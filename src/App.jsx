import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Dropzone from './components/Dropzone';
import CanvasArea from './components/CanvasArea';
import SidebarControls from './components/SidebarControls';
import { 
  removeByColorKey, 
  removeByMagicWand, 
  defringeEdges,
  applyBrush, 
  sampleColorFromCanvas 
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
  const [toolMode, setToolMode] = useState('chroma'); // 'chroma' | 'wand' | 'brush' | 'ai'
  const [targetColor, setTargetColor] = useState({ r: 0, g: 255, b: 0, hex: '#00ff00' });
  const [tolerance, setTolerance] = useState(25);
  const [feather, setFeather] = useState(10);

  const [brushSize, setBrushSize] = useState(30);
  const [brushHardness, setBrushHardness] = useState(80);
  const [brushMode, setBrushMode] = useState('erase'); // 'erase' | 'restore'

  const [bgColorType, setBgColorType] = useState('transparent'); // 'transparent' | 'color' | 'image'
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [customBgImage, setCustomBgImage] = useState(null);

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [webpQuality, setWebpQuality] = useState(85);

  // Fungsi menyimpan snapshot histori baru
  const pushHistoryState = (canvas) => {
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
  };

  // Undo (Kembali ke langkah sebelumnya)
  const handleUndo = () => {
    if (historyIndex <= 0 || !workingCanvasRef.current) return;
    const newIndex = historyIndex - 1;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const snapshot = historyStackRef.current[newIndex];
    ctx.putImageData(snapshot, 0, 0);
    setHistoryIndex(newIndex);
  };

  // Redo (Maju ke langkah berikutnya)
  const handleRedo = () => {
    if (historyIndex >= historyStackRef.current.length - 1 || !workingCanvasRef.current) return;
    const newIndex = historyIndex + 1;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const snapshot = historyStackRef.current[newIndex];
    ctx.putImageData(snapshot, 0, 0);
    setHistoryIndex(newIndex);
  };

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
  }, [historyIndex]);

  // Inisialisasi Kanvas saat foto baru diunggah
  const handleImageSelected = (src) => {
    setImageSrc(src);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImgObj(img);

      const canvas = workingCanvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Simpan backup data piksel asli & reset stack histori
      const initData = ctx.getImageData(0, 0, img.width, img.height);
      originalImageDataRef.current = initData;

      historyStackRef.current = [];
      pushHistoryState(canvas);
    };
    img.src = src;
  };

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
    if (!canvas) return;
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
        onNewImage={() => setImageSrc(null)}
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
              customBgImage={customBgImage}
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
            />
          </div>
        )}
      </main>
    </div>
  );
}
