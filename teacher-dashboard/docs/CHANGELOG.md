> **Fungsi dokumen:** mencatat perubahan Teacher Dashboard berdasarkan tanggal, file, verifikasi, dan kebutuhan deployment.
>
> **Baca ketika:** ingin mengetahui apa yang berubah atau mencari riwayat perbaikan.
>
> **Aturan:** perubahan baru ditambahkan di bagian paling atas setelah judul dan pengantar.

# Changelog Teacher Dashboard

## 17 Juli 2026 — Dokumentasi polling student dipercepat

### Perubahan

- Menyelaraskan dokumentasi teacher bahwa sync flag aktif berada di `Absensi!AQ1`.
- Mencatat bahwa Student Dashboard, Materials, dan Peta Sesi sekarang mengecek perubahan setiap 30 detik selama tab terlihat.
- Polling teacher tetap 60 detik; logika penilaian dan Apps Script teacher tidak diubah.

## 17 Juli 2026 — Penyelarasan dokumentasi sinkronisasi pembukaan sesi

### Masalah

- Dokumentasi arsitektur teacher masih menyebut `Progress!Z1`, padahal backend teacher dan student aktif menggunakan `Absensi!AQ1`.
- Ketidaksesuaian tersebut membuat diagnosis keterlambatan pembukaan sesi siswa menjadi membingungkan.

### Perubahan

- Mengganti seluruh referensi aktif `Progress!Z1` menjadi `Absensi!AQ1` pada dokumentasi arsitektur teacher.
- Memastikan dokumentasi menjelaskan bahwa approval project dan perubahan penting memperbarui sync flag yang dibaca dashboard siswa.
- Perubahan teacher hanya menyentuh dokumentasi; mekanisme penyimpanan nilai dan endpoint Apps Script tidak diubah.

### Verifikasi dan deployment

- Referensi dokumentasi aktif telah diperiksa dan konsisten dengan `apps-script/code-teacher.gs`.
- Dokumentasi diterbitkan bersama perbaikan auto-sync Student Dashboard melalui GitHub Pages.

## 16 Juli 2026 — Refactor struktur tanpa mengubah logika produksi

### Tujuan

- Memisahkan halaman produksi, asset, source Apps Script, dokumentasi, script aktif, dan arsip maintenance.
- Membuat dokumentasi mudah ditemukan dan menjelaskan fungsi setiap MD pada bagian atas.

### Perubahan

- Mempertahankan enam HTML produksi di root agar URL publik dan navigasi tidak berubah.
- Memindahkan `mobile-ready.css` ke `assets/css/mobile-ready.css` dan memperbarui seluruh halaman produksi.
- Memindahkan source backend lokal ke `apps-script/code-teacher.gs` serta menambahkan peringatan deployment manual.
- Mengganti `knowledge-tcr-dbr.md` menjadi `docs/ARCHITECTURE.md`, `log-edit.md` menjadi `docs/CHANGELOG.md`, dan `notes-teacher.md` menjadi `docs/DEVELOPMENT.md`.
- Menambahkan README utama, `DATA-FLOW.md`, `SPREADSHEET-SCHEMA.md`, `DEPLOYMENT.md`, `TROUBLESHOOTING.md`, dan `TEACHER-GUIDE.md`.
- Memindahkan seluruh folder `unused` ke `archive/legacy-maintenance` tanpa menghapus file.
- Menambahkan README pada `archive/` dan `scripts/` agar status runtime file jelas.
- Memperbarui absolute path pada `archive/legacy-maintenance/patch_gs.js` ke lokasi Apps Script baru.
- Memperbarui seluruh referensi dokumentasi ke struktur baru.

### Temuan dan alternatif

- Folder maintenance lama berisi patch historis yang berpotensi tidak cocok dengan source terbaru. File dipindahkan ke archive, bukan dihapus atau dianggap script aktif.
- Browser lokal mencatat `Failed to fetch` pada halaman yang mencoba API eksternal menggunakan data uji. Endpoint teacher diverifikasi terpisah melalui request read-only dan merespons JSON dengan benar.
- Fallback apabila stylesheet baru gagal adalah mengembalikan `mobile-ready.css` ke root. Fallback tidak dipakai karena seluruh halaman berhasil memuat stylesheet baru.

### Verifikasi

