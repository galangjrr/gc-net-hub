# Belajar Data Modeling — dari Review Shan atas `wsr_batches`

> Catatan belajar dari review Shanieulle di MR hanayo !1189 (21 Jul 2026), plus konsep
> medallion (bronze/silver/gold) yang dia singgung. Semua contoh pakai kasus nyata Kyou.

---

## 1. Prinsip dasarnya cuma satu: **satu fakta, satu tempat**

Ini namanya **normalisasi database**. Semua komentar Shan — "pake enum", "jangan string",
"rack kan kita pnya rack id" — turunan dari prinsip ini.

Kalau satu fakta ("barang ini namanya Nendoroid Miku", "rak ini namanya 5C") disimpan di
DUA tempat, cepat atau lambat keduanya akan **beda isi**, dan tidak ada yang tahu mana
yang benar. Contoh nyata di kasus kita:

**Sebelum (salah):**

```php
// wsr_batch_items — versi awal
$table->string('name');          // salinan dari items.name
$table->string('barcode', 64);   // salinan dari items.barcode
$table->string('source', 64);    // salinan dari item_sources.name
$table->string('rack', 64);      // salinan dari racks.name
```

Barang di-rename → salinan di batch masih nama lama. Rak "5C" diganti "5C-ATAS" →
batch masih bilang "5C". Data yang menyalin fakta orang lain pasti **basi** suatu saat.

**Sesudah (benar):**

```php
$table->unsignedInteger('item_id');         // -> items
$table->unsignedInteger('source_id');       // -> item_sources.id
$table->unsignedInteger('destination_id');  // -> item_sources.id
$table->unsignedInteger('rack_id');         // -> racks.id
```

Nama barang/gudang/rak **di-JOIN saat ditampilkan**. Fakta tetap hidup di satu tempat
(tabel asalnya); tabel lain cuma **menunjuk** ke sana pakai id.

Pujian Shan "itu dipisah per items dah bagus, ini namanya database normalization" =
keputusan bikin `wsr_batch_items` sebagai tabel anak (bukan blob JSON) sudah benar.
Review-nya menuntaskan setengah sisanya: **isi** tabelnya pun harus ternormalisasi.

---

## 2. Enum vs string — untuk nilai pilihan tertutup

Kolom yang nilainya cuma bisa beberapa pilihan (`status`: pending/running/done/cancelled)
jangan `VARCHAR`. Alasannya:

1. **VARCHAR menerima apa saja.** `"Pending"`, `"pending "` (spasi), `"pnding"` — semua
   masuk. Validasi PHP bisa dilewati (Metabase, script, SQL manual). Sekali nilai liar
   masuk, `WHERE status = 'pending'` diam-diam melewatkannya → bug tanpa error.
2. **Enum ditolak di level DB.** Nilai di luar daftar = insert gagal. Ini jaring pengaman
   di lapisan paling bawah yang tidak bisa dilewati siapa pun.
3. **Enum disimpan sebagai angka** (1, 2, 3) internal MySQL — perbandingan lebih murah,
   index lebih kecil.

```php
// sebelum
$table->string('status', 16)->default('pending');
// sesudah
$table->enum('status', ['pending', 'running', 'done', 'cancelled'])->default('pending');
```

**Catatan praktis:** validasi allowlist di PHP tetap perlu — supaya user dapat pesan 422
yang jelas, bukan SQL error. Enum itu lapis kedua, bukan pengganti validasi.

**Kapan enum TIDAK cocok:** kalau daftarnya tumbuh lewat data (gudang bisa nambah:
event CF22, AFAID25, ...). Itu bukan enum — itu **tabel referensi** (`item_sources`)
dan kolommu menyimpan id-nya. Rumus cepat:
- Pilihan tetap, berubah cuma lewat deploy → **enum**.
- Pilihan tumbuh lewat data → **tabel referensi + FK/id**.

---

## 3. "String → cuma for display"

Kalimat Shan ini rumus praktis paling berguna. Tanya untuk tiap kolom string:

> **"Kolom ini bakal pernah dipakai di WHERE / JOIN / GROUP BY, atau cuma dibaca manusia?"**

- Dipakai mencari/menghubungkan → **jangan string**. Pakai enum atau id.
- Murni dibaca manusia dan tak pernah di-query → string boleh.

Di kasus kita, yang lolos ujian ini cuma `notes` (catatan bebas staf) dan `error`
(pesan kesalahan). Semua yang lain — status, gudang, rak, nama barang, bahkan nama
author — ternyata di-query atau punya rumah sendiri, jadi dibuang/diganti id.

