# m0

> Orientasi folder `B2C/student-centered/module-generator-scl/docs/golden/m0`. Dibuat otomatis pada 2026-08-30; isi kode/aset tetap menjadi sumber kebenaran.

Folder proyek/artefak m0. Gunakan tabel di bawah untuk melihat fungsi setiap file dan hubungan dengan subfolder.

## Posisi dalam katalog
- [Katalog Academic_Content](../../../../../../CATALOG.md)
- [Index folder induk](../index.md)

## File langsung

| File | Fungsi | Hubungan umum |
|---|---|---|
| [`computed-styles.json`](computed-styles.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`legacy-reference.html`](legacy-reference.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`manifest.json`](manifest.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`page-role-geometry.json`](page-role-geometry.json) | Konfigurasi atau data terstruktur yang dibaca oleh aplikasi/script. | Baca import/reference dari file entry point untuk detail dependency. |
| [`README.md`](README.md) | Dokumentasi orientasi dan peta isi folder. | Baca import/reference dari file entry point untuk detail dependency. |
| [`roblox-back-cover.png`](roblox-back-cover.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`roblox-cover.png`](roblox-cover.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`roblox-late-session-left.png`](roblox-late-session-left.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`roblox-ordinary-left.png`](roblox-ordinary-left.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`roblox-semantic-right.png`](roblox-semantic-right.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`scratch-back-cover.png`](scratch-back-cover.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`scratch-cover.png`](scratch-cover.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`scratch-late-session-left.png`](scratch-late-session-left.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`scratch-ordinary-left.png`](scratch-ordinary-left.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |
| [`scratch-semantic-right.png`](scratch-semantic-right.png) | Aset visual (ilustrasi, screenshot, ikon, atau background). | Direferensikan dari HTML/deck sebagai aset visual. |

## Subfolder

| Folder | Isi dan hubungan |
|---|---|
| *(tidak ada)* | Semua artefak berada langsung di folder ini. |

## Cara membaca
1. Mulai dari entry point (biasanya `index.html`, `deck.html`, atau file bernama `main_*`).
2. Ikuti file `.js`, `.css`, dan aset yang dirujuk oleh entry point.
3. Untuk backend/deployment, baca `.gs`, `README.md`, `PRD.md`, atau `docs/` sebelum mengubah source.
4. Folder `assets/`, `dist/`, `node_modules/`, virtualenv, dan output QC bersifat pendukung; bukan source utama.
