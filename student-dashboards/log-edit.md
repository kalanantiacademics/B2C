# Log Perubahan Student Dashboard

File ini menjadi catatan berkelanjutan untuk setiap perubahan pada `B2C/student-dashboards`. Setiap pekerjaan berikutnya harus menambahkan tanggal, masalah, file yang diubah, rincian implementasi, verifikasi, serta langkah deployment bila ada.

## 2026-07-15 — Planet mengikuti Level dan judul sesi mengikuti Academic Spreadsheet

### Masalah

- Dashboard sebelumnya memilih planet berdasarkan nomor sesi, sehingga dalam satu level Sesi 1 sampai Sesi 12 tampak seperti berpindah-pindah planet.
- Judul kartu roadmap memakai nama planet dan deskripsi hardcoded di HTML, bukan judul sesi pada spreadsheet Academic.
- Kolom Level pada spreadsheet menggunakan sel gabungan. Baris sesi setelah baris pertama level dapat terbaca kosong dan berisiko tercampur dengan level lain.

### Sumber data yang dikonfirmasi

- Tab `B2C_Scratch_INS` berisi materi interaktif, tetapi tidak memiliki kolom judul sesi.
- Tab sumber `B2C_Scratch_Modul` memiliki kolom `Session-topic`.
- Contoh resmi Level 2: Sesi 1 `Eat Healthy Food Part 1`, Sesi 2 `Eat Healthy Food Part 2`, dan Sesi 12 `Presentation Day`.

### File yang diubah

#### `dashboard.html`

- Planet sekarang dipilih dari `studentLevel`, sehingga semua sesi pada level yang sama memakai identitas planet yang sama.
- Judul progress utama menampilkan nama planet level, bukan `Planet <nomor sesi>`.
- Konfigurasi course sekarang menyimpan `topicSheet` untuk tab modul masing-masing program.
- Roadmap mengambil tab materi INS dan tab Modul secara bersamaan.
- Kartu sesi menampilkan nilai `Session-topic` dari spreadsheet Academic sebagai judul utama; deskripsi hardcoded hanya menjadi fallback jika data judul tidak tersedia.
- Nama planet per sesi yang sebelumnya hardcoded di kartu dihapus.
- Pembacaan Level meneruskan nilai level terakhir pada baris kosong akibat merged cells, lalu hanya memilih baris level siswa yang sedang login.

### Deployment

- Perubahan ini hanya berada di `dashboard.html`, sehingga tidak memerlukan deployment ulang Google Apps Script.
- Setelah commit dan push, tunggu GitHub Pages selesai build lalu lakukan hard refresh pada dashboard.

## 2026-07-15 — Sumber nama login dari spreadsheet kelas dan pengamanan sesi

### Masalah

- Login mengambil daftar nama dari tab `Student Active` di database pusat, tetapi upload dan progress ditulis ke tab `Progress` pada spreadsheet kelas.
- Ketidaksesuaian nama seperti `Buidana` di `Student Active` dan `Budiyana` di `Progress` menyebabkan login berhasil tetapi upload gagal dengan pesan `Siswa tidak ditemukan di kolom manapun`.
- Jika pembacaan progress server gagal, dashboard dapat menggunakan `currentSession` atau `attendanceSession` lama dari browser. Akibatnya, siswa baru dapat melihat sesi setelah Sesi 1 dalam keadaan terbuka.

### Diagnosis dan bukti sebelum perubahan

1. Deployment student API untuk kode `SCLWER222` mengembalikan nama `Buidana` dan `Siti Rupiah` dari `Student Active`.
2. Permintaan progress untuk `Buidana` gagal karena tab `Progress` berisi `Budiyana`.
3. Permintaan progress untuk `Siti Rupiah` berhasil dan mengembalikan `currentSession: 1` serta `attendanceSession: 1`.
4. `index.html` sebelumnya hanya mengisi `currentSession = 1` jika key tersebut belum ada, sehingga nilai login lama dapat terbawa.

### File yang diubah

#### `code-student.gs`

- Mengubah `getStudentsByClassCode(code)` agar:
  - mencari kode kelas melalui `Class Database` menggunakan `getClassInfo()`;
  - membuka spreadsheet kelas dari link/ID yang sudah terdaftar;
  - membaca daftar nama langsung dari header tab `Progress`;
  - menggunakan baris 2 sebagai sumber utama dan baris 1 sebagai fallback template lama;
  - hanya membaca kolom C dan seterusnya karena kolom A-B adalah `Materi` dan `Matrix`;
  - membuang placeholder seperti `Student C`, `Student D`, `Students`, `Nama Siswa`, `Note`, dan `Catatan`;
  - menghapus nama duplikat berdasarkan hasil normalisasi;
  - mengembalikan `source: class-progress-sheet` untuk membantu diagnosis API.
