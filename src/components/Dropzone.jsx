import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';

export default function Dropzone({ onImageSelected }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        onImageSelected(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        onImageSelected(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Demo Samples untuk pengujian instan
  const createDemoSample = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    if (type === 'green') {
      // Green screen background dengan objek lingkaran/bintang merah
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, 600, 600);

      // Objek utama (Mobil / Produk sintetis)
      ctx.fillStyle = '#E63946';
      ctx.beginPath();
      ctx.arc(300, 300, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F1FAEE';
      ctx.beginPath();
      ctx.arc(250, 250, 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'white') {
      // Background putih bersih dengan produk sepatu / cangkir
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 600);

      // Objek
      ctx.fillStyle = '#1D3557';
      ctx.beginPath();
      ctx.roundRect(180, 220, 240, 180, [20]);
      ctx.fill();

      ctx.fillStyle = '#457B9D';
      ctx.beginPath();
      ctx.arc(300, 310, 50, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Latar studio gradien
      const grad = ctx.createLinearGradient(0, 0, 600, 600);
      grad.addColorStop(0, '#434343');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 600);

      ctx.fillStyle = '#E9C46A';
      ctx.beginPath();
      ctx.arc(300, 300, 150, 0, Math.PI * 2);
      ctx.fill();
    }

    onImageSelected(canvas.toDataURL('image/png'));
  };

  return (
    <div className="dropzone-container">
      <div 
        className="dropzone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
        
        <div className="dropzone-icon">
          <UploadCloud size={32} />
        </div>
        
        <h2 className="dropzone-title">Unggah Foto atau Seret ke Sini</h2>
        <p className="dropzone-desc">
          Mendukung format PNG, JPG, dan WebP. Pemrosesan 100% aman & lokal di browser Anda.
        </p>

        <div style={{ marginTop: '16px', width: '100%' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '12px' }}>
            Atau coba sampel demo berikut:
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary"
              onClick={(e) => { e.stopPropagation(); createDemoSample('green'); }}
            >
              <Wand2 size={14} /> Sample Green Screen
            </button>
            <button 
              className="btn btn-secondary"
              onClick={(e) => { e.stopPropagation(); createDemoSample('white'); }}
            >
              <ImageIcon size={14} /> Sample Latar Putih
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
