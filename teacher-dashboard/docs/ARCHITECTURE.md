Aku sudah audit read-only seluruh `B2C/teacher-dashboard/`, termasuk:

- `apps-script/code-teacher.gs`
- `index.html`
- `dashboard.html`
- `class-detail.html`
- `curriculum.html`
- `curriculum-detail.html`

Tidak ada file yang diubah.

# Gambaran besar alur teacher dashboard

```text
Guru memasukkan email
        ↓
Database pusat → Class Database
mencocokkan email guru dan kelas SCL aktif
        ↓
Daftar kelas disimpan di localStorage
        ↓
Guru memilih kelas
        ↓
Link spreadsheet kelas diteruskan ke class-detail.html
        ↓
Spreadsheet kelas:
├── Absensi
│   ├── nama
│   ├── usia
│   ├── level
│   ├── tanggal kehadiran
│   ├── jumlah sesi per pertemuan
│   ├── observasi
│   └── total bintang
└── Progress
    ├── progress materi
    ├── quiz
    ├── bintang
    ├── project siswa
    └── catatan bolos
        ↓
Guru mengisi absensi, menilai project,
memberikan bonus, observasi, dan playlist
        ↓
Absensi!AQ1 berubah
        ↓
Student dashboard dan teacher dashboard
mengambil data terbaru
```

# 1. Apps Script teacher yang dipakai

Semua fungsi utama teacher menggunakan Web App berikut:

[Teacher Apps Script Web App](https://script.google.com/macros/s/AKfycbyTxSyRYWoBTscc2553zM29exDTjlHGwTLX4CsFixL3-reCnkL2HAOedAk-UibMK-gj/exec)

URL dipakai di:

- [index.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/index.html:211)
- [dashboard.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/dashboard.html:680)
- [class-detail.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html:616)

Backend lokalnya adalah [code-teacher.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/apps-script/code-teacher.gs).

## Endpoint GET

| Action | Fungsi |
|---|---|
| `getClasses` | Login dan daftar kelas guru |
| `getStudents` | Mengambil siswa, absensi, progress, project, dan bintang |
| `saveAbsensi` | Menulis tanggal kehadiran |
| `markBolos` | Menambah jumlah bolos/izin |
| `checkSync` | Membaca versi sinkronisasi |
| `getRubrics` | Mengambil rubric observasi |

## Endpoint POST

| Action | Fungsi |
|---|---|
| `approveProject` | Menilai Must Do, Should Do, Aspire, dan quiz |
| `giveBonus` | Memberikan bonus bintang |
| `submitPlaylist` | Menyimpan playlist video guru |

# 2. Database pusat

Spreadsheet pusat menggunakan ID:

```text
1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ
```

[Spreadsheet database pusat](https://docs.google.com/spreadsheets/d/1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ/edit)

Tab utama:

- `Class Database`
- `Playlists`, dibuat otomatis jika belum ada

# 3. Login guru

Guru login menggunakan email pada [index.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/index.html:209).

Frontend memanggil:

```text
?action=getClasses&email=EMAIL_GURU
```

Backend kemudian membuka:

```text
Database pusat → Class Database
```

## Mapping `Class Database`

| Data | Kolom | Indeks kode |
|---|---:|---:|
| Nama cabang | A | `[0]` |
| Kode kelas | B | `[1]` |
| Status kelas | C | `[2]` |
| Program | D | `[3]` |
| Nama guru | H | `[7]` |
| Email guru | I | `[8]` |
| Link spreadsheet kelas | J | `[9]` |
| Hari kelas | R | `[17]` |
| Waktu kelas | U | `[20]` |

Kelas hanya diterima jika:

1. Email kolom `I` sama persis dengan email login.
2. Kode kelas di kolom `B` diawali `SCL`.
3. Status di kolom `C` adalah `active`.

Nama guru dari kolom `H` otomatis diberi prefix `Kak` jika belum memilikinya.

Contoh respons:

```json
{
  "success": true,
  "teacherName": "Kak Yazid",
  "teacherEmail": "guru@example.com",
  "classes": [
    {
      "classCode": "SCL...",
      "branchName": "Cabang...",
      "programName": "Roblox...",
      "classLink": "https://docs.google.com/spreadsheets/d/...",
      "day": "Sabtu",
      "time": "10:00"
    }
  ]
}
```

Implementasinya ada di [code-teacher.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/apps-script/code-teacher.gs:150).

## Catatan autentikasi

Login guru hanya memeriksa email yang diketik. Tidak ada:

- Password
- Google Sign-In
- OTP
- Verifikasi kepemilikan email

Jadi siapa pun yang mengetahui email guru yang terdaftar secara teknis dapat mencoba masuk sebagai guru tersebut.

# 4. Data yang disimpan di browser

Setelah login, frontend menyimpan:

| `localStorage` | Isi |
|---|---|
| `teacherName` | Nama guru |
| `teacherEmail` | Email guru |
| `teacherClasses` | Semua kelas aktif guru |
| `kalanantiTheme` | Tema light/dark |

Dashboard tidak mengambil ulang daftar kelas dari server setiap kali halaman dibuka. Ia membaca `teacherClasses` dari browser.

Artinya, jika kelas guru berubah pada spreadsheet ketika guru masih login, daftar kelas browser mungkin tetap lama sampai login ulang atau storage dibersihkan.

# 5. Alur memilih kelas

Kartu kelas dibuat berdasarkan data `teacherClasses`.

Saat guru memilih kelas, dashboard membuka URL seperti:

```text
class-detail.html
?code=KODE_KELAS
&link=LINK_SPREADSHEET_KELAS
&prog=NAMA_PROGRAM
```

Di `class-detail.html`, parameter tersebut menjadi:

```javascript
CLASS_CODE
CLASS_LINK
CLASS_PROG
```

Sumbernya ada di [class-detail.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/class-detail.html:619).

Jadi link spreadsheet kelas dibawa langsung di query URL browser, lalu dikirim kembali ke Apps Script untuk membuka spreadsheet kelas.

# 6. Spreadsheet per kelas

Untuk setiap kelas, link spreadsheet berasal dari:

```text
Class Database → kolom J
```

Spreadsheet kelas minimal harus memiliki:

- `Absensi`
- `Progress`

# 7. Tab `Absensi`

Teacher dashboard membaca data siswa utama dari tab `Absensi`.

Kode tidak sepenuhnya mengandalkan posisi tetap. Ia mencari baris header yang mengandung salah satu nama:

```text
Students Name
Student's Name
Nama Siswa
```

Setelah menemukan header tersebut, kode mencari kolom lain pada baris yang sama.

## Header yang dicari dinamis

| Data | Header yang dicari |
|---|---|
| Nama | `Students Name`, `Student's Name`, `Nama Siswa` |
| Usia | `Usia` |
| Level | `Level` |
| Sesi pertama | `Sesi 1` |
| Rencana sesi | teks mengandung `Tanggal Seharusnya Sesi 1` |
| Jumlah sesi | teks mengandung `Jumlah Jam/Sesi`, `Jumlah Sesi`, atau `Jumlah Jam` |
| Total bintang | teks mengandung `Quiz Score Total` atau `Total Stars` |

## Posisi fallback

Kalau header tidak ditemukan, kode menggunakan:

| Data | Zero-based | Kolom spreadsheet |
|---|---:|---:|
| Nama siswa | 1 | B |
| Usia | 2 | C |
| Level | 4 | E |
| Sesi 1 | 5 | F |
| Total stars | 26 | AA |
| Jumlah jam/sesi | 30 | AE |
| Tanggal seharusnya sesi 1 | 31 | AF |
| Data siswa mulai | 15 | Baris 16 |

Mapping dibuat di [code-teacher.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/teacher-dashboard/apps-script/code-teacher.gs:21).

# 8. Dari mana nama, usia, dan level siswa?

Ketiganya benar-benar dibaca dari spreadsheet kelas:

```text
Spreadsheet kelas → Absensi
```

Berbeda dari student dashboard yang menghitung level dari sesi, teacher dashboard membaca level langsung dari kolom `Level`.

Data yang dikirim untuk setiap siswa:

```javascript
{
  name,
  age,
  level,
  attendanceSession,
  totalSessions: 12,
  sessionDates,
  meetings,
  skipCount
}
```

Teacher dashboard lalu menampilkan level pada kartu Absensi, tabel Progress, dan Leaderboard.

# 9. Penentuan sesi absensi

Kode membaca maksimal 12 kolom mulai dari `Sesi 1`.

Sesi dianggap dihadiri apabila isi sel:

- Tidak kosong
- Bukan `null`
- Bukan `N/A`

Contoh:

| Nama | Sesi 1 | Sesi 2 | Sesi 3 |
|---|---|---|---|
| Budi | 1 Jul | 8 Jul | kosong |

Hasil:

```text
attendanceSession = 2
```

Tanggal diformat:

```text
d MMM yyyy
```

menggunakan zona waktu `Asia/Jakarta`.

# 10. Pertemuan satu sesi atau dua sesi

Dashboard membaca kolom `Jumlah Jam/Sesi`, `Jumlah Sesi`, atau `Jumlah Jam`.

Jika isi kolom mengandung angka `2`, siswa dianggap mengikuti dua sesi per pertemuan.

Contoh:

```text
2 Jam
2 Sesi
2
```

menghasilkan:

```javascript
meetings = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12]
]
```

Selain itu:

```javascript
meetings = [
  [1],
  [2],
  [3],
  ...
]
```

Saat guru menyimpan absensi, tanggal yang sama dapat ditulis ke dua kolom sesi sekaligus.

# 11. Menyimpan kehadiran

Frontend mengirim GET seperti:

```text
?action=saveAbsensi
&classLink=...
&date=2026-07-15
&attendance=[...]
```

Payload siswa hadir:

```javascript
{
  name,
  sessionsToMark,
  materialSession,
  skipCount
}
```

Backend:

1. Membuka spreadsheet kelas.
2. Mencari siswa di tab `Absensi`.
3. Mencari kolom sesi yang akan ditandai.
4. Menulis tanggal.
5. Memberi format `d MMM yyyy`.
6. Memperbarui `Absensi!AQ1`.

Hanya siswa dengan toggle `hadir` yang dikirim ke `saveAbsensi`.

## Batas kehadiran + bolos

Kode menghitung:

```text
jumlah sesi hadir + jumlah sesi bolos
```

Jika hasilnya mencapai minimal `15`, semua kolom sesi yang masih kosong diisi:

```text
N/A
```

Karena jumlah sesi belajar maksimal hanya 12, angka 15 menggambarkan:

```text
12 sesi + maksimal 3 jatah absen/bolos
```

## Temuan tentang “History Materi”

Fungsi `saveAbsensi` mengembalikan pesan:

```text
Absensi & History Materi tersimpan.
```

Tetapi implementasi sekarang hanya menulis ke tab `Absensi`.

Variabel berikut memang dibuat:

```javascript
materialSession
studentColMap
progData
```

tetapi tidak dipakai untuk menulis history materi ke tab `Progress`.

Jadi berdasarkan kode aktual, “History Materi tersimpan” belum benar-benar terjadi di fungsi ini.

# 12. Menandai bolos atau izin

Saat guru memilih bolos:

```text
?action=markBolos
&classLink=...
&studentName=...
&sessionsSkipped=1 atau 2
```

Backend mencari nama siswa di header tab `Progress`:

- Prioritas baris 2
- Kemudian baris 1
- Mulai kolom C
- Exact match, kemudian partial match

Jumlah bolos tidak ditulis ke tab `Absensi`. Ia disimpan sebagai note pada sel header nama siswa di tab `Progress`.

Format note:

```text
[BOLOS: 2]
Bolos ditandai pada: 15 Jul 2026 (+1 jam)
```

Kalau ditandai lagi:

```text
[BOLOS: 3]
Bolos ditandai pada: 15 Jul 2026 (+1 jam)
Bolos ditandai pada: 22 Jul 2026 (+1 jam)
```

`skipCount` kemudian dibaca kembali dari note tersebut.

# 13. Tab `Progress`

Struktur yang diharapkan:

- Nama siswa pada baris 1 atau 2
- Siswa mulai dari kolom C
- Maksimal 12 sesi
- Setiap sesi terdiri dari lima baris

Struktur konseptual:

| Offset | Isi |
|---:|---|
| 0 | Date |
| 1 | Progress |
| 2 | Quiz Score |
| 3 | Star Gained |
| 4 | Project Uploaded |

Namun kode juga memindai label kolom `B`, sehingga posisi Progress, Quiz, Star, dan Project masih dapat ditemukan walaupun urutannya sedikit berbeda.

Label yang dikenali:

- `progress` atau `progres`
- `quiz`
- `star`, `bintang`, atau `nilai`
- `project`, `upload`, atau `link`

# 14. Data progress yang dibaca guru

Untuk setiap siswa dan setiap sesi, backend mengembalikan:

```javascript
sessionData[sesi] = {
  progress,
  stars,
  starsVal,
  link,
  quiz,
  quizStars,
  date,
  note
}
```

## Progress

Jika nilainya berupa angka spreadsheet:

```text
1 → 100%
0.5 → 50%
```

Jika string, nilai ditampilkan sesuai isinya.

## Quiz

Quiz dibaca dari baris berlabel `Quiz`.

Jika formatnya:

```text
4/5
```

maka `quizStars = 4`.

Jika berupa persentase:

```text
80
```

maka dikonversi kira-kira menjadi:

```text
4 bintang
```

## Bintang

Kode mencari format:

```text
3 Star
2 Bintang
```

Semua angka dijumlahkan.

## Project siswa

Project berasal dari baris berlabel:

```text
Project
Upload
Link
```

Format yang dikenali:

```text
[Must Do][Link] URL
[Must Do][Screenshot] URL

[Should Do][Link] URL
[Aspire][Screenshot] URL
```

Teacher dashboard memisahkan link berdasarkan:

- Must Do
- Should Do
- Aspire

Kemudian guru dapat membuka preview:

- Scratch project menjadi `/embed`
- Google Drive folder menjadi `embeddedfolderview`
- Google Drive file menjadi `/preview`
- Google Docs/Slides `/edit` menjadi `/preview`

# 15. Penentuan sesi materi siswa

Teacher dashboard menghasilkan `materialSession` berdasarkan Progress.

Jika progress sesi sudah:

```text
100%
1
```

maka sesi materi berikutnya menjadi:

```text
sesi selesai + 1
```

Contoh:

```text
Sesi 1 selesai → materialSession 2
Sesi 5 selesai → materialSession 6
```

Maksimal tetap sesi 12.

Ini berbeda dari `attendanceSession`:

- `attendanceSession`: berdasarkan tab Absensi.
- `materialSession`: berdasarkan tab Progress.

Teacher dashboard memang membedakan siswa sudah hadir sampai sesi berapa dan materi siswa sudah selesai sampai sesi berapa.

# 16. Approval dan penilaian project

Frontend mengirim POST:

```javascript
{
  action: "approveProject",
  studentName,
  sessionNum,
  classLink,
  mustStars,
  shouldStars,
  aspireStars,
  quizStars,
  projectCollected,
  obsAktivitasScore,
  obsEngagementScore,
  obsNotes
}
```

Backend kemudian:

1. Mencari kolom siswa.
2. Mencari blok sesi.
3. Menulis progress `100%`.
4. Menulis rincian bintang.
5. Menulis tanggal penilaian.
6. Menghitung ulang total bintang.
7. Menulis observasi untuk sesi tertentu.
8. Memperbarui `Absensi!AQ1`.

Format bintang:

```text
3 Star - Must do
2 Star - Should do
1 Star - Aspire to do
4 Star - Quiz
```

Bintang quiz yang sebelumnya dihitung student dashboard ikut dimasukkan kembali ke string penilaian final.

# 17. Observasi dan rubric

Rubric memakai spreadsheet terpisah:

```text
1RutBjQo881tjyArM5TZFYs_1pWFySuNq7Fj_zj38bfU
```

[Spreadsheet rubric](https://docs.google.com/spreadsheets/d/1RutBjQo881tjyArM5TZFYs_1pWFySuNq7Fj_zj38bfU/edit)

Tab:

```text
[4S] Mapping Indikator
```

## Mapping rubric

| Data | Kolom |
|---|---:|
| Program | A |
| Level | B |
| Pertemuan | C |
| Nilai | E |
| Observasi aktivitas | G |
| Observasi engagement | H |

Rubric ditampilkan khusus untuk:

- Sesi 4
- Sesi 8

Frontend memfilter berdasarkan:

- Program kelas
- Level siswa
- Pertemuan/sesi

## Hasil observasi ditulis ke `Absensi`

Untuk sesi 4:

| Data | Kolom |
|---|---:|
| Aktivitas | S |
| Engagement | T |
| Notes | U |

Untuk sesi 8:

| Data | Kolom |
|---|---:|
| Aktivitas | V |
| Engagement | W |
| Notes | X |

# 18. Total bintang di tab Absensi

Setelah approval atau bonus, backend memindai seluruh baris bintang di tab `Progress`.

Semua angka di awal setiap baris dijumlahkan, misalnya:

```text
3 Star - Must do
2 Star - Should do
4 Star - Quiz
```

menjadi:

```text
9
```

Total kemudian ditulis ke kolom yang header-nya mengandung:

- `Quiz Score Total`
- `Total Stars`

Jika header tidak ditemukan, fallback-nya adalah:

```text
Absensi!AA
```

# 19. Bonus bintang

Guru dapat memberi bonus 1–3 bintang dan alasan.

Payload:

```javascript
{
  action: "giveBonus",
  studentName,
  sessionNum,
  classLink,
  bonusStars,
  reason
}
```

Alasan bonus disimpan sebagai note pada sel bintang:

```text
15-Jul: Membantu teman menyelesaikan project
```

## Temuan penting pada bonus

Kode membaca isi sel bintang memakai:

```javascript
parseInt(cell.getValue() || 0, 10)
```

Kalau isi awal:

```text
3 Star - Must do
2 Star - Should do
4 Star - Quiz
```

`parseInt()` hanya menghasilkan `3`.

Jika guru memberikan bonus `2`, sel kemudian diubah menjadi angka:

```text
5
```

Rincian Should Do, Aspire, dan Quiz dapat hilang. Jadi implementasi bonus sekarang berisiko menimpa format penilaian detail.

# 20. Final project sesi 12

Frontend menampilkan checkbox:

```text
Project dikumpulkan
```

khusus sesi 12 dan mengirim:

```javascript
projectCollected: true/false
```

Namun `handleApproveProject()` di backend tidak menggunakan atau menyimpan `projectCollected`.

Artinya checkbox terlihat dan terkirim, tetapi berdasarkan kode saat ini hasil checkbox tidak masuk ke spreadsheet.

# 21. Playlist guru

Guru dapat mengirim:

- Link playlist
- Catatan
- Kode kelas
- Nama guru
- Email guru

Backend menyimpan playlist ke dua lokasi.

## Spreadsheet kelas

Link ditulis ke:

```text
Absensi!B3
```

## Database pusat

Backend mencari tab:

```text
Playlists
```

Jika belum ada, tab dibuat otomatis dengan header:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Class Code | Teacher Name | Teacher Email | Playlist Link | Notes |

Setiap submission ditambahkan sebagai baris baru.

Jika gagal membuat atau menulis tab `Playlists`, error tersebut sengaja diabaikan. Respons tetap dapat dianggap berhasil selama proses utama tidak error.

# 22. Leaderboard

Leaderboard tidak berasal dari tab terpisah.

Frontend menghitungnya dari data:

- Jumlah sesi dengan progress `100%`
- Total bintang
- Persentase keseluruhan:

```text
sesi selesai / 12 × 100%
```

Urutan utamanya berdasarkan:

1. Sesi selesai terbanyak
2. Total bintang tertinggi

# 23. Sinkronisasi dengan student dashboard

Teacher dan student dashboard menggunakan mekanisme:

```text
Absensi!AQ1
```

Setiap perubahan penting menulis timestamp baru ke `AQ1`.

Teacher dashboard mengecek `Z1` setiap 60 detik. Student dashboard juga menggunakan pola serupa.

Aksi yang memperbarui sync flag:

- Menyimpan absensi
- Approval project
- Memberikan bonus
- Beberapa perubahan dari student dashboard

`markBolos` saat ini tidak memanggil `updateSyncFlag()`. Jadi perubahan bolos mungkin tidak otomatis memicu refresh dashboard lain.

# 24. Halaman curriculum guru

Teacher curriculum menggunakan Web App berbeda:

[Curriculum Web App](https://script.google.com/macros/s/AKfycbwvNSa3hUMNqhNOINDeG3cPUdlQM-dGfl-dDX5WejhESjHRALipqhwJ_-3HXOJehtWbWw/exec)

Program yang tersedia di `curriculum.html`:

| Program | Tab sheet |
|---|---|
| Roblox | `B2C_RobloxStudio_Modul` |
| Scratch | `B2C_Scratch_Modul` |
| Python | `B2C_Python_Modul` |

Teacher curriculum berbeda dari student materials:

- Guru menggunakan tab `_Modul`.
- Siswa menggunakan tab `_INS`.

Teacher curriculum membaca:

- `col_0` sebagai level
- `col_1` sebagai sesi

Jika level memakai merged cells, nilai level diteruskan ke baris-baris kosong berikutnya.

Setiap level ditampilkan maksimal 12 sesi.

`curriculum-detail.html` kemudian menggunakan student curriculum API untuk mengambil isi detail materi berdasarkan program, level, dan sesi.

# 25. Ringkasan sumber setiap data

| Data | Sumber |
|---|---|
| Nama guru | `Class Database!H:H` |
| Email guru | Input login + `Class Database!I:I` |
| Kode kelas | `Class Database!B:B` |
| Status kelas | `Class Database!C:C` |
| Program | `Class Database!D:D` |
| Cabang | `Class Database!A:A` |
| Link spreadsheet kelas | `Class Database!J:J` |
| Hari kelas | `Class Database!R:R` |
| Jam kelas | `Class Database!U:U` |
| Nama siswa | Spreadsheet kelas → `Absensi` |
| Usia | Spreadsheet kelas → `Absensi` |
| Level | Spreadsheet kelas → `Absensi` |
| Kehadiran | Spreadsheet kelas → `Absensi`, mulai `Sesi 1` |
| Jumlah sesi per pertemuan | Spreadsheet kelas → `Absensi` |
| Progress materi | Spreadsheet kelas → `Progress` |
| Quiz | Spreadsheet kelas → `Progress` |
| Bintang | Spreadsheet kelas → `Progress` |
| Link project | Spreadsheet kelas → `Progress` |
| Bolos | Note header nama siswa di `Progress` |
| Observasi | Spreadsheet kelas → `Absensi!S:X` |
| Total bintang | Spreadsheet kelas → `Absensi`, fallback `AA` |
| Rubric | Spreadsheet rubric → `[4S] Mapping Indikator` |
| Playlist | Spreadsheet kelas `Absensi!B3` + database `Playlists` |
| Materi guru | Curriculum spreadsheet tab `_Modul` |

# Kesimpulan penting

Teacher dashboard benar-benar membaca level dari tab `Absensi`, sedangkan student dashboard menghitung level dari sesi. Ini berpotensi membuat label level guru dan siswa berbeda.

Temuan utama tanpa aku ubah:

- Login hanya berdasarkan email, tanpa verifikasi kepemilikan.
- Daftar kelas tersimpan di browser dan tidak otomatis diperbarui.
- Pesan “History Materi tersimpan” tidak sesuai implementasi aktual.
- Checkbox final project sesi 12 dikirim tetapi tidak disimpan backend.
- Bonus bintang berisiko menghapus rincian bintang sebelumnya.
- `markBolos` tidak memperbarui `Absensi!AQ1`.
- Kolom rencana sesi ditemukan oleh mapping, tetapi tidak digunakan dalam alur sekarang.
> **Fungsi dokumen:** menjelaskan arsitektur, komponen utama, dan perilaku Teacher Dashboard.
>
> **Baca ketika:** ingin memahami hubungan halaman, Google Apps Script, spreadsheet kelas, rubrik, dan penyimpanan browser.
>
> **Bukan untuk:** langkah deployment atau riwayat perubahan. Gunakan `DEPLOYMENT.md` atau `CHANGELOG.md`.
>
> **Terakhir diperbarui:** 16 Juli 2026.

# Arsitektur Teacher Dashboard
