# ☕ Kopi Senja — Sistem Kasir & Akuntansi

### Sistem Informasi Penjualan Kedai Kopi

**Aplikasi kasir berbasis web untuk mengelola menu, promo, transaksi penjualan, dan laporan kedai kopi.**

## Identitas

- **Nama:** Nanda Afifah
- **NIM:** 12030124140259
- **Program Studi:** Akuntansi, FEB UNDIP

<p align="center">
  <a href="#-fitur-utama">
    <img src="https://img.shields.io/badge/☕_JELAJAHI_FITUR-Kopi_Senja-6F4E37?style=for-the-badge&labelColor=2C211B" alt="Jelajahi Fitur Kopi Senja">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=323330" alt="JavaScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

---

### ☕ *"Setiap transaksi, tercatat dengan lebih berarti."*

---

## 📖 Tentang Proyek

**Kopi Senja** merupakan aplikasi sistem informasi kasir yang dirancang untuk mendukung proses operasional kedai kopi melalui pengelolaan transaksi penjualan berbasis web.

Sistem ini menghubungkan antarmuka kasir dengan backend dan basis data sehingga pencatatan transaksi dapat dilakukan secara terstruktur. Aplikasi juga dilengkapi dengan fitur struk digital yang dapat ditampilkan kembali, dicetak, atau disimpan sebagai PDF melalui dialog cetak browser.

Proyek ini dikembangkan sebagai implementasi sistem informasi berbasis web dengan mengintegrasikan antarmuka pengguna, pemrosesan transaksi, dan pengelolaan data menggunakan teknologi web serta basis data relasional.

## ✨ Fitur Utama

### 📊 Dashboard dan Operasional Kasir

Antarmuka aplikasi untuk mendukung aktivitas operasional kedai kopi dan akses ke fungsi-fungsi kasir yang tersedia.

### 🛍️ Transaksi Penjualan

Kasir memilih satu atau lebih menu, mengatur jumlah, memilih promo opsional dan metode pembayaran, lalu menyimpan transaksi beserta detailnya secara atomik. Diskon dihitung dan divalidasi kembali oleh database.

### ☕ Pengelolaan Menu dan Promo

Kelola menu berdasarkan atribut kategori, termasuk harga dan status aktif/nonaktif. Promo mendukung potongan persentase atau nominal, periode berlaku, serta status aktif. Menu dan promo yang sudah digunakan transaksi tidak dapat dihapus jika penghapusan akan merusak riwayat.

### 🧾 Struk Digital

* Menampilkan struk setelah transaksi berhasil disimpan.
* Mencetak struk melalui browser.
* Menyimpan struk sebagai PDF menggunakan fitur *Save as PDF* pada dialog cetak.
* Membuka kembali struk dari riwayat transaksi, jika tersedia pada antarmuka aplikasi.

### 🗃️ Integrasi Backend dan Database

Backend Node.js menjadi penghubung antara frontend dan layanan basis data Supabase untuk mendukung pemrosesan serta penyimpanan data aplikasi.

### 🕘 Riwayat Transaksi

Mendukung peninjauan kembali transaksi yang telah tersimpan melalui fitur riwayat yang tersedia pada aplikasi.

### 📈 Laporan Penjualan

Laporan menyajikan omzet, jumlah transaksi dan item, ringkasan metode pembayaran, ringkasan harian, rincian penjualan, dan produk terlaris pada rentang tanggal yang dipilih. Data laporan dihitung dari transaksi tersimpan dan dapat dicetak atau diunduh sebagai CSV. Laporan adalah keluaran pengolahan data, bukan entitas ERD atau tabel baru.

---

## 🎨 Tema & Desain

Identitas visual Kopi Senja mengusung nuansa kedai kopi yang hangat, minimalis, dan profesional.

