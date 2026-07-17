## 2026-07-15 — Pilihan Quiz setelah setiap submission

- Setelah siswa berhasil mengumpulkan `Must Do`, `Should Do`, atau `Aspire To`, area aksi menampilkan tombol `Tugas` dan `Quiz` selama Quiz sesi tersebut belum selesai.
- Pada Must Do, siswa tetap dapat memilih antara langsung Quiz atau lanjut ke Should Do.
- Pada Should Do, siswa dapat memilih langsung Quiz atau lanjut ke Aspire To.
- Pada Aspire To, siswa dapat langsung menuju Quiz setelah submission berhasil.
- Tombol Quiz yang tampil pada Should Do dan Aspire To tidak melewati syarat utama. Fungsi `attemptGoToQuiz()` tetap memeriksa bahwa Must Do sudah selesai atau sudah dikumpulkan.
- Preview submission untuk ketiga phase juga menampilkan akses Quiz apabila Must Do telah selesai dan Quiz belum dikerjakan.

---

## 2026-07-15 — Perbaikan cache bintang, penguncian sesi, dan validasi Quiz

- Respons live Budiyana telah terkonfirmasi berisi `currentSession: 2`, `totalStars: 10`, dan rincian bintang Sesi 1: `5 Star - Must do`, `3 Star - Should do`, serta `2 Star - Quiz`.
- Initial load `dashboard.html` sebelumnya tetap menjalankan reset fail-closed walaupun API sukses. Akibatnya `currentSession` ditimpa menjadi 1, `sessionProgress` menjadi array kosong, dan `totalStars` menjadi 0 setelah dashboard selesai dirender.
- Reset fail-closed sekarang hanya dijalankan saat respons API gagal atau identitas siswa tidak ditemukan.
- Modal bintang sekarang dapat mempertahankan dan membaca `sessionProgress` dari respons sukses.
- Backend membaca baris `Quiz Score` pada setiap blok sesi dan mengirim `quizScore` serta `quizDone` dalam `sessionProgress`.
- Sesi berikutnya hanya terbuka jika tiga kondisi terpenuhi: progress 100%, Quiz Score sudah ada, dan submission yang dikirim sudah mendapat bintang guru sesuai phase.
- Nilai progress 100% tanpa Quiz Score tidak lagi cukup untuk membuka sesi berikutnya.

---

Aku sudah roam dan membaca `apps-script/code-student.gs` serta seluruh HTML di `B2C/student-dashboards/`. Tidak ada file yang diubah pada pemeriksaan awal tersebut.

## Gambaran alur besarnya

```text
Siswa memasukkan kode kelas
        ↓
Sheet pusat "Student Active"
mencari daftar nama siswa
        ↓
Siswa memilih nama
        ↓
Kode kelas + nama disimpan di localStorage browser
        ↓
Sheet pusat "Class Database"
mencari program, guru, dan link spreadsheet kelas
        ↓
Spreadsheet kelas:
├── Tab Progress → progres, quiz, bintang, upload
└── Tab Absensi → sesi yang sudah dihadiri
        ↓
Spreadsheet curriculum:
├── materi
├── tugas Must Do / Should Do / Aspire
└── quiz
        ↓
Ditampilkan di dashboard siswa
```

## 1. Semua HTML terhubung ke Apps Script mana?

Seluruh halaman menggunakan Web App berikut:

