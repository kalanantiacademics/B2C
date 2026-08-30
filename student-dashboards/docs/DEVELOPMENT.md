# Development — Student Dashboard

> **Fungsi dokumen:** panduan aman untuk mengembangkan dan memeriksa Student Dashboard secara lokal.
>
> **Baca ketika:** akan mengubah HTML, CSS, JavaScript, atau source Apps Script.

## Aturan utama

- Pertahankan lima HTML produksi di root folder.
- Jangan mengganti key `localStorage`, URL API, action, atau bentuk payload tanpa migrasi terencana.
- Asset bersama berada di `assets/css` dan `assets/js`.
- Eksperimen dilakukan di `experiments/`, bukan pada halaman produksi.
- Source `.gs` lokal harus diuji sintaks sebagai JavaScript dan dideploy manual ke Google Apps Script.

## Menjalankan lokal

Jalankan static server dari root repository lalu buka `/B2C/student-dashboards/`. Jangan mengandalkan double-click `file://` untuk pengujian integrasi penuh.
