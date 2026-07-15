# Spreadsheet Schema — Teacher Dashboard

> **Fungsi dokumen:** mencatat sheet, kolom, blok baris, fallback, dan metadata yang digunakan backend teacher.
>
> **Baca ketika:** spreadsheet berubah atau data tampil pada kolom/baris yang salah.

## Database pusat

- Spreadsheet ID didefinisikan di `../apps-script/code-teacher.gs`.
- Sheet utama: `Class Database`.
- Backend menggunakan data cabang, kode/status kelas, program, guru, link kelas, dan jadwal.

## Spreadsheet kelas

- `Absensi`: identitas siswa, sesi kehadiran, jumlah jam/sesi, rubrik, total bintang, dan sync flag `AQ1`.
- `Progress`: header nama siswa dan blok lima baris per sesi untuk date, progress, quiz, star, dan project.

Mapping dinamis serta fallback numerik berada di bagian awal `apps-script/code-teacher.gs`. Perubahan template spreadsheet wajib diuji terhadap data nyata sebelum deployment.
