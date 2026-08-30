# Testing and Evidence Contract

Dokumen ini mengoperasionalkan PRD Section 22. Automated static, unit,
integration-fixture, local browser, pagination-stress, dan rendered-PDF tooling
tersedia untuk Phase 0–7; real-source mutation tetap mengikuti gate release dan
tidak menjadi bagian test lokal.

## Test Principles

- Test tidak boleh menulis ke production Spreadsheet.
- Acceptance harus menunjuk AC ID dan fixture yang relevan.
- Bug fix harus memiliki regression test bila dapat diautomasi.
- Browser and PDF behavior tidak boleh dinyatakan lulus hanya dari source review.
- Test output aktual dicatat di `WORKLOG.md`; jangan mengarang pass count.
- Secrets, real answer keys, dan private source content tidak boleh masuk fixture.

## Legacy Markdown compatibility regression

The parser regression fixture uses plain SSOT text containing `#`/`##`/`###`
headings, `**bold**`, `*italic*`, `_italic_`, `__bold__`, and `***bold italic***`.
It verifies that delimiters disappear from the normalized model, style runs are
created, native RichTextValue styling remains intact, and fenced-code lines keep
their literal asterisks. The editor browser smoke additionally loads the same
shape and checks that heading blocks become semantic `H2`/`H3` nodes rather than
showing the Markdown prefix.

## Test Layers

| Layer | Purpose | Minimum evidence |
|---|---|---|
| Static | Syntax, lint, formatting, manifest, secret scan | command + exit result |
| Unit | Parser, normalization, auth expiry, revision, parity | deterministic test report |
| Integration | Sheet repository, batch I/O, lock/history/table/image boundaries | temporary fixture result |
| Browser/E2E | Login, editor, autosave, two-context lock, preview/print gate | browser assertions + console status |
| Pagination stress | split/filler/TOC/overflow with worst-case content | fixture summary + page diagnostics |
| Rendered PDF QA | physical A4, full content, fidelity, selectable text, leak scan | PDF metrics + visual contact sheet |

## V2 Production Version 12 Logo Evidence

> Historical release evidence; current Apps Script HEAD/production mapping was
> not reverified during the 8 Agustus 2026 local recovery/security correction.

- `npm run check` lulus 83/83 tests, static check 15 server/9 client files,
  manifest check, dan format check 39 files.
- `npm run qc:v2:browser` lulus pada desktop dan mobile dengan logo portrait
  `48 × 58 px`, `object-fit: contain`, fallback visible, zero horizontal
  overflow, dan zero console/page error.
- Apps Script current code dipush dan immutable version 12 menjadi production;
  version 11 dipertahankan sebagai rollback.
- Public production smoke mengembalikan HTTP 200, menemukan signature treatment
  logo baru, dan zero checked folder/answer identity leak.
- Actual Drive owner fixture belum dijalankan. Credential login wajib dirotasi
  sebelum mutation P4 dilanjutkan karena diagnostic screenshot incident yang
  dicatat secara tereduksi di `WORKLOG.md`.

## V2-P7 Route and Same-Tab Recovery Gate

`npm run qc:v2:recovery` memakai satu synthetic server dan real Chromium untuk
membuktikan AC-033A/AC-034–AC-036 serta V2-P7 tanpa Spreadsheet/Drive nyata.
Gate wajib mencakup:

- immediate refresh sebelum autosave lima detik dengan URL route, tab instance,
  edit-session ID, dan lease token yang sama;
- recovery draft sebagai pilihan eksplisit, bukan silent auto-apply;
- refresh saat save response in-flight dengan persisted request ID dan tepat
  satu history mutation;
- transient resume connection failure tanpa acquire baru atau CTA palsu;
- atomic same-token resume setelah record stale tetapi belum diambil editor lain;
- changed source revision dengan latest source terlihat dan draft lama tetap aman;
- browser Back melalui flush/release dan Forward yang membangun editor kembali;
- zero horizontal overflow, console error, dan page error.

`npm run qc:phase2:browser` tetap menjadi regression dua-context umum. Keduanya
wajib lulus; recovery gate baru tidak menggantikan same-session block,
different-session editing, history, table/layout, atau conflict fixtures lama.

## M8 Release Validation

M8 bukan fixture test dan tidak boleh dimasukkan ke `npm run check`. Evidence
release harus memisahkan:

- local source: fresh `npm run qc:m7:full`;
- Apps Script current code: authorized push diikuti fresh temporary pull dan
  full-source comparison;
- immutable production: version number, deployment mapping, access surface,
  authenticated serta unauthenticated smoke, dan known-good rollback target.

Authenticated `/dev` dan `/exec` smoke wajib dilakukan oleh deployment owner
tanpa menaruh passcode/token pada automation output. Smoke tetap read-only pada
production Spreadsheet kecuali owner menetapkan fixture row khusus dan memberi
otorisasi smoke-write terpisah. Redirect ke Google Sign-In pada unauthenticated
probe bukan bukti login shell `Anyone`; access configuration harus diperbaiki
atau diverifikasi sebelum production acceptance.

Evidence production version 18 pada 8 Agustus 2026:

- fresh `npm run qc:m7:full` lulus 12/12 commands dalam 133,85 detik, termasuk
  85/85 tests, recovery P7, two-context collaboration, pagination stress, dan
  tiga actual PDF masing-masing 34 A4 pages;
- 25 runtime files dipush ke Apps Script HEAD dan fresh temporary pull memiliki
  zero differences terhadap local `src/`;
- immutable version 18 dibuat dan existing production deployment diperbarui;
  immutable version 17 tetap tersedia sebagai rollback target;
- read-only production `/exec` browser smoke lulus HTTP 200 dengan konfigurasi
  siap, login shell terlihat, workspace tersembunyi, identity required, tombol
  login awal disabled, recovery signature baru, zero console/page error, dan
  zero checked answer/Drive/Spreadsheet identity leak;
- authenticated application login dengan passcode, rotated P4 owner fixture,
  dan content mutation tidak dijalankan. Gate tersebut tetap pending dan tidak
  diklaim lulus.

Evidence release terbaru 6 Agustus 2026:

- `npm run qc:m7:full` lulus 11/11 commands dalam 80,76 detik, termasuk 69/69
  tests, delayed-font repagination, two-context collaboration, 56-page
  pagination stress, tiga actual PDF masing-masing 34 A4 pages, dan 66-page
  high-image-count PDF dengan 101/101 gambar;
