# PRD — Kalananti SCL Module Generator & Editor

> **Status dokumen:** Rebaseline disetujui; browser-print tetap output aktif, sementara direct Drive renderer/publish ditunda sebagai future track
> **Versi:** 2.2
> **Tanggal baseline:** 3 Agustus 2026
> **Platform target:** Google Apps Script Web App
> **Output utama:** Editor modul A4 dan PDF melalui browser print
> **Sumber data utama:** Google Spreadsheet SCL

Dokumen ini adalah product contract untuk membangun generator dan editor modul
Student Centered Learning (SCL). PRD v2 menggantikan acceptance visual/editor
v1: backend Apps Script dan normalized Spreadsheet model yang telah lulus tetap
reusable, sedangkan renderer/editor v1 belum dianggap sesuai sampai migrasi
parity terhadap `book-editor-rework` lulus. Requirement target tidak boleh
dianggap implemented tanpa source dan rendered evidence.

---

## 1. Ringkasan Produk

Kalananti SCL Module Generator & Editor adalah aplikasi internal Academic Content untuk mengambil satu level lengkap dari Google Spreadsheet, mengubah 12 session menjadi modul A4 dengan desain Kalananti yang sudah disetujui, memungkinkan penyuntingan visual seperti document editor, menyimpan perubahan kembali ke Spreadsheet sebagai single source of truth, dan menghasilkan PDF yang tajam melalui browser print.

Aplikasi berjalan sepenuhnya pada Google Apps Script dan browser. Tidak ada dependency Flask, Python server, Chromium server, atau pipeline Google Slides.

Produk menggabungkan dua kebutuhan:

1. **Authoring:** tim dapat memperbaiki teks, format, gambar, urutan block, dan tabel melalui editor visual.
2. **Publishing:** sistem membuat cover, petunjuk, daftar isi, session opener, isi berhalaman, filler spread, dan back cover secara otomatis tanpa clipping.

### 1.1 Product statement

> Academic Content membutuhkan satu aplikasi bersama untuk menyusun, mengedit, dan mencetak modul SCL per level dengan Spreadsheet sebagai SSOT, tanpa menata ulang halaman secara manual dan tanpa kehilangan perubahan antar pengguna.

### 1.2 Keputusan produk yang sudah disetujui

- Pengguna utama adalah tim Academic Content.
- Aplikasi di-deploy sebagai Apps Script Web App dengan surface `Anyone` dan akses editor dilindungi team passcode.
- Satu generate selalu mewakili satu course dan satu level.
- Target normal satu level adalah 12 session.
- Konten dan perubahan disimpan kembali ke Spreadsheet.
- Banyak pengguna boleh bekerja pada session berbeda, tetapi satu session hanya boleh memiliki satu editor aktif.
- Autosave server berjalan setelah pengguna berhenti mengetik.
- Google Slides tidak masuk scope.
- PDF menggunakan browser print agar teks dan SVG tetap tajam.
- Tiga tab sumber adalah `B2C_RobloxStudio_Modul`, `B2C_Scratch_Modul`, dan `B2C_Python_Modul`.
- Tab `_INS`, Teacher Guide, dan tab lain tidak dibaca sebagai sumber modul.
- Grammar `kcN*`, `fykN*`, `kcN:`, dan `fykN:` tidak boleh diubah.
- Tabel dibuat melalui editor visual dan disimpan pada hidden tab app-managed.
- Gambar hanya boleh berasal dari URL HTTPS yang valid.
- `quiz_answers` tidak pernah muncul di preview atau PDF.
- Setiap session opener harus berada di halaman kiri pada spread buku.
- Desain komponen dari `../book-editor-rework/docs/PRD.md` adalah baseline visual yang sudah disetujui.
- Implementasi aktual `../book-editor-rework/templates/modern.html` adalah
  authority untuk DOM, CSS, component flow, resize, repagination, dan editing
  behavior; dokumen historis tidak mengalahkan artifact aktual ini.
- Login, pemilihan course/level, parser, lock per session, revision-aware
  autosave, history, dan keamanan Apps Script yang ada dipertahankan.
- Authoring/lock dilakukan per session; publishing menghasilkan satu PDF untuk
  satu course + satu level dari seluruh revision session yang tersimpan.
- Perubahan content disimpan kembali secara revision-aware ke field Spreadsheet;
  perubahan layout disimpan sebagai structured app-managed records, bukan raw
  full-page HTML.
- Enam SVG pada `back-module/` tetap menjadi template halaman kanonis.
- Title, subtitle, header, topic, TOC text, dan nomor halaman dirender sebagai
  native HTML pada koordinat deterministik; Google Slides textbox/autofit tidak
  digunakan.

---

## 2. Latar Belakang dan Masalah

### 2.1 Kondisi saat ini

Konten modul sudah disimpan dalam Google Spreadsheet sebagai satu row per session. Data mencakup objectives, materials, tugas bertingkat, self-check, Kamus Coder, For Your Knowledge, quiz, dan session topic.

Generator sebelumnya menyediakan editor visual yang kuat, tetapi bergantung pada Flask/Python, renderer Chromium, dan export Google Slides raster. Konsekuensinya:

- pengguna lain harus menjalankan environment lokal;
- hasil tidak mudah diproduksi langsung dari satu URL Apps Script;
- state draft tidak menjadi SSOT bersama;
- slide akhir berupa gambar;
- course Python belum menjadi bagian kontrak aktif;
- tabel dan rich text sumber belum memiliki kontrak round-trip yang aman.

### 2.2 Masalah pengguna

Tim Academic Content membutuhkan cara untuk:

- memilih course dan level tanpa menyalin data;
- melihat status 12 session;
- mengedit konten secara visual;
- mempertahankan grammar konten lama;
- bekerja paralel tanpa saling menimpa;
- memulihkan kesalahan autosave;
- membuat tabel yang benar-benar tampil sebagai tabel;
- mempertahankan gambar dengan kualitas terbaik;
- menghasilkan modul A4 yang siap dicetak sebagai buku;
- memastikan setiap session dimulai pada halaman kiri;
- dan menyimpan hasil akhir kembali ke Spreadsheet yang sama.

### 2.3 Hipotesis produk

Jika tim dapat mengelola satu level melalui editor visual yang terhubung langsung ke Spreadsheet, dengan locking per session, autosave ber-history, pagination A4, dan print preflight, maka waktu produksi modul dan risiko kehilangan/menimpa konten akan berkurang secara signifikan.

---

## 3. Tujuan, Indikator Keberhasilan, dan Non-Goals

### 3.1 Tujuan utama

- **G-01** — Membuka satu course dan satu level sebagai satu project modul.
- **G-02** — Membaca dan menulis kembali data modul pada tiga tab sumber yang diizinkan.
- **G-03** — Menampilkan 12 session dan status kesiapan masing-masing.
- **G-04** — Menyediakan editor WYSIWYG berbasis block dengan formatting, gambar URL, tabel, page break, dan undo/redo.
- **G-05** — Mempertahankan grammar `kc` dan `fyk` yang sudah digunakan tim.
- **G-06** — Mencegah dua pengguna mengedit session yang sama secara bersamaan.
- **G-07** — Autosave tanpa kehilangan perubahan dan dengan kemampuan restore history.
- **G-08** — Menghasilkan cover, guide, TOC, session opener, isi, filler spread, dan back cover.
- **G-09** — Menjamin tidak ada clipping/overflow tersembunyi pada halaman A4.
- **G-10** — Menghasilkan PDF dengan teks selectable, SVG tajam, dan gambar tanpa kompresi ulang yang tidak perlu.
- **G-11** — Menyediakan validation, warning, dan recovery yang dapat ditindaklanjuti.

### 3.2 Indikator keberhasilan

- Academic Content dapat membuka aplikasi tanpa menjalankan server lokal.
- Satu level dengan 12 session dapat dibuka, diedit, disimpan, dipulihkan, dan dicetak.
- Dua pengguna dapat mengedit session berbeda tanpa collision.
- Session yang sedang dikunci tampil read-only bagi pengguna lain.
- Data hasil autosave muncul kembali saat level dimuat ulang.
- Restore salah satu dari 20 revisi terakhir mengembalikan row dan preview yang sesuai.
- Marker `kc`/`fyk` tampil di lokasi yang sama dengan urutan `materials`.
- Tabel tampil sebagai tabel HTML dan tidak berubah menjadi paragraf acak.
- Session opener selalu berada pada sisi kiri spread.
- TOC menunjuk session opener yang benar setelah filler dan repagination.
- PDF untuk Roblox Studio, Scratch, dan Python lolos visual QA nyata.

### 3.3 Non-goals MVP

- Bukan LMS atau player pembelajaran siswa.
- Bukan real-time collaborative editor dengan cursor/presence seperti Google Docs.
- Bukan pengganti penuh Google Sheets untuk bulk editing.
- Bukan editor Google Slides dan tidak menghasilkan Google Slides.
- Tidak membaca tab `_INS`, Teacher Guide, atau sumber selain tiga tab `_Modul` yang diizinkan.
- Tidak menampilkan answer key pada modul.
- Tidak mengunggah gambar dari perangkat pengguna.
- Tidak menerima gambar base64 atau blob sebagai source content.
- Tidak menyimpan PDF otomatis ke Drive pada MVP.
- Tidak mengirim email atau menerbitkan modul otomatis.
- Tidak melakukan koreksi akademik otomatis dengan AI.
- Tidak mengizinkan raw HTML tak tersanitasi dari Spreadsheet.
- Tidak menjamin identitas email terverifikasi ketika Apps Script tidak menyediakan email pengguna.

---

## 4. Persona, Akses, dan Ownership

### 4.1 Persona utama — Academic Content Editor

Kebutuhan:

- memilih course dan level;
- melihat session yang Ready, Incomplete, On Progress, atau Locked;
- mengedit satu session tanpa mengganggu session lain;
- melihat preview hasil layout saat bekerja;
- mengetahui status autosave;
- memperbaiki gambar atau tabel bermasalah;
- memulihkan versi lama;
- mencetak modul setelah preflight lolos.

### 4.2 Persona sekunder — Academic Reviewer/Lead

Kebutuhan:

- membuka seluruh level secara read-only;
- memeriksa kelengkapan 12 session;
- melihat warning dan change history;
- mengambil alih session hanya setelah lock stale;
- memvalidasi PDF final.

### 4.3 Maintainer/Deployment Owner

Kebutuhan:

- konfigurasi tanpa secret di source;
- setup hidden tabs secara idempotent;
- audit log yang tidak menyimpan secret;
- test dan deployment yang dapat direproduksi;
- status local source, Apps Script current code, dan production deployment yang terpisah.

### 4.4 Ownership keputusan

| Area                                      | Owner target                      |
| ----------------------------------------- | --------------------------------- |
| Kebenaran akademik                        | Academic Content Lead             |
| Desain komponen                           | Academic Content + Design         |
| Spreadsheet sumber                        | Curriculum/Academic Content Owner |
| Apps Script dan deployment                | Technical Maintainer              |
| Script Properties dan credential rotation | Deployment Owner                  |
| Acceptance PDF                            | Academic Content Lead + QA        |

---

## 5. Source of Truth dan Batas Data

### 5.1 Urutan source of truth

Jika terjadi konflik, gunakan urutan berikut:

1. PRD yang telah disetujui dan keputusan discovery yang tercantum di dokumen ini.
2. Tiga tab `_Modul` untuk isi akademik utama.
3. Hidden tabs generator untuk lock, history, audit, dan tabel editor.
4. Aset SVG pada `back-module/` untuk background halaman.
5. Baseline visual approved pada `../book-editor-rework/docs/PRD.md`.
6. Runtime implementation dan test yang memenuhi acceptance criteria.
7. `prd-awal.md` sebagai catatan awal, bukan kontrak final jika bertentangan dengan PRD ini.

### 5.2 Spreadsheet sebagai SSOT

