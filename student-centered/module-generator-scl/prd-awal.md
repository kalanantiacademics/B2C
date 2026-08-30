jadi aku mau buat module generator dengan html2pdf, maunya bisa diakses ke appscript yah jadi html dan backend nay dari appscript aja 

jadi aku punya data modul yang ada di spreadsheet link https://docs.google.com/spreadsheets/d/1nGihCZS3S9moNY2dt7GIzmBESIQ72Jh5J7d90nhZvX0/edit?usp=sharing

disini ada spreadsheet dengan code

B2C_Scratch_Modul
B2C_Roblox_Modul
B2C_Python_Modul

nah ini tuh harus disusun menjadi sebuah modul

tapi since i put the data in spreadsheet aku harus baut html unutk buat modul nya nambahin atau perbaiki gitu loh lewat HTML nya

jadi awalnya aku tuh udah buat sebelumnya buat generator yang bekerja di /Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/book-editor-rework

tapi ini kan dia pake python yah jadi nya kaya susah kalo ada orang lain mau print atau mau abcd

aku mau dia nanti harusnya sebagus yang project ini /Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2B/UOB/module-dev

jadi dia ambil data nya dari spreadsheet kan
kit apilih ini nya apa modulnya dan level beraapa

trus nanti bsia ubah ubah di html nya jadi kaya google docs gitu ada ininya semua

trus bisa di tempelin ke template yang udah ada /Users/yazidhilmi/Documents/cloud/Kalananti-cloud/Academic_Content/B2C/student-centered/module-generator-scl/back-module

back-module/cover-scl.svg ini untuk cover nya yah 

TITLE

Ukuran box:

* Lebar: 19,57 cm
* Tinggi: 2,46 cm

Posisi:

* X: 0,72 cm
* Y: 10,31 cm

Format teks:

* Font: Poppins
* Ukuran: 28 pt
* Style: Bold
* Perataan horizontal: Tengah
* Perataan vertikal: Tengah
* Pengaturan ukuran: Perkecil teks agar sesuai dengan bentuk

Padding:

* Atas: 0,25 cm
* Bawah: 0,25 cm
* Kiri: 0,25 cm
* Kanan: 0,25 cm

Penulisan:

* Gunakan huruf kapital.
* Placeholder: {{TITLE}}

SUBTITLE

Ukuran box:

* Lebar: 19,57 cm
* Tinggi: 1,82 cm

Posisi:

* X: 0,72 cm
* Y: 12,77 cm

Format teks:

* Font: Poppins
* Ukuran: 18 pt
* Style: Regular
* Perataan horizontal: Tengah
* Perataan vertikal: Tengah
* Pengaturan ukuran: Perkecil teks agar sesuai dengan bentuk

Padding:

* Atas: 0,25 cm
* Bawah: 0,25 cm
* Kiri: 0,25 cm
* Kanan: 0,25 cm

Penulisan:

* Gunakan kapitalisasi normal sesuai judul materi.
* Placeholder: {{sub-title}}



ini juga aku punya awal sessi nya ada:

back-module/beginning-kanan-scl.svg
back-module/beginning-kiri-scl.svg

ini dua ini dipake unutk awal sesi nya
karena ini sama kaya yang lain tapi ini untuk sesi pertama halaman pertama aja sisanya pake yang palin yang 

back-module/plain-kanan-scl.svg
back-module/plain-kiri-scl.svg

untuk penomoran halaman kana kirinya dan headernya sama ajaa kok yah di 4 svg iniii

GUIDELINE POSISI HEADER SESSION TITLE DAN PAGINATION

Patokan umum:

* Gunakan acuan posisi "Dari kiri atas".
* Sebisa mungkin isi angka posisi manual di Opsi format, jangan digeser kira-kira.
* Semua elemen ini dipakai konsisten di seluruh halaman isi.

1. HEADER SESSION TITLE

Fungsi:

* Untuk judul sesi / judul bagian di bagian atas halaman.

Ukuran box:

* Lebar: 7,87 cm
* Tinggi: 1,54 cm

Posisi:

* X: 1,09 cm
* Y: 1,14 cm

Format teks:

* Font: Poppins
* Ukuran: 12 pt
* Style: Bold
* Warna teks: putih
* Perataan horizontal: kiri
* Perataan vertikal: tengah

Padding:

* Atas: 0,25 cm
* Bawah: 0,25 cm
* Kiri: 0,25 cm
* Kanan: 0,25 cm

Penulisan:

* Placeholder: {{Header}}
* Gunakan Title Case atau format nama sesi yang konsisten.
* Contoh:
* Session 1
* Introduction to Scratch
* Creative Storytelling

Catatan bentuk:

* Bentuk header berupa box biru dengan ujung kanan miring / runcing.
* Jangan ubah proporsi bentuk.
* Posisi header berada di kiri atas halaman, sejajar secara visual dengan logo di kanan atas.

2. PAGINATION NUMBER KIRI

Fungsi:

* Nomor halaman yang diletakkan di kiri bawah.
* Dipakai untuk halaman kiri / layout yang membutuhkan nomor di sisi kiri.

Ukuran box:

* Lebar: 1,19 cm
* Tinggi: 0,90 cm

Posisi:

* X: 0,99 cm
* Y: 28,00 cm

Format teks:

* Font: Poppins
* Ukuran: 9 pt
* Style: Bold
* Warna teks: putih
* Perataan horizontal: tengah
* Perataan vertikal: tengah

Padding:

* Atas: 0,25 cm
* Bawah: 0,25 cm
* Kiri: 0,25 cm
* Kanan: 0,25 cm

Penulisan:

* Isi dengan nomor halaman saja.
* Contoh:
* 1
* 12
* 104
* 311

Catatan bentuk:

* Bentuk pagination berupa badge / icon biru.
* Letakkan di kiri bawah, sedikit di atas area dekorasi bawah.
* Pastikan tidak menabrak ornamen footer.

3. PAGINATION NUMBER KANAN

Fungsi:

* Nomor halaman yang diletakkan di kanan bawah.
* Dipakai untuk halaman kanan / layout yang membutuhkan nomor di sisi kanan.

Ukuran box:

* Lebar: 1,17 cm
* Tinggi: 0,90 cm

Posisi:

* X: 18,93 cm
* Y: 28,01 cm

Format teks:

* Font: Poppins
* Ukuran: 9 pt
* Style: Bold
* Warna teks: putih
* Perataan horizontal: tengah
* Perataan vertikal: tengah

Padding:

* Atas: 0,25 cm
* Bawah: 0,25 cm
* Kiri: 0,25 cm
* Kanan: 0,25 cm

Penulisan:

* Isi dengan nomor halaman saja.
* Contoh:
* 2
* 13
* 105
* 312

Catatan bentuk:

* Bentuk pagination sama dengan pagination kiri.
* Letakkan di kanan bawah.
* Pastikan konsisten tinggi posisinya dengan pagination kiri.

4. CATATAN KONSISTENSI

* Header selalu di kiri atas.
* Pagination selalu di bawah.
* Pagination kiri dan kanan harus sejajar secara horizontal.
* Nomor halaman jangan diketik manual dengan posisi bebas; gunakan box template yang sama.
* Jika halaman memakai pagination kiri, maka gunakan posisi kiri.
* Jika halaman memakai pagination kanan, maka gunakan posisi kanan.
* Jangan ubah ukuran box hanya karena jumlah digit berbeda.
* Untuk 1 digit, 2 digit, atau 3 digit, tetap gunakan style yang sama.


paling akhir adalah back-module/back-cover-scl.svg dia gak ada apa aapa