- Apps Script HEAD di-push sebanyak 22 runtime files dan fresh-pull comparison
  terhadap local `src/` menghasilkan zero differences;
- immutable version 4 dibuat dan existing production deployment diperbarui ke
  version tersebut; immutable version 3 tetap tersedia sebagai rollback;
- public production `/exec` merespons HTTP 200, menampilkan login shell dengan
  configuration ready dan login button aktif, menjaga workspace tersembunyi,
  memuat signature font-ready/default-69%/content-left terbaru, tidak
  membocorkan identity sensitif, dan memiliki zero console/page error;
- authenticated owner smoke dan configuration/ownership confirmation tetap
  pending dan tidak diklaim lulus.

Evidence koreksi yang dibuat setelah version 3 dan kemudian dirilis dalam
version 4 pada 6 Agustus 2026:

- `npm run check` lulus 68/68 tests; static check 12 server/9 client files dan
  format check 36 files;
- `npm run qc:phase3:browser` pada live preview zoom 43% menghasilkan tiga
  halaman dengan zero `PAGE_OVERFLOW`, zero structured oversize, zero
  content-bounds overflow, dan zero console/page error;
- `npm run qc:phase6:pdf` membuktikan 101 gambar diproses melalui enam RPC dengan
  maksimal 20 URL per request, 101/101 berhasil decode, print button aktif, dan
  broken-image fixture tetap blocking;
- actual batched-image PDF berisi 66 halaman A4 dengan selectable text; seluruh
  66 halaman diraster ke contact sheet dan diperiksa tanpa gambar hilang atau
  content/footer clipping.

Evidence template/image-default terbaru pada 6 Agustus 2026:

- `npm run check` lulus 69/69 tests; static check 12 server/9 client files dan
  format check 36 files;
- generated `scl-page-asset-contentLeft` di `src/PageAssets.html` identik dengan
  canonical `back-module/plain-kiri-scl.svg` terbaru;
- `npm run qc:m1:image-reflow` membuktikan pasted image mulai pada 69%, editor
  center delta 0,01 px, nested live-preview center delta 0 px, reflow 107,8 ms,
  dan zero console/page error;
- `npm run qc:phase5:browser` tetap stabil pada 56 pages, dua iterasi, zero
  hidden overflow, dan content-left screenshot memakai template terbaru;
- `npm run qc:phase6:pdf` membuktikan default image 69% dan center alignment,
  tiga golden PDF masing-masing 34 A4 pages, 101/101 high-count image readiness,
  serta zero content-bounds/console/page error;
- focused actual PDF berisi 11 pages; seluruh halaman diraster dan diperiksa,
  termasuk template content-left terbaru dan image 69% centered tanpa clipping.

Evidence font-ready live-preview correction terbaru pada 6 Agustus 2026:

- `npm run check` lulus 69/69 tests; static check 12 server/9 client files dan
  format check 36 files;
- delayed-font scenario `npm run qc:phase3:browser` mula-mula memaginasi 18
  paragraf menjadi dua halaman, lalu menjadi tujuh setelah font settle; seluruh
  18 paragraf tetap ada, scroll delta 0, dan page/bounds overflow kosong;
- `npm run qc:phase5:browser` tetap stabil pada 56 pages dengan seluruh 12
  opener berada di kiri dan zero hidden overflow;
- `npm run qc:phase6:pdf` tetap lulus untuk tiga golden PDF 34 halaman serta
  high-image-count PDF 66 halaman/101 gambar; print button aktif dan seluruh
  content-bounds/overflow/console/page-error scan kosong.

Evidence correction massal `IMAGE_FETCH_FAILED` terbaru pada 6 Agustus 2026:

- production evidence dari user menunjukkan 0/147 gambar lolos server preflight
  dan seluruh result jatuh ke generic `IMAGE_FETCH_FAILED`;
- source inspection membuktikan backend memanggil `UrlFetchApp.fetch` sementara
  manifest belum meminta scope `script.external_request`;
- `npm run check` lulus 70/70 tests dan sekarang memblokir manifest yang tidak
  memiliki scope tersebut serta menguji klasifikasi permission/quota;
- `npm run qc:phase6:pdf` lulus untuk tiga golden PDF masing-masing 34 halaman
  dan high-image-count PDF 66 halaman/101 gambar; clean print button aktif,
  permission blocker diringkas menjadi satu diagnostic actionable, dan zero
  unexpected console/page error.
- `npm run qc:m7:full` kemudian lulus 11/11 commands dalam 84,66 detik pada
  source release yang sama;
- Apps Script HEAD dipush dan fresh-pull 22 files menghasilkan zero differences;
  immutable version 5 kemudian dibuat dan production deployment diperbarui;
- public production version 5 merespons HTTP 200, login/configuration ready,
  memuat runtime signature permission/quota correction, tidak membocorkan
  identity sensitif, dan memiliki zero console/page error;
- authenticated real-image preflight tetap memerlukan acceptance oleh owner/user
  yang memiliki app session; credential tidak digunakan dalam automation.

Evidence one-minute stale-lock requirement terbaru pada 6 Agustus 2026:

- `npm run check` lulus 70/70 tests; unit concurrency membuktikan heartbeat pada
  detik ke-30 memperpanjang lease sampai detik ke-90, acquire kedua masih
  ditolak tepat sebelum expiry, dan stale takeover lulus setelah expiry;
- `npm run qc:phase2:browser` lulus pada dua isolated browser contexts dengan
  same-session block, different-session editing, recovery setelah simulated
  crash + 61 detik tanpa heartbeat, autosave, history, revision conflict, dan
  draft preservation; zero horizontal/console/page error;
- Evidence ini lokal; Apps Script HEAD dan production version 5 masih memakai
  stale expiry tiga menit sampai push/deploy diotorisasi.

Evidence copyright-page print correction terbaru pada 6 Agustus 2026:

- diagnosis actual PDF mereproduksi `.a4-legal-close` pada y `15`–`36`, keluar
  dari legal card dan menabrak footer walaupun screen preview terlihat utuh;
- `npm run check` setelah correction lulus 71/71 tests, static check 12
  server/9 client files, dan format check 36 files;
- `npm run qc:phase5:browser` menghasilkan 56 halaman stabil dalam dua iterasi,
  `legalCloseInsideCard=true`, serta zero hidden overflow;