Spreadsheet yang dikonfigurasi server-side adalah satu-satunya penyimpanan bersama project. Browser local storage hanya berfungsi sebagai recovery draft sementara, bukan sumber final.

Isi akademik utama harus kembali ke row sumber. Data app-managed yang tidak memiliki representasi aman pada schema lama—khususnya tabel visual, lock, revision history, dan audit—disimpan pada hidden tabs dalam Spreadsheet yang sama.

### 5.3 Course allowlist

| Course key  | Tab sumber                 | Label cover default |
| ----------- | -------------------------- | ------------------- |
| `roblox`  | `B2C_RobloxStudio_Modul` | `ROBLOX STUDIO`   |
| `scratch` | `B2C_Scratch_Modul`      | `SCRATCH`         |
| `python`  | `B2C_Python_Modul`       | `PYTHON`          |

- **DATA-001** — Client hanya mengirim `courseKey`; nama tab ditentukan server.
- **DATA-002** — Course tidak dikenal harus ditolak, bukan dinormalisasi diam-diam.
- **DATA-003** — Backend tidak boleh menerima nama tab arbitrary dari client.
- **DATA-004** — Tab yang berakhiran `_INS` atau nama lain tidak boleh masuk daftar module source.

### 5.4 Header row

Workbook saat ini dapat memiliki baris panduan sebelum header. Backend harus mencari header pada sepuluh baris awal dan memilih baris yang mengandung `Level`, `Session`, serta mayoritas kolom schema wajib. Implementasi tidak boleh mengasumsikan header selalu pada row 1.

### 5.5 Schema row modul

| Kolom                  | Tipe logis       |     Edit |       Render PDF | Catatan                         |
| ---------------------- | ---------------- | -------: | ---------------: | ------------------------------- |
| `Level`              | string/number    |    Tidak |     Cover/header | Bagian row identity             |
| `Session`            | string/number    |    Tidak |               Ya | Target normal 1–12             |
| `objectives`         | rich multiline   |       Ya |               Ya | Learning objectives             |
| `materials`          | rich multiline   |       Ya |               Ya | Materi, gambar, marker, langkah |
| `must_do`            | rich multiline   |       Ya |               Ya | Target utama                    |
| `should_do`          | rich multiline   |       Ya |               Ya | Pengayaan                       |
| `aspire_to_do`       | rich multiline   |       Ya |               Ya | Tantangan lanjutan              |
| `self-check`         | rich multiline   |       Ya |               Ya | Refleksi statis                 |
| `kamus_coder`        | rich multiline   |       Ya |  Melalui`kcN*` | Definisi`kcN:`                |
| `for_your_knowledge` | rich multiline   |       Ya | Melalui`fykN*` | Definisi`fykN:`               |
| `quiz_questions`     | rich multiline   |       Ya |               Ya | Pertanyaan bernomor             |
| `quiz_options`       | rich multiline   |       Ya |               Ya | Opsi A/B/C, `                   |
| `quiz_answers`       | rich multiline   | Opsional |            Tidak | Tidak boleh bocor ke output     |
| `Session-topic`      | string/rich text |       Ya |               Ya | Baris kedua header opener       |

- **DATA-005** — Perbandingan header harus trim whitespace tetapi mempertahankan nama kanonis saat menulis.
- **DATA-006** — Line ending `CRLF`, `CR`, dan `LF` harus dinormalisasi menjadi `LF` dalam normalized model.
- **DATA-007** — Row identity adalah `${sheetName}::${normalizedLevel}::${normalizedSession}`.
- **DATA-008** — Kombinasi Level + Session harus unik dalam satu tab.
- **DATA-009** — Duplicate row adalah blocking error untuk kedua row terkait.
- **DATA-010** — Insert/reorder row tidak boleh mengubah identity session.
- **DATA-011** — `Session-topic` kosong menghasilkan status Incomplete.
- **DATA-012** — `quiz_answers` boleh dibaca untuk round-trip edit tetapi tidak dikirim ke renderer/print model.

### 5.6 Level normalization

Nilai seperti `1`, `1.0`, `Level 1`, `Scratch Level 1`, atau variasi case dapat dipetakan ke token level yang sama untuk pencarian. Nilai asli tetap dipertahankan ketika tidak diedit.

Satu project level berisi slot Session 1–12:

- row valid dan minimum content terpenuhi: `Ready`;
- row ada tetapi field penting kosong: `Incomplete`;
- row tidak ditemukan: `On Progress`;
- row sedang dimiliki editor lain: `Locked`;
- row memiliki blocking validation: `Needs Fix`.

Session `On Progress` tidak dirender sebagai halaman kosong dan tidak masuk TOC.

### 5.7 Hidden tab schema health dan safe auto-healing

Setiap authenticated bootstrap harus memverifikasi keberadaan, header schema, schema version, dan proteksi `_Generator_Tables`, `_Generator_Locks`, `_Generator_History`, serta `_Generator_Audit` sebelum write operation diaktifkan.

- **STORE-001** — Hidden tab yang belum ada harus dibuat otomatis dengan header dan schema version kanonis.
- **STORE-002** — Kolom kanonis yang hilang boleh ditambahkan secara non-destruktif tanpa menghapus, memindahkan, atau menimpa data yang sudah ada.
- **STORE-003** — Unknown columns harus dipertahankan agar forward/backward compatibility tidak menyebabkan data loss.
- **STORE-004** — Tab dengan duplicate header, header ambigu, atau row data yang tidak kompatibel tidak boleh “diperbaiki” dengan tebakan; backend masuk safe degraded mode, memblokir mutation terkait, dan menampilkan diagnostic code kepada maintainer.
- **STORE-005** — Auto-healing tidak boleh mengubah tiga tab `_Modul` selain melalui save flow session yang tervalidasi.
- **STORE-006** — Hidden tabs harus di-hide dan diproteksi best effort setelah setup/repair, tetapi backend tetap memvalidasi schema karena hide/protection bukan jaminan integritas.

---

## 6. Grammar dan Normalized Content Model

### 6.1 Prinsip grammar

Editor boleh tampil visual, tetapi round-trip ke Sheet tidak boleh merusak grammar lama. Parser menghasilkan normalized block model; serializer menulis kembali ke kolom asal dengan urutan dan marker yang konsisten.

### 6.2 Native rich text

- **FMT-001** — Bold, italic, underline, strikethrough yang didukung, dan link disimpan sebagai Google Sheets RichTextValue.
- **FMT-002** — Pengguna tidak perlu mengetik Markdown untuk formatting inline baru.
- **FMT-003** — Rich text run harus dibaca beserta start/end offset dan link URL.
- **FMT-004** — Font output dinormalisasi ke design system; font Sheet bukan instruksi untuk mengganti font modul.
- **FMT-005** — Raw HTML dari cell harus ditampilkan sebagai teks atau ditolak, bukan dieksekusi.
- **FMT-006** — Legacy inline markup yang sudah ada boleh dibaca untuk compatibility, tetapi serializer baru mengutamakan native rich text.
- **FMT-007** — Legacy Markdown headings (`#`, `##`, `###`) dan inline emphasis
  (`**bold**`, `*italic*`, `_italic_`, `__bold__`, `***bold italic***`) harus
  dibaca sebagai semantic heading/style pada editor, preview, dan print; delimiter
  tidak boleh tampil sebagai prose. Delimiter di fenced code tetap literal.
- **FMT-008** — Markdown H1 dan H2/H3 memakai hierarchy visual yang jelas
  (H1 dominan, H2/H3 lebih kecil) dengan treatment card yang konsisten dengan
  blok `Tahap/Bagian/Langkah` pada editor, preview, dan print.

### 6.3 Objectives

- Setiap baris non-kosong menjadi satu objective item.
- Prefix bullet umum boleh dinormalisasi untuk render tetapi tidak boleh mengubah makna.
- Urutan selalu mengikuti source.

### 6.4 Materials

Parser harus mengenali:

- paragraf;
- bullet dan numbered list;
- `Tahap N`, `Bagian N`, dan `Langkah N`;
- URL gambar standalone;
- URL/link biasa;
- marker `kcN*` dan `fykN*`;
- table block app-managed;
- manual page break dari editor;
- rich text runs.
- fenced code pada course Python: pasangan triple-backtick multiline dan bentuk
  satu baris seperti `````tezt````` dirender sebagai panel IDE; delimiter tidak
  tampil dan isi selalu diperlakukan sebagai text, bukan executable HTML.
- **MAT-001** — Urutan block mengikuti `materials`, bukan nomor marker.
- **MAT-002** — `fyk4*` boleh muncul sebelum `fyk1*` dan harus dirender pada posisi aktualnya.
- **MAT-003** — `|` pada `quiz_options` tidak boleh diproses sebagai table delimiter.
- **MAT-004** — Gambar, caption, dan paragraf pengantar harus dipertahankan sebagai kelompok jika muat.
- **MAT-005** — Block besar harus dapat dipecah secara semantik, bukan dipotong dengan overflow hidden.
- **MAT-006** — Interpretasi fenced code hanya aktif untuk `courseKey=python`;
  source course lain tidak berubah secara implisit.

### 6.5 Kontrak Kamus Coder (`kc`)

- Placement marker: satu baris penuh `kcN*`, case-insensitive saat dibaca.
- Definition marker: `kcN:` di `kamus_coder`.
- Output visual: komponen approved **Tutor Says**.
- Definition berlangsung sampai marker `kcM:` atau akhir cell.
- Marker tanpa definition menghasilkan warning dan placeholder editor, bukan crash.
- Definition tanpa placement marker menghasilkan warning unused content.
- Nomor marker tidak boleh dinormalisasi ulang atau diganti.

### 6.6 Kontrak For Your Knowledge (`fyk`)

- Placement marker: satu baris penuh `fykN*`.
- Definition marker: `fykN:` di `for_your_knowledge`.
- Output visual: komponen approved **Did You Know?**.
- Urutan output mengikuti placement dalam `materials`.
- Marker/definition mismatch mengikuti warning behavior yang sama dengan `kc`.

### 6.7 Tasks dan self-check

Karena modul tidak ditujukan untuk dicoret-coret, komponen tidak boleh menggunakan empty checkbox yang menginstruksikan siswa menandai PDF.

| Field            | Label visual               | Ikon                |
| ---------------- | -------------------------- | ------------------- |
| `must_do`      | Target Utama               | Filled check-circle |
| `should_do`    | Pengayaan                  | Star                |
| `aspire_to_do` | Tantangan                  | Rocket              |
| `self-check`   | Pastikan Kamu Sudah Bisa… | Static check-circle |

- Ikon bersifat dekoratif/status, bukan input.
- Duplicate exact content antara `should_do` dan `aspire_to_do` menghasilkan warning non-blocking.
- Gambar URL di dalam task tetap berada bersama item terkait bila muat.

### 6.8 Quiz

- Pertanyaan menggunakan prefix `N.`.
- Opsi dicocokkan dengan nomor yang sama dan label `A.`, `B.`, dan seterusnya.
- Pipe `|` dapat memisahkan opsi pada satu baris.
- Quiz hanya dirender bila pertanyaan dan opsi tersedia.
- `quiz_answers` tidak boleh masuk payload renderer, DOM print, TOC, hidden print element, atau log.

### 6.9 Normalized model

Normalized session minimum:

```json
{
  "schemaVersion": "scl-module/v1",
  "rowKey": "B2C_RobloxStudio_Modul::1::1",
  "sourceRevision": "sha256:...",
  "level": "1",
  "session": "1",
  "topic": "Making Obby Game Part 1",
  "fields": {},
  "materialBlocks": [],
  "tables": [],
  "warnings": []
}
```

`sourceRevision` adalah hash dari nilai dan rich text run pada seluruh editable field. Hash dipakai untuk optimistic verification walaupun session locking aktif.

---

## 7. Tabel Visual

### 7.1 Prinsip

Tabel tidak ditebak dari paragraf atau delimiter umum. Tabel dibuat dan diedit melalui UI HTML agar struktur row/column eksplisit.

