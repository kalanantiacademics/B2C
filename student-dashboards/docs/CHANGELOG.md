> **Fungsi dokumen:** mencatat perubahan Student Dashboard berdasarkan tanggal, file, verifikasi, dan kebutuhan deployment.
>
> **Baca ketika:** ingin mengetahui apa yang berubah atau mencari riwayat perbaikan.
>
> **Aturan:** perubahan baru ditambahkan di bagian paling atas setelah judul dan pengantar.

# Changelog Student Dashboard

File ini menjadi catatan berkelanjutan untuk setiap perubahan pada `B2C/student-dashboards`. Setiap pekerjaan berikutnya harus menambahkan tanggal, masalah, file yang diubah, rincian implementasi, verifikasi, serta langkah deployment bila ada.

## 2026-07-17 — Navigasi phase, upload ulang, dan sync saat LMS aktif

### Masalah

- Dari Should Do atau Aspire, siswa tidak melihat tombol untuk kembali memeriksa Must Do.
- Kemampuan mengganti project yang salah upload tersembunyi di balik label umum `Tugas` dan `Perbaiki Misi`.
- Saat perubahan sesi diterima ketika siswa masih memakai halaman LMS, `sessionProgress` diperbarui tetapi `currentSession` browser belum ikut diperbarui.

### Perubahan

- Menambahkan tombol **Kembali ke Must Do** pada Should Do.
- Menambahkan tombol **Lihat Must Do** dan **Kembali ke Should Do** pada Aspire.
- Mengganti label aksi submission menjadi **Lihat / Upload Ulang Tugas**.
- Memperjelas tombol pada preview menjadi **Upload Ulang / Ganti Project**.
- Saat `getStudentProgress` menerima perubahan, halaman LMS sekarang ikut menyimpan `currentSession`, `totalStars`, dan `attendanceSession` terbaru tanpa memindahkan siswa dari sesi yang sedang dikerjakan.

### Verifikasi

- Browser memastikan seluruh tombol kembali tampil dan Should Do dapat kembali ke Must Do.
- Browser memastikan aksi upload ulang tampil dari submission dan membuka pilihan ganti project.
- Simulasi respons progress baru berhasil memperbarui `currentSession` dari 1 menjadi 2 selama halaman LMS tetap aktif.

### Deployment

- Perubahan frontend diterbitkan melalui `b2c/main` dan GitHub Pages.
- Tidak memerlukan deployment ulang Apps Script.

## 2026-07-17 — Auto-sync pembukaan sesi dan pesan terkunci per kondisi

### Masalah

- Peta sesi hanya membaca `currentSession` dari `localStorage`, sehingga nilai baru dari teacher tidak langsung membuka sesi berikutnya.
- Siswa perlu refresh berulang kali dan semua kondisi terkunci menampilkan pesan umum yang sama.

### Perubahan

- Menambahkan pemeriksaan `Absensi!AQ1` setiap 30 detik selama tab peta sesi terlihat.
- Menjalankan pemeriksaan ulang saat halaman dibuka, tab kembali aktif, atau browser kembali fokus.
- Memanggil `getStudentProgress` hanya ketika versi sinkronisasi berubah, lalu memperbarui `sessionProgress`, `currentSession`, Orbit, dan node peta tanpa reload.
- Menampilkan notifikasi saat nilai teacher diterima dan sesi berikutnya berhasil terbuka.
- Membedakan pesan untuk Must Do belum selesai, Quiz belum selesai, menunggu nilai Kakak MT, dan kondisi data lengkap yang sedang disinkronkan.
- Menyelaraskan dokumentasi penanda sinkronisasi dari lokasi lama `Progress!Z1` ke lokasi aktif `Absensi!AQ1`.

### Verifikasi

- Empat skenario pesan terkunci diuji melalui browser dan seluruhnya menampilkan pesan yang sesuai.
- Simulasi perubahan sync flag berhasil mengubah `currentSession` dari 1 ke 2, memperbarui Orbit, mengaktifkan node Sesi 2, dan menampilkan notifikasi tanpa reload.
- JavaScript inline berhasil diparse dan seluruh target lokal `href`/`src` tersedia.

