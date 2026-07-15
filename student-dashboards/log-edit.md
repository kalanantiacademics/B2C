# Log Perubahan Student Dashboard

File ini menjadi catatan berkelanjutan untuk setiap perubahan pada `B2C/student-dashboards`. Setiap pekerjaan berikutnya harus menambahkan tanggal, masalah, file yang diubah, rincian implementasi, verifikasi, serta langkah deployment bila ada.

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
