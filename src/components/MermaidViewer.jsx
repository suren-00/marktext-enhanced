import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const orangeThemeLight = {
  primaryColor: '#fef6eb',
  primaryBorderColor: '#e8850c',
  primaryTextColor: '#1a1a1a',
  lineColor: '#d47808',
  secondaryColor: '#fff7ed',
  tertiaryColor: '#faf9f7',
  edgeLabelBackground: '#faf9f7',
  nodeBorder: '#e8850c',
  clusterBkg: '#fef6eb',
  clusterBorder: '#e8850c',
  titleColor: '#1a1a1a',
  edgeLabelTextBackground: '#faf9f7',
  nodeTextColor: '#1a1a1a',
  actorBorder: '#e8850c',
  actorBkg: '#fef6eb',
  actorTextColor: '#1a1a1a',
  actorLineColor: '#e8e5e0',
  signalColor: '#1a1a1a',
  signalTextColor: '#1a1a1a',
  labelBoxBkgColor: '#fef6eb',
  labelBoxBorderColor: '#e8850c',
  labelTextColor: '#1a1a1a',
  loopTextColor: '#1a1a1a',
  noteBorderColor: '#e8850c',
  noteBkgColor: '#fef6eb',
  noteTextColor: '#1a1a1a',
  activationBorderColor: '#e8850c',
  activationBkgColor: '#fef6eb',
  sequenceNumberColor: '#ffffff',
  classText: '#1a1a1a',
  stateBkg: '#fef6eb',
  stateBorder: '#e8850c',
  transitionColor: '#d47808',
  labelBackgroundColor: '#faf9f7',
  fontSize: '12px',
};

const orangeThemeDark = {
  primaryColor: '#2e2418',
  primaryBorderColor: '#f09a24',
  primaryTextColor: '#f0ece6',
  lineColor: '#f09a24',
  secondaryColor: '#2a2018',
  tertiaryColor: '#242424',
  edgeLabelBackground: '#242424',
  nodeBorder: '#f09a24',
  clusterBkg: '#2e2418',
  clusterBorder: '#f09a24',
  titleColor: '#f0ece6',
  edgeLabelTextBackground: '#242424',
  nodeTextColor: '#f0ece6',
  actorBorder: '#f09a24',
  actorBkg: '#2e2418',
  actorTextColor: '#f0ece6',
  actorLineColor: '#333330',
  signalColor: '#f0ece6',
  signalTextColor: '#f0ece6',
  labelBoxBkgColor: '#2e2418',
  labelBoxBorderColor: '#f09a24',
  labelTextColor: '#f0ece6',
  loopTextColor: '#f0ece6',
  noteBorderColor: '#f09a24',
  noteBkgColor: '#2e2418',
  noteTextColor: '#f0ece6',
  activationBorderColor: '#f09a24',
  activationBkgColor: '#2e2418',
  sequenceNumberColor: '#1a1a1a',
  classText: '#f0ece6',
  stateBkg: '#2e2418',
  stateBorder: '#f09a24',
  transitionColor: '#f09a24',
  labelBackgroundColor: '#242424',
  fontSize: '12px',
};

export const MermaidViewer = ({ chartCode, isDark, t }) => {
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [zoom, setZoom] = useState(0.7);
  const [fitZoom, setFitZoom] = useState(0.7);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const wrapperRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Render mermaid chart
  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chartCode || !chartCode.trim()) return;

      try {
        setRenderError(null);
        
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'base',
          themeVariables: isDark ? orangeThemeDark : orangeThemeLight,
          securityLevel: 'strict',
          fontFamily: '"SF Pro Text", "Inter", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
          flowchart: {
            htmlLabels: false,
            useMaxWidth: true,
            curve: 'basis',
            nodeSpacing: 30,
            rankSpacing: 35,
            padding: 8,
            diagramPadding: 8,
            wrappingWidth: 150
          }
        });

        const sanitizedCode = chartCode.trim();
        const uniqueId = `svg-${idRef.current}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, sanitizedCode);

        if (isMounted) {
          setSvgContent(svg);
          setPanOffset({ x: 0, y: 0 });
          // Auto-fit will be calculated after DOM update
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err.message || 'Mermaid 语法报错或渲染失败');
        }
      }
    };

    renderChart();
    return () => { isMounted = false; };
  }, [chartCode, isDark]);

  // Reset zoom after SVG renders (CSS handles the initial sizing)
  useEffect(() => {
    if (!svgContent) return;
    setFitZoom(0.7);
    setZoom(0.7);
    setPanOffset({ x: 0, y: 0 });
  }, [svgContent]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2)));
  }, []);

  // Reset to auto-fit zoom
  const handleReset = useCallback(() => {
    setZoom(0.7);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleFitWidth = useCallback(() => {
    setZoom(0.7);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev + delta).toFixed(2))));
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (zoom > 0.7 && e.button === 0) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  }, [zoom, panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div 
      className="mermaid-wrapper" 
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="mermaid-toolbar">
        <button className="mermaid-zoom-btn" onClick={handleZoomOut} title={t?.("mermaid.zoomOut") || "缩小"}>
          <ZoomOut size={14} />
        </button>
        <span className="mermaid-zoom-level">{zoomPercent}%</span>
        <button className="mermaid-zoom-btn" onClick={handleZoomIn} title={t?.("mermaid.zoomIn") || "放大"}>
          <ZoomIn size={14} />
        </button>
        <div className="mermaid-toolbar-divider" />
        <button className="mermaid-zoom-btn" onClick={handleFitWidth} title={t?.("mermaid.fitWidth") || "适应宽度"}>
          <Maximize2 size={14} />
        </button>
        <button className="mermaid-zoom-btn" onClick={handleReset} title={t?.("mermaid.reset") || "重置视图"}>
          <RotateCcw size={14} />
        </button>
      </div>

      {renderError ? (
        <div className="mermaid-error">
          <strong>{t?.("mermaid.error") || "渲染异常"}:</strong> {renderError}
        </div>
      ) : (
        <div className="mermaid-svg-container">
          <div
            className="mermaid-svg-inner"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              cursor: zoom > 0.7 ? (isPanning ? 'grabbing' : 'grab') : 'default',
              transition: isPanning ? 'none' : 'transform 0.2s ease'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}
    </div>
  );
};
