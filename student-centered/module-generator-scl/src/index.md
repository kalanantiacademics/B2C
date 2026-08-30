# src

> Orientasi folder `B2C/student-centered/module-generator-scl/src`. Dibuat otomatis pada 2026-08-30; isi kode/aset tetap menjadi sumber kebenaran.

Folder proyek/artefak src. Gunakan tabel di bawah untuk melihat fungsi setiap file dan hubungan dengan subfolder.

## Posisi dalam katalog
- [Katalog Academic_Content](../../../../CATALOG.md)
- [Index folder induk](../index.md)

## File langsung

| File | Fungsi | Hubungan umum |
|---|---|---|
| [`Activity.gs`](Activity.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`App.html`](App.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`appsscript.json`](appsscript.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`Assets.html`](Assets.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`Auth.gs`](Auth.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Code.gs`](Code.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Collaboration.gs`](Collaboration.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Config.gs`](Config.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`DataStore.gs`](DataStore.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`DrivePublisher.gs`](DrivePublisher.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Editor.html`](Editor.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`Errors.gs`](Errors.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`FontAssets.html`](FontAssets.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`ImagePreflight.gs`](ImagePreflight.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`index.html`](index.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`LayoutStore.gs`](LayoutStore.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`LegacyAdapter.html`](LegacyAdapter.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`PageAssets.html`](PageAssets.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`Parser.gs`](Parser.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Publisher.html`](Publisher.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`PublishStore.gs`](PublishStore.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`RichText.gs`](RichText.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Storage.gs`](Storage.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |
| [`Styles.html`](Styles.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`TableStore.gs`](TableStore.gs) | Backend Google Apps Script: endpoint, integrasi Sheets/Drive, atau handler form. | Dipanggil halaman HTML melalui fetch/form/API atau dikelola sebagai deployment Apps Script. |

## Subfolder

| Folder | Isi dan hubungan |
|---|---|
| *(tidak ada)* | Semua artefak berada langsung di folder ini. |

## Cara membaca
1. Mulai dari entry point (biasanya `index.html`, `deck.html`, atau file bernama `main_*`).
2. Ikuti file `.js`, `.css`, dan aset yang dirujuk oleh entry point.
3. Untuk backend/deployment, baca `.gs`, `README.md`, `PRD.md`, atau `docs/` sebelum mengubah source.
4. Folder `assets/`, `dist/`, `node_modules/`, virtualenv, dan output QC bersifat pendukung; bukan source utama.
