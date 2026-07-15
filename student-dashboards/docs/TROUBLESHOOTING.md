# Troubleshooting — Student Dashboard

> **Fungsi dokumen:** membantu menemukan penyebab masalah umum Student Dashboard.
>
> **Baca ketika:** halaman kehilangan style, navigasi gagal, data kosong, atau perubahan backend belum terlihat.

- **CSS/JS 404:** periksa path `assets/css/device-guard.css` dan `assets/js/device-guard.js`.
- **Data lama setelah `.gs` diubah:** source lokal belum dideploy sebagai versi baru Google Apps Script.
- **Kembali ke login:** periksa identitas dan state yang dibutuhkan di `localStorage`.
- **Sesi/progres tidak sesuai:** bedakan state browser dengan data yang tersimpan di Sheets.
- **Eksperimen memengaruhi produksi:** pastikan perubahan hanya berada di `experiments/alternate-ui/`.
