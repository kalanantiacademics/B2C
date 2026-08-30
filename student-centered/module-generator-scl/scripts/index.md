# scripts

> Orientasi folder `B2C/student-centered/module-generator-scl/scripts`. Dibuat otomatis pada 2026-08-30; isi kode/aset tetap menjadi sumber kebenaran.

Folder proyek/artefak scripts. Gunakan tabel di bawah untuk melihat fungsi setiap file dan hubungan dengan subfolder.

## Posisi dalam katalog
- [Katalog Academic_Content](../../../../CATALOG.md)
- [Index folder induk](../index.md)

## File langsung

| File | Fungsi | Hubungan umum |
|---|---|---|
| [`build-local-preview.mjs`](build-local-preview.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`build-phase2-preview.mjs`](build-phase2-preview.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`build-phase5-preview.mjs`](build-phase5-preview.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`format-check.mjs`](format-check.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`generate-font-assets.mjs`](generate-font-assets.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`generate-page-assets.mjs`](generate-page-assets.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |
| [`generate_guide_reference_crops.py`](generate_guide_reference_crops.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`phase0-secrets.html`](phase0-secrets.html) | Halaman web/interaktif (UI dan logika biasanya berada di file .js/.gs terkait). | Entry point yang menggabungkan markup, style inline, aset, dan/atau script sibling. |
| [`qc_front_matter_review.py`](qc_front_matter_review.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m0_golden.py`](qc_m0_golden.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m1_direct_edit.py`](qc_m1_direct_edit.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m1_image_reflow.py`](qc_m1_image_reflow.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m1_shell.py`](qc_m1_shell.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m2_adapter.py`](qc_m2_adapter.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m3_compare.py`](qc_m3_compare.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_m7_full.py`](qc_m7_full.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_p7_recovery_browser.py`](qc_p7_recovery_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase1_browser.py`](qc_phase1_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase2_browser.py`](qc_phase2_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase3_browser.py`](qc_phase3_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase4_browser.py`](qc_phase4_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase5_browser.py`](qc_phase5_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_phase6_pdf.py`](qc_phase6_pdf.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`qc_v2_foundation_browser.py`](qc_v2_foundation_browser.py) | Script Python untuk generator, otomasi, migrasi, validasi, atau server lokal. | Dipakai oleh entry point atau workflow build/QC pada folder ini. |
| [`render_pdf_contact_sheet.swift`](render_pdf_contact_sheet.swift) | File pendukung proyek; cek referensi/import dari source utama. | Baca import/reference dari file entry point untuk detail dependency. |
| [`static-check.mjs`](static-check.mjs) | Script command-line/build/deployment. | Baca import/reference dari file entry point untuk detail dependency. |

## Subfolder

| Folder | Isi dan hubungan |
|---|---|
| *(tidak ada)* | Semua artefak berada langsung di folder ini. |

## Cara membaca
1. Mulai dari entry point (biasanya `index.html`, `deck.html`, atau file bernama `main_*`).
2. Ikuti file `.js`, `.css`, dan aset yang dirujuk oleh entry point.
3. Untuk backend/deployment, baca `.gs`, `README.md`, `PRD.md`, atau `docs/` sebelum mengubah source.
4. Folder `assets/`, `dist/`, `node_modules/`, virtualenv, dan output QC bersifat pendukung; bukan source utama.
