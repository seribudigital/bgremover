import React from 'react';
import { Layers, Upload, RotateCcw, Download, Undo2, Redo2 } from 'lucide-react';

export default function Header({ 
  onNewImage, 
  onReset, 
  hasImage, 
  onExport,
  onUndo,
  canUndo,
  onRedo,
  canRedo
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo">
          <Layers size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-title">Naqi Studio</span>
            <span className="brand-badge">by GuruAnamf</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.1, marginTop: '2px' }}>
            Pembersih Latar Foto Cepat & Presisi
          </span>
        </div>
      </div>

      <div className="tool-group">
        {hasImage && (
          <>
            <button 
              className="btn btn-secondary" 
              onClick={onUndo} 
              disabled={!canUndo}
              title="Undo langkah terakhir (Ctrl + Z)"
              style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
            >
              <Undo2 size={16} />
              Undo
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={onRedo} 
              disabled={!canRedo}
              title="Redo langkah berikutnya (Ctrl + Y)"
              style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
            >
              <Redo2 size={16} />
              Redo
            </button>

            <button className="btn btn-secondary" onClick={onReset} title="Reset ke foto awal">
              <RotateCcw size={16} />
              Reset Total
            </button>

            <button className="btn btn-secondary" onClick={onNewImage}>
              <Upload size={16} />
              Foto Baru
            </button>

            <button className="btn btn-primary" onClick={onExport}>
              <Download size={16} />
              Download PNG
            </button>
          </>
        )}
      </div>
    </header>
  );
}
