import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Columns, 
  Edit3, 
  Sidebar as SidebarIcon, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  ListOrdered
} from 'lucide-react';
import { sampleMarkdown } from './sampleDocument';
import { SidebarToc } from './components/SidebarToc';
import { MermaidViewer } from './components/MermaidViewer';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function App() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [viewMode, setViewMode] = useState('read');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [fileName, setFileName] = useState('促销预算管理.md');

  const previewRef = useRef(null);

  // Apply dark theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Extract headings from Markdown (with duplicate ID handling)
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
        // Handle duplicate heading IDs
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
  }, [markdown]);

  // Scroll Spy: highlight active heading on scroll
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

  // Scroll to heading smoothly within preview pane
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

  // Insert [toc] at current cursor or top
  const handleInsertToc = useCallback(() => {
    if (!markdown.includes('[toc]')) {
      setMarkdown((prev) => '# 目录\n\n[toc]\n\n' + prev);
    }
  }, [markdown]);

  // Handle local MD file upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMarkdown(event.target.result.toString());
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be re-uploaded
      e.target.value = '';
    }
  }, []);

  // Download file
  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [markdown, fileName]);

  // Build TOC HTML string (no indentation to avoid marked code-block parsing)
  const buildTocHtml = useCallback(() => {
    const items = headings.map(h => `<li class="toc-level-${h.level}"><a href="#${h.id}">${h.title}</a></li>`).join('');
    return `<div class="inline-toc-box"><div class="inline-toc-title">📌 文档目录树</div><ul class="inline-toc-list">${items}</ul></div>`;
  }, [headings]);

  // Custom parser to split Mermaid code blocks from markdown
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

        if (htmlStr.includes('[toc]')) {
          htmlStr = htmlStr.replace('[toc]', buildTocHtml());
        }

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
  }, [markdown, isDark, headings, buildTocHtml]);

  return (
    <div className="app-container">
      {/* Top Navbar - draggable region for Electron */}
      <header className="top-nav">
        <div className="brand">
          <button 
            className={`icon-btn ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="切换侧边栏目录 (Cmd+Shift+J)"
          >
            <SidebarIcon size={18} />
          </button>

          <div className="brand-logo">M</div>
          <div className="brand-info">
            <div className="brand-name">
              MarkText Enhanced
              <span className="brand-badge">v2.0</span>
            </div>
            <span className="file-path">{fileName}</span>
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
              阅读
            </button>
            <button 
              className={`btn-tab ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              <Columns size={14} />
              分栏
            </button>
            <button 
              className={`btn-tab ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
            >
              <Edit3 size={14} />
              编辑
            </button>
          </div>

          <button className="icon-btn" onClick={handleInsertToc} title="在文档中插入 [toc] 目录表">
            <ListOrdered size={16} />
          </button>

          <label className="icon-btn" title="打开本地 MD 文件" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            <input type="file" accept=".md,.markdown,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button className="icon-btn" onClick={handleDownload} title="导出/下载 .md 文件">
            <Download size={16} />
          </button>

          <button className="icon-btn" onClick={() => setIsDark(!isDark)} title="切换主题">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="main-body">
        {/* Left TOC Sidebar */}
        <SidebarToc
          headings={headings}
          activeId={activeHeadingId}
          onHeadingClick={handleHeadingClick}
          isCollapsed={!isSidebarOpen}
        />

        {/* Editor & Preview Workspace */}
        <main className="workspace">
          {/* Editor Pane (Shown in Edit & Split mode) */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="editor-pane">
              <div className="editor-toolbar">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>源码编辑器</span>
                <span style={{ flex: 1 }}></span>
                <button className="tool-btn" onClick={() => setMarkdown(prev => prev + '\n# 新标题')}>+ 标题</button>
                <button className="tool-btn" onClick={() => setMarkdown(prev => prev + '\n| 列1 | 列2 |\n|---|---|\n| 值1 | 值2 |')}>+ 表格</button>
                <button className="tool-btn" onClick={() => setMarkdown(prev => prev + '\n```mermaid\ngraph TD\n    A["开始"] --> B["流程节点"]\n```')}>+ 流程图</button>
              </div>

              <textarea
                className="editor-textarea"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="在此输入 Markdown 内容..."
              />
            </div>
          )}

          {/* Preview Pane (Shown in Read & Split mode) */}
          {(viewMode === 'read' || viewMode === 'split') && (
            <div className="preview-pane" ref={previewRef}>
              {renderedContent}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