- **TBL-001** — Toolbar menyediakan Insert Table.
- **TBL-002** — User dapat menambah/menghapus row dan column, mengisi header, mengubah alignment, merge sederhana jika didukung, dan menghapus tabel.
- **TBL-003** — Tabel dirender sebagai semantic `<table>` dengan `<thead>` dan `<tbody>`.
- **TBL-004** — Header diulang pada continuation page.
- **TBL-005** — Satu row tidak dipotong di tengah jika tinggi row masih muat satu halaman.
- **TBL-006** — Tabel lebih lebar dari content box menghasilkan warning.
- **TBL-007** — Tabel yang satu row-nya lebih tinggi dari halaman menghasilkan blocking error.
- **TBL-008** — Table content disanitasi dan tidak boleh menyimpan executable HTML.

### 7.2 Persistence

Tabel disimpan pada hidden tab `_Generator_Tables`, bukan sebagai raw HTML/JSON pada `materials` dan bukan sebagai grammar baru yang harus diketik pengguna.

Schema minimum:

| Kolom           | Fungsi                                      |
| --------------- | ------------------------------------------- |
| `table_id`    | UUID stabil                                 |
| `row_key`     | Course tab + level + session                |
| `field`       | Saat ini`materials`                       |
| `order_index` | Urutan relatif pada block model             |
| `anchor_hash` | Hash block teks terdekat untuk re-anchoring |
| `table_json`  | Struktur row, column, style allowlist       |
| `created_at`  | Timestamp                                   |
| `updated_at`  | Timestamp                                   |
| `updated_by`  | Editor label                                |

Jika direct edit pada Sheet membuat anchor tidak ditemukan, tabel dipindahkan ke akhir section pada preview, diberi warning `TABLE_ANCHOR_STALE`, dan harus ditempatkan ulang sebelum print final.

---

## 8. Gambar dan Link

### 8.1 Input gambar

- Hanya URL `https://` yang diterima.
- Upload file lokal, base64, blob URL, dan data URL ditolak.
- URL harus berhasil di-fetch server-side dan memiliki MIME `image/*` yang diizinkan.
- Format minimum yang didukung: PNG, JPEG/JPG, dan WebP.
- External SVG tidak diterima pada MVP kecuali melalui pipeline sanitasi terpisah.
- Redirect terbatas boleh diikuti, tetapi final URL tetap harus HTTPS.
- Double slash pada path URL tidak otomatis invalid bila resource dapat di-fetch.

### 8.2 Image security

- Backend harus memblokir private/local network targets dan skema selain HTTPS.
- Response size memiliki configurable upper bound.
- Image bytes dan signed URL tidak masuk log.
- Client tidak menerima OAuth token atau credential fetch.
- Image error menghasilkan placeholder dengan source label yang aman.

### 8.3 Kualitas cetak

- Browser menggunakan source image asli, bukan screenshot dari Google Docs.
- Gambar tanpa metadata resize eksplisit mulai pada 69% lebar content viewport
  dan seluruh image block diratakan horizontal ke tengah;
  width eksplisit user pada rentang 25–100% tetap dipertahankan.
- Image tidak boleh di-upscale tanpa warning.
- Sistem menghitung effective DPI dari natural pixel size dan ukuran cetak.
- Target kualitas: minimal 200 DPI.
- 120–199 DPI: warning.
- Di bawah 120 DPI: strong warning dan wajib acknowledgement sebelum print.
- Missing/unfetchable image: blocking print error.
- Low-resolution warning tidak boleh mengklaim bahwa software dapat memulihkan detail yang tidak ada pada source.

### 8.4 Client render readiness dan network fallback

Server preflight yang berhasil tidak otomatis membuktikan bahwa browser telah merender image. Sebelum print gate dibuka, client harus menunggu lifecycle setiap image pada DOM final.

- **IMG-001** — Setiap image harus mencapai `load` dan berhasil melalui `HTMLImageElement.decode()` jika tersedia, atau mencapai error/timeout yang eksplisit.
- **IMG-002** — Client memiliki configurable timeout per image dan tidak boleh menunggu tanpa batas.
- **IMG-003** — Direct third-party image yang gagal karena hotlink protection, browser policy, network timeout, atau masalah origin harus menampilkan placeholder yang jelas dan memblokir print.
- **IMG-004** — Print readiness hanya `ready` jika jumlah image expected sama dengan jumlah image rendered-success.
- **IMG-005** — Browser print MVP tidak memakai canvas; istilah canvas taint tidak menjadi dasar validation. Jika jalur raster/canvas ditambahkan kelak, image harus melalui server-mediated fetch/proxy yang memenuhi CORS dan SSRF policy.
- **IMG-006** — Fallback proxy/cache tidak boleh menurunkan resolusi, mengubah aspect ratio, atau menyimpan image lebih lama dari kebutuhan generate aktif tanpa keputusan data-retention baru.
- **IMG-007** — Pagination memakai dimensi natural/preflight yang tersedia dan
  dijalankan ulang setelah seluruh image settle. Perubahan tinggi setelah
  `load/decode` tidak boleh membuat image atau content berikutnya melewati safe
  content bounds atau terpotong oleh footer/page boundary.

---

## 9. Information Architecture dan User Journey

### 9.1 Login gate

1. User membuka Web App.
2. Aplikasi menampilkan team passcode dan input nama atau email kerja pada form
   yang sama sejak awal; tidak boleh baru memunculkan identity sebagai error
   setelah submit pertama.
3. Tombol login hanya aktif setelah kedua input terisi dan passcode tetap
   diverifikasi server-side.
4. Server mencoba memperoleh email Google jika tersedia. Jika email kosong,
   input nama atau email kerja digunakan sebagai editor label self-declared.
5. Server mengeluarkan session token sementara.
6. Client menyimpan token hanya di `sessionStorage`.

### 9.2 Landing page

Landing page menampilkan:

- judul aplikasi;
- course cards Roblox Studio, Scratch, dan Python;
- status koneksi Spreadsheet;
- editor identity;
- logout;
- pesan konfigurasi atau akses yang jelas.

### 9.3 Pemilihan level

Setelah memilih course:

- aplikasi membaca level unik dari tab sumber;
- setiap level menampilkan `Ready count / 12`;
- status warning/blocking terlihat;
- level yang sedang dikerjakan tetap dapat dibuka karena lock berlaku per session.

### 9.4 Workspace level

Workspace mempertahankan shell Apps Script yang ada dan terdiri dari:

- top toolbar;
- sidebar 12 session;
- legacy-parity paged editor sebagai authoring surface utama;
- full-level A4 preview/publisher;
- warning/preflight drawer;
- history drawer;
- print action.

Sidebar session menampilkan:

- nomor session;
- topic;
- status Ready/Incomplete/On Progress/Locked/Needs Fix;
- editor aktif dan last heartbeat jika locked;
- warning count.

### 9.5 Membuka session

1. User memilih session.
2. Server mencoba memperoleh edit lease.
3. Jika berhasil, session masuk edit mode dan heartbeat dimulai.
4. Jika dimiliki editor lain, session dibuka read-only dengan identitas editor dan waktu aktivitas terakhir.
5. User dapat berpindah session setelah pending autosave selesai atau tersimpan lokal bila offline.

### 9.6 Mengedit

Surface authoring utama adalah paged document editor hasil port
`book-editor-rework/templates/modern.html`, bukan kumpulan card form permanen.
Normalized block tetap menjadi model internal untuk save/history, tetapi user
mengetik dan meresize langsung pada visual page flow. Session aktif saja yang
memegang edit lease; session lain tetap dapat dikerjakan user lain.

Pengalaman editing mengikuti document editor modern seperti Google Docs:

- body content memakai normal document flow, bukan absolute-positioned textbox;
- user mengetik langsung pada komponen visual melalui structured
  `contenteditable` surface;
- penambahan/penghapusan teks mendorong content setelahnya naik atau turun;
- page boundary dan continuation dihitung ulang dari DOM tanpa memutus caret;
- toolbar dan selection bersifat modern/sticky, tetapi visual module tetap
  mengikuti component authority legacy;
- autosave persistence tetap lima detik setelah idle, terpisah dari visual
  reflow yang harus terasa langsung dengan debounce maksimal 300 ms.

URL HTTPS gambar yang dimasukkan melalui toolbar atau dipaste sebagai satu baris
mandiri berubah in-place menjadi visual image block setelah validasi. Gambar
dapat dipilih, diganti, dihapus, dan di-resize proporsional melalui inline
handles dan percentage control. Selama resize, surrounding content dan page
break bergerak real-time; resize tidak boleh menjadi floating/absolute overlay
yang menimpa teks.

Full-level publisher memakai component renderer dan pagination primitive yang
sama. Perubahan draft direflow setelah debounce; publishing memakai seluruh
revision session yang telah tersimpan. Editor session dan full-level publisher
tidak boleh memiliki dua interpretasi visual yang berbeda.

Editor mendukung:

- direct text editing;
- bold, italic, underline;
- link;
- predefined heading/step styles;
- bullet dan numbering;
- gambar melalui URL;
- resize gambar proporsional;
- block reorder;
- Insert Table;
- tambah/hapus row dan column tabel;
- manual page break;
- undo dan redo;
- copy-paste text/rich text dengan sanitization;
- status validation real-time;
- preview reflow setelah perubahan.

### 9.7 Print

1. User membuka full-level preview.
2. Sistem menyelesaikan image loading, pagination, filler insertion, numbering, dan TOC stabilization.
3. Preflight menampilkan blocking errors dan warnings.
4. Print terkunci selama blocking error tersedia.
5. Warning non-blocking harus di-acknowledge.
6. `Print / Save as PDF` menjalankan browser print.
7. Print stylesheet menghapus seluruh editor chrome.

---

## 10. Session Locking dan Kolaborasi

### 10.1 Lock scope

Lock key adalah `row_key` session. Lock level penuh tidak digunakan.

- User A dapat mengedit Session 1.
- User B tetap dapat mengedit Session 2–12.
- User B hanya dapat melihat Session 1 secara read-only selama lock aktif.

### 10.2 Lease lifecycle

- Heartbeat interval: 30 detik.
- Lease expiry: 1 menit setelah heartbeat terakhir.
- Membuka session memperoleh lease atomik.
- Berpindah session atau logout mencoba release lease.
- Browser close/crash tidak diandalkan untuk release; expiry adalah recovery utama.
- Active lock tidak dapat diambil alih secara paksa pada MVP.
- Stale lock otomatis dapat diperoleh user berikutnya dan event dicatat.

### 10.3 Lock storage

Hidden tab `_Generator_Locks` minimum:

| Kolom            | Fungsi                               |
| ---------------- | ------------------------------------ |
| `lock_key`     | Sama dengan row key                  |
| `editor_label` | Nama/email display                   |
| `editor_email` | Best effort, boleh kosong            |
| `token_hash`   | Hash token lease, bukan token mentah |
| `acquired_at`  | Timestamp                            |
| `heartbeat_at` | Timestamp terakhir                   |
| `expires_at`   | Timestamp expiry                     |

Apps Script `ScriptLock` digunakan hanya selama transaksi acquire/heartbeat/release agar update row lock atomik.

### 10.4 Lock loss

Jika heartbeat gagal melewati expiry atau server menyatakan lease bukan milik client:

- editor segera menjadi read-only;
- autosave server dihentikan;
- unsaved content dipertahankan di local draft;
- user mendapat pilihan Copy Changes atau Reload Latest;
- client tidak boleh menimpa Sheet tanpa lease baru dan revision check.

---

## 11. Autosave, Revision, History, dan Audit

### 11.1 Autosave behavior

- Local recovery draft diperbarui segera setelah input.
- Server autosave berjalan setelah 5 detik idle.
- Blur field, pindah session, dan sebelum print memicu flush autosave.
- Hanya changed fields dan table changes dikirim.
- Maksimal satu save aktif per session; request berikutnya masuk queue.
- Save membutuhkan valid app session, lease token, dan base revision.

