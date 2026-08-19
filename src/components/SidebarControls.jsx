import React, { useRef } from 'react';
import { 
  Pipette, 
  Wand2, 
  Eraser, 
  Sparkles, 
  Image as ImageIcon, 
  Download,
  Scissors,
  Shapes,
  Type,
  Square,
  Circle,
  Star,
  Heart,
  Triangle,
  Hexagon,
  Diamond,
  Maximize,
  CheckCircle2,
  MinusCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  WrapText,
  PenTool,
  Spline,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { calculateAutoFitFontSize, generatePointsFromShape, computeSmoothTangents } from '../utils/imageProcessor';

export default function SidebarControls({
  toolMode,
  setToolMode,
  targetColor,
  setTargetColor,
  tolerance,
  setTolerance,
  feather,
  setFeather,
  brushSize,
  setBrushSize,
  brushHardness,
  setBrushHardness,
  brushMode,
  setBrushMode,
  bgColorType,
  setBgColorType,
  customBgColor,
  setCustomBgColor,
  setCustomBgImage,
  onApplyChromaKey,
  onRunAIRemoval,
  onDefringe,
  isProcessingAI,
  onExportPNG,
  onExportJPG,
  onExportWebP,
  webpQuality,
  setWebpQuality,
  maskConfig,
  setMaskConfig,
  onApplyMask,
  onCenterMask
}) {
  const bgFileInputRef = useRef(null);

  const presetColors = [
    '#ffffff', '#000000', '#2f81f7', '#3fb950', 
    '#f85149', '#a371f7', '#f1e05a', '#1f242c'
  ];

  const shapesList = [
    { id: 'rect', label: 'Persegi', icon: Square },
    { id: 'rounded_rect', label: 'Rounded', icon: Square },
    { id: 'circle', label: 'Lingkaran', icon: Circle },
    { id: 'star', label: 'Bintang', icon: Star },
    { id: 'heart', label: 'Hati', icon: Heart },
    { id: 'triangle', label: 'Segitiga', icon: Triangle },
    { id: 'hexagon', label: 'Segienam', icon: Hexagon },
    { id: 'diamond', label: 'Ketupat', icon: Diamond }
  ];

  const fontList = [
    { id: 'Impact, sans-serif', label: 'Impact (Tebal & Padat)' },
    { id: "'Plus Jakarta Sans', sans-serif", label: 'Jakarta Sans (Modern Clean)' },
    { id: "'Arial Black', sans-serif", label: 'Arial Black (Heavy)' },
    { id: 'Georgia, serif', label: 'Georgia (Serif Elegan)' },
    { id: "'Courier New', monospace", label: 'Courier (Monospace)' },
    { id: 'cursive', label: 'Cursive (Artistik)' }
  ];

  const handleBgImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCustomBgImage(evt.target.result);
        setBgColorType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const isShapeActive = toolMode === 'shape' || (toolMode === 'shape_mask' && maskConfig?.maskType === 'shape');
  const isTextActive = toolMode === 'text' || (toolMode === 'shape_mask' && maskConfig?.maskType === 'text');
  const isMaskMode = isShapeActive || isTextActive;

  return (
    <aside className="sidebar-panel">
      {/* Section 1: Mode Alat Penghapus */}
      <div className="sidebar-section">
        <div className="sidebar-title">
          <span>Mode Alat Penghapus</span>
        </div>

        <div className="tab-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button 
            className={`tab-btn ${toolMode === 'chroma' ? 'active' : ''}`}
            onClick={() => setToolMode('chroma')}
          >
            <Pipette size={18} />
            Chroma Key
          </button>

          <button 
            className={`tab-btn ${toolMode === 'wand' ? 'active' : ''}`}
            onClick={() => setToolMode('wand')}
          >
            <Wand2 size={18} />
            Magic Wand
          </button>

          <button 
            className={`tab-btn ${toolMode === 'brush' ? 'active' : ''}`}
            onClick={() => setToolMode('brush')}
          >
            <Eraser size={18} />
            Kuas Manual
          </button>

          <button 
            className={`tab-btn ${isShapeActive ? 'active' : ''}`}
            onClick={() => {
              setToolMode('shape');
              setMaskConfig(prev => ({ ...prev, maskType: 'shape' }));
            }}
          >
            <Shapes size={18} />
            Potong Bentuk
          </button>

          <button 
            className={`tab-btn ${isTextActive ? 'active' : ''}`}
            style={{ borderColor: isTextActive ? 'var(--accent-color)' : undefined }}
            onClick={() => {
              setToolMode('text');
              setMaskConfig(prev => ({ ...prev, maskType: 'text' }));
            }}
          >
            <Type size={18} />
            Potong Teks (Wrap)
          </button>

          <button 
            className={`tab-btn ${toolMode === 'ai' ? 'active' : ''}`}
            onClick={() => setToolMode('ai')}
          >
            <Sparkles size={18} />
            AI Auto
          </button>
        </div>

        {/* Dynamic Controls: Chroma Key */}
        {toolMode === 'chroma' && (
          <div>
            <div className="control-group">
              <label className="control-label">Warna Target Latar</label>
              <div className="color-picker-wrapper">
                <input 
                  type="color" 
                  className="color-input-native"
                  value={targetColor.hex}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    setTargetColor({ r, g, b, hex });
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {targetColor.hex.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Toleransi Warna (Tolerance)</span>
                <span className="control-val">{tolerance}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="80" 
                value={tolerance} 
                onChange={(e) => setTolerance(Number(e.target.value))} 
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Kehalusan Tepi (Feather)</span>
                <span className="control-val">{feather}px</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="30" 
                value={feather} 
                onChange={(e) => setFeather(Number(e.target.value))} 
              />
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
              onClick={onApplyChromaKey}
            >
              Hapus Warna Latar Ini
            </button>
          </div>
        )}

        {/* Dynamic Controls: Magic Wand */}
        {toolMode === 'wand' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              💡 <strong>Petunjuk:</strong> Klik langsung pada bagian latar belakang di foto untuk menghapus piksel warna sejenis secara terhubung.
            </p>
            <div className="control-group">
              <div className="control-label">
                <span>Toleransi Magic Wand</span>
                <span className="control-val">{tolerance}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="80" 
                value={tolerance} 
                onChange={(e) => setTolerance(Number(e.target.value))} 
              />
            </div>
          </div>
        )}

        {/* Dynamic Controls: Kuas Manual */}
        {toolMode === 'brush' && (
          <div>
            <div className="control-group">
              <label className="control-label">Tipe Kuas</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                  className={`btn btn-secondary ${brushMode === 'erase' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setBrushMode('erase')}
                >
                  Penghapus (Erase)
                </button>
                <button 
                  className={`btn btn-secondary ${brushMode === 'restore' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setBrushMode('restore')}
                >
                  Pemulih (Restore)
                </button>
              </div>
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Ukuran Kuas (Size)</span>
                <span className="control-val">{brushSize}px</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="120" 
                value={brushSize} 
                onChange={(e) => setBrushSize(Number(e.target.value))} 
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Kekerasan Kuas (Hardness)</span>
                <span className="control-val">{brushHardness}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brushHardness} 
                onChange={(e) => setBrushHardness(Number(e.target.value))} 
              />
            </div>
          </div>
        )}

        {/* Dynamic Controls: Shape & Text Masking (Intersection & Subtract) */}
        {isMaskMode && maskConfig && (
          <div>
            {/* Tipe Operasi: Intersection vs Subtract */}
            <div className="control-group">
              <label className="control-label">Jenis Operasi Masking</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  className={`btn btn-secondary ${maskConfig.operation === 'intersect' ? 'active' : ''}`}
                  style={{
                    fontSize: '0.75rem',
                    flexDirection: 'column',
                    padding: '8px 4px',
                    borderColor: maskConfig.operation === 'intersect' ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: maskConfig.operation === 'intersect' ? 'var(--accent-alpha)' : 'var(--bg-tertiary)'
                  }}
                  onClick={() => setMaskConfig(prev => ({ ...prev, operation: 'intersect' }))}
                >
                  <CheckCircle2 size={16} style={{ color: '#2f81f7', marginBottom: '2px' }} />
                  <strong>Intersection</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Crop Bagian Dalam</span>
                </button>

                <button
                  className={`btn btn-secondary ${maskConfig.operation === 'subtract' ? 'active' : ''}`}
                  style={{
                    fontSize: '0.75rem',
                    flexDirection: 'column',
                    padding: '8px 4px',
                    borderColor: maskConfig.operation === 'subtract' ? 'var(--danger-color)' : 'var(--border-color)',
                    backgroundColor: maskConfig.operation === 'subtract' ? 'rgba(248, 81, 73, 0.15)' : 'var(--bg-tertiary)'
                  }}
                  onClick={() => setMaskConfig(prev => ({ ...prev, operation: 'subtract' }))}
                >
                  <MinusCircle size={16} style={{ color: '#f85149', marginBottom: '2px' }} />
                  <strong>Subtract</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Lubangi Bagian Dalam</span>
                </button>
              </div>
            </div>

            {/* Sub-menu Bentuk (Shape Selector & Edit Pointer Mode) */}
            {isShapeActive && (
              <div>
                <div className="control-group">
                  <label className="control-label">Pilih Bentuk Dasar</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '4px' }}>
                    {shapesList.map(shape => {
                      const IconComponent = shape.icon;
                      const isSelected = maskConfig.shapeType === shape.id;
                      return (
                        <button
                          key={shape.id}
                          className={`btn-secondary ${isSelected ? 'active' : ''}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '8px 2px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'var(--accent-alpha)' : 'var(--bg-tertiary)',
                            color: isSelected ? 'var(--accent-color)' : 'var(--text-main)',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}
                          onClick={() => {
                            setMaskConfig(prev => ({
                              ...prev,
                              shapeType: shape.id,
                              customPoints: generatePointsFromShape(shape.id, prev.width, prev.height, prev.cornerRadius),
                              selectedPointIndex: -1
                            }));
                          }}
                        >
                          <IconComponent size={18} />
                          <span>{shape.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {maskConfig.shapeType === 'rounded_rect' && !maskConfig.isEditPointsMode && (
                  <div className="control-group">
                    <div className="control-label">
                      <span>Radius Sudut (Corner)</span>
                      <span className="control-val">{maskConfig.cornerRadius || 20}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      value={maskConfig.cornerRadius || 20}
                      onChange={(e) => setMaskConfig(prev => ({ ...prev, cornerRadius: Number(e.target.value) }))}
                    />
                  </div>
                )}

                {/* Panel Khusus: Mode Edit Titik (Pointer / Vertex Editor) */}
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: maskConfig.isEditPointsMode ? 'var(--accent-alpha)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: maskConfig.isEditPointsMode ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PenTool size={16} style={{ color: maskConfig.isEditPointsMode ? 'var(--accent-color)' : 'var(--text-muted)' }} />
                      <strong style={{ fontSize: '0.8rem', color: maskConfig.isEditPointsMode ? 'var(--accent-color)' : 'var(--text-main)' }}>
                        Mode Edit Titik (Pointer)
                      </strong>
                    </div>
                    <button
                      className={`btn ${maskConfig.isEditPointsMode ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.7rem', padding: '4px 10px', height: 'auto' }}
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
                    >
                      {maskConfig.isEditPointsMode ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>

                  {maskConfig.isEditPointsMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Pilihan Gaya Garis */}
                      <div className="control-group" style={{ marginBottom: 0 }}>
                        <label className="control-label" style={{ fontSize: '0.72rem' }}>Gaya Garis Bentuk</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px' }}>
                          <button
                            className={`btn btn-secondary ${maskConfig.curveType !== 'smooth' ? 'active' : ''}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '6px 4px',
                              gap: '4px',
                              borderColor: maskConfig.curveType !== 'smooth' ? 'var(--accent-color)' : undefined
                            }}
                            onClick={() => setMaskConfig(prev => ({ ...prev, curveType: 'linear' }))}
                          >
                            <strong>Poligon Lurus</strong>
                          </button>
                          <button
                            className={`btn btn-secondary ${maskConfig.curveType === 'smooth' ? 'active' : ''}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '6px 4px',
                              gap: '4px',
                              borderColor: maskConfig.curveType === 'smooth' ? 'var(--accent-color)' : undefined
                            }}
                            onClick={() => setMaskConfig(prev => ({ ...prev, curveType: 'smooth' }))}
                          >
                            <Spline size={13} />
                            <strong>Kurva Lentur</strong>
                          </button>
                        </div>
                      </div>

                      {/* Info & Aksi Titik Simpul */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>
                          Jumlah Titik: <strong>{maskConfig.customPoints ? maskConfig.customPoints.length : 0}</strong>
                        </span>
                        {maskConfig.selectedPointIndex >= 0 && (
                          <span style={{ color: '#f1e05a' }}>
                            Titik #{maskConfig.selectedPointIndex + 1} Terpilih
                          </span>
                        )}
                      </div>

                      {/* Kontrol Kendali Khusus untuk Titik Terpilih */}
                      {maskConfig.selectedPointIndex >= 0 && maskConfig.customPoints && maskConfig.customPoints[maskConfig.selectedPointIndex] && (
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#f1e05a', fontWeight: 600 }}>
                            ⚙️ Kendali Titik #{maskConfig.selectedPointIndex + 1}:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            <button
                              className={`btn btn-secondary ${maskConfig.customPoints[maskConfig.selectedPointIndex].handleMode === 'smooth' ? 'active' : ''}`}
                              style={{ fontSize: '0.68rem', padding: '4px 2px' }}
                              onClick={() => {
                                setMaskConfig(prev => {
                                  const pts = [...prev.customPoints];
                                  const idx = prev.selectedPointIndex;
                                  const p = pts[idx];
                                  const n = pts.length;
                                  const prevPt = pts[(idx - 1 + n) % n];
                                  const nextPt = pts[(idx + 1) % n];

                                  let cpIn = p.cpIn ? { ...p.cpIn } : { x: p.x, y: p.y };
                                  let cpOut = p.cpOut ? { ...p.cpOut } : { x: p.x, y: p.y };
                                  if (cpIn.x === p.x && cpIn.y === p.y && cpOut.x === p.x && cpOut.y === p.y) {
                                    const vx = (nextPt.x - prevPt.x) * 0.28;
                                    const vy = (nextPt.y - prevPt.y) * 0.28;
                                    cpIn = { x: Math.round((p.x - vx) * 10) / 10, y: Math.round((p.y - vy) * 10) / 10 };
                                    cpOut = { x: Math.round((p.x + vx) * 10) / 10, y: Math.round((p.y + vy) * 10) / 10 };
                                  } else {
                                    const vx = p.x - cpIn.x;
                                    const vy = p.y - cpIn.y;
                                    cpOut = { x: Math.round((p.x + vx) * 10) / 10, y: Math.round((p.y + vy) * 10) / 10 };
                                  }

                                  pts[idx] = {
                                    ...p,
                                    cpIn,
                                    cpOut,
                                    handleMode: 'smooth'
                                  };
                                  return { ...prev, customPoints: pts };
                                });
                              }}
                              title="Kedua kendali sejajar membentuk kelengkungan mulus (Smooth)"
                            >
                              Lentur (Mulus)
                            </button>
                            <button
                              className={`btn btn-secondary ${maskConfig.customPoints[maskConfig.selectedPointIndex].handleMode !== 'smooth' ? 'active' : ''}`}
                              style={{ fontSize: '0.68rem', padding: '4px 2px' }}
                              onClick={() => {
                                setMaskConfig(prev => {
                                  const pts = [...prev.customPoints];
                                  pts[prev.selectedPointIndex] = {
                                    ...pts[prev.selectedPointIndex],
                                    handleMode: 'corner'
                                  };
                                  return { ...prev, customPoints: pts };
                                });
                              }}
                              title="Kendali kiri & kanan bisa digerakkan bebas untuk sudut tajam atau lengkungan kustom (Sudut Bebas)"
                            >
                              Sudut Bebas (Default)
                            </button>
                          </div>

                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.68rem', padding: '3px 4px', width: '100%' }}
                            onClick={() => {
                              setMaskConfig(prev => {
                                const pts = [...prev.customPoints];
                                const p = pts[prev.selectedPointIndex];
                                pts[prev.selectedPointIndex] = {
                                  ...p,
                                  cpIn: { x: p.x, y: p.y },
                                  cpOut: { x: p.x, y: p.y },
                                  handleMode: 'corner'
                                };
                                return { ...prev, customPoints: pts };
                              });
                            }}
                            title="Tarik kedua kendali ke titik untuk sudut lurus/tajam"
                          >
                            Jadikan Sudut Tajam (Lurus)
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '6px 4px', gap: '4px' }}
                          onClick={() => {
                            setMaskConfig(prev => {
                              const pts = prev.customPoints && prev.customPoints.length >= 3
                                ? [...prev.customPoints]
                                : generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius);
                              const idx = prev.selectedPointIndex >= 0 ? prev.selectedPointIndex : 0;
                              const p0 = pts[idx];
                              const p1 = pts[(idx + 1) % pts.length];
                              const midX = Math.round(((p0.x + p1.x) / 2) * 10) / 10;
                              const midY = Math.round(((p0.y + p1.y) / 2) * 10) / 10;
                              const cpIn = {
                                x: Math.round((midX + (p0.x - midX) / 3) * 10) / 10,
                                y: Math.round((midY + (p0.y - midY) / 3) * 10) / 10
                              };
                              const cpOut = {
                                x: Math.round((midX + (p1.x - midX) / 3) * 10) / 10,
                                y: Math.round((midY + (p1.y - midY) / 3) * 10) / 10
                              };
                              const newPt = {
                                x: midX,
                                y: midY,
                                cpIn,
                                cpOut,
                                handleMode: 'corner'
                              };
                              pts.splice(idx + 1, 0, newPt);
                              return {
                                ...prev,
                                customPoints: pts,
                                selectedPointIndex: idx + 1
                              };
                            });
                          }}
                          title="Tambah titik baru di antara simpul"
                        >
                          <Plus size={13} /> Tambah Titik
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.7rem',
                            padding: '6px 4px',
                            gap: '4px',
                            color: maskConfig.selectedPointIndex >= 0 && maskConfig.customPoints && maskConfig.customPoints.length > 3 ? 'var(--danger-color)' : undefined
                          }}
                          disabled={maskConfig.selectedPointIndex < 0 || !maskConfig.customPoints || maskConfig.customPoints.length <= 3}
                          onClick={() => {
                            if (maskConfig.selectedPointIndex >= 0) {
                              setMaskConfig(prev => {
                                if (!prev.customPoints || prev.customPoints.length <= 3) return prev;
                                const nextPts = prev.customPoints.filter((_, i) => i !== prev.selectedPointIndex);
                                return {
                                  ...prev,
                                  customPoints: nextPts,
                                  selectedPointIndex: -1
                                };
                              });
                            }
                          }}
                          title={maskConfig.selectedPointIndex >= 0 ? 'Hapus titik terpilih' : 'Pilih titik di kanvas terlebih dahulu'}
                        >
                          <Trash2 size={13} /> Hapus Titik
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '5px 4px', gap: '4px' }}
                          onClick={() => {
                            setMaskConfig(prev => {
                              if (!prev.customPoints) return prev;
                              return {
                                ...prev,
                                customPoints: computeSmoothTangents(prev.customPoints)
                              };
                            });
                          }}
                          title="Lenturkan otomatis semua kendali kurva agar mulus mengalir"
                        >
                          <Spline size={12} /> Auto-Smooth Semua
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '5px 4px', gap: '4px' }}
                          onClick={() => {
                            setMaskConfig(prev => ({
                              ...prev,
                              customPoints: generatePointsFromShape(prev.shapeType, prev.width, prev.height, prev.cornerRadius),
                              selectedPointIndex: -1
                            }));
                          }}
                          title="Kembalikan titik simpul ke bentuk preset asli"
                        >
                          <RotateCcw size={12} /> Reset Bentuk
                        </button>
                      </div>

                      {/* Panduan Warna Kendali Bézier */}
                      <div style={{
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        lineHeight: 1.5,
                        color: 'var(--text-muted)'
                      }}>
                        <strong style={{ color: 'var(--text-main)' }}>🎨 Panduan Titik Kendali:</strong><br />
                        • <span style={{ color: '#38bdf8' }}>● <strong>Biru Muda:</strong></span> Kendali Masuk (*In-Handle*)<br />
                        • <span style={{ color: '#f472b6' }}>● <strong>Pink:</strong></span> Kendali Keluar (*Out-Handle*)<br />
                        • <span style={{ color: '#f1e05a' }}>● <strong>Kuning/Putih:</strong></span> Titik Sudut Utama<br />
                        • Klik ikon <strong>(+)</strong> pada garis untuk menambah titik baru.
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                      Aktifkan untuk menarik setiap sudut simpul dan membuat bentuk unik bebas!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sub-menu Teks (Text Mask Controls with Wrap Text) */}
            {isTextActive && (
              <div>
                <div className="control-group">
                  <label className="control-label">Input Teks / Kalimat / Paragraf</label>
                  <textarea
                    rows={3}
                    value={maskConfig.text}
                    onChange={(e) => setMaskConfig(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Ketik kata atau kalimat panjang di sini..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Fitur Wrap Text Toggle & Alignment */}
                <div className="control-group">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`btn btn-secondary ${maskConfig.wrapText !== false ? 'active' : ''}`}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.75rem', 
                        gap: '6px',
                        backgroundColor: maskConfig.wrapText !== false ? 'var(--accent-alpha)' : undefined,
                        borderColor: maskConfig.wrapText !== false ? 'var(--accent-color)' : undefined
                      }}
                      onClick={() => setMaskConfig(prev => ({ ...prev, wrapText: !(prev.wrapText !== false) }))}
                      title="Otomatis membungkus teks ke baris baru sesuai batas lebar kotak"
                    >
                      <WrapText size={14} />
                      Wrap Text: {maskConfig.wrapText !== false ? 'AKTIF' : 'OFF'}
                    </button>

                    {/* Text Alignment */}
                    <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                      <button
                        className={`btn-icon ${maskConfig.textAlign === 'left' ? 'active' : ''}`}
                        onClick={() => setMaskConfig(prev => ({ ...prev, textAlign: 'left' }))}
                        title="Rata Kiri"
                        style={{ padding: '6px' }}
                      >
                        <AlignLeft size={14} />
                      </button>
                      <button
                        className={`btn-icon ${(!maskConfig.textAlign || maskConfig.textAlign === 'center') ? 'active' : ''}`}
                        onClick={() => setMaskConfig(prev => ({ ...prev, textAlign: 'center' }))}
                        title="Rata Tengah"
                        style={{ padding: '6px' }}
                      >
                        <AlignCenter size={14} />
                      </button>
                      <button
                        className={`btn-icon ${maskConfig.textAlign === 'right' ? 'active' : ''}`}
                        onClick={() => setMaskConfig(prev => ({ ...prev, textAlign: 'right' }))}
                        title="Rata Kanan"
                        style={{ padding: '6px' }}
                      >
                        <AlignRight size={14} />
                      </button>
                      <button
                        className={`btn-icon ${maskConfig.textAlign === 'justify' ? 'active' : ''}`}
                        onClick={() => setMaskConfig(prev => ({ ...prev, textAlign: 'justify' }))}
                        title="Rata Kiri-Kanan (Justify)"
                        style={{ padding: '6px' }}
                      >
                        <AlignJustify size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Ukuran Huruf (Font Size)</span>
                    <span className="control-val">{maskConfig.fontSize || 60}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={maskConfig.fontSize || 60}
                    onChange={(e) => setMaskConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.75rem', marginTop: '4px', gap: '6px' }}
                    onClick={() => {
                      const autoSize = calculateAutoFitFontSize(
                        maskConfig.text,
                        maskConfig.width,
                        maskConfig.height,
                        {
                          fontFamily: maskConfig.fontFamily,
                          fontWeight: maskConfig.fontWeight,
                          fontStyle: maskConfig.fontStyle,
                          letterSpacing: maskConfig.letterSpacing,
                          wrapText: maskConfig.wrapText !== false,
                          lineHeight: maskConfig.lineHeight || 1.2
                        }
                      );
                      setMaskConfig(prev => ({ ...prev, fontSize: autoSize }));
                    }}
                    title="Otomatis hitung ukuran font agar teks pas memenuhi kotak tanpa keluar"
                  >
                    <Maximize size={14} /> Auto Fit — Sesuaikan Otomatis
                  </button>
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Jarak Antar Huruf (Letter Spacing)</span>
                    <span className="control-val">{maskConfig.letterSpacing || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="100"
                    value={maskConfig.letterSpacing || 0}
                    onChange={(e) => setMaskConfig(prev => ({ ...prev, letterSpacing: Number(e.target.value) }))}
                  />
                </div>

                <div className="control-group">
                  <div className="control-label">
                    <span>Spasi Baris (Line Height)</span>
                    <span className="control-val">{maskConfig.lineHeight || 1.2}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={maskConfig.lineHeight || 1.2}
                    onChange={(e) => setMaskConfig(prev => ({ ...prev, lineHeight: Number(e.target.value) }))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Pilihan Font</label>
                  <select
                    value={maskConfig.fontFamily}
                    onChange={(e) => setMaskConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {fontList.map(font => (
                      <option key={font.id} value={font.id} style={{ background: '#161b22', color: '#fff' }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    className={`btn btn-secondary ${maskConfig.fontWeight === '900' || maskConfig.fontWeight === 'bold' ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: '0.75rem', fontWeight: 800 }}
                    onClick={() => setMaskConfig(prev => ({
                      ...prev,
                      fontWeight: prev.fontWeight === 'normal' ? '900' : 'normal'
                    }))}
                  >
                    Tebal (Bold)
                  </button>
                  <button
                    className={`btn btn-secondary ${maskConfig.fontStyle === 'italic' ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: '0.75rem', fontStyle: 'italic' }}
                    onClick={() => setMaskConfig(prev => ({
                      ...prev,
                      fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic'
                    }))}
                  >
                    Miring (Italic)
                  </button>
                </div>
              </div>
            )}

            {/* Pengaturan Transformasi Ukuran Lebar, Tinggi, & Rotasi */}
            <div className="control-group">
              <div className="control-label">
                <span>Lebar Kotak ({isTextActive ? 'Batas Wrap Teks' : 'Lebar Bentuk'})</span>
                <span className="control-val">{maskConfig.width}px</span>
              </div>
              <input
                type="range"
                min="30"
                max="4000"
                value={maskConfig.width}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaskConfig(prev => {
                    const ratio = prev.height / (prev.width || 1);
                    const newW = val;
                    const newH = prev.keepAspect ? Math.max(30, Math.round(val * ratio)) : prev.height;
                    const scaleX = prev.width > 0 ? newW / prev.width : 1;
                    const scaleY = prev.height > 0 ? newH / prev.height : 1;
                    const updatedPoints = prev.customPoints ? prev.customPoints.map(p => ({
                      ...p,
                      x: Math.round(p.x * scaleX * 10) / 10,
                      y: Math.round(p.y * scaleY * 10) / 10,
                      cpIn: p.cpIn ? {
                        x: Math.round(p.cpIn.x * scaleX * 10) / 10,
                        y: Math.round(p.cpIn.y * scaleY * 10) / 10
                      } : undefined,
                      cpOut: p.cpOut ? {
                        x: Math.round(p.cpOut.x * scaleX * 10) / 10,
                        y: Math.round(p.cpOut.y * scaleY * 10) / 10
                      } : undefined
                    })) : null;

                    return {
                      ...prev,
                      width: newW,
                      height: newH,
                      ...(updatedPoints ? { customPoints: updatedPoints } : {})
                    };
                  });
                }}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Tinggi Kotak ({isTextActive ? 'Tinggi Area Teks' : 'Tinggi Bentuk'})</span>
                <span className="control-val">{maskConfig.height}px</span>
              </div>
              <input
                type="range"
                min="30"
                max="4000"
                value={maskConfig.height}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaskConfig(prev => {
                    const ratio = prev.width / (prev.height || 1);
                    const newH = val;
                    const newW = prev.keepAspect ? Math.max(30, Math.round(val * ratio)) : prev.width;
                    const scaleX = prev.width > 0 ? newW / prev.width : 1;
                    const scaleY = prev.height > 0 ? newH / prev.height : 1;
                    const updatedPoints = prev.customPoints ? prev.customPoints.map(p => ({
                      ...p,
                      x: Math.round(p.x * scaleX * 10) / 10,
                      y: Math.round(p.y * scaleY * 10) / 10,
                      cpIn: p.cpIn ? {
                        x: Math.round(p.cpIn.x * scaleX * 10) / 10,
                        y: Math.round(p.cpIn.y * scaleY * 10) / 10
                      } : undefined,
                      cpOut: p.cpOut ? {
                        x: Math.round(p.cpOut.x * scaleX * 10) / 10,
                        y: Math.round(p.cpOut.y * scaleY * 10) / 10
                      } : undefined
                    })) : null;

                    return {
                      ...prev,
                      height: newH,
                      width: newW,
                      ...(updatedPoints ? { customPoints: updatedPoints } : {})
                    };
                  });
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                {isTextActive 
                  ? 'Menentukan batas vertikal kotak penempatan teks' 
                  : 'Menentukan tinggi / peregangan vertikal bentuk (misal membuat oval tinggi)'}
              </span>
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Rotasi Sudut</span>
                <span className="control-val">{maskConfig.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={maskConfig.rotation || 0}
                onChange={(e) => setMaskConfig(prev => ({ ...prev, rotation: Number(e.target.value) }))}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Kehalusan Tepi (Feather)</span>
                <span className="control-val">{maskConfig.feather || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={maskConfig.feather || 0}
                onChange={(e) => setMaskConfig(prev => ({ ...prev, feather: Number(e.target.value) }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.75rem' }}
                onClick={onCenterMask}
                title="Pusatkan posisi mask ke tengah kanvas"
              >
                <Maximize size={14} /> Pusatkan
              </button>
              <button
                className={`btn btn-secondary ${maskConfig.keepAspect ? 'active' : ''}`}
                style={{ flex: 1, fontSize: '0.75rem' }}
                onClick={() => setMaskConfig(prev => ({ ...prev, keepAspect: !prev.keepAspect }))}
                title="Kunci rasio lebar dan tinggi agar seimbang saat diubah"
              >
                Kunci Rasio: {maskConfig.keepAspect ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Tombol Eksekusi Masking */}
            {(() => {
              const isTextEmpty = isTextActive && (!maskConfig.text || !maskConfig.text.trim());
              return (
                <button
                  className={`btn ${maskConfig.operation === 'intersect' ? 'btn-primary' : ''}`}
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    backgroundColor: isTextEmpty
                      ? undefined
                      : maskConfig.operation === 'subtract'
                        ? 'var(--danger-color)'
                        : undefined,
                    color: '#ffffff',
                    opacity: isTextEmpty ? 0.4 : 1,
                    cursor: isTextEmpty ? 'not-allowed' : 'pointer'
                  }}
                  onClick={onApplyMask}
                  disabled={isTextEmpty}
                  title={isTextEmpty ? 'Ketik teks terlebih dahulu untuk menerapkan mask' : undefined}
                >
                  <Scissors size={16} />
                  {maskConfig.operation === 'intersect' ? 'Terapkan Intersection (Crop)' : 'Terapkan Subtract (Lubangi)'}
                </button>
              );
            })()}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '8px', textAlign: 'center' }}>
              ✨ <em>Tips: Anda juga bisa menggeser, merotasi, dan mengubah ukuran bentuk/teks langsung di atas kanvas!</em>
            </p>
          </div>
        )}

        {/* Dynamic Controls: AI Removal */}
        {toolMode === 'ai' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Menggunakan model AI in-browser untuk pemisahan otomatis subjek foto kompleks secara presisi.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={onRunAIRemoval}
              disabled={isProcessingAI}
            >
              {isProcessingAI ? (
                <>
                  <div className="spinner" />
                  Memproses AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Jalankan AI Auto Removal
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Pembersih Tepi (Edge Refinement & Defringe) */}
      <div className="sidebar-section">
        <div className="sidebar-title">
          <span>Rapikan Tepi (Defringe)</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Hilangkan sisa garis putih/hitam (*halo border*) di pinggiran objek secara presisi.
        </p>
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%' }}
          onClick={onDefringe}
        >
          <Scissors size={15} /> Rapikan Tepi Objek
        </button>
      </div>

      {/* Section 3: Ganti Latar Belakang */}
      <div className="sidebar-section">
        <div className="sidebar-title">
          <span>Ganti Latar Belakang</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            className={`btn btn-secondary ${bgColorType === 'transparent' ? 'active' : ''}`}
            style={{ flex: 1, fontSize: '0.75rem' }}
            onClick={() => setBgColorType('transparent')}
          >
            Transparan
          </button>
          <button 
            className={`btn btn-secondary ${bgColorType === 'color' ? 'active' : ''}`}
            style={{ flex: 1, fontSize: '0.75rem' }}
            onClick={() => setBgColorType('color')}
          >
            Warna Solid
          </button>
          <button 
            className={`btn btn-secondary ${bgColorType === 'image' ? 'active' : ''}`}
            style={{ flex: 1, fontSize: '0.75rem' }}
            onClick={() => setBgColorType('image')}
          >
            Gambar Baru
          </button>
        </div>

        {bgColorType === 'color' && (
          <div>
            <div className="swatch-grid">
              {presetColors.map((color) => (
                <button 
                  key={color}
                  className={`swatch-btn ${customBgColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCustomBgColor(color)}
                />
              ))}
            </div>
            <div className="color-picker-wrapper">
              <input 
                type="color" 
                className="color-input-native"
                value={customBgColor}
                onChange={(e) => setCustomBgColor(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pilih Warna Kustom</span>
            </div>
          </div>
        )}

        {bgColorType === 'image' && (
          <div>
            <input 
              type="file" 
              ref={bgFileInputRef}
              onChange={handleBgImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => bgFileInputRef.current?.click()}
            >
              <ImageIcon size={16} /> Unggah Gambar Latar
            </button>
          </div>
        )}
      </div>

      {/* Section 4: Opsi Download */}
      <div className="sidebar-section" style={{ marginTop: 'auto' }}>
        <div className="sidebar-title">
          <span>Ekspor & Download</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" onClick={onExportPNG}>
            <Download size={16} />
            Download PNG (Transparan HD)
          </button>
          <button className="btn btn-secondary" onClick={onExportJPG}>
            Download JPG (Dengan Latar)
          </button>

          <div style={{
            padding: '12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginTop: '4px'
          }}>
            <div className="control-group" style={{ marginBottom: '12px' }}>
              <div className="control-label">
                <span>Kualitas WebP</span>
                <span className="control-val">{webpQuality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={webpQuality}
                onChange={(e) => setWebpQuality(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                Semakin rendah = file lebih kecil, kualitas turun
              </span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onExportWebP}>
              <Download size={16} />
              Download WebP (Ringan & Cepat)
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
