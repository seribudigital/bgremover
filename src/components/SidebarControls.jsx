import React, { useRef } from 'react';
import { 
  Pipette, 
  Wand2, 
  Eraser, 
  Sparkles, 
  Palette, 
  Image as ImageIcon, 
  Download,
  Scissors,
  Sparkle
} from 'lucide-react';

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
  customBgImage,
  setCustomBgImage,
  onApplyChromaKey,
  onRunAIRemoval,
  onDefringe,
  isProcessingAI,
  onExportPNG,
  onExportJPG,
  onExportWebP,
  webpQuality,
  setWebpQuality
}) {
  const bgFileInputRef = useRef(null);

  const presetColors = [
    '#ffffff', '#000000', '#2f81f7', '#3fb950', 
    '#f85149', '#a371f7', '#f1e05a', '#1f242c'
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

  return (
    <aside className="sidebar-panel">
      {/* Section 1: Mode Alat Penghapus */}
      <div className="sidebar-section">
        <div className="sidebar-title">
          <span>Mode Alat Penghapus</span>
        </div>

        <div className="tab-grid">
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
            className={`tab-btn ${toolMode === 'ai' ? 'active' : ''}`}
            onClick={() => setToolMode('ai')}
          >
            <Sparkles size={18} />
            AI Auto
          </button>
        </div>

        {/* Dynamic Controls based on toolMode */}
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