### Deployment

- Commit `851a2ea` dipush ke `b2c/main`.
- GitHub Pages build dan deployment berhasil; halaman produksi terverifikasi memuat auto-sync serta pesan baru.
- Tidak memerlukan deployment ulang Apps Script karena endpoint dan logika backend tidak diubah.

## 2026-07-16 — Refactor struktur tanpa mengubah logika produksi

### Tujuan

- Memisahkan halaman produksi, asset bersama, source Apps Script, dokumentasi, maintenance script, dan eksperimen.
- Memberi nama dokumentasi yang mudah dipahami developer baru.
- Menandai alternate UI sebagai eksperimen, bukan versi produksi.

### Perubahan

- Mempertahankan lima HTML produksi di root agar URL publik dan navigasi tidak berubah.
- Memindahkan `device-guard.css` ke `assets/css/` dan `device-guard.js` ke `assets/js/`, lalu memperbarui seluruh referensi produksi.
- Memindahkan source backend lokal ke `apps-script/code-student.gs` dan menambahkan peringatan bahwa deployment produksi tidak otomatis berubah.
- Memindahkan patch developer ke `scripts/patch-dashboard.js` dan mengganti absolute path menjadi path relatif terhadap script.
- Memindahkan folder nyata `alternate` ke `experiments/alternate-ui/` serta memperbarui favicon, CSS, dan JavaScript sesuai kedalaman folder baru.
- Menambahkan README untuk root, experiments, alternate UI, dan scripts.
- Mengganti `knowledge-st-dbr.md` menjadi `docs/ARCHITECTURE.md` dan `log-edit.md` menjadi `docs/CHANGELOG.md`.
- Menambahkan `DATA-FLOW.md`, `DEVELOPMENT.md`, `DEPLOYMENT.md`, dan `TROUBLESHOOTING.md`.
- Menambahkan penjelasan fungsi, waktu penggunaan, dan batas dokumen pada bagian atas dokumentasi.
- Menambahkan `scripts/check-local-links.js` untuk memeriksa target lokal `href` dan `src`.

### Temuan dan alternatif

- Changelog lama menyebut `alternate-version`, `alternate-theme.css`, serta salinan device guard di folder eksperimen. Filesystem saat refactor hanya memiliki folder `alternate` dengan lima HTML. Migrasi memakai filesystem sebagai sumber kebenaran dan mencatat status eksperimen melalui README baru.
- Percobaan awal validator link gagal karena quoting shell; alternatif yang berhasil adalah membuat validator Node yang dapat digunakan ulang.
- Static server awal ditolak sandbox; alternatif yang berhasil adalah menjalankannya dengan izin localhost yang sesuai.
- Browser lokal mencatat beberapa `Failed to fetch` ketika halaman mencoba API eksternal dengan identitas data uji. Endpoint student kemudian diverifikasi terpisah melalui request read-only dan merespons JSON dengan benar.
- Fallback apabila asset baru gagal adalah mengembalikan device guard ke root. Fallback tidak dipakai karena seluruh asset baru berhasil dimuat.

### Verifikasi

- `node --check` berhasil untuk source Apps Script student yang disalin sementara sebagai `.js`, device guard, patch script, dan validator link.
- Validator memastikan seluruh target lokal `href` dan `src` pada student dan teacher tersedia.
- Chromium headless membuka lima halaman produksi dan lima halaman eksperimen dengan HTTP 200.
- Seluruh halaman student memuat `assets/css/device-guard.css` dan `assets/js/device-guard.js` tanpa request lokal gagal.
- Endpoint Apps Script student aktif merespons request read-only; respons `Class info not found` untuk kode uji membuktikan endpoint dapat dijangkau.

### Deployment

- Tidak memerlukan deployment ulang Apps Script karena logika backend tidak diubah.
- Perubahan struktur frontend perlu diterbitkan bersama seluruh file baru dan perpindahan asset dalam satu deployment agar tidak terjadi 404 sementara.

## 2026-07-16 — Alternate Version untuk eksplorasi redesign

### Kebutuhan

