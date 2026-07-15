# Deployment — Teacher Dashboard

> **Fungsi dokumen:** menjelaskan deployment frontend dan backend Teacher Dashboard.
>
> **Baca ketika:** perubahan sudah lolos pengujian dan akan diterbitkan.

## Frontend

Frontend terdiri dari HTML serta `assets/css/mobile-ready.css`. Pastikan seluruh path relatif dan navigasi valid sebelum menerbitkan melalui hosting repository.

## Backend

Source lokal berada di `../apps-script/code-teacher.gs`. Mengedit file lokal tidak mengubah Web App aktif. Salin atau sinkronkan source ke project Google Apps Script, buat versi deployment baru, dan pertahankan URL Web App yang dipanggil frontend.

## Checklist

- Login dan daftar kelas berhasil.
- Detail kelas dan rubrik dapat dimuat.
- Absensi, approval, bonus, dan sync flag teruji dengan data uji.
- Curriculum dan panduan dapat dibuka.
- Console tidak memiliki error baru.
- Jika `.gs` berubah, deployment Apps Script sudah diperbarui.
