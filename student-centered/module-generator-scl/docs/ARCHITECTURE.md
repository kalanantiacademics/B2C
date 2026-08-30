# Target Architecture — PRD v2 Migration

Dokumen ini merangkum boundary teknis target dari PRD Sections 5–18. Phase 0–6
telah diimplementasikan dan diverifikasi secara lokal; push current code dan
production release tetap boundary Phase 7.

## System Context

```text
Academic Editor / Reviewer
          |
          v
Apps Script Web App client
  legacy-parity editor + shared renderer + pagination + print
          |
          | authenticated google.script.run RPC
          v
Apps Script service layer
  auth + allowlist + parser + lock + revision + image preflight
          |
          v
Google Spreadsheet SSOT
  3 source _Modul tabs + app-managed hidden tabs
```

Browser memiliki ownership untuk interaction, DOM pagination, visual preview,
image render readiness, dan print CSS. Server memiliki ownership untuk auth,
configuration, source allowlist, data access, validation, lock, revision,
history, audit, dan SSRF-safe image preflight.

PRD v2 menambahkan compatibility boundary. Normalized Spreadsheet data tidak
langsung dirender oleh visual renderer v1. `LegacyAdapter` mengubah normalized
field/block/table/layout model menjadi component model yang mengikuti
`book-editor-rework/templates/modern.html`. `LegacyRenderer` kemudian menjadi
satu-satunya component renderer untuk session editing, full-level preview, dan
print.

Course context diteruskan dari Publisher ke adapter. Khusus `python`, adapter
menggabungkan pasangan triple-backtick atau fenced code satu baris menjadi
component `code` dengan source identity `materials:*`; renderer membuat chrome
IDE dan mengisi `<code>` melalui `textContent`. Scratch dan Roblox tetap melalui
alur paragraph normal sehingga grammar source tidak dinormalisasi lintas-course.

Publisher memindahkan presentation objective ke opener tanpa menghapus field
source dari adapter/serializer. Content pages dimulai dari materials, memakai
header `Session N · topic`, dan list style disimpan sebagai layout attribute lalu
dirender konsisten pada editor serta A4 output.

Opener memiliki bounded `.a4-opener-flow` sebagai pagination region pertama.
Publisher mengukur sisa tinggi setelah title/objective/chips, menempatkan material
yang muat di sana, lalu memakai content-page body biasa untuk continuation.

Preview zoom dimiliki client sebagai CSS screen state dan tidak masuk layout
payload/Spreadsheet. Heartbeat `SERVER_BUSY` mempertahankan lease client yang
ada; autosave mempertahankan request ID/draft lalu retry setelah backoff pendek.
`App.html` juga memiliki Notification Controller untuk memetakan operasi RPC ke
state loading/success/warning/error non-blocking. Setiap wait memiliki client
timeout bounded; timeout hanya mengakhiri wait UI, sedangkan idempotent request
ID dan local recovery draft tetap menjadi safety boundary bila server selesai
terlambat.

Istilah lease/heartbeat tetap internal pada Collaboration Service. Client
menyajikannya sebagai `akses edit`. Saat akses berakhir, Access Recovery
Controller membuat editor hanya baca, menyimpan draft lokal, dan menampilkan CTA
`Aktifkan edit lagi`. Acquire ulang membandingkan `sourceRevision` lama dan baru:
revision yang sama membuka editor serta menjadwalkan autosave kembali; revision
berbeda memuat source terbaru, mereset dirty request, dan mempertahankan draft
lama untuk pilihan eksplisit `Gunakan draft`. Reload source tidak pernah membuka
editor bila client belum memiliki akses edit aktif.

## Server Components

| Component | Responsibility |
|---|---|
| Bootstrap/Auth | Public shell, passcode validation, signed expiring session |
| Config | Script Properties, course-to-tab allowlist, safe defaults |
| Sheet Repository | Bounded bulk reads and patch-oriented writes |
| Normalizer/Parser | Native RichTextValue plus legacy Markdown (`#` headings, `**`/`*`/`_` emphasis), task, quiz, image, `kc`/`fyk` normalized model |
| Lock Service | Per-session lease, heartbeat, stale expiry |
| Revision Service | Hash, optimistic conflict check, idempotent request |
| History/Audit | Revision snapshots and bounded metadata |
| Table Store | Semantic table records and source anchor hashes |
| Image Preflight | HTTPS, SSRF, MIME, byte, dimension/DPI checks |
| Layout Store | Structured per-session layout metadata, revision/history integration |
| Storage Health | Hidden-tab verify, safe create/repair, corrupt safe mode |