- `npm run qc:phase6:pdf` menghasilkan tiga golden PDF masing-masing 34 A4
  pages, focused actual PDF 11 halaman, dan 66-page/101-image PDF; legal close
  tetap berada di physical page 3, tidak muncul di page 4, dan seluruh clean
  path memiliki zero unexpected console/page error;
- actual focused PDF diraster ulang ke `reported-pdf-contact-sheet.png`; seluruh
  11 halaman diperiksa dan halaman Hak Cipta memperlihatkan paragraf penutup
  utuh di dalam card, jauh dari footer;
- attempt `npm run qc:m7:full` dan Apps Script push belum dieksekusi karena
  external-mutation approval reviewer mengembalikan HTTP 403 sebelum process
  dibuat. Evidence ini masih lokal dan tidak diklaim sebagai HEAD/production.

Evidence koreksi login identity terbaru pada 7 Agustus 2026:

- `npm run check` lulus 72/72 tests; static check 12 server/9 client files dan
  format check 36 files;
- `npm run qc:phase1:browser` lulus pada viewport desktop dan mobile: field nama
  atau email kerja terlihat dan required sejak login shell pertama, tombol
  tetap disabled pada opacity `0.5` tanpa identity, lalu enabled setelah kedua
  input lengkap;
- kedua viewport menyelesaikan login dan navigasi fixture sampai project 12
  session, dengan zero horizontal overflow pada workspace serta zero
  console/page error;
- screenshot login awal dan workspace tersimpan di
  `/private/tmp/kalananti-scl-phase1-qc`; evidence bersifat local fixture dan
  tidak membuktikan production deployment;
- `npm run qc:m7:full` lulus 11/11 commands dalam 121,6 detik, termasuk 72/72
  tests, two-context collaboration, 56-page pagination stress, tiga actual PDF
  masing-masing 34 halaman A4, selectable text, dan zero unexpected
  console/page error;
- `npx clasp push -f` berhasil mengirim 22 runtime files ke current code/HEAD;
  fresh temporary pull juga menghasilkan 22 files dan `diff -qr` terhadap
  local `src/` selesai dengan zero differences;
- immutable production tetap version 6. Version baru dan `/exec` update belum
  dilakukan karena credential yang terlihat pada evidence user wajib dirotasi
  lebih dahulu tanpa mencatat nilainya;
- user kemudian secara eksplisit mengarahkan release tanpa rotasi. Existing
  production deployment diperbarui ke immutable version 7 dan version 6 tetap
  tersedia sebagai rollback;
- public read-only `/exec` browser smoke version 7 lulus: HTTP 200,
  configuration ready, login shell terlihat, workspace tersembunyi, passcode
  dan identity field terlihat, identity required, tombol awal disabled pada
  opacity `0.5`, serta zero console/page error;
- authenticated smoke tidak diautomasi agar passcode tidak masuk script,
  command, output, atau artifact; owner validation tetap pending.

Evidence backend activity feedback terbaru pada 7 Agustus 2026:

- `npm run check` lulus 73/73 tests; static check 12 server/9 client files dan
  format check 36 files;
- `npm run qc:phase2:browser` lulus pada dua browser contexts dengan synthetic
  delayed backend: autosave loading/success notice terlihat dan closable,
  tombol close menampilkan `Menutup…`, close success terlihat, serta recovery
  draft tersimpan otomatis setelah lima detik;
- direct source conflict tetap memblokir last-write-wins, mempertahankan local
  draft, dan menampilkan soft error closable; zero horizontal overflow serta
  zero console/page error;
- `npm run qc:phase1:browser` lulus pada desktop/mobile dengan 3 course, 12
  session, zero horizontal overflow, dan zero console/page error;
- screenshot loading dan conflict berada di
  `/private/tmp/kalananti-scl-phase2-qc`; seluruh evidence memakai fixture
  local/synthetic tanpa Spreadsheet production mutation;
- correction masih local-only dan belum dipush ke Apps Script HEAD atau
  production version 7.

Evidence actionable edit-access recovery terbaru pada 7 Agustus 2026:

- `npm run check` lulus 74/74 tests; static check 12 server/9 client files dan
  format check 36 files. Static regression menolak copy user-facing `Lease
  aktif`, `Lease hilang`, `Heartbeat aktif`, `Dikunci editor lain`, dan
  `Read-only` serta memastikan CTA dan revision-check recovery tersedia;
- `npm run qc:phase2:browser` lulus pada dua browser contexts. Akses kedaluwarsa
  membuat editor hanya baca, mempertahankan draft, menampilkan CTA `Aktifkan edit
  lagi` dan busy state `Mengaktifkan…`, lalu mengaktifkan serta meng-autosave
  kembali ketika revision sama;
- fixture revision-berubah membuktikan source terbaru dimuat, recovery banner
  tetap terlihat, dan draft lama tidak diterapkan otomatis. Retry ketika session
  masih dipakai editor lain tetap hanya baca dan memberi instruksi coba lagi;
- seluruh copy editor yang terlihat bebas istilah `lease`/`heartbeat`, dengan
  zero horizontal overflow serta zero console/page error;
- `npm run qc:phase1:browser` lulus pada desktop/mobile dan full
  `npm run qc:m7:full` lulus 11/11 commands dalam 131,53 detik, termasuk tiga
  actual PDF masing-masing 34 halaman A4 dengan selectable text. Seluruh fixture
  local/synthetic dan tidak menyentuh Spreadsheet production;
- Apps Script HEAD dipush sebanyak 22 runtime files; fresh HEAD pull dan fresh
  immutable version 8 pull masing-masing berisi 22 files dan menghasilkan zero
  difference terhadap local `src/`;
- existing production deployment diperbarui ke immutable version 8 dengan
  version 7 tetap tersedia sebagai rollback. Public read-only `/exec` smoke
  merespons HTTP 200, menampilkan configuration ready/login shell serta
  signature CTA `Aktifkan edit lagi`, tidak menampilkan copy teknis lama, dan
  memiliki zero console/page error. Authenticated owner smoke tetap pending dan
  tidak diautomasi tanpa credential;
- pada user-requested redeploy berikutnya, `npm run check` tetap lulus 74/74,
  `clasp push` mengonfirmasi HEAD already up to date, immutable version 9 dibuat,
  dan production dipetakan ulang dengan version 8 sebagai rollback. Fresh pull
  version 9 berisi 22 files dengan zero difference; public HTTP/browser smoke
  kembali lulus dengan HTTP 200, CTA recovery tersedia, copy teknis lama tidak
  terlihat, serta zero console/page error.