| Warna            | Kode      | Penggunaan                      |
| ---------------- | --------- | ------------------------------- |
| ☕ Coffee Brown   | `#6F4E37` | Aksen dan identitas merek       |
| 🌑 Dark Espresso | `#2C211B` | Elemen gelap dan kontras        |
| 🤍 Cream         | `#FAF7F2` | Latar belakang bernuansa hangat |
| 🌿 Sage Green    | `#8A9A7B` | Aksen pendukung                 |

*Kode warna di atas merupakan referensi palet desain dan dapat disesuaikan dengan implementasi aktual pada stylesheet.*

---

## 🛠️ Teknologi

| Layer           | Teknologi                   | Fungsi                                 |
| --------------- | --------------------------- | -------------------------------------- |
| Frontend        | HTML5                       | Struktur halaman aplikasi              |
| Styling         | CSS3                        | Tata letak, visual, dan tampilan struk |
| Client-side     | JavaScript                  | Interaksi pengguna dan komunikasi API  |
| Backend         | Node.js                     | Pemrosesan permintaan aplikasi         |
| Database        | PostgreSQL melalui Supabase | Penyimpanan data aplikasi              |
| Version Control | Git & GitHub                | Pengelolaan versi kode                 |

---

## 🗂️ Struktur Proyek

```text
kopi_senja_web_app/
│
├── frontend/
│   ├── index.html       # Halaman utama aplikasi
│   ├── style.css        # Styling antarmuka, struk, dan laporan
│   ├── app.js           # Logika frontend dan interaksi API
│
├── backend/
│   └── app.js           # Backend dan endpoint API
│
├── database/
│   └── schema.sql       # Skema database dan entitas ERD
│
└── README.md            # Dokumentasi proyek
```

## 🧩 Entitas pada ERD

ERD dan skema database terdiri dari empat entitas utama:

- **MENU** (`menu`) — menyimpan kategori sebagai atribut, nama, harga, kode, dan status ketersediaan.
- **PROMO** (`promo`) — menyimpan jenis/nilai potongan, periode, dan status.
- **PENJUALAN** (`penjualan`) — menyimpan nomor, tanggal, nilai sebelum diskon, diskon aktual, promo yang digunakan, total akhir, dan metode pembayaran.
- **DETAIL_PENJUALAN** (`detail_penjualan`) — menyimpan menu, jumlah, harga saat transaksi, dan subtotal.

Relasi: `PROMO` 1:N `PENJUALAN` (promo opsional), `MENU` 1:N `DETAIL_PENJUALAN`, dan `PENJUALAN` 1:N `DETAIL_PENJUALAN`. Nama promo dan diskon aktual disimpan sebagai snapshot transaksi agar perubahan konfigurasi promo tidak mengubah nilai transaksi historis.

Kategori bukan entitas terpisah. **Laporan tidak termasuk entitas dalam ERD tersebut**, karena laporan merupakan fitur atau keluaran (*output*) sistem yang dihasilkan dari pengolahan data keempat entitas tersebut, bukan objek data utama yang perlu disimpan dalam tabel tersendiri.

---

## 🔄 Alur Sistem

1. **Pengguna mengakses aplikasi** melalui antarmuka frontend.
2. **Transaksi diproses** melalui logika aplikasi dan dikirim ke backend.
3. **Backend berkomunikasi dengan Supabase** untuk mendukung penyimpanan data transaksi.
4. **Hasil transaksi ditampilkan** setelah aplikasi menerima respons yang sesuai dari backend.
5. **Struk dapat dicetak atau disimpan sebagai PDF** melalui fungsi cetak browser.

---

## 🚀 Cara Menjalankan Aplikasi

### Prasyarat

