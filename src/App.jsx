import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import CanvasArea from './components/CanvasArea';
import SidebarControls from './components/SidebarControls';
import { 
  removeByColorKey, 
  removeByMagicWand, 
  defringeEdges,
  applyBrush, 
  sampleColorFromCanvas,
  applyShapeTextOperation
} from './utils/imageProcessor';
import { removeBackground } from '@imgly/background-removal';

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [originalImgObj, setOriginalImgObj] = useState(null);
  
  const workingCanvasRef = useRef(null);
  const originalImageDataRef = useRef(null);
  const isBrushingRef = useRef(false);

  // History Stack untuk Undo & Redo
  const historyStackRef = useRef([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // States Alat & Pengaturan
  const [toolMode, setToolMode] = useState('chroma'); // 'chroma' | 'wand' | 'brush' | 'shape_mask' | 'ai'
  const [targetColor, setTargetColor] = useState({ r: 0, g: 255, b: 0, hex: '#00ff00' });
  const [tolerance, setTolerance] = useState(25);
  const [feather, setFeather] = useState(10);

  const [brushSize, setBrushSize] = useState(30);
  const [brushHardness, setBrushHardness] = useState(80);
  const [brushMode, setBrushMode] = useState('erase'); // 'erase' | 'restore'

  // State untuk Fitur Intersection & Subtract (Bentuk & Teks)
  const [maskConfig, setMaskConfig] = useState({
    operation: 'intersect', // 'intersect' | 'subtract'
    maskType: 'shape',      // 'shape' | 'text'
    shapeType: 'circle',    // 'rect' | 'rounded_rect' | 'circle' | 'star' | 'heart' | 'triangle' | 'hexagon' | 'diamond'
    text: 'STUDIO',
    fontFamily: 'Impact, sans-serif',
    fontSize: 60,
    fontWeight: '900',
    fontStyle: 'normal',
    wrapText: true,
    textAlign: 'center',
    lineHeight: 1.2,
    x: 250,
    y: 250,
    width: 350,
    height: 250,
    rotation: 0,
    feather: 0,
    cornerRadius: 30,
    keepAspect: false
  });

  const [bgColorType, setBgColorType] = useState('transparent'); // 'transparent' | 'color' | 'image'
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [customBgImage, setCustomBgImage] = useState(null);

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [webpQuality, setWebpQuality] = useState(85);

  // Fungsi menyimpan snapshot histori baru
  const pushHistoryState = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Copy ImageData
    const copy = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Hapus histori "redo" jika membuat aksi baru dari posisi tengah
    const currentStack = historyStackRef.current.slice(0, historyIndex + 1);
    
    // Batasi maksimum 25 langkah histori agar hemat RAM
    if (currentStack.length >= 25) {
      currentStack.shift();
    }
    
    currentStack.push(copy);
    historyStackRef.current = currentStack;
    setHistoryIndex(currentStack.length - 1);
  }, [historyIndex]);

  // Undo (Kembali ke langkah sebelumnya)
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || !workingCanvasRef.current) return;
    const newIndex = historyIndex - 1;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const snapshot = historyStackRef.current[newIndex];
    ctx.putImageData(snapshot, 0, 0);
    setHistoryIndex(newIndex);
  }, [historyIndex]);

  // Redo (Maju ke langkah berikutnya)
  const handleRedo = useCallback(() => {
    if (historyIndex >= historyStackRef.current.length - 1 || !workingCanvasRef.current) return;
    const newIndex = historyIndex + 1;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const snapshot = historyStackRef.current[newIndex];
    ctx.putImageData(snapshot, 0, 0);
    setHistoryIndex(newIndex);
  }, [historyIndex]);

  // Keyboard Shortcuts (Ctrl+Z & Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Inisialisasi Kanvas saat foto baru diunggah
  const handleImageSelected = (src) => {
    setImageSrc(src);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImgObj(img);
      historyStackRef.current = [];
      setHistoryIndex(-1);
    };
    img.src = src;
  };

  // Callback saat Canvas selesai dimount di DOM
  const handleCanvasInit = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const initData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    originalImageDataRef.current = initData;

    const defaultWidth = Math.round(Math.min(canvas.width, canvas.height) * 0.6);
    const defaultHeight = Math.round(Math.min(canvas.width, canvas.height) * 0.45);
    setMaskConfig(prev => ({
      ...prev,
      x: Math.round(canvas.width / 2),
      y: Math.round(canvas.height / 2),
      width: defaultWidth,
      height: defaultHeight,
      fontSize: Math.max(24, Math.round(defaultWidth * 0.16)),
      wrapText: true,
      textAlign: 'center',
      keepAspect: false
    }));

    historyStackRef.current = [];
    pushHistoryState(canvas);
  }, [pushHistoryState]);

  // Reset total ke foto awal
  const handleReset = () => {
    if (!originalImgObj || !workingCanvasRef.current || !originalImageDataRef.current) return;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(
      new Uint8ClampedArray(originalImageDataRef.current.data),
      originalImageDataRef.current.width,
      originalImageDataRef.current.height
    ), 0, 0);

    pushHistoryState(canvas);
  };

  // Click handler pada Canvas
  const handleCanvasClick = (e) => {
    const canvas = workingCanvasRef.current;
    if (!canvas || toolMode === 'shape_mask' || toolMode === 'shape' || toolMode === 'text') return;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');

    if (toolMode === 'chroma') {
      const sampled = sampleColorFromCanvas(ctx, x, y);
      setTargetColor(sampled);
      
      const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const updated = removeByColorKey(currentData, sampled, tolerance, feather, true);
      ctx.putImageData(updated, 0, 0);

      pushHistoryState(canvas);
    } else if (toolMode === 'wand') {
      const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const updated = removeByMagicWand(currentData, x, y, tolerance, true);
      ctx.putImageData(updated, 0, 0);

      pushHistoryState(canvas);
    }
  };

  const handleApplyChromaKey = () => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updated = removeByColorKey(currentData, targetColor, tolerance, feather, true);
    ctx.putImageData(updated, 0, 0);

    pushHistoryState(canvas);
  };

  const handleDefringe = () => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updated = defringeEdges(currentData, 1);
    ctx.putImageData(updated, 0, 0);

    pushHistoryState(canvas);
  };

  // Handler Terapkan Masking Bentuk / Teks (Intersection / Subtract)
  const handleApplyMask = () => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    applyShapeTextOperation(canvas, maskConfig);
    pushHistoryState(canvas);
  };

  const handleCenterMask = () => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    setMaskConfig(prev => ({
      ...prev,
      x: Math.round(canvas.width / 2),
      y: Math.round(canvas.height / 2)
    }));
  };

  // Brush Event Handlers
  const handleBrushStart = (e) => {
    if (toolMode !== 'brush') return;
    isBrushingRef.current = true;
    handleBrushMove(e);
  };

  const handleBrushMove = (e) => {
    if (toolMode !== 'brush' || !isBrushingRef.current) return;
    const canvas = workingCanvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updated = applyBrush(
      currentData, 
      originalImageDataRef.current, 
      x, 
      y, 
      brushSize * scaleX, 
      brushHardness, 
      brushMode
    );
    ctx.putImageData(updated, 0, 0);
  };

  const handleBrushEnd = () => {
    if (toolMode === 'brush' && isBrushingRef.current) {
      isBrushingRef.current = false;
      pushHistoryState(workingCanvasRef.current);
    }
  };

  // In-Browser AI Removal Handler
  const handleRunAIRemoval = async () => {
    if (!imageSrc || isProcessingAI) return;
    try {
      setIsProcessingAI(true);
      const blob = await removeBackground(imageSrc);
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = workingCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          pushHistoryState(canvas);
        }
        setIsProcessingAI(false);
      };
      img.src = url;
    } catch (err) {
      console.error('AI removal error:', err);
      alert('Gagal memproses AI. Silakan gunakan metode Chroma Key atau Magic Wand.');
      setIsProcessingAI(false);
    }
  };

  // Download Output Handler
  const exportImage = (format = 'png') => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');

    if (bgColorType === 'color') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(canvas, 0, 0);
    } else if (bgColorType === 'image' && customBgImage) {
      const bgImg = new Image();
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvas, 0, 0);
        triggerDownload(tempCanvas, format);
      };
      bgImg.src = customBgImage;
      return;
    } else {
      ctx.drawImage(canvas, 0, 0);
    }

    triggerDownload(tempCanvas, format);
  };

  const triggerDownload = (canvas, format) => {
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp'
    };
    const mime = mimeTypes[format] || 'image/png';
    const quality = format === 'webp' ? webpQuality / 100 : 0.95;

    const link = document.createElement('a');
    link.download = `naqi-studio-removed.${format}`;
    link.href = canvas.toDataURL(mime, quality);
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header 
        hasImage={!!imageSrc}
        onNewImage={() => {
          setImageSrc(null);
          setOriginalImgObj(null);
          historyStackRef.current = [];
          setHistoryIndex(-1);
        }}
        onReset={handleReset}
        onUndo={handleUndo}
        canUndo={historyIndex > 0}
        onRedo={handleRedo}
        canRedo={historyIndex < historyStackRef.current.length - 1}
        onExport={() => exportImage('png')}
      />

      <main className="app-body">
        {!imageSrc ? (
          <Dropzone onImageSelected={handleImageSelected} />
        ) : (
          <div className="editor-workspace">
            <CanvasArea 
              originalImage={originalImgObj}
              workingCanvasRef={workingCanvasRef}
              toolMode={toolMode}
              setToolMode={setToolMode}
              brushSize={brushSize}
              brushMode={brushMode}
              bgColorType={bgColorType}
              customBgColor={customBgColor}
              customBgImage={customBgImage}
              onCanvasClick={handleCanvasClick}
              onBrushStart={handleBrushStart}
              onBrushMove={handleBrushMove}
              onBrushEnd={handleBrushEnd}
              isComparing={isComparing}
              setIsComparing={setIsComparing}
              maskConfig={maskConfig}
              setMaskConfig={setMaskConfig}
              onCanvasInit={handleCanvasInit}
              historySnapshot={historyIndex >= 0 ? historyStackRef.current[historyIndex] : null}
            />

            <SidebarControls 
              toolMode={toolMode}
              setToolMode={setToolMode}
              targetColor={targetColor}
              setTargetColor={setTargetColor}
              tolerance={tolerance}
              setTolerance={setTolerance}
              feather={feather}
              setFeather={setFeather}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              brushHardness={brushHardness}
              setBrushHardness={setBrushHardness}
              brushMode={brushMode}
              setBrushMode={setBrushMode}
              bgColorType={bgColorType}
              setBgColorType={setBgColorType}
              customBgColor={customBgColor}
              setCustomBgColor={setCustomBgColor}
              setCustomBgImage={setCustomBgImage}
              onApplyChromaKey={handleApplyChromaKey}
              onRunAIRemoval={handleRunAIRemoval}
              onDefringe={handleDefringe}
              isProcessingAI={isProcessingAI}
              onExportPNG={() => exportImage('png')}
              onExportJPG={() => exportImage('jpg')}
              onExportWebP={() => exportImage('webp')}
              webpQuality={webpQuality}
              setWebpQuality={setWebpQuality}
              maskConfig={maskConfig}
              setMaskConfig={setMaskConfig}
              onApplyMask={handleApplyMask}
              onCenterMask={handleCenterMask}
            />
          </div>
        )}
      </main>
    </div>
  );
}