Regression continuous-editor wajib membuktikan satu `contenteditable` root,
Enter membuat paragraf baru tanpa menduplikasi stable block ID, paragraph chrome
tidak muncul, raw standalone HTTPS image URL berubah menjadi image atom, dan
autosave/preview tetap berjalan. Evidence lokal terbaru 4 Agustus 2026:

- `npm run qc:m1:direct-edit`: single root, Enter, caret offset, undo/redo,
  preview, dan zero console/page errors lulus;
- `npm run qc:m1:image-reflow`: paste/resize/replace/delete lulus dengan reflow
  109.1 ms dan zero console/page errors;
- `npm run qc:phase2:browser`: lease dua context, reorder, reload, autosave,
  recovery, dan conflict preservation lulus;
- `npm run qc:phase3:browser`: continuous surface, rich text, image/page break,
  serta live A4 reflow lulus;
- `npm run qc:m7:full`: 11/11 command lulus, termasuk 61/61 tests dan tiga PDF
  aktual masing-masing 55 halaman.

## Fixture Policy

Create synthetic/non-sensitive fixtures covering:

- Roblox, Scratch, and Python headers/content shapes;
- header row not fixed at row 1;
- Level/Session variants and duplicate identity;
- correct and mismatched `kcN*`/`kcN:` and `fykN*`/`fykN:`;
- rich text runs, URLs, long material, and manual separator;
- 12, fewer than 12, and missing session rows;
- long topic over 80 characters;
- image success, wrong MIME, redirect, timeout, private IP, low DPI, and client
  decode failure;
- tables with repeated header, oversized row, stale anchor, and multi-page split;
- TOC non-convergence and multiple filler parity cases;
- quiz fixture with synthetic answer sentinel for leak detection;
- hidden tabs missing column, unknown column, duplicate header, and corrupt data.

## Mandatory Target Checks by Migration

Phase 0–6 checks di bawah tetap menjadi regression contract backend v1. PRD v2
menambahkan migration checks berikut dan tidak menghapus regression lama.

### M0–M3 visual parity

- Golden manifest menunjuk sanitized legacy fixture dan authoritative render.
- Adapter output mempertahankan component order/family dan tidak memuat answer.
- Legacy versus Apps Script render dibandingkan pada canonical scale.
- Content viewport dan dynamic text geometry berada dalam tolerance
  `VISUAL_PARITY_SPEC.md`.
- Empat non-cover template memakai viewport `1.38 / 3.22 / 18.38 / 23.86 cm`,
  padding `0.25 cm`, dan Poppins 14 pt default; cover tidak mewarisi viewport.
- Guide menjelaskan treatment bagian buku dan Guide/TOC memakai beginning asset
  yang sesuai physical left/right parity.
- Front matter sequence memuat cover → blank verso → Hak Cipta → Peringatan →
  Guide lengkap → TOC; blank page tidak memiliki hidden text/TOC entry.
- Hak Cipta/Peringatan memakai beginning-right/left SVG, centered legal card,
  dan roman footer number tanpa dekorasi tambahan; setiap Guide item memiliki
  visual miniature dan label yang match shared component treatment.
- CTA INS memakai exact HTTPS URL, clickable dengan rel aman pada HTML, terbaca
  pada PDF, dan tidak memanggil QR/redirect service pihak ketiga saat runtime.
- Editing, resize, repagination, undo/redo, dan scroll anchor diuji pada browser
  runtime nyata.
- Paste standalone HTTPS image URL harus berubah menjadi in-flow image block;
  handle/percentage resize harus mendorong content/page berikutnya tanpa overlap.
- Typing/reflow latency harus berada dalam 300 ms fixture budget dan caret,
  selection, serta viewport anchor tetap stabil setelah repagination.

### M4 collaborative persistence

- Dua browser context mengedit session berbeda dan melihat shared save setelah
  reload.
- Same-session lease tetap eksklusif.
- Content + structured layout memakai combined revision/history.
- Raw HTML/unknown layout key/corrupt schema memblokir mutation.
- Direct Sheet conflict tidak menimpa perubahan layout atau content.

### M5–M7 composition and PDF

- Title/subtitle/header/topic/page-number short/long fixtures tidak mengubah slot
  geometry.
- Satu course + level menghasilkan satu full-level print DOM/PDF.
- Tidak ada full-page raster image atau Slides API call pada output path.
- Actual PDF checks mencakup A4 media box, selectable text, all-page visual
  inspection, answer-leak scan, TOC, parity, overflow, Session 12, dan back cover.

## Legacy Phase Regression Checks

### Phase 0

- Auth shell does not embed source content or secrets.
- Invalid/expired token and arbitrary course/tab input are rejected.
- Hidden setup is idempotent and corrupt schema enters safe mode.
- `_Generator_Layouts` rejects raw HTML, executable/unknown attributes, answer
  fields, invalid identity/order, and image widths outside 25–100 percent.

### Phase 1

- One level load uses one browser RPC.
- Spreadsheet service call instrumentation proves no per-cell/per-row loop.
- Rich text and grammar round-trip are deterministic.
- Answer sentinel is absent from client response.

### Phase 2

- Two contexts cannot acquire the same session simultaneously.
- Stale lease expires; heartbeat preserves valid lease.
- Duplicate save request does not duplicate write/history.
- Direct Sheet revision conflict is rejected without data loss.

### Phase 3–4

- Rich text, reorder, undo/redo, image sizing, and task visuals persist.
- Semantic table reloads and paginates without becoming paragraph text.
- Stale anchor blocks save/print until resolved.

### Phase 5–6

- Every session opener is on left page side.
- TOC points to actual opener after filler insertion.
- Iteration cap produces deterministic blocking diagnostic.
- Expected image count equals rendered-success count before print.
- Zero hidden overflow at canonical 100% scale.
- PDF includes complete late Session 12 and back cover.
- Text remains selectable and synthetic answer sentinel is absent.

## Rendered PDF Review

For each golden PDF:

1. verify A4 media box and page count;
2. extract text and inspect ordering/answer leak;
3. generate page thumbnails/contact sheet;
4. inspect all pages, not only the first few;
5. inspect cover, guide, TOC, all opener parity, continuation labels, tables,
   images, Session 12, page numbering, filler, and back cover;
6. compare preview versus PDF at representative early/middle/late pages;
7. record browser/version and any manual print settings.
8. compare representative pages against the legacy golden render and record
   accepted anti-aliasing-only differences;