- `node --check` berhasil untuk source Apps Script teacher yang disalin sementara sebagai `.js` dan patch Apps Script yang path-nya diperbarui.
- Validator memastikan seluruh target lokal `href` dan `src` tersedia.
- Chromium headless membuka seluruh enam halaman teacher dengan HTTP 200.
- Seluruh halaman memuat `assets/css/mobile-ready.css`; tidak ada request asset lokal yang gagal.
- Endpoint Apps Script teacher aktif merespons request login read-only dengan pesan email uji tidak terdaftar, sehingga endpoint dapat dijangkau tanpa menulis data.

### Deployment

- Tidak memerlukan deployment ulang Apps Script karena logika backend tidak diubah.
- Struktur frontend harus diterbitkan dalam satu deployment bersama seluruh path dan file baru.

## 16 Juli 2026 - Layout mobile dan favicon seluruh teacher dashboard

### Kebutuhan

- Teacher dashboard harus tetap dapat dibuka melalui HP.
- Seluruh alur teacher perlu memiliki layout yang siap digunakan pada mobile, bukan hanya halaman login atau dashboard utama.
- Seluruh halaman teacher perlu memakai ikon web Kalananti yang sama dengan student dashboard.

### Cara perbaikan

- Menambahkan stylesheet bersama `mobile-ready.css` dan memuatnya pada enam halaman utama teacher dashboard: login, dashboard, detail kelas, daftar kurikulum, detail kurikulum, dan panduan SCL.
- Menyesuaikan navigasi, ukuran tombol sentuh, padding, radius kartu, grid, form, modal, serta elemen media untuk viewport HP.
- Membuat kelompok tombol tab dapat digeser horizontal pada layar sempit.
- Mempertahankan tabel lebar sebagai area scroll horizontal agar kolom tidak dipaksa mengecil dan tetap dapat dibaca.
- Mengubah curriculum detail dari split view desktop berketinggian tetap menjadi dokumen mobile yang dapat di-scroll, dengan navigasi slide tetap mudah dijangkau.
- Mengubah sidebar tetap 280 px pada Panduan SCL menjadi pemilih topik horizontal di bagian atas layar HP.
- Menyembunyikan dekorasi planet yang keluar viewport pada mobile untuk menghapus overflow horizontal.
- Menyimpan ikon Kalananti 900×900 di `assets/kalananti-web-icon.jpg` dan memasangnya sebagai favicon serta Apple touch icon pada keenam halaman teacher.

### Verifikasi browser

- Keenam halaman teacher diuji pada viewport HP 390×844.
- `class-detail.html`, `curriculum.html`, `curriculum-detail.html`, dan `panduan-scl.html` memiliki lebar dokumen sama dengan lebar viewport.
- Overflow tipis pada `index.html` dan `dashboard.html` ditelusuri ke dekorasi planet, lalu dibersihkan hingga `scrollWidth` sama dengan `clientWidth` (390 px).
- Link `mobile-ready.css` terkonfirmasi tersedia pada seluruh halaman teacher.

### File yang diubah

- `teacher-dashboard/assets/css/mobile-ready.css`
- `teacher-dashboard/index.html`
- `teacher-dashboard/dashboard.html`
- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/curriculum.html`
- `teacher-dashboard/curriculum-detail.html`
- `teacher-dashboard/panduan-scl.html`
- `assets/kalananti-web-icon.jpg`
- `knowledge-scl.md`

### Deployment

- Tidak memerlukan deployment ulang Apps Script.
- Perubahan telah di-push ke `b2c/main` melalui commit `afef01e` dan `f3f329f`.
- Setelah GitHub Pages selesai build, lakukan hard refresh agar stylesheet dan favicon terbaru tidak tertahan cache browser.

## 16 Juli 2026 - Menghapus konfirmasi manual penyimpanan project Sesi 12

### Masalah

- Form penilaian Sesi 12 menampilkan checkbox **Project dikumpulkan dan disimpan di sheet**.
- Guru tidak memiliki akses langsung ke spreadsheet, sehingga tidak mungkin memverifikasi atau melakukan penyimpanan manual ke sheet.
- Nilai checkbox dikirim sebagai `projectCollected`, tetapi backend tidak membaca atau menyimpannya. Checkbox hanya memberikan kesan seolah-olah ada proses konfirmasi, padahal tidak menghasilkan perubahan data.
- Project siswa sebenarnya sudah masuk otomatis melalui alur upload/link student dashboard dan terdeteksi dari data sesi pada tab Progress.

### Cara perbaikan

- Menghapus seluruh blok UI checkbox konfirmasi khusus Sesi 12.
- Menghapus JavaScript yang menampilkan, menyembunyikan, dan mengisi nilai checkbox.
- Menghapus field `projectCollected` dari payload `approveProject` karena tidak memiliki penerima atau tempat penyimpanan di backend.
- Mempertahankan alur otomatis yang sudah ada: penilaian tersedia berdasarkan link/upload project yang terdeteksi pada sesi terkait.

### Hasil

- Guru tidak lagi diminta mengonfirmasi pekerjaan yang tidak dapat mereka lakukan.
- Form penilaian Sesi 12 hanya berisi kontrol yang benar-benar berfungsi.
- Deteksi pengumpulan final project tetap otomatis dari data project siswa.

### File yang diubah

- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/docs/CHANGELOG.md`