### 11.2 Revision verification

Sebelum write:

1. Server memperoleh ScriptLock.
2. Server memvalidasi app session dan edit lease.
3. Server membaca row terbaru.
4. Server menghitung source revision.
5. Jika revision berbeda dari base revision, save ditolak dengan `REVISION_CONFLICT`.
6. Jika sama, server menyimpan history snapshot lalu menulis changed fields.
7. Server membaca ulang row, menghitung revision baru, dan mengembalikannya.

### 11.3 History

Hidden tab `_Generator_History` menyimpan maksimal 20 revision per row key.

| Kolom                    | Fungsi                                                    |
| ------------------------ | --------------------------------------------------------- |
| `history_id`           | UUID                                                      |
| `row_key`              | Session identity                                          |
| `revision_before`      | Hash sebelum write                                        |
| `revision_after`       | Hash setelah write                                        |
| `changed_fields`       | Daftar nama field                                         |
| `snapshot_json`        | Snapshot sebelum perubahan, termasuk rich text descriptor |
| `tables_snapshot_json` | Snapshot tabel sebelum perubahan                          |
| `editor_label`         | Pelaku                                                    |
| `created_at`           | Timestamp                                                 |

Revision ke-21 menghapus revision tertua untuk row key tersebut setelah revision baru berhasil disimpan.

### 11.4 Restore

- Restore membutuhkan active lease pada session.
- Restore sendiri membuat history entry baru sebelum menimpa data.
- User melihat timestamp, editor, dan changed fields sebelum restore.
- Restore tidak mengubah Level atau Session.
- Setelah restore, preview, validation, TOC, dan source revision diperbarui.

### 11.5 Audit

`_Generator_Audit` menyimpan metadata event tanpa secret atau image bytes:

- login success/failure aggregate;
- acquire/release/stale lock;
- autosave success/failure;
- restore;
- print attempt dan print readiness;
- configuration error.

Passcode, token, raw cookie, full document payload, dan answer key tidak boleh masuk audit log.

---

## 12. Book Composition dan Page Design System

### 12.1 Ukuran halaman

Semua halaman adalah A4 portrait:

- physical size: `210 mm × 297 mm`;
- design viewBox: sekitar `793.70 × 1122.52 px`;
- print CSS: `@page { size: A4; margin: 0; }`;
- preview zoom tidak mengubah ukuran print.

Empat template non-cover—`beginning-kiri`, `beginning-kanan`, `plain-kiri`, dan
`plain-kanan`—menggunakan content viewport approved berikut:

- left `1.38 cm`;
- top `3.22 cm`;
- width `18.38 cm`;
- height `23.86 cm`;
- internal padding `0.25 cm` pada keempat sisi.

Body copy di dalam viewport menggunakan Poppins `14 pt` agar nyaman dibaca anak.
Ukuran dapat berubah hanya untuk heading/label khusus atau fallback overflow
deterministik yang ditetapkan design system; body copy default tidak boleh
diam-diam diperkecil. Cover memakai coordinate registry tersendiri dan tidak
menggunakan viewport ini.

Background tetap full A4. Content viewport, bukan background, menjadi ownership
DOM legacy. Detail coordinate registry berada di
`docs/VISUAL_PARITY_SPEC.md`.

### 12.2 Aset kanonis

| Page role            | Asset                                                                |
| -------------------- | -------------------------------------------------------------------- |
| Front cover          | `back-module/cover-scl.svg`                                        |
| Guide/TOC sisi kiri  | `back-module/beginning-kiri-scl.svg`                               |
| Guide/TOC sisi kanan | `back-module/beginning-kanan-scl.svg`                              |
| Session opener kiri  | `back-module/beginning-kiri-scl.svg`                               |
| Session opener kanan | `back-module/beginning-kanan-scl.svg` — tidak dipakai default MVP |
| Content kiri         | `back-module/plain-kiri-scl.svg`                                   |
| Content kanan/filler | `back-module/plain-kanan-scl.svg`                                  |
| Back cover           | `back-module/back-cover-scl.svg`                                   |

SVG adalah background kanonis. Konten dinamis ditempatkan sebagai HTML/CSS overlay; source SVG tidak dimodifikasi per generate.

### 12.3 Urutan buku

1. Front cover pada sisi kanan/recto hardcover.
2. Satu halaman kosong pada verso setelah cover.
3. Halaman Hak Cipta.
4. Halaman Peringatan Penggunaan.
5. Panduan Penggunaan lengkap, satu atau lebih halaman.
6. Daftar isi satu atau lebih halaman.
7. Session 1–12 yang tersedia, sesuai urutan session.
8. Filler pages yang diperlukan untuk spread alignment.
9. Back cover.

Halaman kosong merupakan bagian komposisi hardcover dan tidak memuat header,
nomor halaman, TOC entry, atau hidden content. Copy Hak Cipta dan Peringatan
Penggunaan harus berasal dari approved static configuration/template; perubahan
legal copy membutuhkan owner approval dan tidak boleh dihasilkan oleh AI saat
runtime.

Halaman Hak Cipta memakai `beginning-kanan-scl.svg` dan Peringatan Penggunaan
memakai `beginning-kiri-scl.svg`, mengikuti sisi fisik. Legal text ditempatkan
pada satu card native HTML yang floating/centered di safe area. Tidak ada
pattern, garis, atau dekorasi tambahan di luar canonical beginning background,
card, dan nomor halaman romawi pada footer slot.

### 12.4 Cover

- TITLE menggunakan label course uppercase.
- Subtitle menggunakan label level, contoh `LEVEL 1`.
- Cover tidak menampilkan header atau nomor halaman.
- Title/subtitle adalah native HTML overlay dengan fixed coordinate registry,
  bukan text box Slides. Initial coordinates dan optical-QA contract berada di
  `docs/VISUAL_PARITY_SPEC.md`.
- Cover tidak masuk TOC.

### 12.5 Guide dan TOC

Guide menjelaskan bagian-bagian buku dengan nama, fungsi, dan contoh visual
ringkas: Tujuan Belajar, Materi dan Langkah, Tutor Says, Did You Know, Kamus
Coder, gambar/tabel, MUST DO, SHOULD DO, ASPIRE TO DO, self-check, mini quiz,
dan page break. Guide bukan paragraf generik; pembaca harus dapat mencocokkan
setiap penjelasan dengan treatment visual yang ditemui di sesi. Bila satu page
tidak cukup pada Poppins 14 pt, Guide menjadi spread/multi-page dan tidak boleh
mengecilkan body copy di bawah default hanya agar dipaksakan muat.

Setiap entry Guide wajib memiliki miniature/example visual dari treatment
aktual—bukan teks penjelasan saja—agar anak dapat mengenali bentuknya saat muncul
di session. Miniature menggunakan shared component CSS/DOM atau sanitized
snapshot; tidak mengambil screenshot/data privat dari Spreadsheet production.

Guide menampilkan CTA Interactive Slide (INS) dengan label yang ramah anak dan
URL publik lengkap `https://www.kalananti.id/scl-student`. Pada HTML URL menjadi
link HTTPS dengan `target="_blank"` dan `rel="noopener noreferrer"`; pada PDF URL
tetap tercetak terbaca. QR hanya ditambahkan bila generator/aset resmi tersedia
dan hasil scan diverifikasi—bukan melalui layanan QR pihak ketiga saat runtime.

Guide dan TOC memakai background `beginning` sesuai sisi fisik halaman:
`beginning-kiri-scl.svg` pada sisi kiri dan `beginning-kanan-scl.svg` pada sisi
kanan. Jika TOC menjadi lebih dari satu halaman, background berganti mengikuti
parity global, bukan memakai satu background yang sama untuk semua halaman.

TOC:

- hanya memuat session yang memiliki row;
- menampilkan `Session N`, topic, dan nomor session opener;
- menggunakan nomor hasil pagination aktual;
- diperbarui setelah filler insertion;
- menambah halaman TOC jika content tidak muat;
- menjalankan pagination ulang sampai page count stabil atau batas iterasi tercapai.

### 12.6 Session opener dan header

Setiap session opener:

- selalu berada pada page side kiri;
- menggunakan `beginning-kiri-scl.svg`;
- menampilkan header dua baris:

```text
Session 1:
Making Obby Game Part 1
```

- baris kedua berasal dari `Session-topic`;
- menjadi target entry TOC;
- menggunakan design approved untuk session divider/content.

`Session-topic` memiliki soft limit default 80 karakter. Nilai yang lebih panjang tidak dipotong pada source Sheet: editor menampilkan warning, opener melakukan shrink-to-fit deterministik tanpa ellipsis agar seluruh judul tetap terlihat, dan content-page header boleh wrap pada baris sekunder. Editor, history, dan TOC mempertahankan teks lengkap.

Seluruh content page session tetap menampilkan session header yang sama pada header slot template.

Header slot memiliki fixed safe-area. Width/height tidak boleh mengikuti
panjang placeholder atau `fit-content`; font reduction/wrap/ellipsis mengikuti
policy deterministik pada `docs/VISUAL_PARITY_SPEC.md`.

### 12.7 Spread parity dan filler

Cover dianggap sisi kanan/recto. Halaman berikutnya bergantian kiri–kanan secara global.

Sebelum session opener dibuat, renderer memeriksa next page side:

- jika next side kiri, opener langsung dibuat;
- jika next side kanan, renderer menyisipkan filler kanan.

Filler:

- menggunakan `plain-kanan-scl.svg`;
- menampilkan header session sebelumnya;
- body kosong;
- tidak menampilkan nomor halaman;
- tidak masuk TOC;
- tetap dihitung sebagai physical PDF page untuk parity.

Front matter harus distabilkan agar Session 1 tidak membutuhkan filler tanpa previous session. Jika filler pra-Session 1 tetap diperlukan karena TOC berkembang, filler menggunakan header modul generik dan menghasilkan warning visual QA sampai disetujui Design.

### 12.8 Page numbering

- Cover dan back cover tidak bernomor.
- Front matter dapat memakai angka Romawi kecil.
- Content numbering memakai angka Arab.
- Filler tidak menampilkan nomor, tetapi physical index tetap bertambah.
- Nomor yang terlihat dan nomor TOC harus berasal dari satu pagination model.
- Perubahan edit, image size, table, atau filler memicu recompute.
- Text nomor halaman memakai native HTML dengan coordinate terpisah untuk page
  kiri dan kanan; tidak memakai mirror approximation atau textbox autofit.

### 12.9 Baseline visual approved

Content-page header wajib menampilkan nomor session dan topic pada ribbon yang
sama, dengan `Session N` sebagai teks dominan dan topic sebagai baris sekunder
yang lebih kecil. Semua objective non-kosong hanya dirender satu kali di kotak **Di sesi ini
kamu akan** pada opener; objective tidak diulang sebagai block awal halaman isi.
Bullet dan numbered list memakai marker visual Kalananti, bukan marker browser
default. Pagination tidak boleh menyembunyikan bagian block dengan viewport crop.
Sisa ruang opener setelah objective/chips adalah flow region pertama untuk
materials; block yang tidak muat dilanjutkan ke content page berikutnya.

Live preview editor memiliki viewport vertikal sampai mendekati bawah layar dan
zoom screen-only yang dapat diperbesar, diperkecil, atau dikembalikan ke fit;
zoom tidak mengubah geometry print. `SERVER_BUSY` bersifat retryable dan tidak
boleh menjatuhkan lease yang masih valid.

Visual cards, typography hierarchy, illustration treatment, Tutor Says, Did You
Know, objectives, tasks, quiz, content flow, resize, repagination, dan editor
behavior harus mempertahankan implementasi aktual
`../book-editor-rework/templates/modern.html`. Normative geometry dan QA berada
di `docs/VISUAL_PARITY_SPEC.md`. Adaptasi yang diizinkan hanya:

