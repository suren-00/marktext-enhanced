import React from 'react';
import { ListTree, ChevronRight, Hash, Bookmark } from 'lucide-react';

export const SidebarToc = ({ headings, activeId, onHeadingClick, isCollapsed }) => {
  return (
    <aside className={`toc-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="toc-header">
        <div className="toc-title">
          <ListTree size={16} style={{ color: 'var(--accent-color)' }} />
          <span>目录大纲</span>
          <span className="toc-count">{headings.length}</span>
        </div>
      </div>

      <div className="toc-list">
        {headings.length === 0 ? (
          <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            暂无标题目录
          </div>
        ) : (
          headings.map((item, index) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={`${item.id}-${index}`}
                className={`toc-item level-${item.level} ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onHeadingClick(item.id);
                }}
                href={`#${item.id}`}
                title={item.title}
              >
                {item.title}
              </a>
            );
          })
        )}
      </div>
    </aside>
  );
};