- Membuat eksplorasi layout baru untuk seluruh perjalanan siswa tanpa mengubah versi aktif.
- Alur login, dashboard, peta sesi, materi/tugas, quiz, penyimpanan browser, dan komunikasi Apps Script harus tetap sama.

### Implementasi

- Menambahkan folder eksperimen yang saat itu didokumentasikan sebagai `alternate-version` berisi salinan lima halaman student dashboard.
- Menambahkan `alternate-theme.css` sebagai lapisan visual bersama dengan arah desain learning cockpit yang lebih terang, modern, tenang, dan mudah dipindai.
- Login memakai komposisi split-panel, dashboard menekankan next action, materi menyerupai reading workspace, dan quiz memusatkan perhatian pada satu pertanyaan.
- Mempertahankan seluruh ID, handler tombol, URL Apps Script, key `localStorage`, validasi, dan tautan internal halaman.
- Menyalin device guard agar aturan HP/tablet tetap berlaku pada versi alternatif.
- Menyesuaikan path favicon karena halaman berada satu folder lebih dalam.

### File

- `student-dashboards/experiments/alternate-ui/index.html`
- `student-dashboards/experiments/alternate-ui/dashboard.html`
- `student-dashboards/experiments/alternate-ui/sessions.html`
- `student-dashboards/experiments/alternate-ui/materials.html`
- `student-dashboards/experiments/alternate-ui/quiz.html`
- `student-dashboards/experiments/alternate-ui/alternate-theme.css`
- `student-dashboards/experiments/alternate-ui/device-guard.css`
- `student-dashboards/experiments/alternate-ui/device-guard.js`
- `student-dashboards/experiments/alternate-ui/README.md`

### Deployment

- Tidak memerlukan deployment ulang Apps Script.
- Folder alternatif dapat dipreview atau dipublikasikan terpisah dari halaman student dashboard aktif.

### Verifikasi

- JavaScript inline kelima halaman dibandingkan dengan versi aktif dan terkonfirmasi identik.
- Lima halaman berhasil memuat stylesheet alternatif tanpa page error pada viewport desktop 1366×768 dan tablet 820×1180.
- Dashboard, peta sesi, materi, dan quiz tidak mengalami horizontal overflow pada kedua viewport.
- Login diberi pengamanan `overflow-x` untuk menahan elemen dekoratif di tepi viewport.
- Device guard versi alternatif tetap mengizinkan viewport tablet pada pengujian.

## 2026-07-16 — Pembatasan HP, dukungan iPad, dan favicon dashboard

### Kebutuhan

- Student dashboard hanya boleh digunakan melalui tablet, laptop, atau desktop/PC.
- HP harus tetap ditolak ketika portrait, landscape, maupun memakai mode **Situs desktop**.
- iPad Air dan iPad Pro harus dikenali sebagai tablet dan tidak boleh ikut terblokir.
- Seluruh halaman student perlu memakai ikon web Kalananti yang sama.

### Perbaikan akses perangkat

- Menambahkan `device-guard.js` sebagai aturan perangkat bersama untuk seluruh student dashboard.
- Menambahkan `device-guard.css` untuk menutup konten dashboard dan menampilkan pemberitahuan perangkat ketika halaman dibuka melalui HP.
- Memasang kedua file tersebut pada `index.html`, `dashboard.html`, `sessions.html`, `materials.html`, dan `quiz.html`, sehingga pembatasan tidak dapat dilewati dengan membuka URL halaman dalam secara langsung.
- Deteksi HP menggabungkan `navigator.userAgentData.mobile`, user-agent, jenis pointer, dan ukuran sisi pendek layar.
- Perangkat dengan sisi pendek layar minimal 600 CSS px diperlakukan sebagai tablet. Perbaikan ini diperlukan karena Chrome Device Mode dan beberapa versi iPadOS dapat melaporkan iPad sebagai perangkat mobile tanpa nama tablet yang konsisten.
- HP landscape tetap ditolak karena sisi pendek layar HP tidak berubah menjadi ukuran tablet saat layar diputar.

### Favicon

