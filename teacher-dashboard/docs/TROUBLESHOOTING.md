# Troubleshooting — Teacher Dashboard

> **Fungsi dokumen:** membantu menemukan penyebab masalah umum Teacher Dashboard.
>
> **Baca ketika:** style hilang, login gagal, kelas kosong, spreadsheet tidak terbaca, atau write action gagal.

- **Style 404:** periksa `assets/css/mobile-ready.css`.
- **Perubahan backend tidak terlihat:** source `.gs` lokal belum dideploy ulang.
- **Kelas tidak muncul:** periksa email, status kelas, prefix kode SCL, dan mapping `Class Database`.
- **Siswa tidak ditemukan:** periksa nama pada header `Progress` dan hasil normalisasi.
- **Absensi/bintang salah kolom:** periksa header dinamis serta fallback di `apps-script/code-teacher.gs`.
- **Data tidak refresh:** periksa sync flag `Absensi!AQ1` dan endpoint `checkSync`.
