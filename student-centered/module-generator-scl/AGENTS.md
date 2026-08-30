# Repository Instructions — Kalananti SCL Module Generator

Instruksi ini berlaku untuk seluruh file dan subfolder di repository ini. Semua
AI agent dan contributor harus membacanya sebelum melakukan diagnosis,
implementasi, pengujian, atau deployment.

## 1. Mandatory Startup Protocol

Sebelum mengubah apa pun:

1. Baca `AGENTS.md` sampai selesai.
2. Baca `PRD.md` sebagai kontrak produk utama.
3. Baca `docs/IMPLEMENTATION_PLAN.md` untuk mengetahui fase aktif dan gate.
4. Baca entri terbaru yang relevan di `docs/WORKLOG.md`.
5. Baca dokumen domain yang terkait dari daftar pada `README.md`.
6. Jalankan `git status --short` dan jangan mengubah pekerjaan user yang tidak
   terkait.
7. Pastikan apakah pekerjaan yang diminta bersifat diagnosis, implementasi,
   deployment, atau hanya dokumentasi. Jangan memperluas otorisasi sendiri.

Jika instruksi bertentangan, gunakan urutan berikut:

1. permintaan user terbaru;
2. `PRD.md` yang telah disetujui;
3. `AGENTS.md`;
4. keputusan accepted di `docs/DECISIONS.md`;
5. dokumen teknis lain;
6. runtime lama atau `prd-awal.md`.

Jangan menganggap target yang tertulis di PRD sudah diimplementasikan. Verifikasi
source dan runtime terlebih dahulu.

## 2. Product Invariants

Perubahan tidak boleh melanggar invariant berikut tanpa persetujuan requirement
yang eksplisit:

- Google Spreadsheet adalah SSOT bersama.
- Client hanya mengirim `courseKey`; Spreadsheet ID dan nama tab dimiliki server.
- Source module hanya tiga tab `_Modul` yang di-allowlist dalam PRD.
- Grammar `kcN*`, `fykN*`, `kcN:`, dan `fykN:` tidak boleh diganti atau
  dinormalisasi secara destruktif.
- Satu project mewakili satu course dan satu level, dengan slot Session 1–12.
- Lock berlaku per session; autosave harus revision-aware dan idempotent.
- `quiz_answers` tidak pernah boleh masuk payload renderer, preview DOM, log,
  atau PDF.
- Gambar source harus berupa URL HTTPS; jangan menerima upload/base64/blob pada
  MVP.
- Tabel visual disimpan di hidden tab app-managed dan tidak dipaksa masuk ke
  grammar text lama.
- Setiap session opener berada di page side kiri; filler boleh ditambahkan.
- PDF berasal dari browser print A4, dengan selectable text dan SVG tajam.
- Google Slides, email, auto-publish, dan auto-save PDF ke Drive bukan scope MVP.
- Aset kanonis berada di `back-module/`; jangan menggantinya tanpa persetujuan
  desain.

## 3. Data and Destructive-Safety Rules

- Jangan pernah menjalankan test write terhadap Spreadsheet production.
- Gunakan temporary fixture Spreadsheet atau pure fixture untuk integration test.
- Hidden-tab auto-healing hanya boleh menambah struktur kanonis secara
  non-destruktif. Duplicate/ambiguous/corrupt schema harus masuk safe mode dan
  memblokir mutation.
- Jangan menimpa seluruh row bila hanya beberapa field berubah.
- Jangan menghapus unknown columns, history, audit, lock, atau table records
  sebagai jalan pintas migrasi.
- Jangan menjalankan cleanup, reset, force unlock, restore, migration, atau
  deployment production tanpa target yang terverifikasi dan otorisasi yang
  sesuai.
- Preserve perubahan user yang tidak terkait di worktree yang kotor.

## 4. Secrets and Privacy

- Baca dan patuhi `SECURITY.md` sebelum menyentuh auth, Script Properties,
  image fetch, logging, atau deployment.
- Password/passcode plaintext, salt, hashes, signing secrets, tokens, cookies,
  OAuth URLs, API keys, dan signed URLs tidak boleh masuk repository, worklog,
  changelog, test fixture, screenshot, atau output command.
- Credential yang muncul selama discovery dianggap terpapar dan harus dirotasi
  sebelum production.