- legacy content canvas ditempatkan pada full-page A4 template;
- background menggunakan enam aset `back-module` kanonis;
- Google Slides/export raster dihapus;
- checkbox kosong diubah menjadi static icon;
- Python ditambahkan melalui course configuration yang sama;
- tabel HTML menjadi block resmi;
- output akhir menggunakan browser print.
- collaboration/persistence memakai backend Apps Script revision-aware.

Perubahan estetika lain memerlukan persetujuan baru dan tidak boleh terselip dalam fase pagination/backend.

---

## 13. Pagination dan Reflow

### 13.1 Prinsip

- Pagination mengukur DOM nyata pada A4 measurement surface.
- Renderer tidak mengandalkan perkiraan jumlah karakter.
- Tidak boleh ada content yang hilang, clipped, atau tersembunyi.
- Halaman preview dan halaman print berasal dari DOM/model yang sama.

### 13.2 Atomic dan splittable blocks

Atomic jika muat:

- session header/opener;
- image + caption;
- satu quiz question dengan options;
- satu table row;
- satu task item;
- short Tutor Says/Did You Know bubble;
- heading dengan paragraf pertama setelahnya.

Splittable:

- material section panjang;
- list panjang;
- task card berisi banyak item;
- bubble lebih dari satu halaman;
- table lintas halaman;
- quiz stack lintas halaman.

Continuation harus memiliki label yang jelas, misalnya `(Lanjutan)`, dan tidak menggandakan isi.

### 13.3 Pagination sequence

1. Bangun normalized full-level model.
2. Bangun front matter draft.
3. Bangun session blocks tanpa nomor final.
4. Tunggu font dan image readiness/error completion.
5. Ukur dan paginate.
6. Sisipkan filler untuk session-left rule.
7. Hitung anchor session dan nomor halaman.
8. Bangun TOC dari anchor aktual.
9. Paginate ulang karena tinggi TOC dapat berubah.
10. Ulangi sampai page count dan TOC stabil, maksimal lima iterasi secara default.
11. Jalankan overflow scan dan print preflight.

Jika belum stabil setelah batas iterasi, renderer berhenti deterministik dengan blocking error `TOC_STABILIZATION_LIMIT`; renderer tidak boleh melanjutkan loop atau mencetak nomor yang belum final.

### 13.4 Reflow triggers

- load level;
- rich text edit setelah debounce;
- block reorder;
- image load/error;
- image resize selesai;
- insert/edit/delete table;
- manual page break;
- restore revision;
- session status berubah;
- print preparation.

### 13.5 Scroll and selection stability

- Reflow mempertahankan block anchor yang sedang diedit.
- Cursor tidak boleh lompat ke awal document setelah autosave.
- Preview scroll tidak boleh mengubah editor selection.
- Reflow request lama harus dibatalkan/diabaikan bila request baru dimulai.

---

## 14. Preview, Print, dan PDF

### 14.1 Preview workspace

Preview menampilkan:

- A4 pages dengan shadow di screen mode;
- zoom terpisah dari print scale;
- page count;
- TOC navigation;
- warning badges;
- current page highlight;
- print readiness.

Pada session edit mode, panel preview menampilkan opener dan content pages untuk
session aktif. Paged editor mengikuti draft secara live, termasuk
background, image sizing, component styling, manual page break, dan pagination.
Full-level preview tetap digunakan untuk TOC, filler parity, preflight, dan satu
PDF course + level.

Preview tidak menyisipkan editor control ke print DOM.

### 14.2 Print engine

Browser print adalah jalur output resmi MVP.

- Text tetap selectable/vector.
- SVG tetap vector/tajam.
- Background printing diaktifkan melalui CSS dan instruksi user.
- `html2pdf.js`/html2canvas raster bukan jalur utama.
- Print action menggunakan hasil pagination final, bukan membangun ulang layout berbeda.
- Tidak ada intermediate PNG/JPEG untuk satu halaman penuh dan tidak ada
  Google Slides API pada output path.

### 14.3 Print CSS

- `@page { size: A4; margin: 0; }`.
- Satu `.page` menjadi satu printed page.
- Tidak ada browser header/footer dalam acceptance artifact.
- Toolbar/sidebar/modal disembunyikan.
- Shadow, gap, zoom transform, dan screen background dihapus.
- Color adjustment mempertahankan background dan brand colors.
- Link boleh tetap clickable bila browser PDF mendukung.

### 14.4 Print gate

Blocking:

- duplicate row identity;
- source session tidak dapat dibaca;
- image missing/unfetchable;
- image lolos server preflight tetapi gagal `load/decode` atau timeout di browser;
- unresolved table anchor;
- element overflow setelah fallback;
- TOC tidak stabil;
- lock owner memiliki unsaved changes saat print dimulai;
- autosave flush gagal dan user belum memilih print dari last saved revision.

Warning dengan acknowledgement:

- jumlah Ready session kurang dari 12;
- low-resolution image;
- unused `kc`/`fyk` definition;
- marker tidak memiliki pasangan tetapi placeholder telah terlihat;
- duplicate task content;
- topic terlalu panjang tetapi berhasil shrink/wrap;
- session Incomplete tidak ikut output.

---

## 15. Validation dan Status UX

### 15.1 Severity

| Severity     | Perilaku                               |
| ------------ | -------------------------------------- |
| `INFO`     | Informasi tanpa tindakan wajib         |
| `WARNING`  | Print boleh setelah acknowledgement    |
| `BLOCKING` | Print tidak tersedia sampai diperbaiki |

### 15.2 Validation rules minimum

- Schema/header tidak ditemukan.
- Level/session kosong.
- Duplicate Level + Session.
- Session topic kosong.
- Objectives/materials kosong.
- `kcN*`/`kcN:` mismatch.
- `fykN*`/`fykN:` mismatch.
- Image URL bukan HTTPS atau MIME bukan image.
- Image fetch gagal atau resolusi rendah.
- Image client `load/decode` gagal atau melewati timeout.
- Hidden storage schema hilang, tidak lengkap, corrupt, atau ambigu.
- Table anchor stale/overflow.
- Quiz question/options mismatch.
- Exact duplicate Should Do/Aspire To Do.
- Page overflow.
- TOC/session anchor mismatch.
- TOC stabilization melewati configured iteration cap.
- `Session-topic` melewati soft limit tanpa source truncation.
- Kurang dari 12 session.

### 15.3 Status copy

Backend activity feedback:

- Setiap operasi yang dipicu user dan menunggu server—termasuk load level,
  aktivasi/penutupan akses edit, autosave, restore, reload source, compose, dan
  preflight—menampilkan soft notification di bagian atas seketika.
- Notification memiliki state `loading`, `success`, `warning`, atau `error`,
  tidak memblokir seluruh editor kecuali bootstrap/login/logout yang memang
  mengubah authentication surface, dan dapat ditutup tanpa membatalkan operasi.
- Success boleh auto-dismiss; warning/error harus tetap actionable dan dapat
  ditutup manual. Backend error tidak memakai native JavaScript `alert` atau
  `confirm`.
- Panggilan client memiliki timeout bounded sesuai kelas operasi. Timeout atau
  network failure harus menjelaskan bahwa recovery draft tetap aman dan tidak
  boleh membuat tombol tampak menggantung tanpa status.

Autosave:

- `Belum tersimpan`
- `Menyimpan…`
- `Tersimpan`
- `Tersimpan lokal — koneksi terputus`
- `Gagal menyimpan — akan dicoba lagi`
- `Session berubah di sumber — muat ulang diperlukan`

Akses edit:

- `Bisa diedit`
- `Sedang diedit orang lain` dengan nama editor dan aktivitas terakhir
- `Akses edit berakhir` disertai penjelasan bahwa draft tetap aman
- CTA utama `Aktifkan edit lagi`; user tidak diminta menebak apakah harus refresh
- Istilah implementasi `lease`, `heartbeat`, dan `lock` tidak ditampilkan sebagai
  instruksi kepada editor.
- Aktivasi ulang membandingkan revision source. Jika revision sama, editor dapat
  melanjutkan dan autosave berjalan kembali. Jika revision berubah, source
  terbaru dimuat dan draft lama tetap tersedia melalui pilihan eksplisit
  `Gunakan draft`; draft tidak diterapkan otomatis.

Level:

- `{readyCount} dari 12 session siap`
- `On Progress`
- `Incomplete`
- `Needs Fix`

### 15.4 Error contract

Semua server method mengembalikan envelope konsisten:

```json
{
  "ok": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Session berubah sejak terakhir dimuat.",
    "retryable": false,
    "details": {}
  }
}
```

Message untuk user tidak boleh memuat stack trace, Spreadsheet ID, credential, token, atau raw remote response.

---

## 16. Arsitektur Teknis

### 16.1 Diagram konteks

```text
Browser / Apps Script HTML Service
  |-- team passcode gate
  |-- course + level selector
  |-- session block editor
  |-- A4 preview + pagination
  |-- local recovery draft
  |-- browser print
  |
  | google.script.run
  v
Apps Script backend
  |-- auth/session validation
  |-- course allowlist
  |-- RichTextValue parser/serializer
  |-- lock + revision transaction
  |-- image validation/fetch
  |-- setup/maintenance hidden tabs
  v
Google Spreadsheet SSOT
  |-- B2C_*_Modul
  |-- _Generator_Tables
  |-- _Generator_Locks
  |-- _Generator_History
  `-- _Generator_Audit
