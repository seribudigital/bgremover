import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Split, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Pipette, 
  Wand2, 
  Eraser, 
  Shapes, 
  Type,
  Sparkles,
  PenTool,
  MousePointer2,
  Spline,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  drawTextSilhouette, 
  generatePointsFromShape, 
  getCustomPointsSvgPath,
  computeSmoothTangents
} from '../utils/imageProcessor';

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
      ctx.putImageData(historySnapshot, 0, 0);
    } else {
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

  // Transform Gizmo Mouse Handlers (Move, Resize, Rotate, and Drag Point)
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

  const handlePointDragStart = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    if (!maskConfig) return;

    setMaskConfig(prev => ({ ...prev, selectedPointIndex: index }));
    setDragAction(`point_${index}`);
    setDragOrigin({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initPoints: maskConfig.customPoints ? [...maskConfig.customPoints] : []
    });
  };

  const handleControlDragStart = (e, index, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (!maskConfig) return;

    setMaskConfig(prev => ({ ...prev, selectedPointIndex: index }));
    setDragAction(`cp_${handleType}_${index}`);
    setDragOrigin({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initPoints: maskConfig.customPoints ? [...maskConfig.customPoints] : []
    });
  };

  const handleInsertPoint = (e, index, midX, midY) => {
    e.stopPropagation();
    e.preventDefault();
    if (!maskConfig) return;

    const currentPts = maskConfig.customPoints && maskConfig.customPoints.length >= 3
      ? [...maskConfig.customPoints]
      : generatePointsFromShape(maskConfig.shapeType, maskConfig.width, maskConfig.height, maskConfig.cornerRadius);

    const nextPts = [...currentPts];
    nextPts.splice(index + 1, 0, { x: Math.round(midX), y: Math.round(midY) });
    const smoothPts = computeSmoothTangents(nextPts);

    setMaskConfig(prev => ({
      ...prev,
      customPoints: smoothPts,
      isEditPointsMode: true,
      selectedPointIndex: index + 1
    }));
  };

  const handleDeletePoint = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    if (!maskConfig || !maskConfig.customPoints) return;

    if (maskConfig.customPoints.length <= 3) {
      alert('Bentuk harus memiliki minimal 3 titik.');
      return;
    }

    const nextPts = maskConfig.customPoints.filter((_, i) => i !== index);
    setMaskConfig(prev => ({
      ...prev,
      customPoints: nextPts,
      selectedPointIndex: -1
    }));
  };

  useEffect(() => {
    if (!dragAction || !maskConfig || !setMaskConfig) return;

    const handleTransformMove = (e) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const dx = coords.x - dragOrigin.mouseX;
      const dy = coords.y - dragOrigin.mouseY;

      if (dragAction.startsWith('point_')) {
        const pIndex = parseInt(dragAction.replace('point_', ''), 10);
        const relX = coords.x - maskConfig.x;
        const relY = coords.y - maskConfig.y;
        const rad = -((maskConfig.rotation || 0) * Math.PI) / 180;
        const localX = Math.round(relX * Math.cos(rad) - relY * Math.sin(rad));
        const localY = Math.round(relX * Math.sin(rad) + relY * Math.cos(rad));

        setMaskConfig(prev => {
          const currentPts = prev.customPoints && prev.customPoints.length >= 3
            ? [...prev.customPoints]
            : generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius);
          const nextPts = [...currentPts];
          const oldP = nextPts[pIndex];
          const deltaX = localX - oldP.x;
          const deltaY = localY - oldP.y;

          nextPts[pIndex] = {
            ...oldP,
            x: localX,
            y: localY,
            cpIn: {
              x: (oldP.cpIn ? oldP.cpIn.x : oldP.x) + deltaX,
              y: (oldP.cpIn ? oldP.cpIn.y : oldP.y) + deltaY
            },
            cpOut: {
              x: (oldP.cpOut ? oldP.cpOut.x : oldP.x) + deltaX,
              y: (oldP.cpOut ? oldP.cpOut.y : oldP.y) + deltaY
            }
          };

          return {
            ...prev,
            customPoints: nextPts,
            isEditPointsMode: true
          };
        });
      } else if (dragAction.startsWith('cp_in_')) {
        const pIndex = parseInt(dragAction.replace('cp_in_', ''), 10);
        const relX = coords.x - maskConfig.x;
        const relY = coords.y - maskConfig.y;
        const rad = -((maskConfig.rotation || 0) * Math.PI) / 180;
        const localX = Math.round(relX * Math.cos(rad) - relY * Math.sin(rad));
        const localY = Math.round(relX * Math.sin(rad) + relY * Math.cos(rad));

        setMaskConfig(prev => {
          const currentPts = prev.customPoints && prev.customPoints.length >= 3
            ? [...prev.customPoints]
            : generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius);
          const nextPts = [...currentPts];
          const p = nextPts[pIndex];
          const isCorner = p.handleMode === 'corner';

          const newCpIn = { x: localX, y: localY };
          let newCpOut = p.cpOut ? { ...p.cpOut } : { x: p.x, y: p.y };

          if (!isCorner) {
            const vx = localX - p.x;
            const vy = localY - p.y;
            newCpOut = {
              x: Math.round(p.x - vx),
              y: Math.round(p.y - vy)
            };
          }

          nextPts[pIndex] = {
            ...p,
            cpIn: newCpIn,
            cpOut: newCpOut
          };

          return {
            ...prev,
            customPoints: nextPts,
            isEditPointsMode: true
          };
        });
      } else if (dragAction.startsWith('cp_out_')) {
        const pIndex = parseInt(dragAction.replace('cp_out_', ''), 10);
        const relX = coords.x - maskConfig.x;
        const relY = coords.y - maskConfig.y;
        const rad = -((maskConfig.rotation || 0) * Math.PI) / 180;
        const localX = Math.round(relX * Math.cos(rad) - relY * Math.sin(rad));
        const localY = Math.round(relX * Math.sin(rad) + relY * Math.cos(rad));

        setMaskConfig(prev => {
          const currentPts = prev.customPoints && prev.customPoints.length >= 3
            ? [...prev.customPoints]
            : generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius);
          const nextPts = [...currentPts];
          const p = nextPts[pIndex];
          const isCorner = p.handleMode === 'corner';

          const newCpOut = { x: localX, y: localY };
          let newCpIn = p.cpIn ? { ...p.cpIn } : { x: p.x, y: p.y };

          if (!isCorner) {
            const vx = localX - p.x;
            const vy = localY - p.y;
            newCpIn = {
              x: Math.round(p.x - vx),
              y: Math.round(p.y - vy)
            };
          }

          nextPts[pIndex] = {
            ...p,
            cpIn: newCpIn,
            cpOut: newCpOut
          };

          return {
            ...prev,
            customPoints: nextPts,
            isEditPointsMode: true
          };
        });
      } else if (dragAction === 'move') {
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

        if (maskConfig.keepAspect) {
          const maxDelta = Math.max(newW / dragOrigin.initW, newH / dragOrigin.initH);
          newW = Math.round(dragOrigin.initW * maxDelta);
          newH = Math.round(dragOrigin.initH * maxDelta);
        }

        setMaskConfig(prev => ({
          ...prev,
          width: newW,
          height: newH
        }));
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
    const { shapeType, width, height, cornerRadius = 20, isEditPointsMode, customPoints, curveType } = maskConfig;

    if ((isEditPointsMode || shapeType === 'custom') && customPoints && customPoints.length >= 3) {
      const d = getCustomPointsSvgPath(customPoints, curveType || 'linear');
      return <path d={d} />;
    }

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
        const step = Math.PI / points;
        let rot = (Math.PI / 2) * 3;
        let pathStr = `M 0 ${-h2} `;
        for (let i = 0; i < points; i++) {
          let px = Math.cos(rot) * w2;
          let py = Math.sin(rot) * h2;
          pathStr += `L ${px} ${py} `;
          rot += step;

          px = Math.cos(rot) * (w2 * 0.45);
          py = Math.sin(rot) * (h2 * 0.45);
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

  const isShapeActive = toolMode === 'shape' || (toolMode === 'shape_mask' && maskConfig?.maskType === 'shape');
  const isTextActive = toolMode === 'text' || (toolMode === 'shape_mask' && maskConfig?.maskType === 'text');
  const isMaskMode = isShapeActive || isTextActive;
  const isIntersect = maskConfig?.operation === 'intersect';
  const themeColor = isIntersect ? '#2f81f7' : '#f85149';
  const themeFill = isIntersect ? 'rgba(47, 129, 247, 0.22)' : 'rgba(248, 81, 73, 0.22)';

  // Preview teks berbasis Canvas (WYSIWYG — rendering identik dengan hasil akhir)
  // Menggunakan drawTextSilhouette() yang sama persis untuk preview dan hasil masking
  const textPreviewUrl = useMemo(() => {
    if (!maskConfig || maskConfig.maskType !== 'text') return null;
    const { width, height, text, fontSize, fontFamily, fontWeight, fontStyle,
            letterSpacing, wrapText, textAlign, lineHeight, operation } = maskConfig;
    if (!width || !height || !text) return null;

    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(width));
    c.height = Math.max(1, Math.ceil(height));
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.translate(c.width / 2, c.height / 2);

    // Warna preview semi-transparan sesuai mode operasi
    ctx.fillStyle = operation === 'intersect'
      ? 'rgba(47, 129, 247, 0.8)'
      : 'rgba(248, 81, 73, 0.8)';

    drawTextSilhouette(ctx, {
      text, fontSize, fontFamily, fontWeight, fontStyle,
      letterSpacing, width, height, wrapText, textAlign, lineHeight
    });

    return c.toDataURL();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- semua field maskConfig yang relevan sudah di-destructure di dalam
  }, [maskConfig]);

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
              className={`btn btn-icon ${isShapeActive ? 'active' : ''}`}
              onClick={() => {
                if (setToolMode) setToolMode('shape');
                if (setMaskConfig) setMaskConfig(p => ({ ...p, maskType: 'shape' }));
              }}
              title="Potong Bentuk (Shape Mask)"
              style={{
                fontSize: '0.75rem',
                gap: '4px',
                padding: '5px 10px',
                backgroundColor: isShapeActive ? 'var(--accent-alpha)' : undefined,
                color: isShapeActive ? 'var(--accent-color)' : undefined,
                fontWeight: 600
              }}
            >
              <Shapes size={14} />
              <span>Bentuk</span>
            </button>

            <button
              className={`btn btn-icon ${isTextActive ? 'active' : ''}`}
              onClick={() => {
                if (setToolMode) setToolMode('text');
                if (setMaskConfig) setMaskConfig(p => ({ ...p, maskType: 'text' }));
              }}
              title="Potong Teks & Wrap Text"
              style={{
                fontSize: '0.75rem',
                gap: '4px',
                padding: '5px 10px',
                backgroundColor: isTextActive ? 'var(--accent-alpha)' : undefined,
                color: isTextActive ? 'var(--accent-color)' : undefined,
                fontWeight: 600
              }}
            >
              <Type size={14} />
              <span>Teks (Wrap)</span>
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

          {/* Quick Shape Edit Pointer Toggle when Shape is active */}
          {isShapeActive && maskConfig && (
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
              <button
                className={`btn btn-icon ${maskConfig.isEditPointsMode ? 'active' : ''}`}
                onClick={() => {
                  setMaskConfig(prev => {
                    const turningOn = !prev.isEditPointsMode;
                    const pts = turningOn && (!prev.customPoints || prev.customPoints.length < 3)
                      ? generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius)
                      : prev.customPoints;
                    return {
                      ...prev,
                      isEditPointsMode: turningOn,
                      customPoints: pts || prev.customPoints
                    };
                  });
                }}
                title="Aktifkan Edit Titik (Pointer) untuk mengubah simpul bentuk secara bebas"
                style={{
                  fontSize: '0.75rem',
                  gap: '4px',
                  padding: '5px 10px',
                  backgroundColor: maskConfig.isEditPointsMode ? 'var(--accent-alpha)' : undefined,
                  color: maskConfig.isEditPointsMode ? 'var(--accent-color)' : undefined,
                  fontWeight: 600
                }}
              >
                <PenTool size={14} />
                <span>Edit Titik: {maskConfig.isEditPointsMode ? 'ON' : 'OFF'}</span>
              </button>

              {maskConfig.isEditPointsMode && (
                <button
                  className="btn btn-icon"
                  onClick={() => {
                    setMaskConfig(prev => ({
                      ...prev,
                      curveType: prev.curveType === 'smooth' ? 'linear' : 'smooth'
                    }));
                  }}
                  title="Ganti antara Poligon Garis Lurus atau Kurva Lentur Halus"
                  style={{ fontSize: '0.75rem', gap: '4px', padding: '5px 10px' }}
                >
                  <Spline size={14} />
                  <span>{maskConfig.curveType === 'smooth' ? 'Kurva Halus' : 'Garis Lurus'}</span>
                </button>
              )}
            </div>
          )}
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
          {isMaskMode && maskConfig && baseCanvasSize.width > 0 && (maskConfig.maskType !== 'text' || (maskConfig.text && maskConfig.text.trim().length > 0)) && (
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
                  {maskConfig.maskType === 'shape' ? renderSvgShape() : (
                    textPreviewUrl && (
                      <image
                        href={textPreviewUrl}
                        x={-maskConfig.width / 2}
                        y={-maskConfig.height / 2}
                        width={maskConfig.width}
                        height={maskConfig.height}
                      />
                    )
                  )}
                </g>

                {/* Mode Edit Titik (Vector Vertex Handles & Midpoint Add Buttons) */}
                {maskConfig.maskType === 'shape' && maskConfig.isEditPointsMode && maskConfig.customPoints && maskConfig.customPoints.length >= 3 ? (
                  <>
                    {/* Midpoint '+' Handles to Add New Points */}
                    {maskConfig.customPoints.map((pt, i) => {
                      const nextPt = maskConfig.customPoints[(i + 1) % maskConfig.customPoints.length];
                      const mx = (pt.x + nextPt.x) / 2;
                      const my = (pt.y + nextPt.y) / 2;
                      return (
                        <g
                          key={`mid_${i}`}
                          onMouseDown={(e) => handleInsertPoint(e, i, mx, my)}
                          style={{ cursor: 'copy' }}
                        >
                          <title>Klik untuk menyisipkan titik baru</title>
                          <circle
                            cx={mx}
                            cy={my}
                            r="6"
                            fill="#ffffff"
                            stroke={themeColor}
                            strokeWidth="1.5"
                          />
                          <line x1={mx - 3} y1={my} x2={mx + 3} y2={my} stroke={themeColor} strokeWidth="1.5" strokeLinecap="round" />
                          <line x1={mx} y1={my - 3} x2={mx} y2={my + 3} stroke={themeColor} strokeWidth="1.5" strokeLinecap="round" />
                        </g>
                      );
                    })}

                    {/* Bézier Tangent Lines and Dual Control Handles (In & Out Handles) */}
                    {maskConfig.customPoints.map((pt, i) => {
                      const isSelected = maskConfig.selectedPointIndex === i;
                      const hasCpIn = pt.cpIn && (pt.cpIn.x !== pt.x || pt.cpIn.y !== pt.y);
                      const hasCpOut = pt.cpOut && (pt.cpOut.x !== pt.x || pt.cpOut.y !== pt.y);

                      return (
                        <g key={`tangents_${i}`}>
                          {/* Tangent Line to In-Handle */}
                          <line
                            x1={pt.x}
                            y1={pt.y}
                            x2={pt.cpIn ? pt.cpIn.x : pt.x}
                            y2={pt.cpIn ? pt.cpIn.y : pt.y}
                            stroke="#38bdf8"
                            strokeWidth={isSelected ? 1.8 : 1.2}
                            strokeDasharray="4 2"
                            opacity={isSelected ? 0.95 : 0.65}
                          />

                          {/* Tangent Line to Out-Handle */}
                          <line
                            x1={pt.x}
                            y1={pt.y}
                            x2={pt.cpOut ? pt.cpOut.x : pt.x}
                            y2={pt.cpOut ? pt.cpOut.y : pt.y}
                            stroke="#f472b6"
                            strokeWidth={isSelected ? 1.8 : 1.2}
                            strokeDasharray="4 2"
                            opacity={isSelected ? 0.95 : 0.65}
                          />

                          {/* In-Handle Control Knob (Cyan) */}
                          <circle
                            cx={pt.cpIn ? pt.cpIn.x : pt.x}
                            cy={pt.cpIn ? pt.cpIn.y : pt.y}
                            r={isSelected ? 6 : 4.5}
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            onMouseDown={(e) => handleControlDragStart(e, i, 'in')}
                            style={{ cursor: 'crosshair' }}
                          >
                            <title>{`Kendali Masuk (In-Handle) Titik #${i + 1}`}</title>
                          </circle>

                          {/* Out-Handle Control Knob (Pink) */}
                          <circle
                            cx={pt.cpOut ? pt.cpOut.x : pt.x}
                            cy={pt.cpOut ? pt.cpOut.y : pt.y}
                            r={isSelected ? 6 : 4.5}
                            fill="#f472b6"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            onMouseDown={(e) => handleControlDragStart(e, i, 'out')}
                            style={{ cursor: 'crosshair' }}
                          >
                            <title>{`Kendali Keluar (Out-Handle) Titik #${i + 1}`}</title>
                          </circle>
                        </g>
                      );
                    })}

                    {/* Interactive Main Vertex Nodes (Points) */}
                    {maskConfig.customPoints.map((pt, i) => {
                      const isSelected = maskConfig.selectedPointIndex === i;
                      return (
                        <g
                          key={`pt_${i}`}
                          onMouseDown={(e) => handlePointDragStart(e, i)}
                          onContextMenu={(e) => handleDeletePoint(e, i)}
                          onDoubleClick={(e) => handleDeletePoint(e, i)}
                          style={{ cursor: 'grab' }}
                        >
                          <title>{`Titik Utama #${i + 1} (Drag untuk geser titik & kendali, Klik kanan / Double-click untuk hapus)`}</title>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? 9 : 7}
                            fill={isSelected ? '#f1e05a' : '#ffffff'}
                            stroke={themeColor}
                            strokeWidth={isSelected ? 3 : 2.5}
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="2.5"
                            fill={isSelected ? '#000000' : themeColor}
                          />
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <>
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
                  </>
                )}

                {/* Center Move Anchor (Always Accessible) */}
                <circle
                  cx={0}
                  cy={0}
                  r="6.5"
                  fill="#ffffff"
                  stroke={themeColor}
                  strokeWidth="2.5"
                  onMouseDown={(e) => handleTransformStart(e, 'move')}
                  style={{ cursor: 'move' }}
                >
                  <title>Pusat Bentuk (Drag untuk menggeser posisi)</title>
                </circle>

                {/* Rotation Handle Line & Knob (Always Accessible) */}
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
                >
                  <title>Handle Rotasi (Drag untuk memutar bentuk)</title>
                </circle>
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