- Tab `Student Active` tidak lagi menjadi sumber daftar nama login siswa. Tab tersebut tetap dapat dipakai untuk administrasi pusat.

#### `index.html`

- Menambahkan identitas login `loginIdentity` dengan format `kodeKelas::namaSiswa`.
- Saat kelas atau siswa berubah, browser membersihkan state milik login sebelumnya:
  - `currentSession`;
  - `attendanceSession`;
  - `activeLesson`;
  - `sessionProgress`;
  - `totalStars`;
  - `teacherName`;
  - seluruh key berawalan `quiz_`, `kalanantiTaskProgress_`, dan `kalanantiSubmitted_`.
- Setiap login siswa dimulai dalam kondisi aman pada Sesi 1. Dashboard kemudian mengganti nilainya dengan progress terbaru dari server.
- Menghapus flag `isAdmin` ketika login biasa agar akses admin tidak terbawa ke siswa berikutnya.

#### `dashboard.html`

- Menambahkan mekanisme `fail closed` ketika API progress gagal atau siswa tidak ditemukan.
- Untuk siswa non-admin, fallback sekarang menetapkan:
  - `currentSession = 1`;
  - `attendanceSession = 1`;
  - `activeLesson = 1`;
  - `sessionProgress = []`;
  - `totalStars = 0`.
- Dengan fallback tersebut, kegagalan server tidak lagi membuka sesi berdasarkan data login lama.

### Verifikasi lokal

- `code-student.gs` disalin sementara menjadi `/private/tmp/code-student-check.js` karena `node --check` tidak menerima ekstensi `.gs`.
- Perintah `node --check /private/tmp/code-student-check.js` berhasil tanpa error sintaks.
- Pemeriksaan statis memastikan login masih memanggil action API `getStudents`, sehingga perubahan backend tidak memerlukan perubahan endpoint HTML.
- Deployment aktif belum berubah sampai `code-student.gs` versi ini dipasang ulang sebagai versi baru Google Apps Script Web App.

### Langkah deployment yang diperlukan

1. Salin versi terbaru `code-student.gs` ke project Google Apps Script student dashboard.
2. Pilih **Deploy → Manage deployments → Edit**.
3. Buat versi baru dan deploy menggunakan URL Web App yang sama.
4. Buka halaman login menggunakan jendela incognito atau lakukan logout terlebih dahulu.
5. Masukkan `SCLWER222`; pilihan nama yang diharapkan berasal dari header `Progress`: `Budiyana` dan `Siti Rupiah`. Placeholder `Student C` sampai `Student H` tidak boleh muncul.
6. Login sebagai `Budiyana`; pastikan hanya Sesi 1 yang terbuka dan uji kirim satu link/file tugas.
7. Login bergantian sebagai siswa lain untuk memastikan sesi, quiz, dan status submisi siswa sebelumnya tidak terbawa.

### Catatan rollback

- Jika daftar nama tidak muncul, periksa apakah link spreadsheet pada `Class Database` valid dan tab bernama tepat `Progress`.
- Untuk rollback perilaku daftar login saja, kembalikan fungsi `getStudentsByClassCode()` ke pembacaan `Student Active`. Pengamanan state pada `index.html` dan `dashboard.html` sebaiknya tetap dipertahankan.

## 2026-07-15 — Memisahkan Level siswa dari nomor Sesi

### Masalah

- `Budiyana` tercatat sebagai Level 2 pada tab `Absensi`, tetapi belum mengerjakan Materi/Sesi 1.
- Backend sebelumnya hanya mengirim program, guru, sesi, absensi, bintang, dan progress; level siswa tidak dikirim.
- Dashboard sebelumnya menampilkan level menggunakan rumus `Math.ceil(session / 2)`. Rumus ini keliru karena level siswa adalah atribut siswa, bukan hasil dari nomor sesi.
- Halaman materi, peta sesi, roadmap, dan quiz sebelumnya memilih data berdasarkan nomor sesi saja. Jika Level 1 dan Level 2 sama-sama mempunyai Sesi 1, materi yang terpilih dapat berasal dari level yang salah.

### Alur yang diterapkan

```text
Kode kelas
  → spreadsheet kelas
  → header Progress untuk identitas nama
  → baris siswa di tab Absensi untuk Level
  → progress kosong berarti currentSession = 1
  → filter curriculum dengan Level 2 + Session 1
```