9. verify dynamic template text boxes against the coordinate registry;
10. verify the PDF contains no full-page screenshot replacing native body text.

## Local Tooling Contract

Phase 0 menyediakan reproducible non-interactive commands:

```sh
npm run lint
npm test
npm run format:check
npm run check
npm run qc:phase1:browser
npm run qc:phase2:browser
npm run qc:phase3:browser
npm run qc:phase4:browser
npm run qc:front-matter:review
npm run qc:m1:shell
npm run qc:m1:direct-edit
npm run qc:m1:image-reflow
npm run qc:m2:adapter
npm run qc:m3:compare
npm run qc:phase5:browser
npm run qc:phase6:pdf
npm run qc:m7:full
```

`npm run check` saat ini menjalankan Apps Script syntax/manifest/client-boundary
scan, 58 Node unit/integration-fixture tests, dan whitespace/final-newline check.
`npm run qc:phase1:browser` membangun preview sintetis tanpa server mutation,
menjalankan course → level → 12-session flow pada desktop/mobile, memeriksa satu
`loadLevelProject` RPC per selection, console/page errors, dan horizontal
overflow, lalu menulis screenshot sementara ke
`/private/tmp/kalananti-scl-phase1-qc`. Later phases harus menambah explicit PDF
QC commands. Jangan menambahkan network/deployment mutation ke `npm run check`.

`npm run qc:front-matter:review` merender prototype lokal blank verso, Hak
Cipta, Peringatan Penggunaan, dua Guide pages, Daftar Isi, dan Session Opener
dengan viewport approved dan Poppins 14 pt. Command memeriksa font/image
readiness serta zero overflow, lalu menulis tujuh screenshot dan satu full strip ke
`/private/tmp/kalananti-scl-front-matter-review`. Prototype ini bukan runtime
publisher dan memerlukan user visual approval sebelum dipromosikan menjadi
requirement implementation.

`npm run qc:m1:shell` membangun standalone local review HTML, login dengan
fixture sintetis, memilih Roblox Level 1, membuka Session 1 dengan lease aktif,
dan memeriksa isolated legacy-editor shell, paged A4 canvas, revision history,
unresolved include, overflow, console error, serta page error. Artifact review
ditulis ke `/private/tmp/kalananti-scl-m1-shell`; command tidak menyentuh
Spreadsheet atau deployment.

`npm run qc:m1:direct-edit` membuka fixture shell yang sama lalu mengetik pada
paged document, memformat selection menjadi bold, menjalankan undo/redo,
memeriksa caret/focus, scroll anchor, propagasi ke live A4 preview, horizontal
overflow, console error, dan page error. Artifact ditulis ke
`/private/tmp/kalananti-scl-m1-direct-edit` tanpa Spreadsheet mutation.
Checkpoint M3 memperketat assertion tersebut: caret ditempatkan pada offset
karakter 4, editor membangun ulang DOM, lalu focus/collapsed selection harus
kembali pada offset 4 dan window scroll delta tetap nol.

`npm run qc:m1:image-reflow` mem-paste standalone HTTPS image URL ke empty text
block, memeriksa selected controls, proportional percentage resize,
replace/delete, live A4 mutation latency maksimal 300 ms, caret retention,
scroll anchor, overflow, console error, dan page error. Image request dipenuhi
oleh route fixture in-memory; artifact ditulis ke
`/private/tmp/kalananti-scl-m1-image-reflow` tanpa network/Spreadsheet mutation.

M1.4 memakai `npm run qc:phase2:browser` pada current `legacy-paged-v1` shell.
Final run memakai dua isolated browser contexts dan membuktikan same-session
read-only lock, different-session parallel editing, autosave lima detik, local
draft sebelum save, crash recovery, direct-source revision conflict, preserved
draft, dan history tanpa horizontal/console/page error. Artifact shell berada di
`/private/tmp/kalananti-scl-phase2-qc`.

`npm run qc:m2:adapter` menjalankan fixture sanitized Roblox, Scratch, dan
Python melalui `scl-legacy-component/v1`, lalu merender hasilnya memakai shared
Publisher pada browser nyata. Final run membuktikan source key dan component
family stabil, pagination 3/3/4 halaman, zero quiz-answer sentinel di DOM, serta
zero console/page error. Artifact review berada di
`/private/tmp/kalananti-scl-m2-adapter/m2-three-course-render.png`; command tidak
menyentuh Spreadsheet, Apps Script HEAD, atau production. Font dan image URL
eksternal dipenuhi route fixture in-memory agar hasil QC tidak bergantung pada
network atau cache browser. Setelah checkpoint geometry M3, pagination aktual
menjadi 4/3/4 halaman dan tetap tanpa console/page error. Stress extension M3
merender 42 unit MUST DO: 8 halaman terbentuk, tiga continuation chunk, setiap
unit muncul tepat sekali, tanpa overflow atau blocking diagnostic. Python IDE
extension membuktikan multiline dan one-line fence menjadi dua `.code-ide`,
delimiter tidak terlihat, HTML-like payload tetap text-only, serta zero overflow,
console error, dan page error. Artifact-nya berada di
`/private/tmp/kalananti-scl-m2-adapter/python-ide.png`.
Focused layout correction juga memverifikasi lima objective seluruhnya berada di
opener dan tidak berulang di content, materials pertama langsung tampil, header
berisi `Session 5 · topic`, bullet memakai `✦`, numbered marker berbentuk badge,
serta zero overflow/blocking. Artifact berada di `objectives-opener.png` dan
`header-list-content.png` dalam folder artifact yang sama.
Opener-flow extension memakai 38 material lines: `Halo teman-teman!`, bullet,
numbered item, dan material awal berada di opener; continuation pages membawa
sisa unit tepat sekali. Header continuation memisahkan `Session 5` dominan dan
topic kecil, dengan full combined copy tersedia pada title attribute.
Phase 3 browser regression memeriksa live-preview height minimal 720 px, zoom
`43% → 51% → 43%`, realtime draft/image reflow, dan zero horizontal/console/page
error. Delayed-font fixture memastikan preview memaginasi ulang setelah
`document.fonts.ready` tanpa kehilangan unit atau scroll anchor. Static client
gate memastikan `SERVER_BUSY` tidak memanggil lease-loss
path dan autosave menjadwalkan retry sambil mempertahankan draft.
Setiap stress sentinel muncul tepat sekali, dengan zero hidden overflow dan zero
blocking diagnostic.
Font gate menunggu `document.fonts.ready`, memeriksa `14pt Poppins` loaded,
computed family `Poppins, sans-serif`, dan computed size `18.6667px`.

