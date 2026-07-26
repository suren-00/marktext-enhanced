import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Columns, 
  Edit3, 
  Sidebar as SidebarIcon, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  GitBranch, 
  Sparkles, 
  FileText, 
  ListOrdered, 
  Check, 
  ExternalLink,
  Code,
  Copy
} from 'lucide-react';
import { sampleMarkdown } from './sampleDocument';
import { SidebarToc } from './components/SidebarToc';
import { MermaidViewer } from './components/MermaidViewer';
import { marked } from 'marked';

export default function App() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [viewMode, setViewMode] = useState('split'); // 'read' | 'split' | 'edit'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [showGitModal, setShowGitModal] = useState(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);

  const previewRef = useRef(null);

  // Apply dark theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Extract headings from Markdown
  useEffect(() => {
    const lines = markdown.split('\n');
    const extracted = [];
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        const title = rawTitle.replace(/[*_~`]/g, ''); // strip markdown formatting for TOC title
        const id = 'heading-' + title.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
        extracted.push({ level, title, id, rawTitle });
      }
    });

    setHeadings(extracted);
  }, [markdown]);

  // Scroll to heading smoothly
  const handleHeadingClick = (id) => {
    setActiveHeadingId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Insert [toc] at current cursor or top
  const handleInsertToc = () => {
    if (!markdown.includes('[toc]')) {
      setMarkdown((prev) => '# 目录\n\n[toc]\n\n' + prev);
    }
  };

  // Handle local MD file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMarkdown(event.target.result.toString());
        }
      };
      reader.readAsText(file);
    }
  };

  // Download file
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '促销预算管理.md';
    link.click();
  };

  // Custom parser to split Mermaid code blocks from markdown
  const renderMarkdownWithMermaid = (mdContent) => {
    let contentToParse = mdContent;

    const blocks = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(contentToParse)) !== null) {
      const textBefore = contentToParse.substring(lastIndex, match.index);
      if (textBefore) {
        blocks.push({ type: 'markdown', content: textBefore });
      }
      blocks.push({ type: 'mermaid', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    const remainingText = contentToParse.substring(lastIndex);
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
          const tocHtml = `
            <div class="inline-toc-box">
              <div class="inline-toc-title">📌 文档目录树</div>
              <ul class="inline-toc-list">
                ${headings.map(h => `<li style="margin-left: ${(h.level - 1) * 16}px"><a href="#${h.id}">${h.title}</a></li>`).join('')}
              </ul>
            </div>
          `;
          htmlStr = htmlStr.replace('[toc]', tocHtml);
        }

        const parsedHtml = marked.parse(htmlStr);

        return (
          <div
            key={`md-${idx}`}
            className="markdown-body-custom"
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        );
      }
    });
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
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
              <span className="brand-badge">v2.0 (已修复渲染)</span>
            </div>
            <span className="file-path">嘉实多项目 &gt; 促销预算管理.md</span>
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

          <button className="action-btn primary" onClick={() => setShowGitModal(true)}>
            <GitBranch size={15} />
            上传到 GitHub
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
                <button className="tool-btn" onClick={() => setMarkdown(prev => prev + '\n```mermaid\ngraph TD\n    A[开始] --> B[流程节点]\n```')}>+ 流程图</button>
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
              {renderMarkdownWithMermaid(markdown)}
            </div>
          )}
        </main>
      </div>

      {/* Git Push Guide Modal */}
      {showGitModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '560px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <GitBranch size={20} color="var(--accent-color)" />
              推送项目到您自己的 GitHub 账号
            </h3>
            
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.6' }}>
              本项目（MarkText Enhanced）已在您的本地初始化为标准的 Git 仓库！请按以下命令将代码推送到您自己的 GitHub 仓库：
            </p>

            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: 'Fira Code, monospace',
              fontSize: '12.5px',
              lineHeight: '1.7',
              color: 'var(--text-primary)',
              position: 'relative',
              marginBottom: '20px'
            }}>
              <div># 1. 进入本地项目目录</div>
              <div style={{ color: 'var(--accent-color)' }}>cd /Users/xubaobao/.gemini/antigravity/scratch/marktext-enhanced</div>
              <br />
              <div># 2. 关联您在 GitHub 上新建的远程仓库</div>
              <div style={{ color: 'var(--accent-color)' }}>git remote add origin https://github.com/YOUR_USERNAME/marktext-enhanced.git</div>
              <br />
              <div># 3. 推送代码到 GitHub 仓库</div>
              <div style={{ color: 'var(--accent-color)' }}>git branch -M main</div>
              <div style={{ color: 'var(--accent-color)' }}>git push -u origin main</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="action-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`cd /Users/xubaobao/.gemini/antigravity/scratch/marktext-enhanced\ngit remote add origin https://github.com/YOUR_USERNAME/marktext-enhanced.git\ngit branch -M main\ngit push -u origin main`);
                  setCopiedGitCmd(true);
                  setTimeout(() => setCopiedGitCmd(false), 2000);
                }}
              >
                {copiedGitCmd ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                {copiedGitCmd ? '已复制命令' : '复制 Git 命令'}
              </button>
              <button className="action-btn primary" onClick={() => setShowGitModal(false)}>
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