**Kenapa string mahal buat dicari** ("nyari database string itu makan cpu lebih2"):
- Membandingkan string = karakter per karakter + urusan **collation** (case-insensitive?
  charset apa?). Membandingkan integer = satu operasi CPU.
- Index string lebih gemuk → lebih sedikit yang muat di memori → lebih banyak disk.
- Data string bebas mengundang query `LIKE '%...%'` — dan **leading-wildcard LIKE tidak
  bisa pakai index sama sekali** = full scan. Ini yang bikin "muntah db" di tabel
  jutaan baris (ingat insiden Stock Logs: 1,4 juta baris di-scan, CPU 75%).

---

## 4. Kasus nyata: sebelum vs sesudah (ringkasan MR !1189)

| Kolom lama | Masalah | Jadi |
|---|---|---|
| `unit` varchar | pilihan tetap 3 nilai | `enum('GAMMA_LAMBDA','ALPHA','BETA')` |
| `direction` varchar | pilihan tetap 3 nilai | `enum('request','return','event')` |
| `status` varchar (2 tabel) | pilihan tetap | enum |
| `source`/`destination` varchar | salinan `item_sources.name` | `source_id`/`destination_id` |
| `rack` varchar | salinan `racks.name` | `rack_id` (nullable) |
| `name`, `barcode` | salinan dari `items` | dihapus — join `items` |
| `created_by_name`, `executed_by_name` | salinan `users.name` | dihapus — join `users` |

Dua hal penting yang TIDAK berubah (dan ini pelajaran juga):

1. **Bentuk respons API tidak berubah.** PDA tetap kirim/terima NAMA. Server yang
   memetakan nama↔id di pintu masuk/keluar. Normalisasi itu urusan perut database —
   konsumen API tidak perlu tahu. Jadi refactor skema ≠ refactor semua klien.
2. **FK constraint tidak dipasang ke tabel legacy** (`items`, `item_sources`, `racks`).
   Prinsipnya referensi id; constraint FK fisik itu bonus yang di tabel warisan
   (tipe/engine campur) malah berisiko bikin `migrate` gagal. Pragmatis > dogmatis.

---

## 5. Medallion: bronze / silver / gold (/ diamond)

Ini konteks obrolan Shan soal "gold" — arsitektur data untuk **analitik**, terpisah dari
database aplikasi. Data mengalir satu arah lewat lapisan yang makin bersih:

```
DB produksi ──copy──> BRONZE ──bersihkan──> SILVER ──agregasi──> GOLD ──> dashboard
 (melayani              (mentah,             (rapi,               (angka
  checkout)              append-only)         ternormalisasi)      siap saji)
```

- **Bronze** — salinan mentah apa adanya, **append-only, no update**. Jelek tak apa,
  yang penting lengkap & tak pernah hilang. Kalau lapisan atas salah hitung, bangun
  ulang dari sini. (Kata Shan: "*a bronze where its an append only with no update*".)
- **Silver** — bronze yang dibersihkan: duplikat dibuang, tipe dibenerin, nilai
  distandarkan, **dinormalisasi** — persis prinsip bagian 1–3 di atas.
- **Gold** — agregat siap pakai, dibentuk mengikuti **pertanyaan bisnis**, bukan
  struktur sumber. Satu tabel gold ≈ satu dashboard. Contoh yang Shan sebut:
  `daily_item_velocity(item_id, tanggal, terjual, dicancel)` — "item ini kejual
  berapa sehari, dicancel berapa".
- **Diamond/platinum** — BUKAN istilah baku; sebagian tim menambah lapisan keempat
  untuk hasil yang dipersonalisasi per konsumen (feed per user, fitur ML). Anggap
  ekstensi gaya, bukan standar.

**Kenapa relevan buat Kyou:** sekarang dashboard (Cindy v3, Stock Logs) query langsung
ke DB produksi — makanya tiap metrik baru harus diukur EXPLAIN-nya hati-hati. Dengan
medallion, dashboard cuma baca tabel gold yang mungil → nol beban ke DB yang melayani
checkout.

**Tes lakmus Shan:** "item 154632 daily velocity-nya gimana?"
- Tanpa medallion: `%LIKE%` + SUM ke stock_logs 1,4 juta baris, di DB produksi. 🤮
- Dengan medallion: `SELECT * FROM gold.daily_item_velocity WHERE item_id = 154632`. ⚡

**Kuncinya:** kualitas gold ditentukan kebersihan lapisan bawah. Data yang lahir dari
fitur baru (kayak `wsr_batches`) harus **lahir bersih** — karena bronze cuma sebagus
apa yang produksi tulis ke dalamnya.

