# Log Perbaikan Teacher Dashboard

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