### Deployment

- Perubahan hanya pada frontend teacher dashboard dan tidak memerlukan deployment ulang Apps Script.
- Setelah GitHub Pages selesai build, lakukan hard refresh.

## 15 Juli 2026 - Menghapus shortcut penilaian Sesi 12 yang prematur

### Masalah

- Tabel Progress Siswa selalu menampilkan tombol `🏆 S12` selama sesi target bukan Sesi 12.
- Tombol tersebut langsung menjalankan `openApprovalModal(..., 12)` tanpa memeriksa sesi siswa atau keberadaan link final project.
- Akibatnya siswa yang baru berada di Sesi 1 atau Sesi 2 terlihat seolah-olah sudah harus diberi nilai Sesi 12, dan modal Sesi 12 terbuka tanpa link project.
- Shortcut tersebut juga sebenarnya duplikat karena tombol penilaian utama sudah otomatis mengikuti `targetSess` dan hanya muncul ketika link project tersedia.

### Cara perbaikan

- Menghapus tombol shortcut `🏆 S12` yang di-hardcode dari tabel Progress Siswa.
- Mempertahankan tombol penilaian dinamis `Nilai S{targetSess}` sebagai satu-satunya jalur penilaian dari tabel.
- Sesi 12 akan otomatis menjadi target dan tombol `Nilai S12` akan muncul ketika final project Sesi 12 benar-benar memiliki link.
- Riwayat siswa tetap menyediakan akses Edit Nilai untuk sesi yang memang sudah memiliki data.

### Hasil

- Siswa di Sesi 1 atau Sesi 2 tidak lagi menampilkan aksi penilaian Sesi 12.
- Guru tidak dapat membuka form Sesi 12 kosong dari shortcut prematur.
- Ketika final project Sesi 12 tersedia, alur penilaian tetap muncul melalui tombol dinamis yang sama dengan sesi lain.

### File yang diubah

- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/docs/CHANGELOG.md`

### Deployment

- Perubahan hanya pada frontend teacher dashboard dan tidak memerlukan deployment ulang Apps Script.
- Setelah GitHub Pages selesai build, lakukan hard refresh.

## 15 Juli 2026 - Jadwal kartu kelas mengambil sumber dari tab Absensi

### Masalah

- Hari dan jam pada kartu teacher dashboard sebelumnya dibaca dari kolom R dan U di Class Database.
- Kolom tersebut dapat berasal dari formula dan menghasilkan `#REF!`, sedangkan jadwal operasional kelas yang benar sudah tersedia di tab `Absensi` pada masing-masing spreadsheet kelas.
- Tab Absensi menyimpan field **Hari**, **Jam Mulai**, dan **Jam Selesai** di area informasi atas sheet.

### Cara perbaikan

- Setelah kelas Active/Postponed cocok dengan email guru, backend membuka spreadsheet kelas melalui `classLink` dan membaca tab `Absensi`.
- Label Hari, Jam Mulai, Jam Selesai, serta Ruangan dicari secara dinamis pada 30 baris dan 6 kolom pertama agar tidak bergantung pada alamat sel tetap.
- Nilai dibaca melalui `getDisplayValues()` agar format jam yang tampil di spreadsheet tetap dipertahankan.
- Jam Mulai dan Jam Selesai digabung menjadi rentang, misalnya `07:30 - 08:00 WIB`.
- Class Database hanya menjadi fallback apabila jadwal pada tab Absensi belum diisi atau spreadsheet tidak dapat dibaca.
- Kartu menampilkan penanda kecil **Jadwal dari tab Absensi** ketika sumber tersebut berhasil digunakan.
- Jika field Ruangan tersedia, lokasinya diprioritaskan; jika kosong, kartu tetap menggunakan nama cabang dari Class Database.