- Menyimpan ikon Kalananti 900×900 di `assets/kalananti-web-icon.jpg` agar dashboard tidak bergantung pada URL gambar eksternal.
- Menambahkan favicon dan Apple touch icon pada kelima halaman student.

### Verifikasi browser

- iPhone portrait 390×844: diblokir.
- iPhone landscape 844×390: diblokir.
- iPad Air portrait dan landscape: diizinkan.
- iPad Pro 11 inci dan iPad Pro 12,9 inci: diizinkan.
- Kelima halaman student diuji menggunakan profil iPad Air dan seluruhnya tidak menampilkan layar penolakan.
- Desktop 1366×768 tetap diizinkan.

### File yang diubah

- `student-dashboards/assets/js/device-guard.js`
- `student-dashboards/assets/css/device-guard.css`
- `student-dashboards/index.html`
- `student-dashboards/dashboard.html`
- `student-dashboards/sessions.html`
- `student-dashboards/materials.html`
- `student-dashboards/quiz.html`
- `assets/kalananti-web-icon.jpg`
- `knowledge-scl.md`

### Deployment

- Tidak memerlukan deployment ulang Apps Script.
- Perubahan telah di-push ke `b2c/main` melalui commit `afef01e`, `f3f329f`, dan perbaikan iPad `362b003`.
- Setelah GitHub Pages selesai build, lakukan hard refresh karena browser dapat menyimpan JavaScript dan favicon lama di cache.

## 2026-07-15 — Bonus tampil pada popup Detail Bintang

### Masalah

- Popup **Detail Bintangmu** hanya mencetak isi `rawStars` sebagai teks multiline biasa.
- Baris `N Star - Bonus` dari teacher backend tidak memiliki tampilan kategori tersendiri, sehingga bonus sulit dibedakan dari Must Do, Should Do, Aspire, dan Quiz.

### Perbaikan

- Menambahkan formatter rincian bintang yang membaca setiap baris dengan format `N Star - Kategori`.
- Menampilkan Must Do, Should Do, Aspire To, Quiz, dan Bonus sebagai baris terpisah dengan ikon, label, warna, dan jumlah masing-masing.
- Bonus ditampilkan dengan label `🎁 Bonus` dan warna emas.
- Menambahkan escaping HTML sebelum data sheet dimasukkan ke popup agar teks tidak dapat berubah menjadi markup HTML.
- Total di sisi kanan kartu sesi tetap menggunakan `s.stars` dari backend sehingga tidak dihitung ulang di browser.

### Hasil

- Jika data sesi berisi `2 Star - Bonus`, popup Detail Bintangmu menampilkan baris Bonus 2 ⭐ secara jelas.
- Jumlah total sesi tetap konsisten dengan teacher dashboard dan Absensi.

### File yang diubah

- `student-dashboards/dashboard.html`
- `student-dashboards/docs/CHANGELOG.md`

### Deployment

- Perubahan hanya pada frontend student dashboard; tidak memerlukan deployment ulang Apps Script.
- Setelah GitHub Pages selesai build, lakukan hard refresh.

## 2026-07-15 — Detail bintang kosong dan Sesi 2 tetap terkunci setelah API sukses

### Masalah

- API live Budiyana mengembalikan `currentSession: 2`, `totalStars: 10`, serta rincian bintang Must Do, Should Do, dan Quiz.
- Pada initial load, dashboard tetap menjalankan reset fail-closed setelah respons sukses. State kemudian ditimpa menjadi Sesi 1, bintang 0, dan `sessionProgress` kosong.
- Dampaknya, kartu total sempat menampilkan data dari respons server, tetapi modal detail bintang membaca array kosong dan halaman Peta Sesi menganggap Sesi 2 terkunci.
- Backend memakai progress 100% dan penilaian guru untuk membuka sesi berikutnya, tetapi belum memeriksa keberadaan Quiz Score secara eksplisit.

### File yang diubah

#### `dashboard.html`

- Memisahkan jalur respons API sukses dan gagal.
- `initDashboard()` serta pengecekan versi sync tetap berjalan setelah respons sukses tanpa menghapus state server.
- Reset ke Sesi 1, bintang 0, dan progress kosong hanya dijalankan jika respons API benar-benar gagal.

