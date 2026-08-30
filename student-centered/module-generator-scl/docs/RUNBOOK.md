# Operations Runbook

Runbook ini mendeskripsikan procedure Phase 0 yang sudah tersedia secara lokal.
Apps Script current code dan production tetap harus diverifikasi terpisah;
jangan mengisi status dengan tebakan.

## 1. Local Foundation Setup

1. Baca `../AGENTS.md`, `../PRD.md`, dan active phase plan.
2. Pastikan Node `>=22`; project memakai `@google/clasp` `3.3.0` secara lokal.
3. Jalankan `npm install`.
4. Jalankan `npm run check` untuk static, unit, dan formatting gate.
5. Optional render-only preview: `npm run preview:build`; artifact berada di
   temporary directory dan memakai stub RPC tanpa Spreadsheet access. (Catatan: Proses render ke PDF utamanya bergantung pada fallback *Print/Save as PDF* dari browser karena implementasi headless renderer ditunda).
6. Catat hasil nyata di worklog.

## 2. Apps Script Project Setup

1. Tentukan deployment owner dan gunakan named clasp profile khusus account
   tersebut; jangan memakai credential default account lain.
2. Verifikasi profile melalui `npx clasp show-authorized-user --user <profile>`.
3. Audit isi project existing melalui temporary clone sebelum membuat
   `.clasp.json` atau melakukan push.
4. Hubungkan standalone Apps Script project dengan `rootDir` `src` setelah
   remote source dinyatakan aman untuk diganti.
5. Pastikan `npx clasp show-file-status` hanya memuat runtime di `src/`.
6. Enable service/scope hanya yang diperlukan PRD.
   Image preflight memerlukan explicit manifest scope
   `https://www.googleapis.com/auth/script.external_request`. Setelah scope baru
   dipush, deployment owner harus membuka Apps Script editor, menjalankan
   `getAppBootstrap`, dan menyelesaikan authorization prompt sebelum membuat
   immutable production release. Jangan menyalin authorization URL/token ke log.
   Jangan menambah dummy scope untuk memaksa consent; hapus scope yang tidak
   digunakan runtime sebelum release.
7. Isi Script Properties melalui Apps Script UI atau procedure aman:
   - `SCL_SPREADSHEET_ID`;
   - `SCL_PASSWORD_SALT`;
   - `SCL_PASSWORD_HASH`;
   - `SCL_SESSION_SIGNING_SECRET`;
   - `SCL_IMAGE_MAX_BYTES`;
   - optional overrides untuk session TTL, TOC iterations, dan topic limit.
8. Untuk salt, passcode hash, dan signing secret, buka
   `scripts/phase0-secrets.html` secara lokal. Tool menggunakan Web Crypto,
   tidak mengirim network request, mengosongkan input passcode setelah generate,
   dan menyalin value langsung ke clipboard.
9. Jangan menaruh nilainya di command history, screenshot, source, atau worklog.
10. Jalankan `setupGeneratorStorageForOwner_` dari Apps Script editor, atau
    lakukan authenticated bootstrap pertama yang menjalankan safe setup yang
    sama.
11. Jalankan/verifikasi setup dua kali: run kedua tidak boleh menambah header,
    metadata, atau protection baru.
12. Verifikasi tab dibuat/ditambah secara non-destruktif dan corrupt schema tidak
    diubah otomatis.

### V2-P4 Deployment-Owner Drive Setup

Langkah ini dijalankan satu kali dari Apps Script editor sebagai deployment
owner. Jangan menyalin folder ID, consent URL, atau output credential ke source,
command history, screenshot, maupun worklog.

1. Buka Project Settings dan tambahkan Script Property
   `SCL_DRIVE_FOLDER_ID` dengan folder yang sudah memberi deployment owner hak
   menambah file.
2. Pilih dan jalankan `runV2P4OwnerSetupAndFixture`. Selesaikan OAuth consent
   yang diminta untuk Advanced Drive v3. Full Drive
   scope dipakai karena target adalah existing Shared Drive folder tanpa
   Google Picker.
3. Periksa Execution log `SCL_V2_P4_SAFE_RESULT`. Hasil pertama yang diharapkan:
   `ok=true`, `storageReady=true`, `created=true`, `status=PUBLISHED`, dan
   `pageCount=1`.
4. Jalankan fungsi yang sama sekali lagi. Hasil kedua harus `ok=true` dan
   `duplicate=true`; tidak boleh ada file atau registry record kedua.
5. Verifikasi satu temporary child folder dan satu PDF yang jelas berlabel
   synthetic/non-production. Jangan menghapusnya otomatis.
6. Buka aplikasi sebagai editor terautentikasi dan pastikan Published Modules
   memuat satu record fixture serta capability badge menyatakan Drive siap.