### Hasil

- Kartu teacher dashboard menggunakan jadwal operasional dari tab Absensi sebagai sumber utama.
- Formula `#REF!` pada Class Database tidak lagi mengalahkan Hari/Jam yang valid di Absensi.
- Kelas dengan Absensi belum lengkap tetap dapat tampil menggunakan fallback yang tersedia.

### File yang diubah

- `teacher-dashboard/apps-script/code-teacher.gs`
- `teacher-dashboard/dashboard.html`
- `teacher-dashboard/docs/CHANGELOG.md`

### Deployment

- Wajib membuat versi baru pada deployment Apps Script teacher karena sumber jadwal dibaca oleh backend.
- Setelah GitHub Pages selesai build, lakukan hard refresh dan login ulang agar cache `teacherClasses` diperbarui.

## 15 Juli 2026 - Detail dan tombol kelas hilang pada lebar layar tertentu

### Masalah

- Kartu kelas berubah menjadi layout horizontal mulai breakpoint `md`, padahal area konten dashboard pada laptop/tablet masih dipersempit sidebar.
- Bagian kanan kartu yang berisi tombol **Lihat Kelas** dan **Link Playlist** terdorong keluar area layar, sehingga beberapa kartu tampak tidak memiliki detail atau tombol.
- Nilai formula error dari Class Database seperti `#REF!` ditampilkan mentah sebagai hari dan jam (`#REF!, #REF! WIB`).
- Nilai cabang atau link yang kosong menggunakan fallback yang terlalu umum atau menghasilkan navigasi detail yang tidak valid.

### Cara perbaikan

- Menahan layout kartu tetap vertikal sampai breakpoint `xl`; layout horizontal hanya digunakan ketika lebar konten benar-benar cukup.
- Membuat area tombol selebar kartu pada layar kecil/menengah dan baru kembali auto-width pada layar lebar.
- Menambahkan sanitasi nilai Class Database untuk error `#REF!`, `#N/A`, `#VALUE!`, `#NAME?`, `#DIV/0!`, `#NUM!`, dan `#NULL!` pada backend dan frontend.
- Mengganti data jadwal error/kosong menjadi **Hari belum tersedia** dan **Jam belum tersedia**, serta cabang kosong menjadi **Cabang belum tersedia**.
- Hanya membuat URL dan tombol detail jika link spreadsheet kelas tersedia. Jika tidak, kartu menampilkan **Link kelas belum tersedia** dan tidak mengarahkan guru ke halaman detail rusak.

### Hasil

- Tombol kelas tetap terlihat pada tablet, laptop kecil, dan desktop.
- Formula error tidak lagi tampil sebagai `#REF!` pada kartu.
- Kelas dengan data belum lengkap tetap ditampilkan dengan status yang jelas, sementara kelas dengan link valid dapat dibuka seperti biasa.

### File yang diubah

- `teacher-dashboard/apps-script/code-teacher.gs`
- `teacher-dashboard/dashboard.html`
- `teacher-dashboard/docs/CHANGELOG.md`

### Deployment

- `apps-script/code-teacher.gs` perlu dipasang sebagai versi baru pada deployment Apps Script teacher.
- Perubahan layout HTML aktif setelah GitHub Pages selesai build dan browser di-hard refresh.

## 15 Juli 2026 - Kelas Postponed tetap dapat dibuka guru

### Masalah

- Login teacher hanya mengambil baris Class Database dengan status persis `Active`.
- Kelas berstatus `Postponed` tidak dikirim ke dashboard meskipun guru perlu membuka kelas sebelum tanggal mulai untuk mengecek materi, data siswa, dan kesiapan kelas.
- Pemeriksaan frontend menunjukkan tidak ada filter tambahan berdasarkan start date; kelas hilang sepenuhnya karena filter status pada backend login.

### Cara perbaikan

- Mengubah izin akses teacher agar menerima status `Active` atau `Postponed` secara case-insensitive.
- Tetap membatasi kelas pada kode yang diawali `SCL` dan email guru yang sesuai, sehingga status lain seperti `Graduated` tidak ikut terbuka.
- Menambahkan `classStatus` ke data kelas yang dikirim backend.
- Menambahkan badge **Postponed · Tetap Bisa Dicek** pada kartu agar guru tahu kelas belum aktif tetapi tetap dapat dibuka.
- Memperbarui data mock dan pesan ketika tidak ada kelas agar menyebut `Active/Postponed`.

