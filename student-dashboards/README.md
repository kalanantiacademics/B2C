# Student Dashboard

> **Fungsi dokumen:** pintu masuk utama untuk memahami dan mengembangkan Student Dashboard.
>
> **Baca pertama kali:** dokumen ini menjelaskan halaman produksi, struktur folder, backend, dan dokumen lanjutan.

Student Dashboard adalah aplikasi frontend statis untuk login siswa, melihat progres, memilih sesi, membaca materi, mengumpulkan proyek, dan mengerjakan quiz. Halaman produksi berada langsung di folder ini agar URL publik tidak berubah.

## Halaman produksi

- `index.html`: login siswa.
- `dashboard.html`: ringkasan progres dan sesi aktif.
- `sessions.html`: peta sesi.
- `materials.html`: materi serta Must Do, Should Do, dan Aspire.
- `quiz.html`: quiz sesi.

## Struktur penting

- `assets/`: CSS dan JavaScript bersama yang digunakan halaman produksi.
- `apps-script/`: source lokal backend Google Apps Script; bukan runtime GitHub Pages.
- `docs/`: dokumentasi arsitektur, alur data, development, deployment, troubleshooting, dan changelog.
- `scripts/`: alat maintenance developer; tidak dimuat oleh halaman produksi.
- `experiments/alternate-ui/`: eksperimen UI dan bukan versi produksi.

## Mulai membaca

- Sistem secara keseluruhan: `docs/ARCHITECTURE.md`.
- Perjalanan data siswa: `docs/DATA-FLOW.md`.
- Menjalankan atau mengembangkan lokal: `docs/DEVELOPMENT.md`.
- Deployment: `docs/DEPLOYMENT.md`.
- Masalah umum: `docs/TROUBLESHOOTING.md`.
- Riwayat perubahan: `docs/CHANGELOG.md`.

## Batas deployment

Perubahan HTML/CSS/JS dapat diterbitkan melalui hosting frontend. Perubahan `apps-script/code-student.gs` tidak aktif sampai source disalin atau disinkronkan ke project Google Apps Script dan Web App dibuatkan versi deployment baru.