```

### 16.2 Boundary

- Browser tidak menerima Spreadsheet ID dari arbitrary input.
- Browser hanya mengirim course key, level, session, changes, revision, dan token yang dibutuhkan.
- Spreadsheet ID dan secrets berada di Script Properties.
- Client tidak dapat memilih arbitrary tab/range.
- Server tidak menerima raw HTML sebagai source of truth.
- Browser memiliki ownership pagination dan print layout.
- Server memiliki ownership data, auth, lock, history, dan validation source.

### 16.3 Browser RPC dan Spreadsheet batch I/O

Satu aksi `loadLevelProject` dari browser harus menggunakan satu `google.script.run` RPC. Backend kemudian membaca data melalui bulk range operations; per-cell atau per-row service calls di dalam loop dilarang pada load path.

- **ARCH-001** — Source tab dibaca dengan satu bounded rectangular `getValues()` dan satu `getRichTextValues()` untuk range data yang sama, bukan `getValue()`/`getRichTextValue()` berulang.
- **ARCH-002** — Hidden table/history/lock data yang diperlukan dibaca dengan bounded batch range per tab dan difilter di memory.
- **ARCH-003** — Backend tidak boleh memanggil browser RPC terpisah untuk setiap session; 12 session dikembalikan dalam satu normalized level response.
- **ARCH-004** — Write path mengelompokkan adjacent changed cells ketika aman, menggunakan `setValues()`/`setRichTextValues()` secara batch, dan tidak menyentuh field yang tidak berubah.
- **ARCH-005** — Instrumentation test harus dapat menghitung Spreadsheet service read/write calls untuk mencegah regresi N+1.
- **ARCH-006** — Bounded range ditentukan dari header row sampai last relevant row/column; full-sheet ranges tanpa batas tidak digunakan.

### 16.4 Suggested Apps Script methods

| Method                                        | Fungsi                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `getAppBootstrap()`                         | Public shell/config status tanpa content sensitif                                       |
| `authenticateEditor(passcode, label)`       | Validasi passcode dan issue session token                                               |
| `logoutEditor(token)`                       | Invalidasi/best-effort logout                                                           |
| `listCoursesAndLevels(token)`               | Course allowlist dan level summary                                                      |
| `loadLevelProject(token, courseKey, level)` | Normalized 12-session project                                                           |
| `acquireSessionLease(...)`                  | Peroleh lock session                                                                    |
| `heartbeatSessionLease(...)`                | Perpanjang lease                                                                        |
| `releaseSessionLease(...)`                  | Lepas lease                                                                             |
| `saveSessionPatch(...)`                     | Revision-aware autosave                                                                 |
| `getSessionHistory(...)`                    | 20 revision terakhir                                                                    |
| `restoreSessionRevision(...)`               | Restore revision                                                                        |
| `validateImageUrl(...)`                     | MIME/size/resolution preflight                                                          |
| `setupGeneratorStorage()`                   | Idempotent hidden tab setup, schema verification, dan safe repair; owner-only operation |

Nama method dapat berubah, tetapi ownership dan kontraknya tidak.

### 16.5 Suggested project structure

```text
module-generator-scl/
├── PRD.md
├── prd-awal.md
├── back-module/
├── src/
│   ├── Code.gs
│   ├── Auth.gs
│   ├── DataStore.gs
│   ├── RichText.gs
│   ├── Locks.gs
│   ├── History.gs
│   ├── Images.gs
│   ├── index.html
│   ├── Styles.html
│   ├── App.html
│   ├── Editor.html
│   └── Pagination.html
├── tests/
├── scripts/
├── appsscript.json
└── .clasp.json
```

Pemisahan file adalah logical ownership. Build/include dapat disesuaikan dengan batas HTML Service.

---

## 17. Security dan Konfigurasi

### 17.1 Deployment model

- Web App target: accessible as `Anyone` jika Workspace policy mengizinkan.
- Execute as: deployment owner agar user tidak membutuhkan direct Spreadsheet permission.
- Semua content/save method tetap memerlukan valid app session token.
- Public `doGet()` hanya menyajikan shell login, bukan module data.

### 17.2 Script Properties

Minimum configuration:

| Property                       | Fungsi                                       |
| ------------------------------ | -------------------------------------------- |
| `SCL_SPREADSHEET_ID`         | Source Spreadsheet                           |
| `SCL_PASSWORD_SALT`          | Salt password hash                           |
| `SCL_PASSWORD_HASH`          | Hash team passcode, bukan plaintext          |
| `SCL_SESSION_SIGNING_SECRET` | Menandatangani session token                 |
| `SCL_IMAGE_MAX_BYTES`        | Batas image configurable                     |
| `SCL_SESSION_TTL_SECONDS`    | Optional override; default`43200` (12 jam) |
| `SCL_TOC_MAX_ITERATIONS`     | Optional override; default`5`              |
| `SCL_TOPIC_MAX_CHARS`        | Optional soft-limit override; default`80`  |

Credential yang pernah dibagikan selama discovery tidak boleh disalin ke PRD/source dan harus dirotasi sebelum production release.

### 17.3 Authentication requirements

- Passcode diverifikasi server-side menggunakan constant-time comparison sejauh tersedia.
- Plaintext passcode tidak disimpan atau dicatat.
- Session token memiliki signature dan absolute expiry default 12 jam; aktivitas tidak boleh memperpanjang token melewati expiry tersebut.
- Token disimpan di `sessionStorage`, bukan persistent localStorage.
- Semua mutating call memvalidasi token dan expiry.
- Login failure dirate-limit berdasarkan temporary user key/cache best effort.
- Email Google digunakan hanya jika tersedia; fallback editor label harus ditandai sebagai self-declared.

### 17.4 Content security

- Escape text sebelum membuat DOM.
- Rich text hanya menghasilkan allowlisted tags/styles.
- Link menggunakan `rel="noopener noreferrer"`.
- URL protocols di-allowlist.
- Table JSON divalidasi schema dan ukuran.
- Tidak menggunakan `eval`, inline arbitrary script dari Sheet, atau raw iframe.
- Answer key tidak masuk client print model.

### 17.5 Data governance

- Source data tidak dikirim ke third-party service.
- Image fetch hanya menuju source URL terkait content.
- Audit tidak menyimpan full content kecuali history snapshot yang memang diperlukan.
- History dan hidden tabs tetap berada dalam Spreadsheet yang sama.

---

## 18. Performance, Reliability, dan Limits

### 18.1 Performance targets awal

- Login response normal: ≤3 detik.
- Daftar course/level: ≤5 detik untuk workbook normal.
- Load normalized satu level: target ≤10 detik sebelum image completion.
- Editor session aktif terlihat sebelum full-level pagination selesai.
- Autosave acknowledgement normal: target ≤5 detik setelah request dikirim.
- Heartbeat tidak mengganggu typing/reflow.
- Reflow edit kecil: target visual response ≤1,5 detik setelah debounce.
- Print preview level lengkap: progress harus terlihat bila melebihi 3 detik.

Target harus divalidasi terhadap workbook terbesar dan quota Apps Script aktual sebelum production.

Target load ≤10 detik mengasumsikan satu browser RPC dan bounded batch reads. Implementasi yang membaca rich text atau value per-cell/per-row dianggap gagal memenuhi arsitektur meskipun fixture kecil masih terlihat cepat.

### 18.2 Reliability

- Save transaction idempotent berdasarkan request ID.
- Retry tidak boleh menggandakan history entry.
- Timeout autosave mempertahankan local draft.
- Image error selalu menyelesaikan loading lifecycle.
- Pagination memiliki iteration cap default lima.
- Hidden tab setup dan safe auto-healing idempotent serta non-destruktif.
- Cleanup history tidak boleh menghapus revision baru bila save gagal.

### 18.3 Local recovery

Local draft key harus namespace per Spreadsheet configuration, course, level, session, dan schema version. Draft menyimpan:

- changed field representation;
- table changes;
- base revision;
- timestamp;
- editor label;
- unsaved status.

Jika source revision berubah, draft tidak otomatis diterapkan; user melihat compare/recovery prompt.

---

## 19. Accessibility dan Responsiveness

- Editor utama dioptimalkan untuk desktop/laptop.
- Tablet dapat review dan edit sederhana; mobile minimum mendukung login/read-only/status.
- Semua toolbar control memiliki accessible name.
- Keyboard mendukung undo/redo, save flush, heading/list, dan table navigation dasar.
- Focus terlihat dan tidak hilang setelah reflow.
- Status tidak bergantung pada warna saja.
- Modal lock/conflict dapat digunakan dengan keyboard.
- Preview zoom tidak memengaruhi browser zoom accessibility.
- Contrast mengikuti WCAG AA sejauh kompatibel dengan approved brand design.
- `prefers-reduced-motion` mematikan animasi non-esensial.

---

## 20. Observability dan Operations

### 20.1 Logging

Log minimum:

- request ID;
- method/action;
- duration;
- success/error code;
- course key/normalized level/session bila aman;
- row count;
- warning count;
- Spreadsheet service read/write call count untuk sampled performance diagnostics;
- lock lifecycle metadata.

Jangan log passcode, token, image bytes, full field values, Spreadsheet ID, atau quiz answers.

### 20.2 Deployment state

Status berikut selalu dibedakan:

1. **Local source** — file dalam repository.
2. **Apps Script current code / HEAD** — hasil push terbaru.
3. **Versioned production deployment** — immutable version yang digunakan URL `/exec`.

`clasp push` tidak otomatis berarti production URL sudah memakai source tersebut. Release production memerlukan checks, push, version creation, dan deployment update yang eksplisit.

### 20.3 Runbook minimum

- Membuat Apps Script project.
- Mengisi Script Properties tanpa menaruh secret di repo.
- Menjalankan hidden tab setup.
- Menjalankan hidden tab schema health check dan memverifikasi tidak ada corrupt-schema blocking diagnostic.
- Memberi deployment owner akses edit ke Spreadsheet.
- Push current code.
- Verifikasi `/dev`.
- Membuat version dan memperbarui `/exec`.
- Rotasi credential.
- Rollback ke version sebelumnya.

---

## 21. Acceptance Criteria

### 21.1 Akses dan konfigurasi

- **AC-001** — URL publik hanya menampilkan login shell sebelum autentikasi.
- **AC-002** — Login shell meminta passcode dan nama/email kerja sejak awal;
  tombol login menunggu keduanya lengkap, passcode valid menghasilkan temporary
  session, dan passcode invalid tidak membocorkan detail.
- **AC-003** — Secret tidak ditemukan pada source, HTML, PRD, log, atau network response.
- **AC-004** — Spreadsheet ID dan tab allowlist hanya dimiliki server.

### 21.2 Data dan schema

- **AC-005** — Tiga course memetakan ke tiga tab yang disetujui.
- **AC-006** — Tab `_INS` tidak pernah dibaca sebagai source modul.
- **AC-007** — Header row ditemukan walaupun bukan row 1.
- **AC-008** — Level + Session duplicate memblokir row terkait.
- **AC-009** — Satu level menampilkan 12 slot dan Ready count.
- **AC-010** — Missing session tampil On Progress tanpa membuat empty output page.

### 21.3 Grammar dan rendering

- **AC-011** — Rich text bold/italic/underline/link round-trip tanpa Markdown baru.
- **AC-011A** — Legacy Markdown heading/emphasis pada SSOT dibaca tanpa delimiter
  literal; native rich-text runs dan fenced-code content tetap aman.
- **AC-012** — `kcN*` menarik `kcN:` dan merender Tutor Says pada lokasi marker.
- **AC-013** — `fykN*` menarik `fykN:` dan merender Did You Know pada lokasi marker.
- **AC-014** — Marker order mengikuti `materials`, termasuk `fyk4*` sebelum `fyk1*`.
- **AC-015** — Marker mismatch terlihat sebagai warning, bukan content loss.
- **AC-016** — `quiz_answers` tidak ditemukan pada DOM preview/print atau PDF text extraction.
- **AC-017** — Pipe pada quiz options tidak diproses sebagai tabel.
- **AC-017A** — Triple-backtick pada materials Python menjadi panel IDE yang
  aman, tanpa delimiter terlihat atau eksekusi HTML dari isi code.

### 21.4 Editor

- **AC-018** — Text dan supported rich formatting dapat diedit.
- **AC-018A** — Authoring tampil sebagai continuous document flow; normalized
  block model tidak dipresentasikan sebagai card form permanen per baris.
- **AC-018B** — Session diedit langsung pada live document/A4 surface yang
  memakai renderer dan background kanonis yang sama dengan print; tidak ada
  read-only preview terpisah sebagai authoring surface utama.
- **AC-018C** — Insert/delete text dan resize image mereflow content berikutnya
  naik/turun serta menghitung ulang page boundary maksimal 300 ms setelah input,
  tanpa kehilangan caret, selection, atau scroll anchor.
- **AC-018D** — HTTPS image URL yang dipaste sebagai standalone line atau
  dimasukkan melalui toolbar berubah menjadi visual image block yang dapat
  dipilih, diganti, dihapus, dan di-resize proporsional in-place.
- **AC-019** — Gambar URL dapat ditambah, diganti, dihapus, dan di-resize;
  gambar tanpa resize eksplisit mulai pada 69% lebar viewport dan seluruh image
  block diratakan horizontal ke tengah.
- **AC-019A** — Width eksplisit 25–100% tetap dipertahankan, dan delayed image
  readiness memicu repagination tanpa clipping content atau gambar.
- **AC-020** — Non-HTTPS/non-image URL ditolak dengan pesan jelas.
- **AC-021** — Block dapat dipindahkan tanpa mengubah isi marker.
- **AC-022** — Undo/redo tidak merusak normalized model.
- **AC-023** — Manual page break bertahan setelah reload.
- **AC-024** — Must Do dan self-check memakai static icons, bukan input checkbox.

### 21.5 Tabel

- **AC-025** — Insert Table menghasilkan semantic HTML table.
- **AC-026** — Tabel bertahan setelah autosave/reload tanpa raw HTML di `materials`.
- **AC-027** — Table header diulang pada continuation page.
- **AC-028** — Table row tidak terpotong jika row dapat muat pada satu halaman.
- **AC-029** — Stale table anchor memblokir print sampai ditempatkan ulang.

### 21.6 Lock dan autosave

- **AC-030** — Dua pengguna tidak dapat memperoleh active lease pada row key yang sama.
- **AC-031** — Pengguna lain tetap dapat mengedit session berbeda.
- **AC-032** — Session yang sedang diedit orang lain tersedia dalam mode hanya
  baca dengan editor label, last activity, dan retry CTA yang jelas.
- **AC-033** — Heartbeat memperpanjang lease dan stale lease berakhir setelah 1 menit.
- **AC-033A** — Saat akses edit berakhir, editor menjadi hanya baca, draft lokal
  dipertahankan, CTA `Aktifkan edit lagi` terlihat, dan aktivasi ulang melakukan
  revision check sebelum edit atau autosave dibuka kembali.
- **AC-034** — Autosave berjalan 5 detik setelah idle, termasuk setelah user
  memilih recovery draft, dan menampilkan transisi loading/success/retry/error.
- **AC-034A** — Operasi backend yang dipicu user menampilkan soft notification
  closable serta button busy state; network timeout bersifat bounded dan tidak
  meninggalkan UI menggantung tanpa hasil.
- **AC-035** — Revision conflict tidak melakukan last-write-wins.
- **AC-036** — Offline/save failure mempertahankan local recovery draft.
- **AC-037** — History mempertahankan 20 revision terakhir per session.
- **AC-038** — Restore menghasilkan revision baru dan dapat di-undo melalui history.

### 21.7 Pagination dan spread

- **AC-039** — Semua session opener berada pada side kiri.
- **AC-040** — Filler kanan dibuat hanya ketika dibutuhkan oleh global parity.
- **AC-041** — Filler memakai plain kanan, header session sebelumnya, tanpa body/nomor/TOC entry.
- **AC-042** — TOC menunjuk opener setelah filler insertion.
- **AC-043** — Tidak ada visible atau hidden overflow pada seluruh page.
- **AC-044** — Bubble, task, quiz, dan table continuation tidak menduplikasi/menghilangkan content.
- **AC-045** — TOC stabilization berhenti deterministik atau menghasilkan blocking error.

### 21.8 PDF

- **AC-046** — Print menghasilkan A4 portrait tanpa browser header/footer.
- **AC-047** — Text PDF tetap selectable.
- **AC-048** — SVG/background tidak pecah pada zoom normal dan tinggi.
- **AC-049** — Image missing memblokir print; low DPI menampilkan warning.
- **AC-050** — Cover, guide, TOC, seluruh Ready session, filler yang dibutuhkan, dan back cover berada dalam urutan benar.
- **AC-051** — Roblox, Scratch, dan Python masing-masing memiliki satu golden PDF yang lolos rendered visual inspection.

### 21.9 Operations

- **AC-052** — Hidden tab setup aman dijalankan ulang.
- **AC-053** — Log dan audit tidak mengandung secret/full payload.
- **AC-054** — Local, current code, dan production deployment dapat diidentifikasi.
- **AC-055** — Release baru memiliki documented checks dan rollback version.

### 21.10 Technical resilience

- **AC-056** — Load satu level menggunakan satu browser RPC, bounded bulk `getValues()`/`getRichTextValues()`, dan tidak memiliki per-cell/per-row Spreadsheet service loop.
- **AC-057** — Print gate tetap terkunci sampai seluruh expected image berhasil `load/decode`; client error/timeout menghasilkan placeholder dan blocking diagnostic.
- **AC-058** — Bootstrap membuat hidden tab yang hilang dan menambah kolom kanonis yang hilang secara non-destruktif; schema corrupt/ambigu memblokir mutation tanpa menimpa data.
- **AC-059** — Editor session token kedaluwarsa maksimal 12 jam secara default dan tidak dapat digunakan untuk mutation setelah expiry.
- **AC-060** — TOC stabilization berhenti setelah maksimal lima iterasi default dan menghasilkan `TOC_STABILIZATION_LIMIT` bila belum stabil.
- **AC-061** — `Session-topic` lebih dari 80 karakter menghasilkan warning; source tetap utuh dan opener menampilkan seluruh judul tanpa ellipsis melalui shrink-to-fit, sementara content-page header dapat wrap tanpa overflow.
- **AC-061A** — Markdown H1 tampil sebagai heading-card dominan dan H2/H3
  sebagai heading-card sekunder yang lebih kecil, konsisten dengan visual
  `Tahap/Bagian/Langkah` antara editor dan A4 preview/print.

### 21.11 PRD v2 visual parity dan collaborative layout

- **AC-062** — Apps Script authoring surface memakai DOM/CSS/component flow
  legacy dari `book-editor-rework/templates/modern.html`, bukan renderer visual
  v1 yang dibangun ulang.
- **AC-063** — Empat template non-cover memakai content viewport `x=1.38 cm`,
  `y=3.22 cm`, `width=18.38 cm`, `height=23.86 cm`, dan internal padding
  `0.25 cm` di atas full-page A4 background; body copy default adalah Poppins
  `14 pt`.
- **AC-064** — Cover title/subtitle, header, topic, TOC text, dan page number
  adalah native HTML dengan coordinate registry; tidak ada Slides
  textbox/autofit atau intrinsic `fit-content` positioning.
- **AC-065** — Golden fixture legacy dan Apps Script menghasilkan content order,
  component family, wrapping, dan geometry yang sama dalam tolerance
  `docs/VISUAL_PARITY_SPEC.md`.
- **AC-065A** — Guide menjelaskan treatment bagian-bagian buku dan Guide/TOC
  memakai pasangan background `beginning` yang mengikuti sisi fisik halaman.
- **AC-065B** — Front matter berurutan cover, blank verso, Hak Cipta, Peringatan
  Penggunaan, Guide lengkap, lalu TOC; blank page tidak berisi hidden content.
- **AC-065C** — Guide memuat CTA INS ke
  `https://www.kalananti.id/scl-student`; URL clickable pada HTML dan tetap
  terbaca pada PDF tanpa redirect/QR service pihak ketiga saat runtime.