7. Catat hanya status/counter aman. Jangan mencatat folder ID, file ID, URL,
   token, atau full RPC response.

Jika folder identity pernah masuk source, command output, atau log, jangan
gunakan kembali identity tersebut sebagai bukti gate. Buat/validasi target
temporary pengganti, ubah Script Property melalui Project Settings, cabut akses
target lama sesuai prosedur owner, lalu ulangi capability/fixture gate. Rotation
ini merupakan external mutation dan harus memiliki target serta otorisasi
eksplisit.

Jika Apps Script Execution API menolak fungsi, gunakan editor manual di atas.
Jangan membuat public maintenance RPC atau membypass pemeriksaan owner.

## 3. Development Verification

PRD v2 migration additionally follows the active M0–M7 commands/evidence in
`IMPLEMENTATION_PLAN.md` and `TESTING.md`. Passing v1 regression commands does
not prove visual parity.

1. Jalankan full local check.
2. Jika canonical `back-module/*.svg` berubah dengan approval desain, jalankan
   `npm run assets:generate` dan verifikasi generated role di
   `src/PageAssets.html` identik dengan canonical SVG sebelum test/push.
3. Push hanya bila user meminta sinkronisasi Apps Script dan remote audit sudah
   selesai.
4. Setelah push, bedakan status sebagai `current code`, belum production.
5. Verifikasi `/dev` dengan deployment owner account.
6. Untuk Phase 0, uji login shell, valid/invalid passcode, session resume/logout,
   tiga public course keys, dan storage diagnostic. Representative level read
   baru dimulai pada Phase 1.
7. Periksa browser console, horizontal overflow desktop/mobile, dan pastikan
   source tab names/Spreadsheet ID tidak muncul di response/client source.
8. Jangan menjalankan fixture write pada source production.
9. Untuk Phase 2 local gate, jalankan `npm run qc:phase2:browser`; shared server
   pada command tersebut sepenuhnya sintetis dan tidak membutuhkan Spreadsheet.
10. Jangan menguji autosave/restore pada `/dev` yang menunjuk source production.
   Jika real Apps Script integration test diperlukan, buat temporary fixture
   Spreadsheet dan verifikasi targetnya sebelum mutation.
11. Untuk gate lokal publishing, jalankan `npm run qc:phase5:browser` lalu
    `npm run qc:phase6:pdf`. Artifact Phase 6 berada di temporary directory
    `/private/tmp/kalananti-scl-phase6-qc` dan tidak memakai Spreadsheet nyata.
    (Catatan: Phase 5 dan 6 saat ini berstatus deferred. Pengujian output PDF wajib menggunakan fallback *Print/Save as PDF* bawaan browser.)
12. Untuk V2-P1–P4 local foundation, jalankan `npm run qc:v2:browser` dan
    `npm run qc:v2:recovery`, lalu `npm run check`. Fake Drive membuktikan
    logic/failure handling tetapi tidak menggantikan langkah owner pada section
    V2-P4 di atas.

### Browser Print / Save as PDF

1. Pastikan tombol print aktif; jangan bypass blocking diagnostic.
2. Selesaikan acknowledgement bila low-DPI warning muncul.
3. Pada dialog browser pilih A4 portrait, scale 100%, margins none, background
   graphics aktif, serta browser headers/footers nonaktif.
4. Simpan PDF dan periksa late Session 12 serta back cover sebelum distribusi.
   Gunakan nama yang disarankan UI: `Kalananti-SCL-<COURSE>-Level-<LEVEL>.pdf`.
5. Pastikan publishing memakai satu selected course + level; editing tetap per
   session.
6. Pastikan print path tidak memanggil screenshot renderer atau Google Slides.
7. Bandingkan halaman representatif dengan M0 golden manifest sebelum release.

## 4. Release Procedure

Production release membutuhkan otorisasi eksplisit.

1. Pastikan PRD/phase exit dan release checklist disetujui.
2. Pastikan credential sudah dirotasi dan properties lengkap.
3. Jalankan static, unit, integration, browser, pagination, and rendered-PDF QA.
4. Record current deployments and versions untuk rollback.
5. Push source dan tunggu propagation.
6. Re-clone/compare runtime files bila diperlukan untuk membuktikan HEAD sesuai.
7. Create immutable Apps Script version dengan description yang jelas.
8. Jika manifest menambah OAuth scope, deployment owner selesaikan
   reauthorization dari Apps Script editor dan verifikasi permission tidak lagi
   menjadi blocker.
9. Update existing production deployment atau buat deployment baru sesuai
   keputusan owner.
10. Smoke-test `/exec` dengan account yang tepat.
11. Catat local SHA, Apps Script version, deployment ID/URL bila aman, hasil
    smoke test, dan rollback target di worklog.