[Apps Script student Web App](https://script.google.com/macros/s/AKfycby7AP62UmvDpvCnEsIOqcj6FDAtFG_5_A_NzgcQ3IDnrdWM80ikZPdyrk9lJNWUCCwKfg/exec)

URL tersebut muncul di:

- [index.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/index.html:238)
- [dashboard.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/dashboard.html:721)
- [materials.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/materials.html:564)
- [sessions.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/sessions.html:263)
- [quiz.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/quiz.html:275)

Backend URL ini seharusnya merupakan hasil deploy dari [code-student.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs).

---

## 2. Spreadsheet pusat/database

Kode menggunakan spreadsheet ID:

```text
1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ
```

Link langsung:

[Spreadsheet database pusat](https://docs.google.com/spreadsheets/d/1Dfm4RUOBbz3bvHT0nLnEIkYUoGxRRbC6fFqrZfKa8kQ/edit)

Di dalamnya minimal ada dua tab yang dipakai:

- `Student Active`
- `Class Database`

### Tab `Student Active`

Digunakan ketika siswa memasukkan kode kelas pada halaman login.

Mapping yang dipakai:

| Data | Kolom | Nomor kolom |
|---|---:|---:|
| Nama siswa | B | 2 |
| Kode kelas | V | 22 |
| Status siswa | W | 23 |

Alurnya:

1. Siswa memasukkan kode kelas.
2. Frontend memanggil:

```text
?action=getStudents&code=KODE_KELAS
```

3. Apps Script mencari kode tersebut di kolom `V`.
4. Untuk setiap baris yang cocok, kode membaca nama dari kolom `B`.
5. Status dibaca dari kolom `W`.
6. Siswa yang statusnya mengandung `graduated` tidak ditampilkan.
7. Daftar nama dikirim ke dropdown login.

Implementasinya ada di [code-student.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs:700).

Pencarian kode menggunakan `matchEntireCell(false)`, artinya pencarian tidak harus sama persis satu sel penuh. Ini berpotensi mencocokkan kode yang hanya mengandung teks serupa.

### Tab `Class Database`

Digunakan setelah siswa sudah memilih nama.

Mapping berdasarkan indeks yang dipakai kode:

| Data | Kolom | Indeks kode |
|---|---:|---:|
| Kode kelas | B | `[1]` |
| Nama program | D | `[3]` |
| Nama guru | H | `[7]` |
| Link spreadsheet kelas | J | `[9]` |

Contohnya, kode kelas dari login dicocokkan dengan kolom `B`. Setelah ketemu:

- Program diambil dari kolom `D`.
- Nama guru dari kolom `H`.
- Link spreadsheet kelas dari kolom `J`.

Implementasinya ada di:

- [handleGetStudentProgress()](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs:121)
- [getClassInfo()](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs:427)

Jadi link spreadsheet kelas bukan ditulis langsung dalam dashboard. Link berbeda untuk setiap kelas dan diambil dari `Class Database!J:J`.

---

## 3. Dari mana nama siswa dan kelas berasal?

### Nama siswa

Nama siswa berasal dari:

```text
Database pusat → Student Active → kolom B
```

Setelah siswa memilih nama, frontend menyimpannya sebagai:

```javascript
localStorage.studentName
```

### Kode/nama kelas

Kode kelas berasal dari input login, kemudian disimpan dua kali:

```javascript
localStorage.className
localStorage.classCode
```

Keduanya berisi kode yang sama, misalnya `RBLX01`.

Penyimpanan dilakukan di [index.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/index.html:363).

Jadi istilah `className` di kode sebenarnya lebih dekat ke kode kelas, bukan nama kelas lengkap.

### Nama guru

Nama guru berasal dari:

```text
Class Database → kolom H
```

Backend mengirim `teacherName`, lalu dashboard menyimpan:

```javascript
localStorage.teacherName
```

Kemudian ditampilkan di bagian coach/guru dashboard.

### Program

Program berasal dari:

```text
Class Database → kolom D
```

Kode hanya mengenali program yang mengandung:

- `scratch`
- `roblox`

Jika nama program mengandung `scratch`, dashboard memilih course Scratch. Jika mengandung `roblox`, course Roblox dipilih.

Program lain seperti Python atau ScratchJr belum dipetakan oleh dashboard utama ini.

---

## 4. Dari mana level siswa berasal?

Ini bagian penting: level yang tampil di dashboard tidak diambil dari spreadsheet.

Dashboard menghitung level dari sesi:

```javascript
Level = Math.ceil(session / 2)
```

Contohnya:

| Sesi | Level tampilan |
|---:|---:|
| 1–2 | Level 1 |
| 3–4 | Level 2 |
| 5–6 | Level 3 |
| 7–8 | Level 4 |
| 9–10 | Level 5 |
| 11–12 | Level 6 |

Kodenya ada di [dashboard.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/dashboard.html:953).

Jadi walaupun mungkin ada kolom `Level` pada sheet Absensi, student dashboard ini tidak menggunakannya untuk label level.

---

## 5. Spreadsheet kelas masing-masing

Setelah link spreadsheet kelas ditemukan di `Class Database!J:J`, kode membuka spreadsheet itu.

Student dashboard menggunakan dua tab:

- `Progress`
- `Absensi`

### Tab `Progress`

Tab ini adalah sumber:

- Progress setiap sesi
- Nilai quiz
- Bintang
- Link/upload project
- Riwayat tanggal siswa membuka sesi
- Sinyal sinkronisasi

#### Posisi nama siswa

Nama siswa dicari pada:

- Baris 2 terlebih dahulu
- Kalau tidak ditemukan, baris 1
- Mulai kolom C ke kanan

Pencariannya:

1. Exact match setelah nama dinormalisasi.
2. Kalau gagal dan nama lebih dari 3 karakter, memakai partial match.

Normalisasi menghapus spasi dan karakter non-alfanumerik. Misalnya:

```text
Yazid Hilmi
yazid-hilmi
Yazid_Hilmi
```

semuanya bisa menjadi:

```text
yazidhilmi
```

#### Struktur setiap sesi

Kode menganggap satu sesi terdiri dari lima baris.

Pembacaan progress memakai pola:

```text
Sesi 1 mulai sekitar row 4
Sesi 2 mulai sekitar row 9
Sesi 3 mulai sekitar row 14
dan seterusnya, lompat 5 baris
```

Dalam setiap blok lima baris, kolom `B` diperiksa untuk mencari label yang mengandung:

- `progres`
- `quiz`
- `star`
- `bintang`
- `nilai`
- `project`
- `upload`
- `link`

Sedangkan nilai masing-masing siswa berada di kolom siswa yang ditemukan tadi.

Struktur konseptualnya:

| Kolom A | Kolom B | Kolom C dan seterusnya |
|---|---|---|
| Sesi | Jenis data | Nilai per siswa |
| Sesi 1 | Progress | Progress siswa |
|  | Quiz | Nilai quiz siswa |
|  | Star/Bintang | Bintang siswa |
|  | Project Uploaded | Link project siswa |
|  | Data lain | Data siswa |

Kode tidak sepenuhnya bergantung pada urutan baris dalam lima baris itu karena label di kolom `B` dipindai.

#### Syarat sesi berikutnya terbuka

`currentSession` akan bergerak ke sesi berikutnya apabila:

1. Progress sesi sudah `100%`; dan
2. Hasil submission sudah mendapat penilaian/bintang guru.

Nilai progress dianggap selesai jika berisi:

```text
1
100
100%
```

Untuk submission berlabel `[Must Do]`, `[Should Do]`, atau `[Aspire]`, kode memeriksa apakah baris bintang memiliki label penilaian yang sesuai.

Artinya, upload project saja belum tentu membuka sesi selanjutnya. Submission juga perlu dinilai oleh guru.

#### Total bintang

Kode membaca teks di baris `Star/Bintang/Nilai`, lalu mencari pola seperti:

```text
3 Star
2 Bintang
```

Semua angka tersebut dijumlahkan menjadi `totalStars`.

#### Penanda sinkronisasi

Kode menggunakan:

```text
Absensi!AQ1
```

Nilainya berupa timestamp.

Dashboard utama mengecek `AQ1` setiap 60 detik. Peta sesi mengeceknya setiap 30 detik selama tab terlihat, serta ketika halaman atau tab kembali aktif. Bila nilainya berubah, dashboard mengambil ulang data progress siswa.

Jadi ketika guru atau student action mengubah data dan `AQ1` ikut diperbarui, tampilan siswa bisa refresh otomatis tanpa reload manual.

---

## 6. Tab `Absensi`

Tab `Absensi` dipakai untuk menentukan sesi mana yang sudah dihadiri siswa.

Kode mencari header secara dinamis. Header nama yang diterima:

```text
Students Name
Student's Name
Nama Siswa
```

Pada baris header yang sama, kode mencari:

```text
Sesi 1
```

Setelah menemukan baris siswa, kode membaca maksimal 12 kolom sesi mulai dari `Sesi 1`.

Suatu sesi dianggap pernah dihadiri jika sel:

- Tidak kosong
- Bukan `null`
- Bukan `N/A`

Sesi terakhir yang memiliki isi menjadi `attendanceSession`.

Contoh:

| Nama Siswa | Sesi 1 | Sesi 2 | Sesi 3 | Sesi 4 |
|---|---|---|---|---|
| Budi | tanggal | tanggal | kosong | kosong |

Maka:

```text
attendanceSession = 2
```

Perlu dicatat, dashboard utama memprioritaskan `attendanceSession` untuk menentukan sesi aktif yang ditampilkan. Jadi tampilannya bisa mengikuti Absensi, sementara perhitungan unlock backend menggunakan Progress + penilaian guru. Ada dua konsep sesi yang berbeda:

- `currentSession`: berdasarkan progress dan grading.
- `attendanceSession`: berdasarkan isi tab Absensi.
- Dashboard visual: lebih memprioritaskan `attendanceSession`.

---

## 7. Spreadsheet curriculum/materi

Spreadsheet materi menggunakan ID:

```text
1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0
```

Link:

[Spreadsheet curriculum](https://docs.google.com/spreadsheets/d/1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0/edit)

Tab yang diizinkan backend:

- `B2C_RobloxStudio_Modul`
- `B2C_Scratch_Modul`
- `B2C_Python_Modul`
- `B2C_ScratchJr_Modul`
- `B2C_RobloxStudio_INS`
- `B2C_Scratch_INS`

Tetapi HTML student dashboard saat ini hanya memakai:

- `B2C_RobloxStudio_INS`
- `B2C_Scratch_INS`

Backend membaca:

- Header dari baris 2
- Data mulai baris 3

Semua sel diubah menjadi string sebelum dikirim sebagai JSON.

### Mapping materi

| Isi | Header yang dicari | Fallback |
|---|---|---|
| Sesi | `Session`, `session`, `Sesi` | `col_2` / `col_1` |
| Tujuan | `Objectives`, `Objective`, `Tujuan` | `col_3` |
| Materi/manual | `Manual`, `materials` | `col_4` |
| Must Do | `Must Do`, `must_do`, `Tugas Must Do` | `col_5` |
| Should Do | `Should Do`, `should_do`, `Tugas Should Do` | `col_6` |
| Aspire | `Aspire To Do`, `Aspire Do`, `Aspire` | `col_7` |
| Kamus Coder | `kamus coder` | `col_9` |
| Interactive slide | `Interactive slide` | `col_14` |
| Script HTML | `Script HTML` | `col_15` |

Mapping ini ada di [materials.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/materials.html:650).

### Mapping quiz

Quiz membaca:

| Isi quiz | Header/fallback |
|---|---|
| Pertanyaan | `quiz_questions` / `col_11` |
| Pilihan | `quiz_options` / `col_12` |
| Jawaban | `quiz_answers` / `col_13` |

Ada komentar lama yang menyebut kolom berbeda, tetapi implementasi aktual memakai `col_11`, `col_12`, dan `col_13`.

---

## 8. Alur upload project siswa

Upload dilakukan dari `materials.html`, bukan oleh guru.

Payload yang dikirim:

```javascript
{
  action: "submitProject",
  classCode,
  studentName,
  className,
  session,
  phase,
  projectUrl,
  files
}
```

`phase` dapat berupa:

- `must-do`
- `should-do`
- `aspire-do`

### Google Drive tujuan

Base folder Drive memiliki ID:

```text
16FwcvV1VMCH1PmxHEGdastGPQH2EDtRC
```

Link:

[Folder upload Kalananti](https://drive.google.com/drive/folders/16FwcvV1VMCH1PmxHEGdastGPQH2EDtRC)

Struktur folder yang dibuat:

```text
Base Folder
└── KODEKELAS-NAMASISWA-PROGRAM
    └── Session N
        └── must-do / should-do / aspire-do
            └── file siswa
```

Setelah upload, URL folder atau project ditulis ke:

```text
Spreadsheet kelas → Progress
→ blok sesi terkait
→ baris Project/Upload/Link
→ kolom siswa
```

Format isi sel:

```text
[Must Do][Screenshot] URL
[Must Do][Link] URL
[Should Do][Screenshot] URL
[Aspire][Link] URL
```

Kalau jenis phase dan tipe yang sama sudah ada, entry lama diganti. Jika belum ada, entry baru ditambahkan.

### Temuan penting pada upload

Di `handleSubmitProject()`, file dibuat dua kali:

```javascript
taskFolder.createFile(blob);
taskFolder.createFile(blob);
```

Artinya satu file yang dikirim melalui jalur `submitProject` kemungkinan tersimpan dua kali di Drive. Ini terlihat di [code-student.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs:518).

---

## 9. Alur progress siswa

Di halaman materi:

- Membuka materi memberi dasar progress `50%`.
- Menyelesaikan checklist Must Do menambah progress.
- Menyelesaikan quiz membuat progress menjadi `100%`.

Frontend mengirim:

```javascript
{
  action: "updateProgress",
  classCode,
  studentName,
  session,
  progress
}
```

Backend seharusnya menulis progress ke:

```text
Progress → baris progress sesi → kolom siswa
```

Backend hanya menulis jika persentase baru lebih tinggi daripada persentase sebelumnya. Progress tidak diturunkan.

### Masalah kritis pada fungsi progress

Di file sekarang ada deklarasi fungsi ganda:

```javascript
function handleUpdateProgress(data) {
function handleUpdateProgress(data) {
```

Terletak di sekitar [code-student.gs](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/apps-script/code-student.gs:780).

Akibatnya, handler luar yang dipanggil `doPost()` kemungkinan tidak menjalankan proses update dan hanya mendefinisikan fungsi di dalamnya. Ini dapat membuat `action: updateProgress` menghasilkan respons kosong/tidak valid.

Jadi progress `50%`, `95%`, atau `100%` dari materials/quiz berpotensi tidak tersimpan melalui handler ini.

---

## 10. Alur quiz

Setelah quiz selesai, frontend:

1. Menyimpan penanda lokal:

```javascript
localStorage["quiz_N"] = "true"
```

2. Mengirim `action: saveQuiz`.
3. Menghitung skor persentase.
4. Menghitung bintang:

```javascript
Math.floor((score / total) * 5)
```

5. Menulis nilai ke baris `Quiz`.
6. Menulis `100%` ke baris `Progress`.
7. Menulis atau mengganti:

```text
X Star - Quiz
```

pada baris bintang.
8. Memperbarui `Absensi!AQ1`.

Quiz juga mengirim `action: updateProgress` kedua kalinya, tetapi sebenarnya `saveQuiz` sendiri sudah menulis progress menjadi `100%`.

---

## 11. Apa yang dilakukan guru?

Dari sudut pandang student dashboard:

- Nama guru dibaca dari `Class Database!H:H`.
- Student code tidak memiliki halaman upload guru.
- Guru kemungkinan bekerja melalui `teacher-dashboard`.
- Hasil kerja guru yang dilihat siswa berasal dari perubahan pada spreadsheet kelas:
  - Nilai/bintang pada tab `Progress`
  - Absensi pada tab `Absensi`
  - Approval atau grading project
- Jika teacher dashboard memperbarui `Absensi!AQ1`, peta sesi siswa mendeteksi perubahan maksimal sekitar 30 detik selama tab terlihat.

Materi dan quiz bukan berasal dari upload guru ke spreadsheet kelas, tetapi dari spreadsheet curriculum pusat pada tab `B2C_RobloxStudio_INS` atau `B2C_Scratch_INS`.

---

## 12. Data yang disimpan di browser

Dashboard sangat bergantung pada `localStorage`:

| Key | Isi |
|---|---|
| `studentName` | Nama siswa |
| `className` | Kode kelas |
| `classCode` | Kode kelas |
| `teacherName` | Nama guru |
| `selectedCourse` | `scratch` atau `roblox` |
| `currentSession` | Sesi hasil progress/grading |
| `attendanceSession` | Sesi terakhir dari Absensi |
| `activeLesson` | Sesi yang sedang dibuka |
| `sessionProgress` | Detail progress semua sesi |
| `totalStars` | Total bintang |
| `quiz_N` | Quiz sesi N sudah selesai |
| `kalanantiTaskProgress_*` | Checklist tugas lokal |
| `kalanantiSubmitted_*` | Status submission lokal |

Artinya beberapa status UI hanya tersimpan di browser. Kalau pindah perangkat atau membersihkan storage, checklist lokal dan beberapa penanda submission bisa hilang, meskipun data utama di spreadsheet tetap ada.

## Kesimpulan paling singkat

Sumber datanya terbagi menjadi tiga:

1. Database pusat  
   `Student Active` untuk kode kelas dan nama siswa; `Class Database` untuk program, guru, dan link spreadsheet kelas.

2. Spreadsheet kelas  
   `Progress` untuk progress, quiz, bintang, dan upload; `Absensi` untuk sesi yang sudah dihadiri.

3. Spreadsheet curriculum  
   `B2C_RobloxStudio_INS` atau `B2C_Scratch_INS` untuk materi, tugas, interactive content, dan quiz.

Ada tiga temuan yang perlu diperhatikan, tanpa aku ubah:

- Level hanya dihitung dari sesi, bukan dibaca dari data level spreadsheet.
- Upload file pada `handleSubmitProject()` membuat file dua kali.
- `handleUpdateProgress()` terdeklarasi ganda dan kemungkinan tidak berjalan semestinya.

Berikut run-through student dashboard dari sudut pandang siswa: tombol apa yang diklik, apa yang muncul, dan data akhirnya pergi ke mana. Ini berdasarkan kode terbaru yang sekarang ada di folder tersebut. Tidak ada file yang aku ubah.

# Alur lengkap siswa

```text
Login
  ↓
Dashboard utama
  ↓
Pilih sesi aktif
  ↓
Learning / materi
  ↓
Must Do
  ├── Centang semua tugas
  ├── Kumpulkan link/file
  └── Kerjakan quiz
  ↓
Should Do
  ├── Centang semua tugas
  └── Kumpulkan link/file
  ↓
Aspire
  ├── Pilih minimal satu tantangan
  └── Kumpulkan link/file
  ↓
Guru membuka hasil
  ↓
Guru memberikan bintang
  ↓
Sesi berikutnya terbuka
```

# 1. Siswa membuka halaman login

Halaman:

[index.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/index.html)

Yang siswa lihat:

1. Input kode kelas.
2. Tombol untuk memeriksa kode.
3. Setelah kode benar, muncul dropdown nama siswa.
4. Siswa memilih namanya.
5. Siswa menekan tombol login/masuk.

## Ketika kode kelas diperiksa

Frontend mengirim:

```text
?action=getStudents&code=KODE_KELAS
```

Backend membuka:

```text
Database pusat
└── Student Active
    ├── Kolom V = kode kelas
    ├── Kolom B = nama siswa
    └── Kolom W = status siswa
```

Siswa berstatus `graduated` tidak dimasukkan ke dropdown.

## Ketika siswa memilih nama

Data berikut disimpan di browser:

```javascript
studentName
className
classCode
currentSession
attendanceSession
```

Untuk login baru, state sesi dan data lama siswa sebelumnya dibersihkan. Kemudian siswa diarahkan ke:

```text
dashboard.html
```

# 2. Siswa masuk ke dashboard utama

Halaman:

[dashboard.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/dashboard.html)

Dashboard mengambil data berdasarkan:

```text
kode kelas + nama siswa
```

Data yang dimuat:

- Nama siswa
- Nama guru
- Program Roblox atau Scratch
- Level siswa
- Sesi aktif
- Absensi terakhir
- Total bintang
- Progress semua sesi
- Status project dan grading

## Yang muncul di dashboard

Siswa akan melihat:

- Nama siswa
- Kode kelas
- Nama guru
- Program
- Level
- Total bintang
- Progress orbit
- Sesi aktif
- Daftar sesi berikutnya
- Tombol materi
- Tombol peta sesi

## Penentuan level

Versi kode terbaru sudah membaca level siswa dari tab `Absensi`, lalu menyimpannya sebagai:

```javascript
localStorage.studentLevel
```

Materi juga difilter berdasarkan level siswa tersebut.

## Penentuan sesi aktif

Sesi aktif memakai:

```javascript
currentSession
```

`currentSession` berasal dari hasil progress dan grading di tab `Progress`.

Versi sekarang tidak menggunakan `attendanceSession` sebagai pembuka utama sesi. Attendance tetap disimpan, tetapi sesi aktif mengikuti progress yang telah diselesaikan dan dinilai.

# 3. Tombol sesi pada dashboard

Pada daftar roadmap terdapat kartu seperti:

```text
Sesi 1
Sesi 2
Sesi 3
...
```

## Kalau sesi sudah terbuka

Ketika kartu diklik:

```javascript
localStorage.activeLesson = nomor sesi
```

Kemudian siswa diarahkan ke:

```text
materials.html
```

## Kalau sesi masih terkunci

Muncul pesan:

```text
Misi ini masih terkunci!
Selesaikan sesi sebelumnya dengan 100% termasuk quiz.
```

Siswa tidak pindah halaman.

# 4. Tombol “Peta Sesi”

Jika siswa menekan tombol peta sesi, ia masuk ke:

[sessions.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/sessions.html)

Yang muncul adalah jalur semua sesi.

Status sesi:

| Kondisi | Tampilan |
|---|---|
| Nomor di bawah sesi aktif | Selesai/centang |
| Sama dengan sesi aktif | Aktif |
| Di atas sesi aktif | Terkunci |

Jika sesi terkunci diklik, muncul popup:

```text
MASIH KE-GEMBOK!
Ayo selesaikan misi di sesi sebelumnya.
```

Jika boleh dibuka:

```javascript
activeLesson = nomor sesi
```

lalu pindah ke `materials.html`.

# 5. Siswa masuk ke halaman materi

Halaman:

[materials.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/materials.html)

Saat halaman dibuka, sistem mengambil:

```text
selectedCourse
studentLevel
activeLesson
```

Contoh:

```text
Program: Roblox
Level: 2
Sesi: 4
```

Kemudian sistem membuka tab curriculum:

- Roblox → `B2C_RobloxStudio_INS`
- Scratch → `B2C_Scratch_INS`

Data difilter berdasarkan:

- Level siswa
- Nomor sesi aktif

# 6. Tahap pertama: Learning

Ketika halaman material pertama kali terbuka, siswa berada pada fase:

```text
Learning
```

Yang muncul:

- Judul program, level, dan sesi
- Materi berbentuk slide
- Tombol previous/next slide
- Learning objectives di sidebar
- Interactive content jika tersedia
- Kamus Coder jika tersedia
- Tombol `Lanjutkan Ke Misi 🚀`

Siswa dapat membaca slide menggunakan tombol maju dan mundur.

## Tombol “Lanjutkan Ke Misi”

Jika siswa menekan:

```text
Lanjutkan Ke Misi 🚀
```

Sistem menjalankan:

```javascript
setPhase('must-do')
```

Kemudian halaman berubah dari materi menjadi daftar tugas Must Do.

Pada saat masuk Must Do, sistem mulai menghitung progress dengan nilai dasar:

```text
50%
```

# 7. Tahap Must Do

Yang muncul:

- Judul `Tantangan Must Do`
- Daftar tugas
- Gambar atau contoh jika tersedia
- Tombol `TANDAI SELESAI` pada setiap tugas
- Daftar checklist yang sama di sidebar
- Tombol `KUMPUL MISI`

## Tombol “Tandai Selesai”

Setiap tugas memiliki tombol:

```text
TANDAI SELESAI
```

Ketika diklik:

1. Tugas ditandai dengan centang.
2. Tombol berubah menjadi:

```text
✓ MISI SELESAI
```

3. Status checklist disimpan di browser.
4. Progress dihitung ulang.
5. Progress dikirim ke Apps Script.
6. Apps Script menulis progress ke tab `Progress`.

Checklist lokal disimpan menggunakan key seperti:

```text
kalanantiTaskProgress_roblox_1
```

Artinya checklist terkait:

- Program
- Nomor sesi
- Browser/perangkat yang dipakai

## Perhitungan progress Must Do

Progress awal:

```text
50%
```

Sisa `45%` dibagi berdasarkan jumlah tugas Must Do.

Contoh ada tiga tugas:

```text
Progress awal      = 50%
Tugas 1 selesai    = 65%
Tugas 2 selesai    = 80%
Tugas 3 selesai    = 95%
Quiz selesai       = 100%
```

Rumusnya:

```text
50% + (45% / jumlah tugas × tugas selesai)
```

Jika tidak ada tugas Must Do, sistem langsung memberi tambahan 45%, menjadi sekitar 95%.

## Kalau belum semua tugas dicentang

Tombol `KUMPUL MISI` terlihat tidak aktif.

Jika dicoba, muncul:

```text
Mission Locked
Selesaikan dan centang semua misi di atas dulu.
```

## Kalau semua tugas dicentang

Tombol `KUMPUL MISI 🚀` menjadi aktif.

# 8. Tombol “Kumpul Misi”

Ketika siswa menekan:

```text
KUMPUL MISI 🚀
```

Muncul modal submission.

Modal berisi:

- Judul `KUMPUL MISI MUST 🚀`
- Input link project
- Input upload file
- Informasi jumlah file
- Tombol `KIRIM MISI`

Siswa harus memasukkan minimal salah satu:

- Link project; atau
- File/screenshot

Jika keduanya kosong, muncul:

```text
Waduh!
Masukkan link atau upload file dulu ya kapten!
```

# 9. Jika siswa memasukkan link

Contoh link:

- Scratch project
- Roblox project
- Google Drive
- Google Docs
- Link project lainnya

Payload yang dikirim:

```javascript
{
  action: "submitProject",
  classCode,
  studentName,
  className,
  session,
  phase: "must-do",
  url,
  files: []
}
```

Backend kemudian menulis link ke:

```text
Spreadsheet kelas
└── Progress
    └── Blok sesi aktif
        └── Baris Project Uploaded
            └── Kolom siswa
```

Formatnya:

```text
[Must Do][Link] https://link-project
```

# 10. Jika siswa mengunggah file

File dibaca oleh browser, diubah menjadi base64, lalu dikirim ke Apps Script.

Backend menyimpannya ke Google Drive:

```text
Base Folder Kalananti
└── KODEKELAS-NAMASISWA-PROGRAM
    └── Session N
        └── must-do
            └── file siswa
```

Kemudian URL folder ditulis ke tab `Progress`:

```text
[Must Do][Screenshot] URL_FOLDER_DRIVE
```

Jadi file fisiknya pergi ke Google Drive, sedangkan link foldernya masuk ke spreadsheet kelas.

# 11. Setelah submission Must Do berhasil

Muncul popup:

```text
MANTAP! TERKIRIM! 🌟
Misimu sudah terkirim ke markas.
Sekarang tunggu Kakak Pengajar periksa.
```

Status submission disimpan di browser:

```javascript
kalanantiSubmitted_program_sesi_must-do = true
```

Tampilan tugas berubah menjadi:

```text
SUBMITTED 🛰️
```

Setelah Must Do terkirim, muncul beberapa tombol:

- `Lanjut ke Should Do ⭐`
- `Tugas 👀`
- `Quiz ✉️`, selama quiz belum selesai

# 12. Tombol “Tugas”

Jika siswa menekan:

```text
Tugas 👀
```

Muncul modal preview.

Sistem membaca link hasil submission dari data `sessionProgress`.

Yang bisa muncul:

- Tombol `Link Project 🔗`
- Tombol `Screenshot/Folder 📸`
- Preview project dalam iframe
- Tombol memperbarui/memperbaiki submission

Untuk jenis link tertentu:

| Jenis | Yang muncul |
|---|---|
| Scratch | Project embed |
| Google Drive folder | Isi folder |
| Google Drive file | Preview file |
| Google Docs/Slides | Preview document |
| URL biasa | URL dibuka dalam iframe |

Jika siswa menekan tombol update, modal submission terbuka kembali sehingga submission dengan phase dan tipe yang sama dapat diganti.

# 13. Tombol Quiz

Quiz hanya ditampilkan pada bagian Must Do.

Jika siswa menekan:

```text
Quiz ✉️
```

Sistem memeriksa:

- Must Do sudah dikumpulkan; atau
- Semua checklist Must Do sudah selesai

Jika belum:

```text
Belum Siap!
Selesaikan Must Do dulu baru bisa Quiz.
```

Jika siap, siswa pindah ke:

[quiz.html](/Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-dashboards/quiz.html)

# 14. Halaman Quiz

Sistem mengambil pertanyaan berdasarkan:

- Program siswa
- Level siswa
- Sesi aktif

Yang muncul:

- Pertanyaan
- Pilihan A/B/C/D
- Nomor pertanyaan
- Score
- Progress pertanyaan

## Ketika siswa memilih jawaban

Jawaban langsung dikunci.

Jika benar:

```text
✅ Benar! Jawaban yang tepat adalah ...
```

Jika salah:

```text
❌ Hmm, salah! Jawaban yang benar adalah ...
```

Setelah sekitar 1,2 detik, sistem otomatis berpindah ke pertanyaan berikutnya.

## Tombol submit quiz

Tombol submit baru muncul setelah semua pertanyaan sudah dijawab.

Ketika ditekan:

1. Persentase nilai dihitung.
2. Hasil quiz muncul.
3. Status quiz disimpan di browser.
4. Nilai dikirim ke backend.
5. Progress sesi ditulis `100%`.
6. Bintang quiz dihitung.
7. `Absensi!AQ1` diperbarui.

Rumus bintang:

```javascript
Math.floor((jawabanBenar / totalPertanyaan) * 5)
```

Contoh:

| Nilai | Bintang backend |
|---:|---:|
| 100% | 5 |
| 80% | 4 |
| 60% | 3 |
| 40% | 2 |
| 20% | 1 |
| 0% | 0 |

Backend menulis ke tab `Progress`:

```text
Quiz row     → nilai quiz
Progress row → 100%
Star row     → X Star - Quiz
```

Di browser juga disimpan:

```javascript
quiz_N = true
```

# 15. Tahap Should Do

Dari Must Do yang sudah dikumpulkan, siswa dapat menekan:

```text
Lanjut ke Should Do ⭐
```

Yang muncul:

- Daftar tantangan Should Do
- Tombol `TANDAI SELESAI`
- Tombol `KUMPUL MISI`

Aturannya:

- Semua tugas Should Do harus dicentang.
- Setelah itu tombol Kumpul Misi aktif.
- Siswa memasukkan link atau file.
- Submission dikirim dengan:

```javascript
phase: "should-do"
```

Di spreadsheet menjadi:

```text
[Should Do][Link] URL
```

atau:

```text
[Should Do][Screenshot] URL_FOLDER
```

Setelah berhasil, muncul tombol:

- `Lanjut ke Aspire Do 👑`
- `Tugas 👀`

Should Do tidak memiliki quiz terpisah.

# 16. Tahap Aspire

Dari Should Do yang sudah dikumpulkan, siswa menekan:

```text
Lanjut ke Aspire Do 👑
```

Yang muncul adalah daftar tantangan Aspire.

Perbedaannya:

- Must Do membutuhkan semua tugas dicentang.
- Should Do membutuhkan semua tugas dicentang.
- Aspire hanya membutuhkan minimal satu tugas dicentang.

Setelah minimal satu tantangan dipilih, tombol `KUMPUL MISI` aktif.

Submission dikirim dengan:

```javascript
phase: "aspire-do"
```

Di spreadsheet menjadi:

```text
[Aspire][Link] URL
```

atau:

```text
[Aspire][Screenshot] URL_FOLDER
```

Setelah berhasil, siswa bisa melihat submission melalui tombol `Tugas 👀`.

# 17. Apakah siswa langsung membuka sesi berikutnya?

Belum tentu.

Setelah quiz, progress menjadi:

```text
100%
```

Tetapi backend student dashboard juga memeriksa apakah submission sudah dinilai guru.

Contoh siswa mengirim:

```text
[Must Do][Link] ...
[Should Do][Link] ...
```

Maka sistem mencari bintang yang sesuai:

```text
3 Star - Must do
2 Star - Should do
```

Jika siswa juga mengirim Aspire, sistem mencari:

```text
X Star - Aspire to do
```

Jadi urutannya:

```text
Siswa submit
      ↓
Progress 100% setelah quiz
      ↓
Guru membuka teacher dashboard
      ↓
Guru melihat link/screenshot
      ↓
Guru memberi bintang sesuai phase
      ↓
Student dashboard membaca grading
      ↓
currentSession naik
      ↓
Sesi berikutnya terbuka
```

# 18. Apa yang dilihat guru?

Pada teacher dashboard, guru membuka siswa dan sesi terkait.

Guru dapat melihat:

- Link Must Do
- Screenshot/folder Must Do
- Link Should Do
- Screenshot/folder Should Do
- Link Aspire
- Screenshot/folder Aspire
- Nilai quiz
- Progress
- Tanggal
- Bintang yang sudah diberikan

Guru kemudian memberi:

- Bintang Must Do
- Bintang Should Do
- Bintang Aspire
- Observasi untuk sesi 4 atau 8
- Bonus jika diperlukan

Setelah guru menyimpan penilaian:

```text
Progress = 100%
Star row diperbarui
Total stars diperbarui
Absensi!AQ1 diperbarui
```

Dashboard utama mengecek perubahan sekitar setiap 60 detik. Peta sesi mengecek setiap 30 detik selama tab terlihat dan langsung mengecek lagi ketika tab kembali aktif.

# 19. Urutan tombol versi sederhana

| Tahap | Tombol siswa | Hasil |
|---|---|---|
| Dashboard | Kartu sesi | Masuk ke materi |
| Dashboard | Peta Sesi | Melihat semua sesi |
| Learning | Next/Previous | Berpindah slide |
| Learning | Lanjutkan Ke Misi | Masuk Must Do |
| Must Do | Tandai Selesai | Checklist dan update progress |
| Must Do | Kumpul Misi | Membuka modal submission |
| Submit modal | Kirim Misi | Link/file masuk backend |
| Must Do selesai | Tugas | Preview submission |
| Must Do selesai | Quiz | Masuk halaman quiz |
| Must Do selesai | Lanjut Should Do | Masuk tantangan tambahan |
| Should Do | Kumpul Misi | Submission Should Do |
| Should selesai | Quiz | Langsung masuk halaman quiz jika tidak ingin lanjut Aspire |
| Should selesai | Lanjut Aspire | Masuk Aspire |
| Aspire | Kumpul Misi | Submission Aspire |
| Aspire selesai | Quiz | Masuk halaman quiz |
| Quiz | Pilih jawaban | Feedback langsung |
| Quiz | Submit | Nilai, bintang quiz, progress 100% |

# 20. Data akhirnya lari ke mana?

| Aktivitas siswa | Tujuan |
|---|---|
| Login | `localStorage` browser |
| Pilih sesi | `localStorage.activeLesson` |
| Baca materi | Tidak langsung menulis ke sheet |
| Masuk Must Do | Progress mulai 50% |
| Centang tugas | Browser + `Progress` sheet |
| Submit link | `Progress` → Project Uploaded |
| Upload file | Google Drive + URL ke `Progress` |
| Submit quiz | `Progress` → Quiz, Progress, Star |
| Checklist tugas | Browser lokal |
| Status submission | Browser + link server |
| Hasil grading guru | `Progress` sheet |
| Sesi berikutnya | Dibuka setelah progress dan grading terpenuhi |

# Catatan penting dari flow sekarang

- Siswa dapat masuk ke Should Do segera setelah Must Do dikumpulkan; quiz bisa dikerjakan sebelum atau sesudah Should Do.
- Tombol Quiz tersedia setelah submission Must Do, Should Do, maupun Aspire, selama Quiz sesi tersebut belum selesai.
- Should Do dan Aspire tidak menambah rumus progress material; progress utama berasal dari Must Do dan quiz.
- Checklist tersimpan per browser. Jika siswa ganti perangkat, checklist lokal belum tentu ikut pindah.
- Submission yang sudah masuk ke spreadsheet tetap bisa ditemukan kembali dari server.
- Sesi berikutnya tidak cukup hanya quiz `100%`; submission yang dikirim juga harus mendapat grading guru.
- Jika siswa mengirim Must Do, Should Do, dan Aspire, backend mengharapkan penilaian yang sesuai untuk phase-phase tersebut sebelum menganggap grading lengkap.
> **Fungsi dokumen:** menjelaskan arsitektur, komponen utama, dan perilaku Student Dashboard.
>
> **Baca ketika:** ingin memahami hubungan halaman, Google Apps Script, Google Sheets, Drive, dan penyimpanan browser.
>
> **Bukan untuk:** langkah deployment atau riwayat perubahan. Gunakan `DEPLOYMENT.md` atau `CHANGELOG.md`.
>
> **Terakhir diperbarui:** 16 Juli 2026.

# Arsitektur Student Dashboard
