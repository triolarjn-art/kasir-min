# 🛒 KasirKu - Website Kasir Modern

Aplikasi Point of Sale (POS) modern & minimalis yang siap di-deploy ke GitHub Pages. Tanpa backend — semua data tersimpan di localStorage browser.

## ✨ Fitur

- **Kasir (POS)** — Pilih produk, atur qty, diskon, pembayaran tunai + kembalian
- **Manajemen Produk** — Tambah, edit, hapus produk
- **Riwayat Transaksi** — Semua transaksi tersimpan, bisa cetak ulang struk
- **Dashboard** — Statistik pendapatan, transaksi, produk, stok menipis
- **Cetak Struk** — Print-friendly receipt
- **Persisten** — Data tersimpan di browser (localStorage)
- **Responsive** — Mobile, tablet, desktop
- **Modern Minimalis** — Design clean dengan aksen indigo

## 🚀 Cara Deploy ke GitHub Pages

### 1. Buat Repository
1. Login ke [github.com](https://github.com)
2. Klik **New repository**
3. Nama: `kasirku` (atau terserah Anda)
4. Set **Public**
5. Klik **Create repository**

### 2. Upload File
**Cara A — via Web (tanpa Git):**
1. Klik **uploading an existing file**
2. Upload semua file: `index.html`, `style.css`, `app.js`, `README.md`
3. Klik **Commit changes**

**Cara B — via Git:**
```bash
git init
git add .
git commit -m "Initial commit: KasirKu POS"
git branch -M main
git remote add origin https://github.com/USERNAME/kasirku.git
git push -u origin main