12. Perbarui changelog.

`clasp push` saja bukan release production.

### M8 Release Evidence Checklist

Catat hasil aktual tanpa menyalin credential, Spreadsheet ID, deployment URL,
atau full response payload ke dokumentasi publik:

1. `npm run qc:m7:full` lulus pada source yang akan dirilis.
2. `clasp deployments` dan `clasp versions` merekam state sebelum mutation serta
   immutable rollback target bila sudah ada.
3. Pull HEAD ke temporary directory baru dan bandingkan seluruh `src/`; status
   current code hanya lulus bila tidak ada perbedaan.
4. Pada `/dev`, deployment owner memverifikasi login valid/invalid, tiga course,
   representative level dengan 12 slot, storage health, preview/print gate,
   console error, dan tidak adanya secret/source-tab identity pada response.
   Jangan melakukan content write terhadap production Spreadsheet.
5. Deployment owner mengonfirmasi required Script Properties telah dirotasi dan
   lengkap, target Spreadsheet benar, execute-as owner benar, serta protection
   owner/group sudah diputuskan. Catat statusnya saja, bukan nilainya.
6. Buat immutable version dengan description release yang jelas; jangan memakai
   `@HEAD` sebagai production rollback target.
7. Update deployment production ke version tersebut dan pastikan access surface
   sesuai PRD. Record version number serta deployment identity hanya pada
   operational evidence yang memang membutuhkan akses terbatas.
8. Jalankan smoke `/exec` read-only yang sama, termasuk unauthenticated login
   shell/content-leak probe dan authenticated owner flow.
9. Jalankan `clasp deployments`/`clasp versions` lagi dan buktikan deployment
   production menunjuk immutable version baru sementara version sebelumnya tetap
   tersedia untuk rollback.
10. Rollback verification berarti target known-good dan command redeploy sudah
    teridentifikasi; jangan melakukan rollback aktual pada release sehat hanya
    untuk pengujian.

## 5. Production Smoke Test

- Login shell tampil tanpa content leak.
- Passcode valid/invalid behavior benar tanpa detail leak.
- Course allowlist hanya menunjukkan tiga source module.
- Representative level terbaca dengan 12 slot status.
- Lock/session expiry bekerja.
- Preview dan print gate dapat mencapai expected state.
- Tidak ada console/server error atau secret di response/log.
- Jangan melakukan content edit production kecuali smoke-write telah disetujui
  dan target row khusus sudah ditetapkan.

## 6. Rollback

1. Identifikasi terakhir known-good immutable version.
2. Pastikan masalah bukan hanya cache, account permission, Script Property, atau
   mismatch HEAD versus `/exec`.
3. Update deployment ke version known-good.
4. Smoke-test `/exec` kembali.
5. Jangan menghapus version bermasalah; simpan untuk diagnosis.
6. Append worklog incident dan correction plan tanpa secret.

## 7. Common Diagnostics

### `/dev` berbeda dari `/exec`

- `/dev` memakai current code; `/exec` memakai pinned immutable version.
- Periksa deployment list dan version sebelum menyimpulkan push gagal.

### Source dapat dibuka owner tetapi Web App gagal membaca

- Verifikasi Web App execute-as identity dan permission deployment owner pada
  Spreadsheet.
- Verifikasi `SCL_SPREADSHEET_ID` ada tanpa menampilkannya ke client/log.

### Editor blocked oleh lock

Jika client menerima `SERVER_BUSY`, jangan force unlock atau reload source:
heartbeat mempertahankan lease dan autosave mencoba ulang otomatis setelah dua
detik. Gunakan Salin Perubahan/Muat Source Terbaru hanya untuk revision conflict
atau lease invalid/expired yang eksplisit, bukan warning sandbox/Google shell.

- Periksa lease owner metadata dan last heartbeat.
- Jangan force unlock lease aktif.
- Lease stale dapat diambil alih hanya sesuai expiry policy.

### Hidden storage diagnostic

- Missing tab/column: jalankan safe setup/repair.
- Unknown column: pertahankan.
- Duplicate/ambiguous/corrupt schema: hentikan mutation dan lakukan diagnosis
  manual; jangan menghapus data sebagai recovery cepat.

### Print gate tidak terbuka

- Periksa unsaved/autosave state, image server/client readiness, table anchor,
  pagination cap, TOC stability, dan overflow diagnostics.
- Jangan menyediakan bypass untuk blocking condition yang melanggar PRD.

## 8. Credential Rotation

1. Generate material baru melalui channel aman oleh deployment owner.
2. Update Script Properties tanpa menaruh value di repository/command log.
3. Invalidasi session lama bila signing secret berubah.
4. Smoke-test login dan mutation validation.
5. Catat bahwa rotasi selesai tanpa mencatat credential.
