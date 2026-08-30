# M0 Legacy Golden Baseline

Artifact pada folder ini dibuat dari fixture sintetis dan CSS authority
`book-editor-rework/templates/modern.html`. Tidak ada Spreadsheet production,
saved book, atau data course nyata yang digunakan.

Jalankan ulang dari root repository:

```sh
npm run qc:m0:golden
```

`manifest.json` mengikat fixture, source authority, dan setiap artifact dengan
SHA-256. `computed-styles.json` mencatat typography/component style aktual;
`page-role-geometry.json` mencatat ukuran sheet/content serta nomor halaman.
PNG Roblox dan Scratch mencakup cover/title, ordinary flow, step/image,
semantic cards, left/right numbering, late Session 12, dan back cover.

## Review gate

Artifact ini adalah baseline lokal yang siap direview, bukan Product/Design
approval. Reviewer perlu memastikan treatment visual dan optical offsets dapat
dipakai sebagai acuan migrasi. Setelah approval dicatat di `WORKLOG.md`, M0
dapat ditutup dan M1.1 boleh dimulai.

Review 4 Agustus 2026 menyetujui baseline dengan target override pada
`fixtures/m0/approved-target.json`: viewport empat template non-cover adalah
`1.38 / 3.22 / 18.38 / 23.86 cm`, padding `0.25 cm`, body Poppins 14 pt, dan
Guide/TOC memakai background beginning sesuai parity. Override ini mengalahkan
geometry legacy screenshot untuk target renderer; screenshot tetap dipertahankan
sebagai reference component treatment.
