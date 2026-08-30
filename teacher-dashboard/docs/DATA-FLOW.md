# Data Flow — Teacher Dashboard

> **Fungsi dokumen:** menjelaskan perjalanan data dari tindakan guru menuju browser dan spreadsheet.
>
> **Baca ketika:** ingin mengetahui sumber data atau tujuan penyimpanan absensi, penilaian, bonus, dan rubrik.

```text
Login → Daftar kelas → Detail kelas → Absensi/Penilaian
                         ↓
               Google Apps Script
                         ↓
        Class Database + Absensi + Progress
```

- Browser menyimpan identitas guru dan kelas terpilih untuk navigasi.
- Frontend memanggil URL deployment Google Apps Script.
- Backend membaca database pusat dan spreadsheet kelas.
- Perubahan absensi, penilaian, bonus, serta sinkronisasi ditulis ke spreadsheet kelas.

Detail fungsi tersedia di `ARCHITECTURE.md`; posisi data tersedia di `SPREADSHEET-SCHEMA.md`.
