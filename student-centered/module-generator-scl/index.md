# module generator scl

> Orientasi folder `B2C/student-centered/module-generator-scl`. Dibuat otomatis pada 2026-08-30; isi kode/aset tetap menjadi sumber kebenaran.

Generator/editor modul dengan source, tests, docs, dan deliverables.

## Posisi dalam katalog
- [Katalog Academic_Content](../../../CATALOG.md)
- [Index folder induk](../index.md)

## File langsung

| File | Fungsi | Hubungan umum |
|---|---|---|
| [`.clasp.json`](.clasp.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`.claspignore`](.claspignore) | Metadata/konfigurasi lokal. | Baca import/reference dari file entry point untuk detail dependency. |
| [`.gitignore`](.gitignore) | Metadata/konfigurasi lokal. | Baca import/reference dari file entry point untuk detail dependency. |
| [`AGENTS.md`](AGENTS.md) | Panduan kerja/aturan khusus untuk contributor atau agent. | Baca import/reference dari file entry point untuk detail dependency. |
| [`CHANGELOG.md`](CHANGELOG.md) | Dokumentasi, spesifikasi, catatan, atau panduan. | Baca import/reference dari file entry point untuk detail dependency. |
| [`package-lock.json`](package-lock.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`package.json`](package.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`patch_resume.js`](patch_resume.js) | Logika frontend, sinkronisasi, data interaksi, atau skrip tooling. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`prd-awal.md`](prd-awal.md) | Dokumentasi, spesifikasi, catatan, atau panduan. | Baca import/reference dari file entry point untuk detail dependency. |
| [`PRD.md`](PRD.md) | Dokumentasi, spesifikasi, catatan, atau panduan. | Baca import/reference dari file entry point untuk detail dependency. |
| [`README.md`](README.md) | Dokumentasi orientasi dan peta isi folder. | Baca import/reference dari file entry point untuk detail dependency. |
| [`SECURITY.md`](SECURITY.md) | Dokumentasi, spesifikasi, catatan, atau panduan. | Baca import/reference dari file entry point untuk detail dependency. |

## Subfolder

| Folder | Isi dan hubungan |
|---|---|
| [`assets/`](assets) | Artefak/subproyek turunan; buka folder untuk detail. |
| [`back-module/`](back-module/index.md) | Index turunan |
| [`docs/`](docs/index.md) | Index turunan |
| [`scripts/`](scripts/index.md) | Index turunan |
| [`src/`](src/index.md) | Index turunan |
| [`tests/`](tests/index.md) | Index turunan |

## Cara membaca
1. Mulai dari entry point (biasanya `index.html`, `deck.html`, atau file bernama `main_*`).
2. Ikuti file `.js`, `.css`, dan aset yang dirujuk oleh entry point.
3. Untuk backend/deployment, baca `.gs`, `README.md`, `PRD.md`, atau `docs/` sebelum mengubah source.
4. Folder `assets/`, `dist/`, `node_modules/`, virtualenv, dan output QC bersifat pendukung; bukan source utama.

## Hubungan utama generator modul SCL

```text
Google Sheets (single source of truth)
        └─ src/ (Apps Script parser, editor, renderer, persistence)
             ├─ back-module/ (aset halaman kanonis)
             ├─ docs/ (architecture, plans, testing, runbook)
             └─ tests/ + scripts/ (fixtures, regression, QC)
                  └─ browser Print / Save as PDF (output resmi)
```

`PRD.md` dan `AGENTS.md` menentukan kontrak; `README.md` memberi status operasional terbaru.
