import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Scan } from 'lucide-react';

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
  const [autoFit, setAutoFit] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
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

  const calculateFitZoom = useCallback(() => {
    const viewport = viewportRef.current;
    const svg = canvasRef.current?.querySelector('svg');
    if (!viewport || !svg) return 0.7;

    const { width, height } = svg.viewBox.baseVal;
    if (!width || !height) return 0.7;

    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.maxWidth = 'none';

    const availableWidth = Math.max(1, viewport.clientWidth - 48);
    const availableHeight = Math.max(1, viewport.clientHeight - 48);
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(availableWidth / width, availableHeight / height)));
  }, []);

  const applyFit = useCallback(() => {
    const nextFitZoom = calculateFitZoom();
    setFitZoom(nextFitZoom);
    setZoom(nextFitZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [calculateFitZoom]);

  // Fit the rendered SVG to the available canvas, including after entering
  // or leaving the expanded viewer.
  useEffect(() => {
    if (!svgContent) return undefined;
    const frame = requestAnimationFrame(applyFit);
    return () => cancelAnimationFrame(frame);
  }, [svgContent, isFullscreen, applyFit]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoFit) return undefined;
    const resizeObserver = new ResizeObserver(applyFit);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [autoFit, applyFit]);

  const handleZoomIn = useCallback(() => {
    setAutoFit(false);
    setZoom(prev => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setAutoFit(false);
    setZoom(prev => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2)));
  }, []);

  // Reset to auto-fit zoom
  const handleReset = useCallback(() => {
    setAutoFit(true);
    setZoom(fitZoom);
    setPanOffset({ x: 0, y: 0 });
  }, [fitZoom]);

  const handleFit = useCallback(() => {
    setAutoFit(true);
    applyFit();
  }, [applyFit]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    setAutoFit(true);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setAutoFit(false);
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev + delta).toFixed(2))));
    }
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [panOffset]);

  const handlePointerMove = useCallback((e) => {
    if (isPanning) {
      e.preventDefault();
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  }, [isPanning]);

  const handlePointerUp = useCallback((e) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className={`mermaid-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="mermaid-toolbar">
        <button className="mermaid-zoom-btn" onClick={handleZoomOut} title={t?.("mermaid.zoomOut") || "缩小"}>
          <ZoomOut size={14} />
        </button>
        <span className="mermaid-zoom-level">{zoomPercent}%</span>
        <button className="mermaid-zoom-btn" onClick={handleZoomIn} title={t?.("mermaid.zoomIn") || "放大"}>
          <ZoomIn size={14} />
        </button>
        <div className="mermaid-toolbar-divider" />
        <button className="mermaid-zoom-btn" onClick={handleFit} title={t?.("mermaid.fit") || "自动适应"}>
          <Scan size={14} />
        </button>
        <button
          className="mermaid-zoom-btn"
          onClick={handleFullscreen}
          title={isFullscreen ? (t?.("mermaid.exitFullscreen") || "退出全屏") : (t?.("mermaid.fullscreen") || "全屏查看")}
          aria-label={isFullscreen ? "退出全屏" : "全屏查看"}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
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
        <div
          className="mermaid-svg-container"
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="mermaid-svg-inner"
            ref={canvasRef}
            style={{
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              cursor: isPanning ? 'grabbing' : 'grab',
              transition: isPanning ? 'none' : 'transform 0.2s ease'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}
    </div>
  );
};