## Client Components

| Component | Responsibility |
|---|---|
| Login/Landing | Authentication and course/level selection |
| Level Workspace | 12 session states, editor selection, diagnostics |
| Legacy Adapter | Normalized project → authoritative legacy component model |
| Paged Session Editor | Direct editing, formatting, image resize, undo/redo, DOM reflow for the leased session |
| Save Controller | Debounce, local draft, lease/revision-aware autosave |
| Notification Controller | Soft activity/result feedback, button busy state, bounded RPC timeout |
| Legacy Renderer | Shared authoritative DOM/CSS components for editor, publisher, and print |
| Template Composer | Canonical SVG background + deterministic native-HTML text slots + legacy content viewport |
| Pagination Engine | Physical DOM measurement, split, filler, TOC stabilization |
| Print Controller | Flush, image readiness, overflow scan, print gate |

## Storage Contract

Main academic content remains on:

- `B2C_RobloxStudio_Modul`;
- `B2C_Scratch_Modul`;
- `B2C_Python_Modul`.

App-managed state uses:

- `_Generator_Layouts` for allowlisted `scl-layout/v1` block order, image width,
  manual break, and `keepTogether` attributes;
- `_Generator_Tables`;
- `_Generator_Locks`;
- `_Generator_History`;
- `_Generator_Audit`.

Hidden tabs are part of the same Spreadsheet SSOT but are not an excuse to
rewrite source grammar. Layout records store only allowlisted structured state,
such as stable block identity, order, image display size, and manual page break;
they do not store executable/raw full-page HTML. Schema repair is additive and
non-destructive.
Schema version `scl-generator/v1` disimpan sebagai sheet-scoped developer
metadata sehingga row header tetap kanonis. Audit schema hanya menerima event
metadata bounded (`event_type`, request/status/error identity, safe course
identity, duration, editor label, timestamp, dan sanitized metadata JSON), bukan
full content atau credential.

## Load Path

1. Client calls `loadLevelProject` once.
2. Server validates session, course, and level.
3. Server discovers header and reads one bounded source rectangle through bulk
   values and rich-text operations.
4. Required hidden-tab ranges are read in bounded batches.
5. Data is normalized in memory into 12 session slots.
6. Legacy Markdown delimiters are converted into rich-text runs while native
   Sheets runs and fenced-code literals are preserved.
7. `quiz_answers` is removed before serialization.
8. Client receives one normalized response plus tables/layout records.
9. Legacy Adapter creates the legacy component model for the active leased
   session and progressively for full-level publishing.
10. Legacy Renderer can show the active editor before full-level pagination
   completes.

Per-cell/per-row Spreadsheet service calls in load loops are forbidden.

Implementasi Phase 1 berada di `DataStore.gs`, `RichText.gs`, dan `Parser.gs`.
Reader mengambil satu used-data rectangle per source tab dengan tepat satu
`getValues()` dan satu `getRichTextValues()` pada range yang sama. Header dipilih
dari sepuluh row awal bila memuat `Level`, `Session`, dan mayoritas ketat dari
13 header non-opsional. `Ready` memerlukan topic, objectives, dan materials;
row lain tetap dipetakan ke 12 slot tanpa membuat source row baru. Phase 2
menambahkan satu bounded read `_Generator_Locks` saat level dimuat agar active
lock tampil read-only dengan editor label dan last activity.

## Save Path

1. Editor acquires/maintains session lease.
2. Client keeps local recovery draft and sends changed fields after debounce.
3. Server validates token, lease owner, base revision, request ID, and patch.
4. Server rejects conflicts; it does not silently merge incompatible content.
5. Server snapshots history, applies bounded writes, creates audit metadata, and
   returns the new revision.
6. Client clears only the acknowledged local draft.

Implementasi lokal Phase 2 berada di `Collaboration.gs` dan Phase 2 save
controller pada `App.html`. Client hanya mengirim course key, normalized level,
session, lease token, request ID, base revision, dan changed fields. Row key dan
source tab tetap ditentukan server. Lease token mentah hanya berada di client;
hidden lock storage menyimpan hash. Successful request metadata pada audit
menjadi idempotency record, sementara history snapshot tidak pernah dikirim
kepada client.

