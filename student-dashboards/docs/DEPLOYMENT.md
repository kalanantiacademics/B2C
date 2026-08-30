# Deployment — Student Dashboard

> **Fungsi dokumen:** menjelaskan perbedaan dan langkah deployment frontend dengan backend Student Dashboard.
>
> **Baca ketika:** perubahan sudah lolos pengujian dan akan diterbitkan.

## Frontend

Frontend terdiri dari HTML serta file di `assets/`. Pastikan seluruh path relatif valid sebelum menerbitkan melalui hosting repository.

## Backend

Source lokal berada di `../apps-script/code-student.gs`. Mengedit file tersebut tidak mengubah Web App aktif. Salin atau sinkronkan source ke project Google Apps Script, buat versi deployment baru, lalu pertahankan URL Web App yang digunakan halaman HTML.

## Checklist

- Tidak ada asset lokal yang menghasilkan 404.
- Login, dashboard, sesi, materi, submission, dan quiz teruji.
- Console browser tidak memiliki error baru.
- Jika `.gs` berubah, deployment Google Apps Script telah diperbarui.