---

## 6. Checklist desain tabel baru (pakai tiap bikin migrasi)

1. **Tiap kolom string, tanya:** dipakai WHERE/JOIN/GROUP BY? → enum atau id.
   Cuma dibaca manusia? → string boleh.
2. **Nilai pilihan tetap** (berubah cuma lewat deploy) → `enum(...)`.
3. **Entitas yang sudah punya tabel** (gudang, rak, barang, user, kategori) → simpan
   **id-nya**, jangan salin namanya. Nama di-join saat tampil.
4. **State yang berubah & di-query per baris** → kolom/tabel anak, **bukan kolom JSON**.
   (JSON = nulis ulang seluruh blob tiap update, tak bisa di-index/COUNT per baris.)
5. **Index mengikuti query**, bukan menebak: tulis dulu query yang bakal dipakai layar,
   baru bikin index untuk pola itu. Verifikasi pakai **EXPLAIN** (lewat Metabase
   readonly — ingat: index prod banyak yang dibuat manual di luar migrations).
6. **Author/waktu:** `created_by`/`updated_by` = user_id (bukan nama), plus timestamp.
7. **API boleh tetap ramah:** klien kirim/terima nama tak masalah — petakan nama↔id
   di controller. Skema bersih ≠ API kaku.
8. **FK constraint** pasang ke tabel yang lahir bareng (satu migrasi); ke tabel legacy
   cukup kolom id murni + komentar alasan.

---

## 7. Buat prompting ke depan (ini yang kamu minta)

Shan sendiri menyarankan pola ini: "*kalo bingung → lempar ke claude coba ask...*".
Kalimat-kalimat yang bisa kamu pakai langsung:

**Mendesain skema fitur baru:**
> "Aku mau bikin fitur X. Desain skemanya dengan prinsip: enum untuk pilihan tertutup,
> referensi id untuk entitas yang sudah punya tabel (item_sources, racks, users, items),
> string hanya untuk teks bebas display. State yang berubah per baris jadi tabel anak,
> bukan JSON. Sebutkan index-nya berdasarkan query yang bakal dipakai layarnya."

**Review skema yang sudah ada (meniru gaya review Shan):**
> "Review skema/migrasi ini untuk normalisasi: cari kolom string yang harusnya enum
> atau id, salinan data yang bisa basi, state di JSON yang harusnya kolom, dan query
> yang bakal jadi full scan. Kasih sebelum/sesudah-nya."

**Yang disarankan Shan verbatim (buat belajar medallion):**
> "Define a medallion db schema assuming I'm creating a bronze where it's append-only
> with no update. What silver and gold could I create for it? What technical question
> could I answer through it?"

**Tes lakmus untuk menguji desainmu sendiri:**
> "Dengan skema ini, kalau ada yang tanya 'item 154632 daily velocity-nya berapa' —
> query-nya seperti apa, dan apa dia butuh %LIKE% atau scan tabel besar? Kalau iya,
> apanya yang harus diubah?"

**Sebelum push, minta lawan tanding:**
> "Adversarial review: coba patahkan skema ini. Nilai apa yang bisa masuk tapi tidak
> sah? Fakta apa yang disimpan dobel? Query layar mana yang tidak ke-cover index?"

Pola umumnya: **sebutkan prinsipnya di prompt** (enum/id/display-only/tabel anak/index
per query), jangan cuma "bikinin tabel" — karena default model cenderung bikin yang
"jalan" (string semua), bukan yang "well-modeled". Persis bedanya draft pertamamu vs
hasil review Shan.

---

## Rujukan cepat istilah

| Istilah | Arti singkat |
|---|---|
| Normalisasi | Satu fakta satu tempat; tabel lain menunjuk pakai id |
| Denormalisasi | Sengaja menyalin demi kecepatan baca — sah di lapisan GOLD, bukan di tabel operasional |
| Enum | Kolom dengan daftar nilai tetap, ditolak DB kalau di luar daftar |
| FK (foreign key) | Kolom id yang menunjuk baris tabel lain (constraint fisiknya opsional) |
| Tabel referensi | Tabel master untuk daftar yang tumbuh lewat data (item_sources, racks) |
| Collation | Aturan pembanding string (case, charset) — sumber "Illegal mix of collations" |
| Covering index | Index yang memuat semua kolom yang diminta query → tak perlu sentuh tabel |
| Append-only | Cuma INSERT, tak pernah UPDATE/DELETE — sifat lapisan bronze |
| Medallion | Arsitektur bronze → silver → gold untuk analitik |