Implementation lama `Editor.html` tetap menjadi reference untuk serializer dan
save boundary, tetapi surface visualnya superseded oleh Migration M1–M4.
Rich formatting tetap diserialisasi ke native rich-text runs. Reorder bekerja
pada stable block identity tanpa menulis ulang marker `kc`/`fyk`; manual page
break dan image size berpindah ke structured layout state setelah M4 migration.
M4 menyimpan source block dalam urutan kanonis dan memisahkan urutan visual pada
`_Generator_Layouts`, sehingga reorder tidak membalik lagi saat session dimuat
ulang. Combined revision dan history meliputi field, semantic table, dan layout;
restore mengembalikan ketiganya dalam lease boundary yang sama.
Phase 4 menambahkan `TableStore.gs`. Table payload tervalidasi disimpan sebagai
record semantic `scl-table/v1` di `_Generator_Tables`, bukan di source grammar.
Autosave dan history membawa snapshot fields + tables dalam satu lease/revision
boundary. Combined revision memperluas server-only source revision sehingga
answer isolation tetap terjaga. Anchor memakai hash FNV-1a deterministik dari
text block terdekat; direct Sheet edit yang menghilangkan anchor menghasilkan
`TABLE_ANCHOR_STALE` dan mutation/print tetap diblokir sampai re-anchor. Client
merender `<table><thead><tbody>`, membagi continuation berdasarkan row boundary,
dan mengulang header pada setiap continuation component. Full A4 measurement
dimiliki `Publisher.html` pada Phase 5. Canonical SVG dari `back-module/`
digenerate tanpa modifikasi menjadi tujuh role template pada `PageAssets.html`
(dua role memakai source beginning-left yang sama) agar
Apps Script HTML runtime dapat meng-clone SVG sebagai background tanpa URL
client atau rasterization baru. Publisher membangun satu full-level DOM,
mengukur A4 body nyata, membagi splittable paragraph/table rows, menyisipkan
filler dari global physical-side model, memberi visible page number, dan
menstabilkan TOC maksimal lima iterasi. Overflow dan oversized atomic block
menjadi blocking diagnostic; long topic mempertahankan source utuh dengan
two-line shrink/ellipsis visual.

Migration M5 menempatkan cover, blank verso, legal pages, dua Guide pages, TOC,
session opener/content/filler, dan back cover pada physical-side model yang sama.
Semua fixed copy memakai native HTML dan satu coordinate registry; Guide memakai
miniature dari class component renderer yang sama, sedangkan INS memakai URL
HTTPS publik tanpa runtime QR/redirect service. Full-level preview dan print
memakai DOM publisher yang sama; live editor memanggil jalur pagination dan
component builder Publisher yang sama untuk session aktif.

Phase 6 lama menambahkan authenticated server preflight untuk HTTPS host, redirect,
MIME PNG/JPEG/WebP, byte cap, dan dimensions. Browser mencocokkan expected image
dengan image yang berhasil `load` dan `decode`, menghitung effective DPI dari
ukuran natural/server dan ukuran cetak, lalu melakukan satu repagination setelah
image readiness. Broken/timeout/decode failure menampilkan placeholder dan
memblokir print. A4 print memakai DOM final yang sama; canonical SVG clone
mendapat instance-scoped IDs agar tidak menghasilkan duplicate DOM IDs.

## Pagination and Print Path

1. Flush the active session draft through revision-aware save and reject an
   unstable/failed flush.
2. Reload the complete selected course + level in one RPC so composition uses
   the latest saved session revisions, then build the normalized full-level model.
3. Adapt fields/tables/layout into legacy components.
4. Compose hardcover front matter: cover, blank verso, owner-approved static
   copyright/warning pages, complete Guide with public INS CTA, and TOC.
5. Compose canonical A4 backgrounds and deterministic native-HTML text slots.
6. Place content on the four non-cover templates at `1.38 cm, 3.22 cm` in an
   `18.38 cm × 23.86 cm` viewport with `0.25 cm` internal padding and Poppins
   14 pt default body copy. Guide and TOC select beginning-left/right assets
   from physical parity.
7. Wait for fonts and image success/error completion.
8. Paginate the same authoritative DOM used by the editor.
9. Insert filler so each session opener begins on the left page side.
10. Build TOC from actual anchors and stabilize at most five iterations by
   default.
