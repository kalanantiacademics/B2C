# Data Flow — Student Dashboard

> **Fungsi dokumen:** menjelaskan perjalanan data dari tindakan siswa sampai browser, Google Sheets, dan Google Drive.
>
> **Baca ketika:** ingin melacak sumber data, tujuan penyimpanan, atau efek sebuah tombol.

## Alur utama

```text
Login → Dashboard → Sessions → Materials → Submission → Quiz
```

- Browser menyimpan identitas, posisi sesi, dan state navigasi melalui `localStorage`.
- Google Apps Script menyediakan endpoint yang dipanggil URL deployment di halaman HTML.
- Google Sheets menyimpan roster, progres, quiz, absensi, dan metadata sesi.
- Google Drive dapat menjadi tujuan upload proyek.

Detail fungsi dan perilaku tersedia di `ARCHITECTURE.md`.