Jadi untuk kondisi Budiyana saat ini, hasil yang diharapkan adalah **Scratch, Level 2, Sesi 1**. Sesi 2 dan seterusnya tetap terkunci sampai syarat penyelesaian Sesi 1 terpenuhi.

### File yang diubah

#### `code-student.gs`

- Saat membaca baris siswa di tab `Absensi`, backend sekarang mencari kolom berheader `Level` secara dinamis.
- Nilai level dinormalisasi menjadi angka positif.
- Respons `getStudentProgress` sekarang menyertakan `studentLevel`.
- Nilai default tetap Level 1 jika header/nilai level tidak ditemukan, agar dashboard gagal secara aman.

#### `index.html`

- Menambahkan `studentLevel` ke daftar state yang dibersihkan ketika identitas login berubah.

#### `dashboard.html`

- Menyimpan `studentLevel` dari respons server ke `localStorage`.
- Label orbit menampilkan level siswa sebenarnya dan tidak lagi menghitung level dari nomor sesi.
- Roadmap curriculum difilter berdasarkan level siswa sebelum sesi dirender.
- Gerbang sesi dan persentase dashboard sekarang mengikuti `currentSession` dari penyelesaian progress, bukan `attendanceSession`.

#### `sessions.html`

- Data peta sesi difilter berdasarkan `studentLevel` sebelum dilakukan deduplikasi nomor sesi.
- Status terkunci/terbuka dan validasi klik menggunakan `currentSession`. Kehadiran saja tidak membuka sesi berikutnya.

#### `materials.html`

- Materi dipilih dari kombinasi `studentLevel` dan `activeLesson`.
- Fallback berdasarkan indeks juga hanya menggunakan kumpulan data level siswa.
- Judul materi menampilkan program, level, dan sesi aktif.

#### `quiz.html`

- Pertanyaan quiz dipilih menggunakan kombinasi level siswa dan sesi aktif.

### Aturan kompatibilitas curriculum

- Nilai level seperti `2`, `Level 2`, atau nilai gabungan seperti `1, 2` didukung karena angka level diekstrak dari teks.
- Jika suatu baris curriculum tidak memiliki nilai Level, baris tersebut dianggap materi umum dan tetap dapat digunakan.

### Langkah pengujian setelah deployment

1. Deploy ulang `code-student.gs` sebagai versi baru Web App.
2. Login menggunakan `SCLWER222` dan pilih `Budiyana`.
3. Pastikan respons progress mengandung `studentLevel: 2`, `currentSession: 1`, dan `attendanceSession: 1`.
4. Pastikan dashboard menampilkan `Level 2` dan misi aktif Sesi 1.
5. Pastikan peta hanya membuka Sesi 1.
6. Buka materi dan pastikan judul menampilkan `SCRATCH LEVEL 2 / Sesi 1` serta kontennya berasal dari curriculum Level 2.
7. Pastikan quiz Sesi 1 juga berasal dari curriculum Level 2.

## 2026-07-15 — Publikasi perubahan ke GitHub Pages

### Penyebab halaman live belum berubah

- Perubahan sebelumnya baru tersimpan di workspace lokal dan belum dibuat commit/push pada nested repository `B2C`.
- Repository induk `Kalananti-cloud` memakai remote proyek lain. GitHub Pages `kalanantiacademics.github.io/B2C` berasal dari repository nested `Academic_Content/B2C` dengan remote `kalanantiacademics/B2C`.
- Nama `Buidana`, Level 6, dan Sesi 12 pada tangkapan layar juga berasal dari kombinasi HTML lama, deployment Apps Script lama, serta state login lama di `localStorage`.

### Alur publikasi

- File student dashboard diperiksa dan dicommit hanya dari nested repository `B2C`.
- Remote GitHub yang digunakan adalah `kalanantiacademics/B2C`.
- Akses memakai SSH key akademik yang tersedia di mesin ini.
- Perubahan HTML akan aktif melalui GitHub Pages setelah push dan proses build Pages selesai.
- `code-student.gs` tidak dijalankan oleh GitHub Pages. File tersebut tetap harus ditempel/deploy sebagai versi baru pada Google Apps Script Web App agar sumber nama dan level baru aktif di API.

### Catatan pengujian browser

- Setelah GitHub Pages dan Apps Script sama-sama terbarui, lakukan logout lalu login ulang. Ini diperlukan agar `studentName` lama (`Buidana`) diganti dengan pilihan resmi dari header `Progress` (`Budiyana`).
- Jika browser masih menampilkan data lama, lakukan hard refresh atau uji melalui incognito.

