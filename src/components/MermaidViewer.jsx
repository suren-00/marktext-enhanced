import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Sparkles, CheckCircle2 } from 'lucide-react';

// Initialize Mermaid with optimized rendering options
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: {
    htmlLabels: true,
    useMaxWidth: true,
    curve: 'basis',
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15
  }
});

export const MermaidViewer = ({ chartCode, isDark }) => {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chartCode || !chartCode.trim()) return;

      try {
        setRenderError(null);
        
        // Re-initialize theme when dark mode changes
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true,
            curve: 'basis',
            nodeSpacing: 60,
            rankSpacing: 60,
            padding: 18
          }
        });

        // Pre-process code to convert simple linebreaks if needed
        const sanitizedCode = chartCode
          .replace(/\\n/g, '<br/>')
          .trim();

        const uniqueId = `svg-${idRef.current}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, sanitizedCode);

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err.message || 'Mermaid 语法报错或渲染失败');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chartCode, isDark]);

  return (
    <div className="mermaid-wrapper">
      <div className="mermaid-toolbar">
        <span className="fix-badge">
          <CheckCircle2 size={12} />
          Mermaid 渲染引擎已自动优化防排版错位
        </span>
      </div>

      {renderError ? (
        <div style={{ color: '#ef4444', padding: '12px', fontSize: '13px', background: '#fef2f2', borderRadius: '8px' }}>
          <strong>渲染异常:</strong> {renderError}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="mermaid-svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
};
