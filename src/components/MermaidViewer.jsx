import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export const MermaidViewer = ({ chartCode, isDark }) => {
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chartCode || !chartCode.trim()) return;

      try {
        setRenderError(null);
        
        // Use htmlLabels: false to force pure SVG text rendering.
        // This avoids foreignObject issues in Electron that cause
        // Chinese edge labels to render as broken gray blocks.
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
          flowchart: {
            htmlLabels: false,
            useMaxWidth: true,
            curve: 'basis',
            nodeSpacing: 50,
            rankSpacing: 60,
            padding: 16,
            wrappingWidth: 200
          }
        });

        const sanitizedCode = chartCode.trim();

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
      {renderError ? (
        <div style={{ color: '#ef4444', padding: '12px', fontSize: '13px', background: '#fef2f2', borderRadius: '8px', width: '100%' }}>
          <strong>渲染异常:</strong> {renderError}
        </div>
      ) : (
        <div
          className="mermaid-svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
};