### Status publikasi

- Commit lokal berhasil dibuat: `d3205f8` (`Fix student login identity, level, and session gating`).
- Push menggunakan SSH key akademik gagal karena akun GitHub yang terdeteksi (`mds-academic`) tidak memiliki izin menulis ke `kalanantiacademics/B2C`.
- Fingerprint `SHA256:Dns6nijOYoN1tAeOkmLncMERfUN+0LOZ9mU0CdQ2VAQ` yang dicatat di `knowledge-scl.md` tidak cocok dengan tiga public key yang saat ini tersedia di folder `~/.ssh`.
- Karena push belum berhasil, GitHub Pages masih menyajikan versi lama. Commit lokal tetap aman dan siap dipush setelah credential dengan akses tulis tersedia.

### Penyelesaian autentikasi dan push

- SSH agent tidak memuat identity `new-yazid-mac`, tetapi GitHub CLI sudah login melalui keyring sebagai akun organisasi `kalanantiacademics` dengan scope `repo`.
- Git remote `b2c` dikembalikan ke HTTPS dan autentikasi Git dikonfigurasi melalui `gh auth setup-git`.
- Push ke `kalanantiacademics/B2C` branch `main` berhasil pada 15 Juli 2026.
- Rentang commit yang dipublikasikan: `701a966..95de5c9`.
- Status HTML GitHub Pages diverifikasi terpisah setelah proses build/caching selesai.

### Hasil verifikasi live

- GitHub Pages build untuk commit `6ac9a64` selesai dengan status `built` pada 15 Juli 2026.
- `dashboard.html` live sudah memuat `studentLevel` dan gerbang sesi berbasis `currentSession`; rumus lama `Math.ceil(sess/2)` sudah tidak ada.
- `index.html` live sudah memuat `loginIdentity` dan pembersihan state lintas siswa.
- Deployment Google Apps Script yang aktif masih mengembalikan `Buidana` dari endpoint `getStudents` untuk `SCLWER222`. Ini membuktikan backend Web App belum memakai versi lokal `code-student.gs` yang baru.

## 2026-07-15 — Indikator jumlah slide dan transisi otomatis ke Must Do

### Masalah

- Navigasi materi hanya menampilkan satu bentuk indikator aktif tanpa keterangan posisi, sehingga siswa tidak mengetahui jumlah slide dan sedang berada di slide ke berapa.
- Tombol kanan dinonaktifkan pada slide terakhir. Siswa harus mencari tombol lain di sidebar untuk masuk ke `Must Do`.

### Perubahan di `materials.html`

- Menambahkan label `Slide X dari Y` di atas indikator.
- Menampilkan satu titik untuk setiap slide; titik aktif berbentuk lebih panjang dan berwarna kuning.
- Setiap titik dapat diklik untuk langsung membuka slide terkait.
- Area titik dapat digeser horizontal jika jumlah slide banyak.
- Tombol kanan tetap aktif pada slide terakhir, berubah warna kuning, dan memiliki label aksesibilitas `Lanjut ke Must Do`.
- Menekan tombol kanan pada slide terakhir otomatis menjalankan `setPhase('must-do')`.
- Perpindahan ke `Must Do` tetap memakai alur yang sudah ada, termasuk pencatatan progress awal melalui `syncProgress()`.

## 2026-07-15 — Sinkronisasi jam kelas dari tab Absensi

### Masalah

- Kartu kelas pada dashboard menampilkan jam hardcoded `17:00 – 18:00`, sehingga tidak mengikuti jadwal kelas pada spreadsheet.

### Perubahan

- `code-student.gs` mencari label `Jam Mulai` dan `Jam Selesai` secara dinamis di tab `Absensi`.
- Nilai waktu dinormalisasi ke format 24 jam `HH:mm` menggunakan zona waktu `Asia/Jakarta`.
- Respons `getStudentProgress` sekarang menyertakan `classStartTime` dan `classEndTime`.
- `dashboard.html` menyimpan jadwal dari server dan menampilkannya pada kartu kelas.
- Jika jadwal kosong/tidak ditemukan, dashboard menampilkan `Jadwal belum tersedia`, bukan jam palsu.
- `index.html` membersihkan cache jadwal ketika siswa atau kelas login berubah.

### Hasil yang diharapkan untuk SCLWER222

- Tab `Absensi` berisi Jam Mulai `7:30 AM` dan Jam Selesai `8:00 AM`.
- Dashboard harus menampilkan `07:30 – 08:00` setelah Apps Script versi terbaru dideploy.