* [Node.js](https://nodejs.org/) terpasang pada komputer.
* [Visual Studio Code](https://code.visualstudio.com/) atau editor kode sejenis.
* Project Supabase yang telah dikonfigurasi.
* Konfigurasi koneksi database dan API yang sesuai.

### 1. Buka Folder Proyek

Buka folder `kopi_senja_web_app` melalui Visual Studio Code.

### 2. Jalankan Backend

Buka terminal PowerShell pada folder utama proyek, atur URL project dan service-role key Supabase (jangan letakkan key di frontend), lalu jalankan backend:

```powershell
$env:SUPABASE_URL="https://PROJECT_ID.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"
node backend/app.js
```

Jalankan `database/schema.sql` satu kali melalui Supabase SQL Editor, baik untuk project baru maupun database lama. Pada database lama, buat backup terlebih dahulu. Skrip memetakan tabel legacy `products`, `sales`, dan `sale_items`, memindahkan nama kategori lama ke atribut `menu.kategori`, mempertahankan transaksi dan detail historis, menambahkan tabel promo, serta menghapus referensi pelanggan dan tabel kategori lama. Skrip menolak migrasi bila subtotal historis tidak cocok dengan jumlah dikali harga satuan.

Restart server setiap kali konfigurasi environment berubah.

Backend secara default mendengarkan port `3001`; frontend memakai `http://127.0.0.1:3001/api`. Jadi `http://127.0.0.1:30001/` bukan alamat backend pada konfigurasi default (port-nya berbeda satu digit). URL berikut melayani pemeriksaan kesehatan yang sama:

```text
http://127.0.0.1:3001/
http://127.0.0.1:3001/health
http://127.0.0.1:3001/api/health
```

Endpoint aplikasi lainnya berada di bawah `/api`, misalnya `/api/menu`, `/api/promos`, dan `/api/sales`. Jika port backend diubah dengan environment variable `PORT`, sesuaikan juga `API_BASE` di bagian awal `frontend/app.js` agar portnya sama. Backend Node.js menjadi perantara ke Supabase; frontend tidak mengakses Supabase langsung.

### 3. Jalankan Frontend

Buka folder `frontend`, kemudian jalankan `index.html` menggunakan ekstensi **Live Server** pada Visual Studio Code.

Pastikan frontend menggunakan alamat API backend yang sesuai.

### 4. Uji Transaksi

Lakukan transaksi percobaan dan periksa apakah data berhasil diproses, struk ditampilkan, serta fungsi cetak berjalan sesuai harapan.

---

## 🗄️ Basis Data dan Konfigurasi

Aplikasi menggunakan Supabase sebagai layanan basis data berbasis PostgreSQL. Backend bertugas menangani komunikasi antara frontend dan layanan database.

Sebelum digunakan, pastikan konfigurasi berikut sesuai dengan project:

* URL project Supabase.
* Kunci akses yang sesuai dengan kebutuhan backend.
* Endpoint API dan port server.
* Skema empat tabel pada `database/schema.sql`.

**Keamanan:** jangan menambahkan password database, secret key, atau kredensial privat ke README maupun repository publik. Simpan kredensial sensitif pada konfigurasi backend yang tidak diunggah ke GitHub.

---

## 🌐 Deployment

Frontend statis dapat dipublikasikan ke layanan hosting statis. Repository ini tidak menyertakan workflow GitHub Actions.

Perlu diperhatikan bahwa **GitHub Pages hanya menyediakan hosting untuk frontend statis**. Backend Node.js harus dijalankan pada server atau layanan hosting backend yang sesuai agar fitur transaksi dapat digunakan dari internet.

Setelah deployment selesai, pastikan URL API pada frontend mengarah ke backend online dan bukan ke alamat lokal `localhost`.

---

## 🎯 Tujuan Pengembangan

Pengembangan Kopi Senja berfokus pada penerapan sistem informasi berbasis web untuk mendukung pencatatan transaksi yang terstruktur, integrasi frontend dan backend, pemanfaatan basis data relasional, serta penyediaan dokumentasi transaksi melalui struk digital.

Proyek ini juga menjadi sarana penerapan konsep pengembangan aplikasi, pengelolaan data, dan integrasi layanan dalam satu sistem operasional.

---

<p align="center">
  <strong>☕ Kopi Senja</strong><br>
  <em>Tempat setiap transaksi memiliki cerita.</em>
</p>