- **AC-065D** — Hak Cipta/Peringatan memakai beginning-right/left background,
  satu centered legal card tanpa dekorasi tambahan selain nomor halaman, dan
  setiap entry Guide memiliki visual example yang match treatment aktual.
- **AC-066** — User hanya mengunci/mengedit satu session, sementara user lain
  dapat mengedit session berbeda; full-level publisher memakai revision tersimpan
  dari seluruh session.
- **AC-067** — Content edit dapat dibuka kembali dari perangkat lain melalui
  Spreadsheet SSOT; structured layout edit juga shared dan revision-aware tanpa
  menyimpan raw full-page HTML sebagai source.
- **AC-068** — Satu print action menghasilkan satu PDF lengkap untuk course +
  level yang dipilih, bukan satu PDF per session.
- **AC-069** — Editor screen, full-level preview, dan print memakai satu
  authoritative component renderer; perbedaan hanya chrome/zoom screen.
- **AC-070** — PDF tidak memiliki full-page raster screenshot; body text tetap
  selectable dan canonical SVG/background mempertahankan kualitas source.

---

## 22. Test Strategy

### 22.1 Unit tests

- Header row discovery.
- Course/tab allowlist.
- Level/session normalization.
- Duplicate identity detection.
- Rich text run normalization/serialization.
- `kc`/`fyk` extraction dan mismatch.
- Quiz parsing tanpa answer leak.
- URL/MIME validation.
- Table schema validation.
- Revision hashing.
- History retention 20 entries.
- Lock acquire/heartbeat/release/stale behavior.
- Page side/filler decision.
- Session token absolute 12-hour expiry.
- TOC stabilization berhenti tepat pada configured iteration cap.
- Session topic 80-character soft-limit behavior tanpa source truncation.

### 22.2 Integration tests

- Load and save representative row per course.
- Rich text round-trip ke temporary Spreadsheet fixture.
- Concurrent acquire request untuk row yang sama.
- Autosave idempotency dengan duplicate request ID.
- Revision conflict setelah simulated direct Sheet edit.
- Table save/reload/re-anchor.
- Image fetch success, redirect, wrong MIME, timeout, oversized response.
- One-RPC level load dan instrumentation untuk mendeteksi per-cell/per-row Spreadsheet service calls.
- Client image success versus server-success/client-failure readiness.
- Hidden tab creation, missing-column repair, unknown-column preservation, dan corrupt-schema safe mode.

Test tidak boleh menggunakan atau mengubah production Spreadsheet.

### 22.3 Browser/E2E tests

- Login/logout/session expiry.
- Course/level/session navigation.
- Locked read-only state dengan dua browser contexts.
- Typing, formatting, image URL, reorder, table, undo/redo.
- Offline autosave recovery.
- Restore history.
- Full preview dan print gate.
- Image `load/decode` timeout memblokir print dengan placeholder yang jelas.
- Session token expiry saat workspace masih terbuka.
- Desktop/tablet/mobile minimum behavior.
- No console/page errors pada happy path.

### 22.4 Pagination stress fixtures

- Tepat 12 session.
- Kurang dari 12 session.
- Topic sangat panjang.
- Long objectives/materials/tasks.
- Bubble lebih dari satu page.
- Banyak gambar berurutan.
- Low-resolution dan broken image.
- Tabel panjang lintas page.
- Satu table row oversized.
- TOC satu dan dua page.
- Fixture TOC yang tidak stabil untuk memastikan iteration cap lima.
- Session yang memerlukan filler di beberapa parity.

### 22.5 Visual/PDF QA

QA wajib menggunakan PDF yang benar-benar dirender, bukan hanya memeriksa `%PDF` signature.

Periksa:

- seluruh halaman thumbnail/contact sheet;
- cover title/subtitle placement;
- header session;
- side kiri/kanan dan filler;
- TOC/page number;
- clipping/overflow;
- table continuation;
- image sharpness;
- selectable text;
- back cover;
- late Session 12 inclusion.

---

## 23. Implementation Phases

Foundation backend lama diperlakukan sebagai reusable capability, bukan bukti
bahwa visual target v2 sudah selesai. Delivery baru memakai Migration M0–M8:

1. M0 — documentation rebaseline dan golden visual baseline;
2. M1 — Apps Script legacy-editor shell;
3. M2 — normalized-to-legacy compatibility adapter;
4. M3 — exact component renderer dan DOM pagination;
5. M4 — collaborative inline editing dan structured layout persistence;
6. M5 — deterministic A4 template/text overlay;
7. M6 — direct browser PDF dan preflight;
8. M7 — full parity/concurrency/PDF QA;
9. M8 — Apps Script HEAD sync dan separately authorized production release.

Task, dependency, status, dan exit gate authoritative berada di
`docs/IMPLEMENTATION_PLAN.md`.

---

## 24. Risks dan Mitigasi

| Risiko                                                   | Dampak                                  | Mitigasi                                                             |
| -------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| Surface Anyone membuka peluang brute force               | Unauthorized access                     | Hash, signed session, rate limit, credential rotation                |
| Email user kosong                                        | Lock/audit identity tidak terverifikasi | Best-effort email + required self-declared label                     |
| Autosave menimpa direct Sheet edit                       | Content loss                            | Lease + revision hash + conflict rejection                           |
| Browser crash meninggalkan lock                          | Session lama terblokir                  | Heartbeat dan 3-minute expiry                                        |
| Apps Script quota/latency                                | Autosave lambat                         | Debounce, patch save, batching, clear status                         |
| Per-cell RichTextValue read menghasilkan N+1 latency     | Level gagal memenuhi target load        | One RPC, bounded batch reads, call-count instrumentation             |
| Rich text round-trip hilang                              | Formatting rusak                        | Run-level parser/serializer dan golden fixture                       |
| Marker lama rusak                                        | Bubble hilang/salah posisi              | Grammar freeze, validation, round-trip tests                         |
| Table anchor berubah setelah direct edit                 | Table pindah                            | Anchor hash, blocking stale warning, reposition UI                   |
| External image hilang                                    | PDF tidak lengkap                       | Server validation, blocking print, durable-source guideline          |
| Server image preflight lolos tetapi browser gagal render | PDF memiliki placeholder/blank image    | Client load/decode readiness dan blocking print gate                 |
| Source image rendah                                      | PDF buram                               | Effective DPI warning dan no silent upscale                          |
| TOC mengubah pagination                                  | Nomor bergeser                          | Iterative stabilization dengan cap                                   |
| Filler salah parity                                      | Session opener salah sisi               | Global page-side model dan parity fixtures                           |
| Hidden tabs diedit manual                                | Lock/history corrupt                    | Hide/protect, non-destructive auto-healing, corrupt-schema safe mode |
| Answer key bocor                                         | Academic/privacy issue                  | Exclude before client renderer and PDF text test                     |
| Visual scope melebar                                     | Delivery lambat                         | Approved design freeze, separate change approval                     |