### Hasil

- Guru dapat login dan membuka kelas SCL berstatus Postponed sebelum start date.
- Kelas Active tetap tampil seperti sebelumnya.
- Kelas Graduated dan status selain Active/Postponed tetap tidak ditampilkan.

### File yang diubah

- `teacher-dashboard/apps-script/code-teacher.gs`
- `teacher-dashboard/dashboard.html`
- `teacher-dashboard/index.html`
- `teacher-dashboard/docs/CHANGELOG.md`

### Deployment

- `apps-script/code-teacher.gs` perlu disalin ke project Apps Script teacher dan deployment Web App yang sama dibuatkan versi baru.
- Perubahan HTML aktif setelah GitHub Pages selesai build dan browser di-hard refresh.

## 15 Juli 2026 - Memperjelas pilihan bonus bintang

### Masalah

- Pada modal **Beri Bonus Bintang**, tombol `+1`, `+2`, dan `+3` tidak menunjukkan pilihan aktif dengan jelas.
- JavaScript menambahkan class warna Tailwind saat tombol dipilih, tetapi warna latar dan border tombol sudah ditentukan melalui inline style. Inline style memiliki prioritas lebih tinggi sehingga perubahan warna aktif hampir tidak terlihat; pengguna terutama hanya melihat tombol sedikit membesar.
- Belum ada keterangan teks yang memastikan jumlah bonus yang sedang dipilih.

### Cara perbaikan

- Mengganti penanda state aktif menjadi atribut `aria-pressed` agar state pilihan eksplisit dan dapat dibaca teknologi bantu.
- Menambahkan desain aktif khusus: latar emas terang, border kontras, ring/glow, efek tombol terangkat, dan badge centang hijau.
- Memperbesar tombol dari 48 px menjadi 56 px dan menambah jarak antartombol agar target klik lebih nyaman.
- Menambahkan status dinamis **“Bonus +N bintang dipilih”** di bawah pilihan. Saat modal baru dibuka, status kembali menjadi **“Belum ada jumlah yang dipilih”**.
- Menambahkan label aksesibel pada grup dan setiap tombol serta focus ring untuk navigasi keyboard.

### Hasil

- Hanya satu tombol bonus yang dapat tampil aktif pada satu waktu.
- Pilihan aktif sekarang dapat dikenali melalui warna, bentuk, centang, dan teks status—tidak bergantung pada satu perubahan visual saja.
- Nilai `tempBonus` dan alur pengiriman bonus tetap menggunakan mekanisme yang sama, sehingga perubahan ini tidak mengubah payload backend.

### File yang diubah

- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/docs/CHANGELOG.md`

## 15 Juli 2026 - Total teacher lebih besar dan bonus tidak tampil di rincian

### Masalah

- `starsVal` dari backend teacher sudah merupakan jumlah seluruh baris pada sel bintang, termasuk Must Do, Should Do, Aspire, Quiz, dan Bonus.
- Riwayat teacher menghitung total dengan `starsVal + quizStars`, sehingga bintang Quiz terhitung dua kali. Contoh data asli 12 bintang tampil sebagai 14 di teacher karena Quiz 2 ditambahkan kembali.
- Dashboard anak dan total pada Absensi menampilkan 12 karena keduanya tidak melakukan penambahan Quiz kedua tersebut.
- Tooltip **Score Breakdown** hanya mengenali Must Do, Should Do, Aspire, dan Quiz; baris `N Star - Bonus` belum diparsing atau ditampilkan.
- Kotak Mission memakai seluruh `starsVal`, sehingga dapat ikut mencampurkan Quiz dan Bonus ke angka Mission.

### Cara perbaikan

- Menjadikan `starsVal` sebagai total akhir sesi tanpa menambahkan `quizStars` lagi.
- Menambahkan parser khusus untuk format `N Star - Bonus`.
- Menghitung Mission hanya dari Must Do + Should Do + Aspire. Untuk data format lama yang belum memiliki rincian, Mission menggunakan total dikurangi Quiz dan Bonus.
- Menampilkan Bonus sebagai baris tersendiri pada tooltip Score Breakdown dan kartu rincian sesi.

### Hasil

- Untuk Must Do 5, Should Do 3, Quiz 2, dan Bonus 2, teacher sekarang menampilkan total 12—sama dengan dashboard anak dan Absensi.
- Score Breakdown menampilkan keempat komponen tersebut dan jumlah rinciannya sama dengan badge total.
- Quiz dan Bonus tidak lagi tercampur ke angka Mission.

### File yang diubah

- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/docs/CHANGELOG.md`

