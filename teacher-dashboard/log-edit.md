# Log Perbaikan Teacher Dashboard

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

- `teacher-dashboard/code-teacher.gs`
- `teacher-dashboard/dashboard.html`
- `teacher-dashboard/index.html`
- `teacher-dashboard/log-edit.md`

### Deployment

- `code-teacher.gs` perlu disalin ke project Apps Script teacher dan deployment Web App yang sama dibuatkan versi baru.
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
- `teacher-dashboard/log-edit.md`

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
- `teacher-dashboard/log-edit.md`

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

- `teacher-dashboard/code-teacher.gs`
- `teacher-dashboard/class-detail.html`
- `teacher-dashboard/log-edit.md`
