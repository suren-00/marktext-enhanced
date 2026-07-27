import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Columns, 
  Edit3, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Globe,
  Printer,
  HelpCircle,
  ChevronDown,
  FilePlus,
  Save,
  Languages,
  Folder
} from 'lucide-react';
import { SidebarToc } from './components/SidebarToc';
import { MermaidViewer } from './components/MermaidViewer';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { translations } from './translations';

const availableLanguages = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [viewMode, setViewMode] = useState('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState('zh');
  const t = (key) => translations[lang]?.[key] || translations['zh']?.[key] || key;

  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const openFileInputRef = useRef(null);

  useEffect(() => {
    setShowWelcomeScreen(documents.length === 0);
  }, [documents.length]);

  // Notify Electron main process when language changes
  useEffect(() => {
    if (window.electronAPI?.setLanguage) {
      window.electronAPI.setLanguage(lang);
    }
  }, [lang]);

  const handleOpenDocument = () => {
    openFileInputRef.current?.click();
  };

  const handleCreateNewDoc = () => {
    console.log('Creating new doc...');
    setShowWelcomeScreen(false);

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: '新建文档.md',
      content: ''
    };

    setDocuments([newDoc]);
    setActiveTabId(newDoc.id);
    setViewMode('split');
  };

  // Handle files opened from Finder
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.onOpenFile || !electronAPI?.readFile) {
      return undefined;
    }

    const unsubscribe = electronAPI.onOpenFile(async (filePath) => {
      try {
        const text = await electronAPI.readFile(filePath);
        const fileName = filePath.split(/[\\/]/).pop() || '未命名.md';
        const id = `file:${filePath}`;
        const openedDoc = { id, name: fileName, content: text, filePath };

        setDocuments(prev => {
          const existingIndex = prev.findIndex(doc => doc.filePath === filePath);
          if (existingIndex === -1) {
            return [...prev, openedDoc];
          }
          return prev.map((doc, index) => index === existingIndex ? openedDoc : doc);
        });
        setActiveTabId(id);
        setViewMode('read');
        setShowWelcomeScreen(false);
      } catch (error) {
        console.error('Failed to open file:', error);
        alert(`无法打开文件：${error.message}`);
      }
    });

    electronAPI.notifyRendererReady?.();
    return unsubscribe;
  }, []);

  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  const previewRef = useRef(null);
  const textareaRef = useRef(null);

  const activeDoc = documents.find(d => d.id === activeTabId) || documents[0];
  const markdown = activeDoc?.content || '';
  const fileName = activeDoc?.name || '未命名.md';

  const setMarkdown = useCallback((updater) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== activeTabId) return doc;
      const newContent = typeof updater === 'function' ? updater(doc.content) : updater;
      return { ...doc, content: newContent };
    }));
  }, [activeTabId]);


  // Insert markdown snippet at cursor position in editor
  const insertAtCursor = useCallback((snippet) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = markdown.substring(0, start);
    const after = markdown.substring(end);
    const inserted = (start > 0 && !before.endsWith('\n') ? '\n' : '') + snippet + '\n';
    setMarkdown(before + inserted + after);
    // Restore focus and set cursor after inserted text
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = before.length + inserted.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }, [markdown]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const lines = markdown.split('\n');
    const extracted = [];
    const idCount = {};
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        const title = rawTitle.replace(/[*_~`]/g, '');
        let id = 'heading-' + title.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
        if (idCount[id] !== undefined) {
          idCount[id] += 1;
          id = `${id}-${idCount[id]}`;
        } else {
          idCount[id] = 0;
        }
        extracted.push({ level, title, id, rawTitle });
      }
    });

    setHeadings(extracted);
  }, [markdown, activeTabId]);

  useEffect(() => {
    const previewEl = previewRef.current;
    if (!previewEl || headings.length === 0) return;
    if (viewMode === 'edit') return;

    const handleScroll = () => {
      const previewRect = previewEl.getBoundingClientRect();
      const headingEls = headings
        .map(h => document.getElementById(h.id))
        .filter(Boolean);

      let currentId = '';
      for (const el of headingEls) {
        const rect = el.getBoundingClientRect();
        const relativeTop = rect.top - previewRect.top;
        if (relativeTop <= 60) {
          currentId = el.id;
        } else {
          break;
        }
      }
      if (currentId) {
        setActiveHeadingId(currentId);
      }
    };

    previewEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => previewEl.removeEventListener('scroll', handleScroll);
  }, [headings, viewMode]);

  useEffect(() => {
    const previewEl = previewRef.current;
    if (previewEl) {
      previewEl.scrollTop = 0;
    }
  }, [activeTabId]);

  const handleHeadingClick = useCallback((id) => {
    setActiveHeadingId(id);
    const element = document.getElementById(id);
    const previewEl = previewRef.current;
    if (element && previewEl) {
      const elRect = element.getBoundingClientRect();
      const previewRect = previewEl.getBoundingClientRect();
      const offset = elRect.top - previewRect.top + previewEl.scrollTop - 20;
      previewEl.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }, []);

  const handleCloseTab = useCallback((tabId, e) => {
    e?.stopPropagation();
    setDocuments(prev => {
      const idx = prev.findIndex(d => d.id === tabId);
      const next = prev.filter(d => d.id !== tabId);
      if (tabId === activeTabId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.id ?? null);
      }
      return next;
    });
  }, [activeTabId]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newDoc = {
            id: `doc-${Date.now()}`,
            name: file.name,
            content: event.target.result.toString()
          };
          setDocuments(prev => [...prev, newDoc]);
          setActiveTabId(newDoc.id);
          setViewMode('read');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [markdown, fileName]);

  // Export as HTML
  const handleExportHTML = useCallback(() => {
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName.replace('.md', '')}</title>
  <style>
    body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
    h1,h2,h3,h4 { margin-top: 1.5em; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    blockquote { border-left: 4px solid #e8850c; padding-left: 16px; margin-left: 0; color: #666; }
  </style>
</head>
<body>${DOMPurify.sanitize(marked.parse(markdown), { ADD_ATTR: ['style'], ADD_TAGS: ['div','ul','li','a','span'] })}</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace('.md', '.html');
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    setShowExportMenu(false);
  }, [markdown, fileName]);

  // Export as PDF through Electron's native print pipeline. The old approach
  // used window.open(), which the desktop shell blocks for external links.
  const handleExportPDF = useCallback(async () => {
    const htmlContent = DOMPurify.sanitize(marked.parse(markdown), { ADD_ATTR: ['style'], ADD_TAGS: ['div','ul','li','a','span'] });
    const fullHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${fileName}</title>
      <style>body{font-family:-apple-system,"PingFang SC",sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.7}
      h1,h2,h3{margin-top:1.5em}code{background:#f5f5f5;padding:2px 6px;border-radius:4px}
      pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px 12px}
      th{background:#f5f5f5}blockquote{border-left:4px solid #e8850c;padding-left:16px;margin-left:0;color:#666}
      @page{size:A4;margin:18mm 16mm} @media print{body{max-width:none;margin:0;padding:0}}</style></head><body>${htmlContent}</body></html>`;
    setShowExportMenu(false);

    try {
      if (window.electronAPI?.exportPDF) {
        await window.electronAPI.exportPDF({ html: fullHtml, fileName });
        return;
      }

      // Browser fallback for development mode.
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        return;
      }
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    } catch (error) {
      console.error('PDF export error:', error);
      alert(error.message || 'PDF 导出失败');
    }
  }, [fileName, markdown]);

  // New blank document
  const handleNewDoc = useCallback(() => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: '未命名.md',
      content: t('newDoc.content')
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveTabId(newDoc.id);
    setViewMode('split');
    setShowFileMenu(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          // Save As - prompt for filename
          const name = prompt(t('saveAs.prompt'), fileName);
          if (name) {
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = name.endsWith('.md') ? name : name + '.md';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
          }
        } else {
          // Save - download
          handleDownload();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [markdown, fileName, handleDownload]);


  const renderedContent = useMemo(() => {
    const mdContent = markdown;
    const blocks = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(mdContent)) !== null) {
      const textBefore = mdContent.substring(lastIndex, match.index);
      if (textBefore) {
        blocks.push({ type: 'markdown', content: textBefore });
      }
      blocks.push({ type: 'mermaid', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    const remainingText = mdContent.substring(lastIndex);
    if (remainingText) {
      blocks.push({ type: 'markdown', content: remainingText });
    }

    return blocks.map((block, idx) => {
      if (block.type === 'mermaid') {
        return <MermaidViewer key={`mermaid-${idx}`} chartCode={block.content} isDark={isDark} />;
      } else {
        let htmlStr = block.content;
        
        headings.forEach(({ rawTitle, id }) => {
          const headingRegex = new RegExp(`^(#{1,6})\\s+${rawTitle.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'gm');
          htmlStr = htmlStr.replace(headingRegex, (m, hashes) => {
            return `<h${hashes.length} id="${id}">${rawTitle}</h${hashes.length}>`;
          });
        });


        const parsedHtml = DOMPurify.sanitize(marked.parse(htmlStr), {
          ADD_ATTR: ['style'],
          ADD_TAGS: ['div', 'ul', 'li', 'a', 'span']
        });

        return (
          <div
            key={`md-${idx}`}
            className="markdown-body-custom"
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        );
      }
    });
  }, [markdown, isDark, headings]);



  return (
    <div className="app-container">
      {/* Welcome Screen - shown when no documents are open */}
      {showWelcomeScreen && (
        <div className="welcome-screen">
          <div className="welcome-content">
            <img src="./owlmark-icon.png" alt="OwlMark logo" className="welcome-logo" />
            <h2>OwlMark</h2>
            <p>Your elegant Markdown editor</p>

            <div className="welcome-buttons">
              <button className="btn-primary" onClick={handleOpenDocument}>
                <Folder size={18} />
                打开文档
              </button>

              <button className="btn-secondary" onClick={handleCreateNewDoc}>
                <FileText size={18} />
                新建空白文档
              </button>
            </div>
            <input
              ref={openFileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}
      {/* Top Navbar - Claude style, draggable for Electron */}
      <header className="top-nav">
        <div className="brand">
          <img src="./owlmark-icon.png" alt="OwlMark" className="brand-icon" />
          <div className="brand-info">
            <div className="brand-name">OwlMark</div>
          </div>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="nav-controls">
          <div className="view-switcher">
            <button 
              className={`btn-tab ${viewMode === 'read' ? 'active' : ''}`}
              onClick={() => setViewMode('read')}
            >
              <BookOpen size={14} />
              {t('nav.read')}
            </button>
            <button 
              className={`btn-tab ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              <Columns size={14} />
              {t('nav.split')}
            </button>
            <button 
              className={`btn-tab ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
            >
              <Edit3 size={14} />
              {t('nav.edit')}
            </button>
          </div>


          {/* File menu */}
          <div className="nav-dropdown" style={{ position: 'relative' }}>
            <button className="btn-tab" onClick={() => { setShowFileMenu(!showFileMenu); setShowExportMenu(false); setShowLangMenu(false); }}>
              <Save size={14} />
              {t('nav.save')}
              <ChevronDown size={11} style={{ opacity: 0.5 }} />
            </button>
            {showFileMenu && (
              <div className="nav-dropdown-menu" onClick={() => setShowFileMenu(false)}>
                <button className="dropdown-item" onClick={handleNewDoc}>
                  <FilePlus size={14} /> {t('file.newDoc')}
                </button>
                <label className="dropdown-item" style={{ cursor: 'pointer' }}>
                  <Upload size={14} /> {t('file.open')}
                  <input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={handleDownload}>
                  <Download size={14} /> {t('file.saveMd')} <span className="shortcut">⌘S</span>
                </button>
                <button className="dropdown-item" onClick={() => {
                  const name = prompt(t('saveAs.prompt'), fileName);
                  if (name) {
                    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url; link.download = name.endsWith('.md') ? name : name + '.md';
                    link.click(); setTimeout(() => URL.revokeObjectURL(url), 100);
                  }
                  setShowFileMenu(false);
                }}>
                  <Download size={14} /> {t('file.saveAsMd')} <span className="shortcut">⇧⌘S</span>
                </button>
              </div>
            )}
          </div>

          {/* Export menu */}
          <div className="nav-dropdown" style={{ position: 'relative' }}>
            <button className="btn-tab" onClick={() => { setShowExportMenu(!showExportMenu); setShowFileMenu(false); setShowLangMenu(false); }}>
              <Download size={14} />
              {t('nav.export')}
              <ChevronDown size={11} style={{ opacity: 0.5 }} />
            </button>
            {showExportMenu && (
              <div className="nav-dropdown-menu">
                <button className="dropdown-item" onClick={handleExportPDF}>
                  <Printer size={14} /> {t('export.pdf')}
                </button>
                <button className="dropdown-item" onClick={handleExportHTML}>
                  <Globe size={14} /> {t('export.html')}
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={handleDownload}>
                  <FileText size={14} /> {t('export.md')}
                </button>
              </div>
            )}
          </div>

          {/* Syntax help */}
          <button className="btn-tab" onClick={() => setShowSyntaxHelp(!showSyntaxHelp)} title="Markdown 语法速查">
            <HelpCircle size={14} />
            {t('nav.syntax')}
          </button>

          <div className="nav-dropdown" style={{ position: 'relative' }}>
            <button className="btn-tab" onClick={() => { setShowLangMenu(!showLangMenu); setShowFileMenu(false); setShowExportMenu(false); }}>
              <Languages size={14} />
              {availableLanguages.find(l => l.code === lang)?.name || lang}
              <ChevronDown size={11} style={{ opacity: 0.5 }} />
            </button>
            {showLangMenu && (
              <div className="nav-dropdown-menu" style={{ minWidth: '140px' }}>
                {availableLanguages.map(l => (
                  <button 
                    key={l.code}
                    className={`dropdown-item ${lang === l.code ? 'active' : ''}`}
                    onClick={() => { setLang(l.code); setShowLangMenu(false); }}
                  >
                    <span style={{ marginRight: '8px' }}>{l.flag}</span>
                    {l.name}
                    {lang === l.code && <span style={{ marginLeft: 'auto', color: 'var(--accent-color)' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-tab" onClick={() => setIsDark(!isDark)} title="切换主题">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? t('nav.light') : t('nav.dark')}
          </button>
        </div>
      </header>

      {/* Document Tabs Bar - with sidebar toggle at position 1 */}
      <div className="doc-tabs">
        <button
          className={`doc-tab-toggle ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="doc-tabs-divider" />

        {documents.map(doc => (
          <div
            key={doc.id}
            className={`doc-tab ${doc.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTabId(doc.id)}
          >
            <span className="doc-tab-name">{doc.name}</span>
            <button
              className="doc-tab-close"
              onClick={(e) => handleCloseTab(doc.id, e)}
              title={t("tab.close")}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <label className="doc-tab doc-tab-add" title={t("tab.newFile")} style={{ cursor: 'pointer' }}>
          <Plus size={14} />
          <input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Main Container */}
      <div className="main-body">
        <SidebarToc
          headings={headings}
          activeId={activeHeadingId}
          onHeadingClick={handleHeadingClick}
          isCollapsed={!isSidebarOpen}
          t={t}
        />

        <main className="workspace">
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="editor-pane">
              <div className="editor-toolbar">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{fileName}</span>
                <span style={{ flex: 1 }}></span>
                <button className="tool-btn" onClick={() => insertAtCursor('# 新标题')}>{t('editor.title')}</button>
                <button className="tool-btn" onClick={() => insertAtCursor('| 列1 | 列2 |\n|---|---|\n| 值1 | 值2 |')}>{t('editor.table')}</button>
                <button className="tool-btn" onClick={() => insertAtCursor('```mermaid\ngraph TD\n    A["开始"] --> B["流程节点"]\n```')}>{t('editor.flowchart')}</button>
              </div>

              <textarea
                ref={textareaRef}
                className="editor-textarea"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder={t("editor.placeholder")}
              />
            </div>
          )}

          {(viewMode === 'read' || viewMode === 'split') && (
            <div className="preview-pane" ref={previewRef}>
              {renderedContent}
            </div>
          )}
        </main>
      </div>
      {/* Syntax Help Modal */}
      {showSyntaxHelp && (
        <div className="syntax-overlay" onClick={() => setShowSyntaxHelp(false)}>
          <div className="syntax-panel" onClick={e => e.stopPropagation()}>
            <div className="syntax-header">
              <div>
                <div className="syntax-title">{t('syntax.title')}</div>
                <div className="syntax-subtitle">{t('syntax.subtitle')}</div>
              </div>
              <button className="syntax-close" onClick={() => setShowSyntaxHelp(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="syntax-body">
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">H</span> {t('syntax.headings')}</div>
                <pre className="syntax-code">{t('syntax.headings.code')}</pre>
                <div className="syntax-desc">{t('syntax.headings.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">B</span> {t('syntax.emphasis')}</div>
                <pre className="syntax-code">{t('syntax.emphasis.code')}</pre>
                <div className="syntax-desc">{t('syntax.emphasis.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">☰</span> {t('syntax.lists')}</div>
                <pre className="syntax-code">{t('syntax.lists.code')}</pre>
                <div className="syntax-desc">{t('syntax.lists.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">☑</span> {t('syntax.tasks')}</div>
                <pre className="syntax-code">{t('syntax.tasks.code')}</pre>
                <div className="syntax-desc">{t('syntax.tasks.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">—</span> {t('syntax.hr')}</div>
                <pre className="syntax-code">{'---'}</pre>
                <div className="syntax-desc">{t('syntax.hr.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">"</span> {t('syntax.quote')}</div>
                <pre className="syntax-code">{t('syntax.quote.code')}</pre>
                <div className="syntax-desc">{t('syntax.quote.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">{'{}'}</span> 代码</div>
                <pre className="syntax-code">{t('syntax.code.sample')}</pre>
                <div className="syntax-desc">{t('syntax.code.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">⊞</span> {t('syntax.table')}</div>
                <pre className="syntax-code">{t('syntax.table.code')}</pre>
                <div className="syntax-desc">{t('syntax.table.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">🔗</span> {t('syntax.links')}</div>
                <pre className="syntax-code">{t('syntax.links.code')}</pre>
                <div className="syntax-desc">{t('syntax.links.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">f(x)</span> {t('syntax.math')}</div>
                <pre className="syntax-code">{t('syntax.math.code')}</pre>
                <div className="syntax-desc">{t('syntax.math.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">↕</span> {t('syntax.mermaid')}</div>
                <pre className="syntax-code">{t('syntax.mermaid.code')}</pre>
                <div className="syntax-desc">{t('syntax.mermaid.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">*</span> {t('syntax.footnote')}</div>
                <pre className="syntax-code">{t('syntax.footnote.code')}</pre>
                <div className="syntax-desc">{t('syntax.footnote.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">=</span> {t('syntax.highlight')}</div>
                <pre className="syntax-code">{t('syntax.highlight.code')}</pre>
                <div className="syntax-desc">{t('syntax.highlight.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">x²</span> {t('syntax.subsuper')}</div>
                <pre className="syntax-code">{t('syntax.subsuper.code')}</pre>
                <div className="syntax-desc">{t('syntax.subsuper.desc')}</div>
              </div>
              <div className="syntax-card">
                <div className="syntax-card-title"><span className="syntax-icon">😄</span> {t('syntax.emoji')}</div>
                <pre className="syntax-code">{t('syntax.emoji.code')}</pre>
                <div className="syntax-desc">{t('syntax.emoji.desc')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