`npm run qc:phase2:browser` membangun preview sintetis dan memakai dua isolated
browser contexts terhadap satu shared in-memory server. Scenario mencakup same-
session lock rejection, different-session parallel edit, idle autosave lima
detik, crash/stale-lease recovery draft, direct-source revision conflict,
structured reorder, manual break, image width, reload layout lintas context,
console/page errors, dan horizontal overflow. Evidence M4 terakhir pada 4
Agustus 2026 lulus seluruh scenario dengan zero console/page error. Artifact sementara ditulis ke
`/private/tmp/kalananti-scl-phase2-qc`; command tidak membuka atau menulis
Spreadsheet nyata.

`npm run qc:phase3:browser` memakai fixture server in-memory non-production dan
editor browser nyata. Scenario mencakup continuous document surface, draft
reflow ke canonical live A4 session preview, native rich-text formatting, reorder
yang mempertahankan identity marker `kc`/`fyk`, undo/redo normalized model,
penolakan image URL non-HTTPS/non-image, proportional image sizing metadata,
manual page break, static task/self-check icons, autosave, serta close/reopen
round-trip. Command memeriksa horizontal overflow, console/page errors, dan
menulis screenshot ke `/private/tmp/kalananti-scl-phase3-qc`.

`npm run qc:phase4:browser` memakai fixture server in-memory non-production.
Scenario mencakup semantic table edit, autosave/reload tanpa raw table pada
`materials`, repeated `<thead>` pada continuation, whole-row split dan
oversized-row diagnostic, direct-edit stale anchor, re-anchor, console/page
error, serta horizontal overflow. Artifact sementara ditulis ke
`/private/tmp/kalananti-scl-phase4-qc`.

`npm run qc:phase5:browser` membangun full-level synthetic fixture 12 session
dan merender DOM A4 nyata dengan tujuh page-role templates dari enam aset SVG
kanonis. Scenario mencakup front matter lengkap, side-aware Guide/TOC, 12 visual
miniature Guide, CTA INS, Poppins lokal, native coordinate slots, 12 opener,
content/filler parity, long Session 12, table continuation/repeated header,
visible TOC numbering, forced five-iteration failure, back cover, dan overflow
scan. Artifact representative serta tiled all-page contact sheet ditulis ke
`/private/tmp/kalananti-scl-phase5-qc`; tidak ada Spreadsheet atau network
mutation.

Evidence Migration M5 terakhir pada 4 Agustus 2026: `npm run check` lulus
58/58 tests, static check 12 server/9 client files, dan 36 files format check.
Browser QC menghasilkan 79 halaman dan lulus dengan stabilization dua iterasi,
front matter/physical parity benar, 12 opener kiri, filler kanan, TOC matching,
copy legal statis, CTA INS aman, Poppins loaded, long-text stepping, repeated
table headers/eight rows preserved, zero hidden overflow, zero console error,
dan zero page error. Seluruh 79 halaman diperiksa melalui tiled contact sheet;
front matter, content kiri/kanan, Session 12, dan back cover juga diperiksa pada
render ukuran penuh.

`npm run qc:phase6:pdf` merender tiga fixture course melalui Chromium print A4,
menulis PDF Roblox/Scratch/Python, mengekstrak text dengan `pypdf`, memverifikasi
media box/page count/Session 12/answer sentinel, dan menghasilkan contact sheet
seluruh halaman serta representative screenshots. Scenario tambahan membuktikan
broken image menghasilkan placeholder + blocking gate dan very-low DPI meminta
acknowledgement. Artifact sementara berada di
`/private/tmp/kalananti-scl-phase6-qc`; tidak ada Spreadsheet/network production
mutation.

Evidence Migration M6 terakhir pada 4 Agustus 2026: `npm run check` lulus
60/60 tests, static check 12 server/9 client files, dan 36 files format check.
Browser/PDF QC menghasilkan Roblox, Scratch, dan Python masing-masing 55 halaman
A4 (`594.96 × 841.92 pt`) dengan selectable extracted text, expected/rendered
image 1/1, Session 12 dan back cover lengkap, zero answer sentinel, zero
overflow, serta zero clean-path console/page error. Browser app fixture
membuktikan urutan save lalu fresh level reload sebelum full-level composition,
draft tersimpan muncul di publisher, print chrome tersembunyi, dan filename serta
setting browser ditampilkan. Broken image memblokir; very-low DPI memerlukan
acknowledgement. Seluruh halaman diperiksa melalui tiga contact sheet dan
representative cover/Session 12/back-cover render ukuran penuh.

Regression layout PDF pada 6 Agustus 2026: `npm run check` lulus 65/65 tests,
static check 12 server/9 client files, dan 36 files format check.
`npm run qc:phase3:browser` mempertahankan resize manual 25%/55% dan scroll
anchor `189 -> 189`, dengan zero overflow, console error, atau page error.
`npm run qc:phase5:browser` menghasilkan 56 halaman; focused opener
`Intro & Instance.new` berubah dari `clientHeight 115 < scrollHeight 124`
menjadi `clientHeight 125 = scrollHeight 125`, header turun dari sekitar
`43.09 px` ke `48.38 px` dan tetap centered, serta zero hidden overflow.
`npm run qc:phase6:pdf` menghasilkan Roblox/Scratch/Python masing-masing 34 A4
pages dan focused 10-page actual PDF. Assertion `titleUnclipped`,
`headerCentered`, `imageAutoFitted`, dan `imageUncropped` seluruhnya true,
dengan zero overflow/console/page error. Actual-PDF evidence berada di
`/private/tmp/kalananti-scl-phase6-qc/reported-layout-regression.pdf` dan
`/private/tmp/kalananti-scl-phase6-qc/reported-pdf-contact-sheet.png`.
Seluruh pemeriksaan memakai fixture lokal/non-production; source hasil koreksi
sudah push/pull-verified ke Apps Script HEAD dan dirilis sebagai immutable
production version 2 pada 6 Agustus 2026.

