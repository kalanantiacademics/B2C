# Student Dashboard Scripts

> **Fungsi dokumen:** menjelaskan maintenance tool lokal Student Dashboard.
>
> **Baca ketika:** akan menjalankan atau memperbarui script patch developer.

- `patch-dashboard.js`: patch historis untuk dashboard. Script tidak dijalankan oleh frontend dan harus diperiksa sebelum digunakan kembali.
- `check-local-links.js`: memeriksa target lokal pada atribut `href` dan `src` seluruh file HTML.

Contoh dari root repository:

```bash
node B2C/student-dashboards/scripts/check-local-links.js B2C/student-dashboards B2C/teacher-dashboard
```