#### `apps-script/code-student.gs`

- Mendeteksi baris `Quiz Score` secara dinamis dalam setiap blok sesi.
- Menambahkan `quizScore` dan `quizDone` pada setiap item `sessionProgress`.
- Mengubah syarat membuka sesi berikutnya menjadi: progress 100%, Quiz Score tersedia, dan seluruh phase submission yang dikirim sudah mendapat penilaian guru.
- Progress 100% tanpa Quiz tidak lagi membuka sesi berikutnya.

#### `docs/ARCHITECTURE.md`

- Menambahkan diagnosis state reset dan dokumentasi syarat unlock terbaru.

### Deployment

- `dashboard.html` aktif setelah GitHub Pages selesai build.
- Perubahan `apps-script/code-student.gs` memerlukan pembuatan versi baru pada deployment Apps Script dengan URL Web App yang sama.

## 2026-07-15 — Tombol Quiz setelah Should Do dan Aspire To dikumpulkan

### Masalah

- Setelah Must Do dikumpulkan, tombol Quiz tersedia.
- Setelah Should Do atau Aspire To dikumpulkan, tombol Quiz justru disembunyikan karena kode membatasi akses visual hanya untuk phase Must Do.
- Siswa yang tidak ingin melanjutkan semua tugas tambahan kesulitan menemukan jalan menuju Quiz.

### File yang diubah

#### `materials.html`

- Menampilkan tombol Quiz setelah submission berhasil pada Must Do, Should Do, dan Aspire To selama Quiz sesi belum selesai.
- Alur Should Do sekarang memberi dua pilihan: lanjut ke Aspire To atau langsung Quiz.
- Setelah Aspire To terkirim, siswa dapat langsung menuju Quiz.
- Pengamanan `attemptGoToQuiz()` tetap dipertahankan, sehingga tombol tidak dapat melewati kewajiban menyelesaikan atau mengumpulkan Must Do.
- Modal preview submission ketiga phase juga menampilkan tombol Quiz jika Must Do telah selesai dan Quiz belum dikerjakan.

#### `docs/ARCHITECTURE.md`

- Memperbarui dokumentasi alur tombol dan aturan akses Quiz setelah submission setiap phase.

### Deployment

- Perubahan hanya pada HTML dan dokumentasi; tidak memerlukan deployment ulang Apps Script.
- Setelah push, tunggu GitHub Pages selesai build lalu lakukan hard refresh.

## 2026-07-15 — Tombol kembali dari materi ke dashboard

### Masalah

- Tombol header pada halaman materi masih bertuliskan `Intip Materi` dan hanya memanggil fase learning, padahal siswa sudah berada di halaman materi.
- Siswa membutuhkan navigasi yang jelas untuk kembali ke dashboard utama.

### File yang diubah

#### `materials.html`

- Mengubah label tombol header menjadi `← Kembali ke Dashboard`.
- Mengubah aksi tombol menjadi navigasi langsung ke `dashboard.html`.
- Logo di sisi kiri tetap memiliki fungsi kembali ke dashboard seperti sebelumnya.

### Deployment

- Perubahan hanya pada HTML dan tidak memerlukan deployment ulang Apps Script.
- Setelah push, tunggu GitHub Pages selesai build lalu lakukan hard refresh.

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

#### `apps-script/code-student.gs`

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

- `apps-script/code-student.gs` disalin sementara menjadi `/private/tmp/code-student-check.js` karena `node --check` tidak menerima ekstensi `.gs`.
- Perintah `node --check /private/tmp/code-student-check.js` berhasil tanpa error sintaks.
- Pemeriksaan statis memastikan login masih memanggil action API `getStudents`, sehingga perubahan backend tidak memerlukan perubahan endpoint HTML.
- Deployment aktif belum berubah sampai `apps-script/code-student.gs` versi ini dipasang ulang sebagai versi baru Google Apps Script Web App.

### Langkah deployment yang diperlukan

1. Salin versi terbaru `apps-script/code-student.gs` ke project Google Apps Script student dashboard.
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

