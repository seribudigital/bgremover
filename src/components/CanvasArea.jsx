import React, { useRef, useEffect, useState } from 'react';
import { Split, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

export default function CanvasArea({
  originalImage,
  workingCanvasRef,
  toolMode,
  brushSize,
  brushMode,
  bgColorType,
  customBgColor,
  customBgImage,
  onCanvasClick,
  onBrushStart,
  onBrushMove,
  onBrushEnd,
  isComparing,
  setIsComparing
}) {
  const containerRef = useRef(null);
  const compareWrapperRef = useRef(null);

  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [baseCanvasSize, setBaseCanvasSize] = useState({ width: 0, height: 0 });

  // State Zoom (1.0 = 100%, 0.25 - 5.0)
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // State Drag-to-Pan (Geser Kanvas)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Ukuran dasar kanvas saat dimuat
  useEffect(() => {
    const updateSize = () => {
      const canvas = workingCanvasRef.current;
      if (canvas) {
        setBaseCanvasSize({
          width: canvas.width,
          height: canvas.height
        });
      }
    };

    updateSize();

    const canvas = workingCanvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [workingCanvasRef, originalImage]);

  // Handle Zoom dengan Scroll Wheel
  const handleWheelZoom = (e) => {
    // Zoom dengan Ctrl/Cmd+Wheel atau Scroll Wheel biasa
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoomLevel((prev) => Math.max(0.25, Math.min(5.0, Number((prev + delta).toFixed(2)))));
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(5.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
  const handleResetZoom = () => setZoomLevel(1.0);

  // Drag-to-Pan Event Handlers (Middle Click / Drag)
  const handleContainerMouseDown = (e) => {
    if (e.button === 1 || e.target === containerRef.current) { // Middle click or background drag
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop
      });
    }
  };

  useEffect(() => {
    const handleMouseMovePan = (e) => {
      if (!isPanning || !containerRef.current) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
    };

    const handleMouseUpPan = () => {
      setIsPanning(false);
    };

    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMovePan);
      window.addEventListener('mouseup', handleMouseUpPan);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMovePan);
      window.removeEventListener('mouseup', handleMouseUpPan);
    };
  }, [isPanning, panStart]);

  // Split slider drag handling
  const handleSplitMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSplit || !compareWrapperRef.current) return;
      const rect = compareWrapperRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSplitPos(percentage);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    if (isDraggingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit]);

  // Track mouse for custom brush cursor preview
  const handleCanvasMouseMove = (e) => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (toolMode === 'brush') {
      onBrushMove(e);
    }
  };

  const getCanvasStyle = () => {
    if (bgColorType === 'color') {
      return { backgroundColor: customBgColor };
    }
    if (bgColorType === 'image' && customBgImage) {
      return {
        backgroundImage: `url(${customBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return {};
  };

  // Hitung dimensi tampilan kanvas dengan skala Zoom
  const displayWidth = baseCanvasSize.width > 0 ? baseCanvasSize.width * zoomLevel : 'auto';
  const displayHeight = baseCanvasSize.height > 0 ? baseCanvasSize.height * zoomLevel : 'auto';

  return (
    <div className="canvas-viewport">
      {/* Top Toolbar */}
      <div className="canvas-toolbar-top">
        <div className="tool-group">
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Mode: <strong style={{ color: 'var(--accent-color)' }}>
              {toolMode === 'chroma' && 'Chroma Color Key'}
              {toolMode === 'wand' && 'Magic Wand Click'}
              {toolMode === 'brush' && `Kuas Manual (${brushMode === 'erase' ? 'Penghapus' : 'Pemulih'})`}
              {toolMode === 'ai' && 'AI Auto Removal'}
            </strong>
          </span>
        </div>

        {/* Zoom & Compare Controls */}
        <div className="tool-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-md)' }}>
            <button className="btn-icon" onClick={handleZoomOut} title="Zoom Out (-)">
              <ZoomOut size={15} />
            </button>
            <span 
              onClick={handleResetZoom}
              title="Klik untuk reset zoom ke 100%"
              style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '46px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button className="btn-icon" onClick={handleZoomIn} title="Zoom In (+)">
              <ZoomIn size={15} />
            </button>
            <button className="btn-icon" onClick={handleResetZoom} title="Reset Zoom (100%)">
              <Maximize2 size={14} />
            </button>
          </div>

          <button 
            className={`btn btn-secondary ${isComparing ? 'active' : ''}`}
            onClick={() => setIsComparing(!isComparing)}
            title="Bandingkan Sebelum & Sesudah"
          >
            <Split size={16} />
            {isComparing ? 'Tutup Perbandingan' : 'Bandingkan Asli'}
          </button>
        </div>
      </div>

      {/* Canvas View Area dengan Scrollable Container (Penuh tanpa terpotong) */}
      <div 
        className="canvas-container checkerboard-bg" 
        ref={containerRef}
        onWheel={handleWheelZoom}
        onMouseDown={handleContainerMouseDown}
        style={{
          cursor: isPanning ? 'grabbing' : 'default'
        }}
      >
        <div 
          className="compare-container"
          ref={compareWrapperRef}
          style={{ 
            position: 'relative', 
            display: 'inline-block', 
            lineHeight: 0,
            width: typeof displayWidth === 'number' ? `${displayWidth}px` : 'auto',
            height: typeof displayHeight === 'number' ? `${displayHeight}px` : 'auto',
            maxWidth: 'none',
            maxHeight: 'none',
            flexShrink: 0
          }}
          onMouseEnter={() => setIsHoveringCanvas(true)}
          onMouseLeave={() => setIsHoveringCanvas(false)}
        >
          {/* Main Working Canvas */}
          <canvas
            ref={workingCanvasRef}
            className="editor-canvas"
            style={{
              width: typeof displayWidth === 'number' ? `${displayWidth}px` : '100%',
              height: typeof displayHeight === 'number' ? `${displayHeight}px` : '100%',
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              cursor: toolMode === 'eyedropper' || toolMode === 'wand' ? 'crosshair' : toolMode === 'brush' ? 'none' : 'default',
              ...getCanvasStyle()
            }}
            onClick={onCanvasClick}
            onMouseDown={onBrushStart}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={onBrushEnd}
          />

          {/* Brush Circle Cursor Preview */}
          {toolMode === 'brush' && isHoveringCanvas && (
            <div
              style={{
                position: 'absolute',
                top: mousePos.y,
                left: mousePos.x,
                width: `${brushSize * zoomLevel}px`,
                height: `${brushSize * zoomLevel}px`,
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                pointerEvents: 'none',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                backgroundColor: brushMode === 'erase' ? 'rgba(248, 81, 73, 0.2)' : 'rgba(63, 185, 80, 0.2)',
                zIndex: 40
              }}
            />
          )}

          {/* Before/After Split Comparison Overlay */}
          {isComparing && originalImage && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${splitPos}%`,
                  height: '100%',
                  overflow: 'hidden',
                  zIndex: 25,
                  borderRight: '2px solid #ffffff',
                  boxShadow: '2px 0 8px rgba(0,0,0,0.5)'
                }}
              >
                <img
                  src={originalImage.src}
                  alt="Original"
                  style={{
                    width: typeof displayWidth === 'number' ? `${displayWidth}px` : '100%',
                    height: typeof displayHeight === 'number' ? `${displayHeight}px` : '100%',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    display: 'block',
                    objectFit: 'fill'
                  }}
                />
              </div>

              {/* Split Slider Draggable Handle */}
              <div
                className="compare-handle"
                style={{ left: `${splitPos}%` }}
                onMouseDown={handleSplitMouseDown}
              >
                <div className="compare-handle-knob">
                  ↔
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
