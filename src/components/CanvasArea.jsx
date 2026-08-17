import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Split, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Pipette, 
  Wand2, 
  Eraser, 
  Shapes, 
  Sparkles 
} from 'lucide-react';

export default function CanvasArea({
  originalImage,
  workingCanvasRef,
  toolMode,
  setToolMode,
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
  setIsComparing,
  maskConfig,
  setMaskConfig,
  onCanvasInit,
  historySnapshot
}) {
  const containerRef = useRef(null);
  const compareWrapperRef = useRef(null);
  const svgOverlayRef = useRef(null);

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

  // State Transform Interaction for Shape / Text Masking
  const [dragAction, setDragAction] = useState(null);
  const [dragOrigin, setDragOrigin] = useState({ mouseX: 0, mouseY: 0, initX: 0, initY: 0, initW: 0, initH: 0, initRot: 0, initFontSize: 120 });

  // Inisialisasi dan Pemulihan Kanvas yang Tahan Banting (Anti Hilang)
  useEffect(() => {
    const canvas = workingCanvasRef.current;
    if (!canvas || !originalImage) return;

    const imgW = originalImage.naturalWidth || originalImage.width;
    const imgH = originalImage.naturalHeight || originalImage.height;

    if (canvas.width !== imgW || canvas.height !== imgH) {
      canvas.width = imgW;
      canvas.height = imgH;
    }

    const ctx = canvas.getContext('2d');

    if (historySnapshot) {
      // Pulihkan state riwayat jika ada
      ctx.putImageData(historySnapshot, 0, 0);
    } else {
      // Inisialisasi awal foto
      ctx.clearRect(0, 0, imgW, imgH);
      ctx.drawImage(originalImage, 0, 0);
      if (onCanvasInit) {
        onCanvasInit(canvas);
      }
    }

    setBaseCanvasSize({ width: imgW, height: imgH });
  }, [originalImage, historySnapshot, workingCanvasRef, onCanvasInit]);

  // Handle Zoom dengan Scroll Wheel
  const handleWheelZoom = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoomLevel((prev) => Math.max(0.25, Math.min(5.0, Number((prev + delta).toFixed(2)))));
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(5.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
  const handleResetZoom = () => setZoomLevel(1.0);

  // Drag-to-Pan Event Handlers (Middle Click / Background Drag)
  const handleContainerMouseDown = (e) => {
    if (e.button === 1 || e.target === containerRef.current) {
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

  // Convert client coordinates to canvas pixel space
  const getCanvasCoords = useCallback((clientX, clientY) => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, [workingCanvasRef]);

  // Transform Gizmo Mouse Handlers (Move, Resize, Rotate)
  const handleTransformStart = (e, action) => {
    e.stopPropagation();
    e.preventDefault();
    if (!maskConfig) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    setDragAction(action);
    setDragOrigin({
      mouseX: coords.x,
      mouseY: coords.y,
      initX: maskConfig.x,
      initY: maskConfig.y,
      initW: maskConfig.width,
      initH: maskConfig.height,
      initRot: maskConfig.rotation || 0,
      initFontSize: maskConfig.fontSize || 120
    });
  };

  useEffect(() => {
    if (!dragAction || !maskConfig || !setMaskConfig) return;

    const handleTransformMove = (e) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const dx = coords.x - dragOrigin.mouseX;
      const dy = coords.y - dragOrigin.mouseY;

      if (dragAction === 'move') {
        setMaskConfig(prev => ({
          ...prev,
          x: Math.round(dragOrigin.initX + dx),
          y: Math.round(dragOrigin.initY + dy)
        }));
      } else if (dragAction === 'rotate') {
        const centerX = maskConfig.x;
        const centerY = maskConfig.y;
        const rad = Math.atan2(coords.y - centerY, coords.x - centerX);
        let deg = Math.round((rad * 180) / Math.PI + 90);
        if (deg < 0) deg += 360;
        deg = deg % 360;
        setMaskConfig(prev => ({
          ...prev,
          rotation: deg
        }));
      } else {
        const rad = -((maskConfig.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;

        let newW = dragOrigin.initW;
        let newH = dragOrigin.initH;

        if (dragAction.includes('e')) newW = Math.max(20, Math.round(dragOrigin.initW + localDx * 2));
        if (dragAction.includes('w')) newW = Math.max(20, Math.round(dragOrigin.initW - localDx * 2));
        if (dragAction.includes('s')) newH = Math.max(20, Math.round(dragOrigin.initH + localDy * 2));
        if (dragAction.includes('n')) newH = Math.max(20, Math.round(dragOrigin.initH - localDy * 2));

        if (maskConfig.keepAspect || maskConfig.maskType === 'text') {
          const maxDelta = Math.max(newW / dragOrigin.initW, newH / dragOrigin.initH);
          newW = Math.round(dragOrigin.initW * maxDelta);
          newH = Math.round(dragOrigin.initH * maxDelta);
        }

        setMaskConfig(prev => {
          const updated = {
            ...prev,
            width: newW,
            height: newH
          };
          if (prev.maskType === 'text') {
            updated.fontSize = Math.max(16, Math.round(dragOrigin.initFontSize * (newW / dragOrigin.initW)));
          }
          return updated;
        });
      }
    };

    const handleTransformUp = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleTransformMove);
    window.addEventListener('mouseup', handleTransformUp);

    return () => {
      window.removeEventListener('mousemove', handleTransformMove);
      window.removeEventListener('mouseup', handleTransformUp);
    };
  }, [dragAction, dragOrigin, getCanvasCoords, maskConfig, setMaskConfig]);

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

  const displayWidth = baseCanvasSize.width > 0 ? baseCanvasSize.width * zoomLevel : 'auto';
  const displayHeight = baseCanvasSize.height > 0 ? baseCanvasSize.height * zoomLevel : 'auto';

  // Render SVG Path untuk bentuk mask
  const renderSvgShape = () => {
    if (!maskConfig) return null;
    const { shapeType, width, height, cornerRadius = 20 } = maskConfig;
    const w2 = width / 2;
    const h2 = height / 2;

    switch (shapeType) {
      case 'rect':
        return <rect x={-w2} y={-h2} width={width} height={height} />;
      case 'rounded_rect':
        return <rect x={-w2} y={-h2} width={width} height={height} rx={Math.min(cornerRadius, w2, h2)} />;
      case 'circle':
      case 'ellipse':
        return <ellipse cx={0} cy={0} rx={Math.abs(w2)} ry={Math.abs(h2)} />;
      case 'star': {
        const points = 5;
        const outerRadius = Math.min(Math.abs(w2), Math.abs(h2));
        const innerRadius = outerRadius * 0.45;
        const step = Math.PI / points;
        let rot = (Math.PI / 2) * 3;
        let pathStr = `M 0 ${-outerRadius} `;
        for (let i = 0; i < points; i++) {
          let px = Math.cos(rot) * outerRadius * (w2 / outerRadius);
          let py = Math.sin(rot) * outerRadius * (h2 / outerRadius);
          pathStr += `L ${px} ${py} `;
          rot += step;

          px = Math.cos(rot) * innerRadius * (w2 / outerRadius);
          py = Math.sin(rot) * innerRadius * (h2 / outerRadius);
          pathStr += `L ${px} ${py} `;
          rot += step;
        }
        pathStr += 'Z';
        return <path d={pathStr} />;
      }
      case 'heart': {
        const sx = w2 / 100;
        const sy = h2 / 100;
        const d = `M 0 ${35 * sy} C ${-75 * sx} ${-40 * sy}, ${-100 * sx} ${-90 * sy}, ${-45 * sx} ${-95 * sy} C 0 ${-95 * sy}, 0 ${-60 * sy}, 0 ${-45 * sy} C 0 ${-60 * sy}, 0 ${-95 * sy}, ${45 * sx} ${-95 * sy} C ${100 * sx} ${-90 * sy}, ${75 * sx} ${-40 * sy}, 0 ${35 * sy} Z`;
        return <path d={d} />;
      }
      case 'triangle':
        return <polygon points={`0,${-h2} ${w2},${h2} ${-w2},${h2}`} />;
      case 'hexagon': {
        const sides = 6;
        let pts = [];
        for (let i = 0; i < sides; i++) {
          const a = (i * 2 * Math.PI) / sides;
          pts.push(`${w2 * Math.cos(a)},${h2 * Math.sin(a)}`);
        }
        return <polygon points={pts.join(' ')} />;
      }
      case 'diamond':
        return <polygon points={`0,${-h2} ${w2},0 0,${h2} ${-w2},0`} />;
      default:
        return <rect x={-w2} y={-h2} width={width} height={height} />;
    }
  };

  const isMaskMode = toolMode === 'shape_mask';
  const isIntersect = maskConfig?.operation === 'intersect';
  const themeColor = isIntersect ? '#2f81f7' : '#f85149';
  const themeFill = isIntersect ? 'rgba(47, 129, 247, 0.22)' : 'rgba(248, 81, 73, 0.22)';

  return (
    <div className="canvas-viewport">
      {/* Top Toolbar dengan Quick Tool Selector */}
      <div className="canvas-toolbar-top">
        <div className="tool-group">
          {/* Quick Tool Selector Tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`btn btn-icon ${toolMode === 'chroma' ? 'active' : ''}`}
              onClick={() => setToolMode && setToolMode('chroma')}
              title="Chroma Key"
              style={{ fontSize: '0.75rem', gap: '4px', padding: '5px 10px' }}
            >
              <Pipette size={14} />
              <span>Chroma</span>
            </button>

            <button
              className={`btn btn-icon ${toolMode === 'wand' ? 'active' : ''}`}
              onClick={() => setToolMode && setToolMode('wand')}
              title="Magic Wand"
              style={{ fontSize: '0.75rem', gap: '4px', padding: '5px 10px' }}
            >
              <Wand2 size={14} />
              <span>Wand</span>
            </button>

            <button
              className={`btn btn-icon ${toolMode === 'brush' ? 'active' : ''}`}
              onClick={() => setToolMode && setToolMode('brush')}
              title="Kuas Manual"
              style={{ fontSize: '0.75rem', gap: '4px', padding: '5px 10px' }}
            >
              <Eraser size={14} />
              <span>Kuas</span>
            </button>

            <button
              className={`btn btn-icon ${toolMode === 'shape_mask' ? 'active' : ''}`}
              onClick={() => setToolMode && setToolMode('shape_mask')}
              title="Bentuk & Teks (Crop & Cutout)"
              style={{
                fontSize: '0.75rem',
                gap: '4px',
                padding: '5px 10px',
                backgroundColor: toolMode === 'shape_mask' ? 'var(--accent-alpha)' : undefined,
                color: toolMode === 'shape_mask' ? 'var(--accent-color)' : undefined,
                fontWeight: 600
              }}
            >
              <Shapes size={14} />
              <span>Bentuk & Teks</span>
            </button>

            <button
              className={`btn btn-icon ${toolMode === 'ai' ? 'active' : ''}`}
              onClick={() => setToolMode && setToolMode('ai')}
              title="AI Auto Removal"
              style={{ fontSize: '0.75rem', gap: '4px', padding: '5px 10px' }}
            >
              <Sparkles size={14} />
              <span>AI</span>
            </button>
          </div>
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

      {/* Canvas View Area dengan Scrollable Container */}
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
            onClick={toolMode !== 'shape_mask' ? onCanvasClick : undefined}
            onMouseDown={toolMode === 'brush' ? onBrushStart : undefined}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={toolMode === 'brush' ? onBrushEnd : undefined}
          />

          {/* Interactive Transform Overlay for Shape / Text Masking */}
          {isMaskMode && maskConfig && baseCanvasSize.width > 0 && (
            <svg
              ref={svgOverlayRef}
              viewBox={`0 0 ${baseCanvasSize.width} ${baseCanvasSize.height}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 35
              }}
            >
              <g
                transform={`translate(${maskConfig.x}, ${maskConfig.y}) rotate(${maskConfig.rotation || 0})`}
                style={{ pointerEvents: 'auto' }}
              >
                {/* Silhouette Fill & Contour */}
                <g
                  onMouseDown={(e) => handleTransformStart(e, 'move')}
                  style={{ cursor: 'move' }}
                  fill={themeFill}
                  stroke={themeColor}
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                >
                  {maskConfig.maskType === 'shape' ? (
                    renderSvgShape()
                  ) : (
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={maskConfig.fontSize || 120}
                      fontFamily={maskConfig.fontFamily || 'Impact, sans-serif'}
                      fontWeight={maskConfig.fontWeight || 'bold'}
                      fontStyle={maskConfig.fontStyle || 'normal'}
                      fill={themeFill}
                      stroke={themeColor}
                      strokeWidth="2"
                    >
                      {maskConfig.text || 'STUDIO'}
                    </text>
                  )}
                </g>

                {/* Bounding Box Outline */}
                <rect
                  x={-maskConfig.width / 2}
                  y={-maskConfig.height / 2}
                  width={maskConfig.width}
                  height={maskConfig.height}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.8"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Center Move Anchor */}
                <circle
                  cx={0}
                  cy={0}
                  r="6"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2.5"
                  onMouseDown={(e) => handleTransformStart(e, 'move')}
                  style={{ cursor: 'move' }}
                />

                {/* Rotation Handle Line & Knob */}
                <line
                  x1={0}
                  y1={-maskConfig.height / 2}
                  x2={0}
                  y2={-maskConfig.height / 2 - 28}
                  stroke={themeColor}
                  strokeWidth="1.5"
                />
                <circle
                  cx={0}
                  cy={-maskConfig.height / 2 - 28}
                  r="7"
                  fill={themeColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  onMouseDown={(e) => handleTransformStart(e, 'rotate')}
                  style={{ cursor: 'grab' }}
                />

                {/* 4 Corner Resize Handles */}
                <rect
                  x={-maskConfig.width / 2 - 5}
                  y={-maskConfig.height / 2 - 5}
                  width="10"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2"
                  onMouseDown={(e) => handleTransformStart(e, 'nw')}
                  style={{ cursor: 'nwse-resize' }}
                />
                <rect
                  x={maskConfig.width / 2 - 5}
                  y={-maskConfig.height / 2 - 5}
                  width="10"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2"
                  onMouseDown={(e) => handleTransformStart(e, 'ne')}
                  style={{ cursor: 'nesw-resize' }}
                />
                <rect
                  x={maskConfig.width / 2 - 5}
                  y={maskConfig.height / 2 - 5}
                  width="10"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2"
                  onMouseDown={(e) => handleTransformStart(e, 'se')}
                  style={{ cursor: 'nwse-resize' }}
                />
                <rect
                  x={-maskConfig.width / 2 - 5}
                  y={maskConfig.height / 2 - 5}
                  width="10"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2"
                  onMouseDown={(e) => handleTransformStart(e, 'sw')}
                  style={{ cursor: 'nesw-resize' }}
                />

                {/* 4 Edge Resize Handles */}
                <rect
                  x={-5}
                  y={-maskConfig.height / 2 - 4}
                  width="10"
                  height="8"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  onMouseDown={(e) => handleTransformStart(e, 'n')}
                  style={{ cursor: 'ns-resize' }}
                />
                <rect
                  x={-5}
                  y={maskConfig.height / 2 - 4}
                  width="10"
                  height="8"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  onMouseDown={(e) => handleTransformStart(e, 's')}
                  style={{ cursor: 'ns-resize' }}
                />
                <rect
                  x={maskConfig.width / 2 - 4}
                  y={-4}
                  width="8"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  onMouseDown={(e) => handleTransformStart(e, 'e')}
                  style={{ cursor: 'ew-resize' }}
                />
                <rect
                  x={-maskConfig.width / 2 - 4}
                  y={-4}
                  width="8"
                  height="10"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="1.5"
                  onMouseDown={(e) => handleTransformStart(e, 'w')}
                  style={{ cursor: 'ew-resize' }}
                />
              </g>
            </svg>
          )}

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