---

## 25. Definition of Done

Produk MVP dianggap selesai hanya bila:

1. PRD dan mapping visual disetujui.
2. Tiga course menggunakan shared pipeline yang sama.
3. Spreadsheet source dan hidden tabs menjadi SSOT yang dapat dipulihkan.
4. Lock/autosave/history lulus concurrency dan failure tests.
5. Grammar lama round-trip tanpa perubahan kode marker.
6. Table editor dan persistence lulus reload/pagination tests.
7. Semua page roles menggunakan aset SVG kanonis.
8. Session-left rule, filler, page number, dan TOC lulus stress fixtures.
9. Tidak ada overflow, missing content, raw HTML execution, atau answer leak.
10. Browser print menghasilkan PDF A4 dengan selectable text.
11. Golden PDF untuk Roblox, Scratch, dan Python telah diperiksa secara visual sampai Session 12 dan back cover.
12. Secrets tidak berada di repository, PRD, client HTML, atau logs.
13. Local source, Apps Script current code, dan production deployment diverifikasi terpisah.
14. Runbook setup, release, credential rotation, dan rollback tersedia.
15. Academic Content Lead menerima production behavior dan artifact final.
16. Load path tidak memiliki Spreadsheet service N+1 dan lulus call-count test.
17. Hidden storage safe auto-healing dan corrupt-schema safe mode lulus destructive-safety tests.
18. Token expiry, image client readiness, TOC iteration cap, dan long-topic policy lulus edge-case tests.

---

## 26. Requirement Traceability

| Product area         | Requirement utama                                         | Acceptance     |
| -------------------- | --------------------------------------------------------- | -------------- |
| Access               | Anyone surface + passcode session                         | AC-001–AC-004 |
| Data                 | Three-course allowlist + 12 session                       | AC-005–AC-010 |
| Grammar              | Rich text,`kc`, `fyk`, quiz                           | AC-011–AC-017 |
| Editor               | WYSIWYG, image, tasks, undo                               | AC-018–AC-024 |
| Tables               | Visual table + hidden persistence                         | AC-025–AC-029 |
| Collaboration        | Lease, autosave, history                                  | AC-030–AC-038 |
| Pagination           | Spread, filler, TOC, overflow                             | AC-039–AC-045 |
| PDF                  | A4, selectable text, image quality                        | AC-046–AC-051 |
| Operations           | Setup, logging, deployments                               | AC-052–AC-055 |
| Technical resilience | Batch I/O, image readiness, auto-healing, explicit limits | AC-056–AC-061 |

---

## 27. Open Configuration Items Sebelum Production

Keputusan produk utama sudah tertutup. Item berikut adalah konfigurasi/operasional, bukan pembukaan ulang scope:

- Pemilik Apps Script production.
- Nilai production `SCL_SPREADSHEET_ID`.
- Credential baru setelah rotation.
- Session signing secret.
- Image byte limit berdasarkan fixture terbesar.
- Konfirmasi atau override session token TTL; default `43200` detik (12 jam).
- Konfirmasi atau override maksimum TOC stabilization; default `5` iterasi.
- Konfirmasi atau override soft limit `Session-topic`; default `80` karakter tanpa source truncation.
- Daftar browser resmi untuk QA.
- Academic Content Lead yang memberikan final acceptance.
- Apakah hidden tabs akan diproteksi hanya untuk deployment owner atau maintainer group.

---

## 28. Persetujuan

| Peran                          | Nama | Status                                         | Tanggal |
| ------------------------------ | ---- | ---------------------------------------------- | ------- |
| Product/Academic Content Owner | User | PRD v2 direction approved for implementation  | 2026-08-03 |
| Design Owner                   | User | Legacy visual + canonical SVG approved         | 2026-08-03 |
| Product/Academic Content Owner | User | Post-MVP Drive publishing direction approved   | 2026-08-07 |
| Product/Academic Content Owner | User | Manual browser-print fallback accepted; renderer/direct publish deferred | 2026-08-07 |
| Technical Owner                |      | Pending                                        |         |
| QA/Reviewer                    |      | Pending                                        |         |

Setelah PRD disetujui, perubahan terhadap source tabs, grammar `kc/fyk`, session-left rule, access model, output PDF, atau approved visual baseline harus dicatat sebagai perubahan requirement, bukan dimasukkan diam-diam ke implementasi.

---

## 29. Post-MVP V2 — Drive Publishing and Operational History

Section ini menambahkan planned post-MVP scope tanpa mengubah fakta bahwa
auto-save PDF ke Drive bukan bagian MVP awal pada Section 3.3. Delivery dan gate
authoritative berada di `docs/IMPLEMENTATION_PLAN_V2.md`. Parallel track P0–P4
telah diotorisasi. P5–P6 renderer/direct publish ditunda berdasarkan keputusan
owner 7 Agustus 2026 dan bukan current completion gate selama browser
`Print / Save as PDF` menjadi output resmi. Status implementasi serta gate
eksternal aktual mengikuti plan dan `docs/WORKLOG.md`, bukan target requirement
ini; acceptance direct Drive tetap future criteria dan tidak boleh diklaim pass.

### 29.1 Product outcome

- Sidebar utama memakai logo portrait Kalananti tanpa box/crop, mempertahankan
  rasio native dengan focus treatment dan fallback yang terlihat, serta menu Dashboard,
  Spreadsheet SSOT, Activity Log, serta Published Modules; Settings tetap di
  bagian bawah.
- Top profile memakai authenticated editor identity. New Module dan Logout
  menjadi action berbeda yang sesuai label dan behavior aktual.
- Activity Log menampilkan metadata akses/aktivitas aman dari hidden audit
  storage, bukan credential atau full content.
- Compose tetap menyiapkan serta memeriksa modul dan membuka browser
  `Print / Save as PDF`. Aksi `Publish ke Drive` baru diaktifkan jika future
  P5–P6 dibuka kembali dan preflight direct publish lulus; compose sendiri tidak
  membuat file Drive.
- Published Modules memakai list app-native. Folder Drive tidak di-iframe.
- Satu publish menghasilkan immutable version baru. File lama tidak di-rename
  atau ditimpa; latest version ditentukan oleh registry metadata.
- Browser `Print / Save as PDF` tetap menjadi fallback resmi sampai Drive PDF
  lulus parity dan production acceptance.

### 29.2 Storage ownership

Spreadsheet tetap SSOT untuk content/layout serta menyimpan bounded publish
registry pada hidden app-managed `_Generator_Publishes`. Drive menyimpan binary
artifact PDF. Folder ID adalah server-owned configuration dan tidak dikirim
oleh client.

Publish registry minimum menyimpan publish/request identity, course, normalized
level, integer version, full-level source revision digest, lifecycle status,
latest pointer, Drive file identity, sanitized filename, page/file metadata,
renderer version, safe publisher label, timestamps, dan allowlisted error
metadata. Registry tidak menyimpan HTML, content payload, image/PDF bytes,
signed URL, secret, atau answer key.

### 29.3 Drive and renderer boundary

Web App tetap execute-as deployment owner. Setelah scope consent dan capability
check, deployment owner meng-upload ke target Drive folder menggunakan API yang
mendukung Shared Drive. Renderer tidak mendapat Drive credential.

Direct Drive output harus memakai controlled Chrome renderer yang menjalankan
authoritative publisher DOM/CSS dan pinned runtime, atau renderer lain yang
terlebih dahulu membuktikan parity yang sama. Apps Script-only HTML conversion
tidak dapat menjadi output resmi hanya karena menghasilkan `%PDF`; actual PDF
harus memenuhi Section 14 dan V2 acceptance criteria.

Renderer protocol harus short-lived, signed, replay-resistant, bounded, dan
answer-filtered. Worker tidak boleh menyimpan payload/PDF setelah request
selesai atau log full content. Infrastructure renderer merupakan exception
pasca-MVP yang terkontrol terhadap Apps-Script-only MVP boundary; provision,
release, monitoring, dan rollback-nya terpisah dari Apps Script deployment.

### 29.4 Version and failure behavior

- Version reservation atomik per course + level dan idempotent per request ID.
- Publish memakai digest dari latest saved 12-session state; changed/unstable
  source sebelum commit memblokir publish.
- Retry tidak boleh menghasilkan duplicate record/file.
- Upload berhasil tetapi finalization gagal harus dapat direkonsiliasi melalui
  publish identity tanpa menimpa file lain.
- Failed publish tidak mengubah source content, layout, history, atau local
  recovery draft.
- Folder permission/quota, renderer timeout, invalid PDF, dan oversize artifact
  menghasilkan safe actionable status.

### 29.5 V2 acceptance criteria

- **V2-AC-001** — Logo portrait unboxed dengan native aspect ratio, visible
  fallback, navigation IA, focus state, dan
  desktop/mobile overflow lulus rendered browser test.
- **V2-AC-002** — Authenticated profile dinamis; New Module dan Logout memiliki
  action terpisah yang benar.
- **V2-AC-003** — Successful access/activity dicatat; failed login hanya
  aggregate aman tanpa attempted credential/identity mentah.
- **V2-AC-004** — Activity RPC authenticated, allowlisted, paginated, bounded,
  dan tidak memuat secret/full content/answer.
- **V2-AC-005** — Publish schema additive/non-destructive; corrupt/ambiguous
  schema memblokir mutation.
- **V2-AC-006** — Compose tidak membuat file dan publish hanya aktif setelah
  latest saved project lulus seluruh blocking preflight.
- **V2-AC-007** — Request ID retry menghasilkan tepat satu publish record dan
  maksimal satu Drive file.
- **V2-AC-008** — Concurrent publish pada course + level yang sama memperoleh
  version berbeda dengan tepat satu latest pointer.
- **V2-AC-009** — Folder ID tetap server-side; deployment owner melakukan
  Shared Drive-capable upload dan renderer tidak memiliki Drive credential.
- **V2-AC-010** — Drive PDF memakai authoritative DOM/CSS, A4, selectable text,
  sharp SVG, complete Session 12/back cover, correct TOC/parity, zero hidden
  overflow, dan zero answer leak.
- **V2-AC-011** — Drive PDF dan browser-print fixture match pada page count,
  page-role order, extracted text, TOC target, serta approved geometry tolerance.
- **V2-AC-012** — Published Modules menampilkan bounded version history dan
  authenticated Open in Drive action tanpa folder iframe.
- **V2-AC-013** — Renderer/Drive failure tidak mengubah academic source atau
  menggandakan artifact; browser print fallback tetap tersedia.
- **V2-AC-014** — Secret, token, IDs yang dilarang, full content, image/PDF bytes,
  signed URL, dan answer key tidak masuk log, registry, DOM, atau artifact QA.
- **V2-AC-015** — Local source, Apps Script HEAD, renderer revision, dan
  immutable production deployment dilaporkan dan di-rollback secara terpisah.

### 29.6 Production gate

Test write hanya menggunakan fixture Spreadsheet dan temporary/non-production
Drive folder sampai P7. Production folder write, new OAuth scope consent,
renderer infrastructure mutation, Apps Script push, dan deployment masing-masing
memerlukan target verification serta otorisasi eksplisit. Satu owner-approved
production canary baru boleh dilakukan setelah tiga-course actual-PDF QA lulus.
Selama P5–P6 deferred, production canary yang dimaksud adalah future direct
Drive canary dan tidak menjadi syarat release perbaikan browser-print atau
route/recovery. Release Apps Script tetap memerlukan authenticated smoke,
credential/configuration rotation, fresh-pull comparison, dan otorisasi terpisah.