## 15 Juli 2026 - Bonus menimpa nilai utama dan tidak bisa diedit

### Masalah

- Saat bonus diberikan, backend menjalankan `parseInt()` langsung pada seluruh isi sel bintang. Untuk isi multiline seperti `3 Star - Must do`, `2 Star - Should do`, dan `2 Star - Quiz`, yang terbaca hanya angka pertama.
- Backend kemudian mengganti seluruh isi sel dengan hasil angka pertama ditambah bonus. Akibatnya rincian Must Do, Should Do, Aspire, dan Quiz terhapus.
- Bonus tidak disimpan sebagai komponen tersendiri, sehingga modal **Edit Nilai** tidak dapat mengenali atau memuat bonus yang sudah diberikan.
- Mengirim bonus lagi selalu bersifat menambah, bukan mengoreksi bonus sebelumnya.

### Cara perbaikan

- Menyimpan bonus sebagai baris tersendiri dengan format `N Star - Bonus` pada sel bintang yang sama.
- Mengubah proses penyimpanan bonus menjadi **upsert**: jika belum ada maka baris bonus ditambahkan; jika sudah ada maka hanya baris bonus yang diganti.
- Semua baris Must Do, Should Do, Aspire, dan Quiz dipertahankan apa adanya saat bonus disimpan.
- Saat nilai utama diedit, backend membaca dan mempertahankan baris bonus yang telah tersimpan.
- Modal Edit Nilai sekarang membaca bonus yang sudah ada, mengubah label tombol menjadi **Edit Bonus (+N Bintang)**, serta membuka modal bonus dengan jumlah lama sudah terpilih.
- Alasan bonus lama dimuat kembali dan penyimpanan berikutnya memperbarui alasan aktif, bukan terus menambahkan catatan duplikat. Jika alasan dikosongkan saat diedit, note lama ikut dibersihkan.
- Menambahkan validasi backend agar bonus hanya menerima angka 1 sampai 3.

### Hasil

- Bonus menambah total bintang tanpa menghapus komponen penilaian lainnya.
- Bonus dapat dikoreksi dari `+1`, `+2`, atau `+3` melalui alur Edit Nilai tanpa menggandakan bonus.
- Perhitungan total tetap kompatibel karena setiap komponen, termasuk bonus, tetap menggunakan format baris `N Star - ...`.
- Data yang telanjur ditimpa menjadi angka oleh versi lama tidak dapat direkonstruksi otomatis karena rincian aslinya sudah tidak berada di sel. Nilai tersebut perlu dimasukkan ulang satu kali melalui Edit Nilai; setelah itu perbaikan baru akan mempertahankannya.

### File yang diubah

- `teacher-dashboard/apps-script/code-teacher.gs`
- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/docs/CHANGELOG.md`
## 2026-07-16 — Mencegah tanggal persetujuan masuk ke header siswa

### Masalah

- Saat guru menyetujui bintang Sesi 1, tanggal dapat ditulis ke row 2 yang merupakan header nama siswa.
- Penulisan tersebut menghalangi formula array `TRANSPOSE` di `Progress!C2` dan menghasilkan `#REF!`.
- Penelusuran Git menunjukkan logika `sessionStartRow - 1` berasal dari commit `0f2f4f7` tanggal 30 April 2026.

### Perbaikan

- `handleApproveProject()` sekarang menulis tanggal ke `sessionStartRow`, yaitu baris `Date`, tanpa mengurangi satu baris.
- Fallback `findStudentAndSession()` diselaraskan agar Sesi 1 dimulai dari row 3 dan setiap sesi berikutnya berjarak lima baris.
- Data progress, quiz, star, dan project tetap dicari secara dinamis dari blok sesi yang sama.

## 2026-07-16 — Memindahkan metadata sinkronisasi ke Absensi AQ1

- Backend guru sekarang menulis dan membaca versi sinkronisasi melalui `Absensi!AQ1`.
- Lokasi lama `Progress!Z1` tidak lagi digunakan oleh backend guru.
- Kontrak API `syncVersion` tetap sama sehingga frontend teacher tidak memerlukan perubahan.