#### `apps-script/code-student.gs`

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

1. Deploy ulang `apps-script/code-student.gs` sebagai versi baru Web App.
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
- `apps-script/code-student.gs` tidak dijalankan oleh GitHub Pages. File tersebut tetap harus ditempel/deploy sebagai versi baru pada Google Apps Script Web App agar sumber nama dan level baru aktif di API.

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
- Deployment Google Apps Script yang aktif masih mengembalikan `Buidana` dari endpoint `getStudents` untuk `SCLWER222`. Ini membuktikan backend Web App belum memakai versi lokal `apps-script/code-student.gs` yang baru.

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

- `apps-script/code-student.gs` mencari label `Jam Mulai` dan `Jam Selesai` secara dinamis di tab `Absensi`.
- Nilai waktu dinormalisasi ke format 24 jam `HH:mm` menggunakan zona waktu `Asia/Jakarta`.
- Respons `getStudentProgress` sekarang menyertakan `classStartTime` dan `classEndTime`.
- `dashboard.html` menyimpan jadwal dari server dan menampilkannya pada kartu kelas.
- Jika jadwal kosong/tidak ditemukan, dashboard menampilkan `Jadwal belum tersedia`, bukan jam palsu.
- `index.html` membersihkan cache jadwal ketika siswa atau kelas login berubah.

### Hasil yang diharapkan untuk SCLWER222

- Tab `Absensi` berisi Jam Mulai `7:30 AM` dan Jam Selesai `8:00 AM`.
- Dashboard harus menampilkan `07:30 – 08:00` setelah Apps Script versi terbaru dideploy.

## 2026-07-16 — Percobaan sumber nama dari Absensi kolom B (dibatalkan)

### Masalah

- Dropdown login membaca header baris 1–2 sheet `Progress` sebagai daftar siswa.
- Tanggal pada header siswa dan timestamp sinkronisasi di `Progress!Z1` ikut tampil sebagai pilihan nama.

### Perubahan

- `getStudentsByClassCode()` sekarang hanya membaca kolom B sheet `Absensi`.
- Pembacaan dimulai setelah header `Students Name`, `Student Name`, `Student's Name`, atau `Nama Siswa` ditemukan.
- Jika label header tidak ditemukan, fallback dimulai dari baris 16 agar area informasi kelas di bagian atas sheet tidak masuk dropdown.
- Nama kosong, placeholder, dan nama duplikat tetap disaring.
- Penanda sumber respons diubah menjadi `class-absensi-column-b`.

> Perubahan ini langsung dikoreksi pada entri berikutnya setelah struktur sheet
> dipastikan kembali. Implementasi final memakai `Progress!C2:J2`.

## 2026-07-16 — Koreksi sumber nama login ke Progress C2:J2

### Koreksi struktur

- Sumber nama login yang benar adalah header `Progress!C2:J2`, bukan seluruh header Progress dan bukan pembacaan langsung kolom B Absensi.
- Rentang dibatasi sampai kolom J sehingga `Progress!Z1` dan metadata lain tidak dapat masuk ke dropdown.
- Nilai `#REF!`, placeholder, sel kosong, dan duplikat disaring.

### Akar kerusakan header

- Ditemukan bug pada backend guru ketika persetujuan bintang menyimpan tanggal.
- Helper guru sudah menganggap `sessionStartRow` sebagai baris `Date` (Sesi 1 = row 3), tetapi penulisan tanggal menggunakan `sessionStartRow - 1` sehingga menulis ke row 2.
- Akibatnya nama siswa di row 2 dapat ditambahi tanggal dan formula array `TRANSPOSE` pada C2 gagal mengembang dengan `#REF!`.

## 2026-07-16 — Memindahkan metadata sinkronisasi ke Absensi AQ1

- Penanda sinkronisasi dipindahkan dari `Progress!Z1` ke `Absensi!AQ1` agar tidak berada di area header Progress.
- `updateSyncFlag()` dan `handleCheckSync()` memakai konstanta lokasi yang sama.
- Format nilainya tetap timestamp milidetik sehingga polling dashboard tidak perlu diubah.
