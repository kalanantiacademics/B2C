# Teacher Dashboard

> **Fungsi dokumen:** pintu masuk utama untuk memahami dan mengembangkan Teacher Dashboard.
>
> **Baca pertama kali:** dokumen ini menjelaskan halaman produksi, struktur folder, backend, dan dokumentasi lanjutan.

Teacher Dashboard adalah aplikasi frontend statis untuk login guru, melihat kelas, mencatat absensi, menilai proyek, memberi bonus, membaca kurikulum, dan membuka panduan SCL. Halaman produksi tetap berada langsung di folder ini agar URL publik tidak berubah.

## Halaman produksi

- `index.html`: login guru.
- `dashboard.html`: daftar dan ringkasan kelas.
- `class-detail.html`: absensi, progres, proyek, rubrik, dan bonus.
- `curriculum.html`: daftar kurikulum.
- `curriculum-detail.html`: detail materi kurikulum.
- `panduan-scl.html`: panduan pengajaran SCL.

## Struktur penting

- `assets/`: CSS dan JavaScript bersama halaman produksi.
- `apps-script/`: source lokal backend Google Apps Script.
- `docs/`: dokumentasi teknis, deployment, panduan guru, dan changelog.
- `scripts/`: maintenance tool yang masih aktif.
- `archive/`: tool lama; tidak digunakan runtime produksi.

## Mulai membaca

- Sistem: `docs/ARCHITECTURE.md`.
- Perjalanan data: `docs/DATA-FLOW.md`.
- Struktur spreadsheet: `docs/SPREADSHEET-SCHEMA.md`.
- Development: `docs/DEVELOPMENT.md`.
- Deployment: `docs/DEPLOYMENT.md`.
- Masalah umum: `docs/TROUBLESHOOTING.md`.
- Panduan guru: `docs/TEACHER-GUIDE.md`.
- Riwayat perubahan: `docs/CHANGELOG.md`.

## Batas deployment

Perubahan `apps-script/code-teacher.gs` tidak aktif sampai source dipasang pada project Google Apps Script dan Web App dibuatkan versi deployment baru.
