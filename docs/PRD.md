# PRD: GC Net Local Station v2.0 (Financial & Smart Sync)

## 1. Ringkasan Produk
Aplikasi kasir warnet lokal yang berjalan sebagai **single-binary `.exe`**. Operator (Ibu/Adik) dapat mengelola booking PC, memantau pooling kas, dan melihat log transaksi — baik dari PC kasir maupun HP via jaringan lokal (`http://gcnet.local`).

**Dokumen Teknis Terkait:**
- [Backend.md](Backend.md) — Spesifikasi server, API, dan data storage
- [Front-End.md](Front-End.md) — Logika frontend, state management, dan sinkronisasi
- [UI.md](UI.md) — Desain visual, komponen UI, dan responsivitas

---

## 2. Fitur Input Cerdas (Smart UI)
Alih-alih dropdown statis, kita akan menggunakan komponen **Searchable Combobox**:

- **Fuzzy Search:** Saat mengetik "2", sistem langsung menyaring pilihan seperti "Paket 2 Jam", "Paket 12 Jam", dsb.
- **Auto-Select:** Jika teks yang diketik tepat sama dengan nama paket (misal: "2 Jam"), sistem akan otomatis memilihnya tanpa perlu diklik lagi.
- **Keyboard Navigation:** Bisa navigasi hasil pencarian menggunakan panah atas-bawah dan Enter untuk memilih.
- **History Autocomplete:** Kolom "Nama Pemain" akan mengingat nama-nama yang pernah diinput sebelumnya (maksimal 100 nama terakhir, disimpan di `database.json`).

---

## 3. Modul Keuangan & Pooling Kas
Sistem kini tidak hanya mencatat nama, tapi juga nilai transaksi:

- **Master Harga:** Di menu **Pengaturan**, operator bisa menambah, mengedit, dan menghapus paket beserta harganya (misal: Paket 2 Jam = Rp7.000). Akses via UI khusus, bukan edit JSON langsung.
- **Live Money Counter (Pooling):** Dashboard menampilkan total uang dari semua antrian yang sedang aktif.
- **Dynamic Deduction:** Begitu booking diklik "Selesai" atau "Batal", saldo Pooling otomatis berkurang.

---

## 4. Sistem Logging (Riwayat Transaksi)
Tab khusus **"Log Aktivitas"** untuk memantau keluar-masuknya pemain:

- **Log Selesai:** Mencatat Nama, PC, Paket, Harga, Jam Mulai, Jam Selesai, dan Status Pembayaran.
- **Log Pembatalan:** Jika booking dibatalkan, operator **wajib mengisi alasan singkat** (dropdown: "Salah Input", "Pemain Batal", "Lainnya") agar tidak terjadi kecurangan.

**Penyimpanan:** Semua data (PC, Paket, Antrian, Log, History Nama) disimpan dalam satu file `database.json`.

---

## 5. Spesifikasi Tabel Data

### A. Tabel Antrian (Main Dashboard)

| Kolom | Tipe | Keterangan |
|---|---|---|
| No | Auto-increment | Nomor urut tampilan |
| Nama Pemain | String | Nama pelanggan |
| PC | String | Nama/nomor PC (misal: "PC-01") |
| Paket | String | Nama paket yang dipilih |
| Harga | Number (Rp) | Harga otomatis dari master paket |
| Jam Mulai | Datetime | Waktu booking dimulai |
| Status Bayar | Enum | "Belum" / "Sudah" |
| Aksi | Button | Tombol "Selesai" dan "Batal" |

### B. Tabel Log (History)

| Kolom | Tipe | Keterangan |
|---|---|---|
| No | Auto-increment | Nomor urut tampilan |
| Nama Pemain | String | Nama pelanggan |
| PC | String | Nama/nomor PC |
| Paket | String | Nama paket |
| Harga | Number (Rp) | Nominal transaksi |
| Jam Mulai | Datetime | Waktu booking dimulai |
| Jam Selesai | Datetime | Waktu booking berakhir |
| Status | Enum | "Selesai" / "Batal" |
| Keterangan | String | Alasan pembatalan (jika batal) |

---

## 6. Autentikasi & Akses Kontrol
Karena ini aplikasi keuangan, perlu ada proteksi minimal:

- **PIN Operator:** Saat pertama kali membuka aplikasi (atau setelah idle 30 menit), operator harus memasukkan PIN 4 digit.
- **PIN default:** `1234` (bisa diganti di menu Pengaturan).
- **Tidak ada multi-user:** Cukup satu level akses karena semua pengguna adalah keluarga.

---

## 7. Backup & Recovery
Strategi untuk mencegah kehilangan data:

- **Auto-Backup:** Setiap kali aplikasi dimulai, file `database.json` di-backup otomatis ke folder `backups/` dengan format nama `database_YYYY-MM-DD_HH-mm.json`.
- **Rotasi Backup:** Hanya menyimpan **7 backup terakhir** untuk menghemat ruang disk.
- **Write Safety:** Setiap operasi tulis ke `database.json` menggunakan mekanisme **write-then-rename** (tulis ke file temp dulu, baru rename) untuk mencegah corruption jika PC mati mendadak.

---

## 8. Rekap & Laporan Harian
Tab khusus **"Rekap"** di dashboard untuk melihat ringkasan keuangan:

- **Pendapatan Hari Ini:** Total Rp dari semua booking dengan status "Selesai" hari ini.
- **Jumlah Transaksi:** Total booking selesai dan batal hari ini.
- **Filter Tanggal:** Bisa memilih rentang tanggal untuk melihat rekap periode tertentu.
- **Paket Terpopuler:** Menampilkan paket yang paling sering dipesan.

> Fitur export ke Excel/PDF **tidak termasuk** dalam v2.0. Akan dipertimbangkan untuk versi mendatang.

---

## 9. Sinkronisasi Data (Multi-Device)
Agar tampilan di HP dan PC Kasir selalu sinkron:

- **Metode: Polling** (setiap 5 detik frontend melakukan `GET /api/data`).
- **Alasan:** Lebih simple untuk diimplementasikan dan di-debug. Tidak memerlukan library WebSocket tambahan di sisi Go.
- **Upgrade Path:** Jika performa polling menjadi masalah di masa depan, bisa di-upgrade ke Server-Sent Events (SSE) tanpa perubahan besar di frontend.

---

## 10. Konfirmasi Aksi Destruktif
Untuk mencegah salah klik, terutama di layar HP:

- Tombol **"Batal"** memunculkan dialog konfirmasi + dropdown alasan sebelum eksekusi.
- Tombol **"Selesai"** memunculkan dialog konfirmasi singkat: *"Selesaikan booking [Nama] di [PC]?"*
- Tombol **"Hapus"** pada Master PC/Paket memunculkan dialog: *"Yakin hapus [item]? Data yang terkait akan terpengaruh."*

---

## 11. Spesifikasi Teknis (Ringkasan)
| Aspek | Keputusan |
|---|---|
| **Backend** | Go (Golang) — single binary `.exe` |
| **Frontend** | Tailwind CSS 4.0 + Alpine.js (via CDN, di-embed ke binary) |
| **Database** | File `database.json` tunggal |
| **Akses Lokal** | mDNS via `gcnet.local` (library `zeroconf`) |
| **Sinkronisasi** | Polling setiap 5 detik |
| **Embedding** | Frontend di-embed ke binary Go via `//go:embed` |

> Detail teknis implementasi ada di [Backend.md](Backend.md), [Front-End.md](Front-End.md), dan [UI.md](UI.md).