- Spreadsheet ID, Script ID, deployment ID, dan internal URL hanya boleh dicatat
  bila memang diperlukan secara operasional; jangan tampilkan di client.
- Log hanya metadata yang diizinkan PRD. Jangan log full field values, image
  bytes, token, atau answer key.

## 5. Implementation Workflow

Untuk setiap perubahan:

1. Nyatakan requirement/AC yang sedang dikerjakan.
2. Inspeksi implementasi dan test yang aktif; jangan menebak berdasarkan nama
   file atau changelog.
3. Buat perubahan sekecil mungkin dalam fase aktif.
4. Tambahkan atau perbarui test yang membuktikan behavior.
5. Jalankan validation proporsional terhadap risiko sesuai `docs/TESTING.md`.
6. Untuk layout/PDF, render artifact nyata dan periksa seluruh halaman yang
   terdampak—bukan hanya HTML source atau signature `%PDF`.
7. Perbarui dokumentasi yang wajib menurut bagian 8.
8. Append entry ke `docs/WORKLOG.md` sebelum final response.

Jangan memulai fase berikutnya sebelum exit criteria fase aktif terpenuhi.
Jangan mengubah status fase menjadi complete hanya karena source sudah ditulis;
validation dan evidence wajib tersedia.

## 6. Status and Deployment Truth

Selalu bedakan tiga status berikut:

1. **Local source** — file di workspace ini.
2. **Apps Script current code / HEAD** — source yang sudah di-push.
3. **Versioned production deployment** — immutable version yang dipakai URL
   `/exec`.

`clasp push` hanya mengubah current code. Jangan menyebut perubahan “live” atau
“production” sebelum version dibuat, deployment diperbarui, dan smoke test
production lulus. Deployment merupakan external mutation dan memerlukan
permintaan/otorisasi eksplisit dari user.

## 7. Mandatory Worklog

`docs/WORKLOG.md` adalah riwayat operasional append-only. Untuk setiap task atau
diagnostic session:

- baca entri terbaru sebelum bekerja;
- append satu entri sebelum final response;
- pisahkan request, user actions, agent actions, validation, errors/decisions,
  dan pending work;
- tandai informasi historis yang tidak diverifikasi sebagai `Not verified`;
- jangan mengedit entri lama untuk menutupi kesalahan—append correction;
- jangan menyalin percakapan verbatim atau menyimpan secret.

`CHANGELOG.md` bukan worklog. Changelog hanya mencatat perubahan produk atau
engineering yang notable/release-oriented.

## 8. Documentation Maintenance Matrix

| Jika perubahan menyentuh | Dokumen yang harus diperbarui |
|---|---|
| Requirement/scope/AC | `PRD.md`, `docs/DECISIONS.md`, plan bila fase berubah |
| Boundary/component/data flow | `docs/ARCHITECTURE.md` |
| Phase/task/gate/status | `docs/IMPLEMENTATION_PLAN.md` |
| Test command, fixture, atau acceptance evidence | `docs/TESTING.md` |
| Setup, recovery, push, release, rollback | `docs/RUNBOOK.md` |
| Auth, secret, privacy, SSRF, answer isolation | `SECURITY.md` |
| Notable behavior/fix/release | `CHANGELOG.md` |
| Setiap task/diagnostic | `docs/WORKLOG.md` |

Hindari menyalin seluruh requirement ke banyak dokumen. Dokumen turunan harus
menautkan section/AC di PRD; jika terjadi konflik, PRD menang.

## 9. Verification Minimum

- Static checks dan unit tests harus lulus untuk setiap code change.
- Integration test menggunakan fixture non-production.
- Browser behavior diuji di runtime nyata, bukan hanya function isolation.
- Concurrency diuji dengan minimal dua browser contexts.
- Print/PDF diuji dari hasil render A4 nyata, termasuk late Session 12 dan back
  cover.
- Periksa console/page errors, overflow, missing image, selectable text, page
  parity, TOC, dan answer leak.
- Catat command dan hasil aktual; jangan mengarang jumlah test atau status pass.

Jika tooling belum tersedia, nyatakan `Not implemented` dan kerjakan foundation
tooling pada Phase 0—jangan mengklaim checks telah dijalankan.