Pre-release `npm run qc:m7:full` pada 6 Agustus 2026 meluluskan seluruh 11/11
command dalam 189,15 detik: 65/65 tests, browser Phase 1–4, two-context
collaboration, direct editing/image reflow, three-course adapter, legacy
comparison, 56-page pagination stress, dan Roblox/Scratch/Python actual PDF
masing-masing 34 A4 pages. Ketiga PDF memiliki selectable text, opener-left,
complete back cover, zero overflow, serta zero clean-path console/page error.
Production version 2 kemudian dipull sebanyak 22 files dan `diff -rq` terhadap
local `src/` menghasilkan zero difference. Public `/exec` smoke menghasilkan
HTTP 200 HTML, latest PDF-layout signatures, zero unauthenticated sensitive
identity leak, visible login shell di Apps Script iframe, serta zero
console/page error. Authenticated owner smoke tetap gate terpisah dan tidak
dijalankan tanpa credential owner.

Follow-up clipping/default-image regression pada 6 Agustus 2026: `npm run check`
lulus 67/67 tests, static check 12 server/9 client files, dan 36 files format
check. `npm run qc:m1:image-reflow` membuktikan pasted image mulai pada 50%,
resize/reflow selesai 110,6 ms, scroll delta 0, dan zero console/page error.
`npm run qc:phase3:browser` mempertahankan image resize serta preview scroll
`300 -> 300`; `npm run qc:phase5:browser` menghasilkan 56 pages stabil dengan
zero hidden overflow. `npm run qc:phase6:pdf` menghasilkan tiga course
masing-masing 34 A4 pages; seluruh default image memakai 50%, content-bounds dan
overflow scan kosong, serta clean app path menampilkan tombol
`Print / Save as PDF` dengan `disabled=false`. Focused 11-page actual PDF
mempertahankan gambar dan Tahap berikutnya dalam safe area. Broken-image path
tetap blocking dan menampilkan diagnostic actionable. Artifact berada di
`/private/tmp/kalananti-scl-phase6-qc/reported-layout-regression.pdf`,
`reported-default-50-image-page.png`, dan `reported-pdf-contact-sheet.png`.
Evidence ini lokal/non-production; Apps Script HEAD dan production version 2
belum memuat correction tersebut.

`npm run qc:m7:full` adalah gate lokal konsolidasi M7. Command menjalankan
`npm run check`, seluruh regression browser Phase 1–4, V2-P7 route/recovery,
direct edit dan image
reflow M1, adapter tiga course, comparison M3, stress pagination M5, serta tiga
golden PDF M6 secara berurutan. Setelah PDF dibuat, macOS PDFKit meraster setiap
halaman PDF aktual—bukan DOM pra-print—ke contact sheet per course dan menulis
summary terstruktur ke `/private/tmp/kalananti-scl-phase7-qc/summary.json`.
Command memakai fixture sintetis/in-memory dan tidak menyentuh Spreadsheet,
Apps Script HEAD, atau production. Product/Design acceptance tetap merupakan
review manusia terpisah setelah artifact diperiksa.

Evidence Phase 6 terakhir pada 3 Agustus 2026: `npm run check` lulus 31/31 test.
Tiga golden PDF masing-masing 51 A4 pages, expected/rendered image 1/1, opener
kiri, back cover, selectable extracted text, dan zero answer sentinel. Clean path
memiliki zero console/page error; full contact sheets dan representative
cover/Session 12/back cover diperiksa.

Full pre-release rerun pada 3 Agustus 2026 juga meluluskan browser QC Phase 1–4,
78-page pagination stress Phase 5, dan tiga rendered golden PDF Phase 6. Phase 1
desktop/mobile memakai tepat satu level-load RPC tanpa overflow/error; Phase 2
memakai dua browser contexts; Phase 3–4 mempertahankan editor visual dan semantic
table round-trip. Seluruh fixture synthetic/local dan tidak menyentuh Spreadsheet,
Apps Script HEAD, atau production.

Evidence Phase 5 terakhir pada 3 Agustus 2026: `npm run check` lulus dengan
28/28 tests dan 29 files lulus format check. `npm run qc:phase5:browser` lulus
dengan 78 pages, stabilization dua iterasi, 12 opener kiri, filler kanan, TOC
matching visible page number, repeated table headers/eight preserved rows,
complete Session 12/back cover, deterministic forced limit diagnostic, zero
hidden overflow, zero console error, dan zero page error.

Evidence Phase 3 visual-regression correction terakhir pada 3 Agustus 2026:
`npm run qc:phase3:browser` lulus termasuk approved component visual assertion,
static task icon, zero horizontal overflow, zero console error, dan zero page
error. Artifact berada di `/private/tmp/kalananti-scl-phase3-qc`.

Evidence Phase 4 terakhir pada 3 Agustus 2026: `npm run check` lulus dengan
23/23 tests. Browser QC lulus untuk seluruh assertion Phase 4 dengan zero
horizontal overflow, console error, dan page error. Final browser rerun setelah
server-only revision correction mengalami preview bootstrap timeout sebelum
login; correction tersebut diverifikasi unit dengan membandingkan project
revision dan lease revision.

Evidence Phase 3 terakhir pada 3 Agustus 2026: `npm run check` lulus dengan
21/21 tests; `npm run qc:phase3:browser` lulus dengan seluruh behavior boolean
bernilai `true`, zero horizontal overflow, zero console error, dan zero page
error. Visual owner acceptance diberikan pada 3 Agustus 2026 dan exit gate
Phase 3 telah ditutup.

Evidence Phase 2 terakhir pada 3 Agustus 2026: `npm run check` lulus dengan
20/20 tests, lalu `npm run qc:phase2:browser` lulus pada dua browser contexts
dengan seluruh scenario bernilai benar, satu history autosave, zero horizontal
overflow, zero console error, dan zero page error. Screenshot conflict/recovery
dan second context tersedia di artifact directory sementara di atas. Boundary
Apps Script/Spreadsheet write nyata belum diuji dan bukan bagian fixture lokal.

## Evidence Record

PRD v2 foundation rerun pada 3 Agustus 2026: `npm run check` lulus 42/42 test
dan 33 files lulus format check. `npm run qc:phase3:browser` meluluskan rich
text, marker identity, undo/redo, page break, persisted/realtime image width,
canonical live A4 preview, serta zero horizontal/console/page error.
`npm run qc:phase5:browser` menghasilkan 75 halaman stabil dalam dua iterasi,
12 opener kiri, filler kanan, TOC matching, repeated table header dengan delapan
row tetap utuh, canonical header/page-number slots, complete Session 12/back
cover, dan zero hidden overflow. `npm run qc:phase6:pdf` menghasilkan tiga PDF
fixture masing-masing 32 halaman dengan A4 media box `594.96 × 841.92 pt`,
selectable extracted text, zero overflow/answer sentinel/console/page error,
serta image failure dan low-DPI gates yang sesuai. Artifact berada di
`/private/tmp/kalananti-scl-phase3-qc`, `/private/tmp/kalananti-scl-phase5-qc`,
dan `/private/tmp/kalananti-scl-phase6-qc`. Evidence ini belum merupakan M0
legacy golden comparison atau Product/Design acceptance.

