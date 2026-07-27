import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ListTree, ChevronRight } from 'lucide-react';

// Build tree from flat headings list
function buildTree(headings) {
  const root = { children: [], level: 0 };
  const stack = [root];

  headings.forEach((h, idx) => {
    const node = { ...h, index: idx, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  return root.children;
}

// Get all node IDs that should be auto-expanded (level <= maxLevel)
function getAutoExpandedIds(tree, maxLevel) {
  const set = new Set();
  const walk = (nodes) => {
    nodes.forEach(n => {
      if (n.level <= maxLevel && n.children.length > 0) {
        set.add(n.id);
      }
      if (n.children.length > 0) {
        walk(n.children);
      }
    });
  };
  walk(tree);
  return set;
}

const TocNode = ({ node, activeId, onHeadingClick, expandedSet, toggleExpand }) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedSet.has(node.id);
  const isActive = activeId === node.id;

  return (
    <div className="toc-tree-node">
      <div className={`toc-tree-item level-${node.level} ${isActive ? 'active' : ''}`}>
        {hasChildren ? (
          <button
            className="toc-tree-toggle"
            onClick={() => toggleExpand(node.id)}
            title={isExpanded ? '收起' : '展开'}
          >
            <ChevronRight
              size={14}
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease'
              }}
            />
          </button>
        ) : (
          <span className="toc-tree-toggle-placeholder" />
        )}
        <a
          className="toc-tree-link"
          href={`#${node.id}`}
          title={node.title}
          onClick={(e) => {
            e.preventDefault();
            onHeadingClick(node.id);
          }}
        >
          {node.title}
        </a>
      </div>
      {hasChildren && isExpanded && (
        <div className="toc-tree-children">
          {node.children.map(child => (
            <TocNode
              key={child.id}
              node={child}
              activeId={activeId}
              onHeadingClick={onHeadingClick}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SidebarToc = ({ headings, activeId, onHeadingClick, isCollapsed, t }) => {
  const tree = useMemo(() => buildTree(headings), [headings]);

  const [expandedSet, setExpandedSet] = useState(new Set());

  // Auto-expand top 2 levels when tree changes (tab switch, etc.)
  useEffect(() => {
    setExpandedSet(getAutoExpandedIds(tree, 2));
  }, [tree]);

  const toggleExpand = useCallback((id) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <aside className={`toc-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="toc-header">
        <div className="toc-title">
          <ListTree size={16} style={{ color: 'var(--accent-color)' }} />
          <span>{t?.('sidebar.outline') || '目录大纲'}</span>
          <span className="toc-count">{headings.length}</span>
        </div>
      </div>

      <div className="toc-list">
        {tree.length === 0 ? (
          <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            暂无标题目录
          </div>
        ) : (
          tree.map(node => (
            <TocNode
              key={node.id}
              node={node}
              activeId={activeId}
              onHeadingClick={onHeadingClick}
              expandedSet={expandedSet}
              toggleExpand={toggleExpand}
            />
          ))
        )}
      </div>
    </aside>
  );
};
