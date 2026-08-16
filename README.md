# ✂️ BackCut Studio - In-Browser Background Remover WebApp

Aplikasi Web **Background Remover** modern, responsif, dan kaya fitur yang berjalan **100% di browser pengguna (Client-Side)** tanpa memerlukan server backend atau API Key berbayar. Foto pengguna 100% aman dan menjaga privasi penuh.

---

## 🌟 Fitur Utama

- 🎨 **Smart Color Key (Chroma Threshold)**: Menghapus warna latar tertentu dengan Eyedropper & slider toleransi warna + feathering.
- 🪄 **Magic Wand Tool (Flood Fill)**: Klik pada latar belakang foto untuk menghapus piksel terhubung dengan warna serupa.
- 🖌️ **Manual Precision Brush**: Kuas *Erase* (penghapus) dan *Restore* (pemulih) langsung pada kanvas HTML5 lengkap dengan pratinjau kursor lingkaran.
- ✂️ **Rapikan Tepi (Edge Defringing / De-spill)**: Menghilangkan sisa garis putih/hitam (*halo border*) di sekeliling objek secara presisi.
- ⚡ **AI Auto-Remove (In-Browser)**: Pemisahan otomatis 1-klik untuk foto subjek kompleks (manusia/hewan/produk) menggunakan model in-browser (`@imgly/background-removal`).
- 🖼️ **Ganti Latar Belakang**: Pilih latar belakang Transparan (*checkerboard*), Warna Solid (Color Picker), atau Unggah Gambar Latar Baru.
- 🔍 **Zoom & Scroll Navigasi 360°**: Dukungan `Ctrl + Scroll Wheel`, slider zoom hingga 500%, serta fitur *Drag-to-Pan (Middle Click Drag)* tanpa ada area yang terpotong.
- ↔️ **Before / After Split Comparison View**: Slider perbandingan foto asli vs foto editan secara real-time.
- ↩️ **Undo & Redo History System**: Menyimpan hingga 25 langkah histori editan lengkap dengan tombol pintas keyboard (`Ctrl + Z` dan `Ctrl + Y`).
- 📥 **Ekspor HD**: Download hasil dalam format **PNG Transparan HD** atau **JPG**.

---

## 🛠️ Stack Teknologi

- **Core**: React 19 + Vite 8
- **Styling**: Vanilla CSS (Dark Studio Design System)
- **Engine Pemrosesan Citra**: HTML5 Canvas API + Custom JS Image Processor Engine
- **Engine AI**: `@imgly/background-removal` (WebAssembly / WebGPU)
- **Icons**: Lucide React

---

## 🚀 Jalankan Secara Lokal

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/seribudigital/bgremover.git
   cd bgremover
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Dev Server**:
   ```bash
   npm run dev
   ```
   Akses di browser pada: `http://localhost:5173/`

4. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

## 🌐 Lisensi & Hak Cipta
Dibuat oleh [Seribu Digital](https://github.com/seribudigital). Lisensi MIT.