Reference-parity rerun pada 3 Agustus 2026: `npm run check` lulus 36/36 tests,
termasuk attached inline-image extraction dan literal task labels.
`npm run qc:phase3:browser` meluluskan editor/live-preview component visual,
round-trip, resize, zero overflow, dan zero console/page error.
`npm run qc:phase5:browser` menghasilkan 54 halaman stabil dalam dua iterasi,
floating task badges, correct TOC/parity/table/back cover, dan zero hidden
overflow. First browser render mendeteksi badge `-5px` sebagai overflow;
anchors digeser masuk 5px dan rerun lulus.

Visual regression rerun pada 3 Agustus 2026 setelah continuous print-flow dan
page-number centering correction: `npm run check` lulus 34/34 tests dan 31-file
format check. `npm run qc:phase5:browser` menghasilkan 54 halaman stabil dalam
dua iterasi; ordinary content memiliki zero card chrome, semantic components
tetap styled, badge kiri/kanan centered pada anchor footer, TOC/parity/table/back
cover lulus, dan zero hidden overflow.

Every completed task worklog entry should state:

- command or method used;
- environment/fixture;
- actual result and count;
- untested boundary;
- artifact path when screenshots/PDFs are generated;
- whether status is local, current code, or production.

## M0 Golden Baseline Command

`npm run qc:m0:golden` mengekstrak CSS langsung dari authority
`book-editor-rework/templates/modern.html`, memakai fixture sanitized
Roblox/Scratch pada `fixtures/m0/legacy-golden.json`, dan menghasilkan 10
screenshot, 18-selector computed-style report, page-role geometry, serta
SHA-256 manifest di `docs/golden/m0`. Command tidak membaca atau menulis
Spreadsheet. Product/Design optical review tetap manual gate sebelum M0
ditutup.

## V2 Drive Publishing Gates

> Status: P1–P4 local foundation and P7 route/recovery correction implemented.
> Actual rotated deployment-owner Drive fixture remains pending and must not be
> inferred from fake-Drive tests. P5–P6 direct Drive tests are deferred.

Current commands and evidence:

- `npm run check`: 85/85 static/unit/fixture integration tests passed on
  8 Agustus 2026, including safe activity aggregation, publish idempotency,
  latest pointer, corrupt schema, owner-only Drive, retry, quota, permission,
  oversize paths, minimum OAuth scope, safe Drive error logging, and the absence
  of a source-embedded Drive target.
- `npm run qc:v2:browser`: desktop/mobile navigation, unboxed portrait logo,
  fallback, dynamic identity, Activity, Published Modules, New Module/Logout,
  zero horizontal overflow, and zero console/page errors.
- `npm run qc:v2:recovery`: same-tab route/token resume, dirty and in-flight
  draft recovery, transient reconnect, stale renewal, changed revision, Back,
  dan Forward reconstruction pada real Chromium.
- `npm run qc:m7:full`: 12/12 regression commands passed in 153.79 seconds on
  8 Agustus 2026, including the dedicated V2-P7 recovery gate. The three actual
  fixture PDFs remain 34 A4 pages each with A4 media box
  `594.96 × 841.92 pt`, selectable text counts of 9,360/9,348/9,346 characters,
  zero content-bounds overflow, complete Session 12/back cover, and zero
  unexpected console/page error. Every actual PDF page was rasterized and its
  course contact sheet inspected. Summary and contact sheets are in
  `/private/tmp/kalananti-scl-phase7-qc`; the focused 11-page layout contact
  sheet is in `/private/tmp/kalananti-scl-phase6-qc`. This is a local
  browser-print baseline, not a Drive artifact claim.
- Sanitized baseline hashes and page counts are stored in
  `../fixtures/v2/drive-publishing-baseline.json`.

Testing V2 mengikuti phase pada `IMPLEMENTATION_PLAN_V2.md`:

1. UI fixture: logo fallback/crop, navigation/focus, dynamic identity,
   New Module/Logout, desktop/mobile overflow, dan zero console/page error.
2. Audit fixture: successful events, failed-login aggregate, auth/pagination,
   corrupt schema safe mode, serta secret/full-content/answer sentinel scan.
3. Publish registry fixture: additive repair, request idempotency, two-context
   same-level version reservation, latest pointer, failure, dan late retry.
4. Temporary Drive integration: synthetic PDF upload melalui deployment owner,
   Shared Drive capability, permission/quota/not-found/duplicate paths, dan
   verified no production mutation.
5. Renderer integration: signature/expiry/replay/timeout/size gates, pinned
   runtime, font/image readiness, response validation, and no retained payload.
6. Actual PDF parity: Roblox, Scratch, dan Python Drive artifact dibandingkan
   browser-print golden untuk media box, page count/order, TOC/parity, extracted
   selectable text, images/SVG, overflow, Session 12, back cover, dan answer
   sentinel.
7. End-to-end two-context publish: same/different level, client timeout with
   server success, upload-success/finalization-failure reconciliation, browser
   print fallback, and one-record/one-file invariant.
8. Release gate: local/HEAD/renderer/production revision separation, temporary
   rollback drill, public shell smoke, authenticated smoke, dan separately
   authorized production canary.

Drive integration tests hanya boleh menulis ke exact temporary/non-production
folder yang telah diverifikasi. Fixture file tidak dihapus otomatis sebagai
side effect test. Cleanup, jika diperlukan, menjadi operasi terpisah dengan
target file ID eksplisit dan otorisasi sesuai destructive-safety rules.

## Markdown heading/title visual regression

`npm run check` mencakup assertion source-level untuk `fitOpenerTitle_`,
non-clamped opener titles, dan hierarchy CSS H1/H2. Jalankan
`npm run preview:build` lalu `python3 scripts/qc_phase1_browser.py` untuk
smoke desktop/mobile; test ini memastikan preview tetap bebas horizontal
overflow dan tanpa console/page error. Visual review terakhir dilakukan pada
local preview build, bukan pada production deployment.