11. Run geometry, overflow, image-readiness, and answer-leak preflight.
12. Print the full course + level DOM only if blocking diagnostics are zero.

There is no full-page screenshot, Google Slides mutation, or server-side
Chromium step in this path.

## Trust Boundaries

- Client input is untrusted even after login.
- Spreadsheet content is academic source, not trusted HTML.
- External image URLs are hostile network input.
- Hidden/protected tabs can still be manually damaged and must be verified.
- Browser preview success does not prove PDF success; rendered artifact QA is a
  separate boundary.

## Architecture Change Rule

Changes to ownership, storage, auth, source tabs, pagination, or deployment
boundary require PRD/decision updates before implementation. Generated page
HTML or exported PDF is an artifact, not the design source.

## V2 Drive Publishing Boundary

> Status: P1–P4 source foundation tersedia. Actual owner synthetic Drive
> fixture dan production revision belum diverifikasi pada closeout lokal
> 8 Agustus 2026. Controlled renderer dan end-to-end academic publish P5–P6
> deferred; browser print adalah output aktif.

```text
Authenticated Academic Editor
          |
          | compose + explicit publish request
          v
Apps Script Web App / Service Layer
  auth + saved-revision digest + preflight + publish reservation
          |                                  |
          | signed bounded render request    | app-managed metadata
          v                                  v
Controlled pinned-Chrome renderer      Google Spreadsheet SSOT
  authoritative DOM/CSS -> PDF          _Generator_Publishes + Audit
          |
          | bounded PDF response; no Drive credential
          v
Apps Script deployment owner
  Advanced Drive API, Shared Drive capable
          |
          v
Target Drive folder
  immutable versioned PDF artifacts
```

Apps Script tetap memiliki ownership auth, source loading, preflight decision,
revision digest, version reservation, Drive upload, registry finalization, dan
authenticated read response. Renderer hanya memiliki ownership atas pinned
Chromium print-to-PDF dari answer-filtered authoritative document dan tidak
memiliki Drive credential atau persistent content store.

`_Generator_Publishes` menjadi registry state machine `PENDING → RENDERING →
UPLOADING → PUBLISHED|FAILED`. Version direservasi atomik per course + level;
request ID dan Drive app property publish ID membentuk reconciliation boundary.
Latest pointer adalah patch metadata pada record, bukan overwrite/rename file.

Activity Log membaca allowlisted bounded metadata dari `_Generator_Audit`.
Published Modules membaca paginated metadata dari `_Generator_Publishes` dan
membentuk file-open action setelah auth. Folder identity tetap Script Property
server-side dan folder Drive tidak di-iframe.

Browser print tetap jalur fallback independen. Renderer deployment, Apps Script
HEAD, Apps Script immutable production version, dan Drive configuration memiliki
status serta rollback terpisah.

## V2 Durable Editor Route and Resume Boundary

Course, level, dan session aktif disimpan sebagai bounded URL hash serta
`sessionStorage` route fallback. Draft recovery tetap berada di `localStorage`
per course/level/session. Hak edit memakai structured same-tab record yang
memuat random tab instance, idempotent edit-session ID, raw lease token, dan
identity route; record ini tidak masuk Spreadsheet, log, URL, atau cross-tab
storage.

Saat refresh, client memuat source terbaru, lalu mencoba `resumeSessionLease`
sebelum memperlakukan status `Locked` sebagai lock milik editor lain. Server
memverifikasi hash token pada record lock di bawah `ScriptLock`; token yang sama
dapat memperpanjang record stale secara atomik selama belum diganti editor lain.
Edit-session ID menjadi idempotency key event `edit_resumed`, sehingga retry
setelah response timeout tidak menambah activity event ganda.

Transport error retryable menempatkan editor pada state reconnecting tanpa
menghapus token atau menampilkan CTA reacquire. Retry dilakukan dengan backoff
serta dipicu kembali oleh `online`, focus, dan tab visibility. Hanya
`LEASE_INVALID`, `LEASE_EXPIRED`, conflict ownership, atau app-session expiry
yang memindahkan editor ke recovery/read-only permanen. Browser Back memakai
flush/release normal; full-page unload hanya menyimpan draft sinkron dan tidak
melepaskan lock agar same-tab refresh dapat resume.
