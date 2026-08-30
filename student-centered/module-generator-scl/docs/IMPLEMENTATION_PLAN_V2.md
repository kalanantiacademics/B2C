# Implementation Plan V2 — Drive Publishing and Operational History

Dokumen ini adalah delivery plan untuk perluasan pasca-MVP yang menambahkan
sidebar final, access activity, publish history, dan penyimpanan PDF langsung ke
Google Drive. Requirement normatif tetap dimiliki `../PRD.md`; plan migrasi
visual M0–M8 yang sedang berjalan tetap dimiliki `IMPLEMENTATION_PLAN.md`.

## 1. Status dan Activation Gate

| Field | Value |
|---|---|
| Plan version | 2.2 |
| Status | Manual-print track released as production version 18; external P4 rotation/fixture pending; P5–P6 deferred |
| Current dependency | Parallel track explicitly authorized while legacy M8 remains administratively open |
| Product direction | Approved 7 Agustus 2026 |
| Primary output | Browser Print / Save as PDF; direct Drive output remains deferred future track |
| Upload identity | Apps Script deployment owner |
| Render strategy target | Controlled Chrome renderer using the authoritative DOM/CSS |
| Production mutation | Security/recovery source released in version 18; replacement Drive fixture still requires separate authorization |

Activation gate parallel track dipenuhi oleh otorisasi product owner pada
7 Agustus 2026. Otorisasi tersebut mencakup P0–P4, push/release Apps Script,
dan satu fixture PDF sintetis pada temporary child folder. Otorisasi tidak
mencakup:

- membuat atau mengubah Cloud Run service/GCP billing;
- renderer P5 atau end-to-end publish P6;
- production academic PDF canary;
- cleanup fixture atau orphan file.

Setiap external mutation di atas tetap memerlukan target yang diverifikasi dan
otorisasi eksplisit pada fasenya.

## 2. Outcome yang Disetujui

1. Logo Kalananti menggantikan badge `K` dan tampil tanpa box/crop dengan native
   portrait ratio, focus treatment, dan visible fallback, tanpa mengubah asset
   halaman modul kanonis.
2. Sidebar utama berurutan Dashboard, Spreadsheet SSOT, Activity Log, dan
   Published Modules; Settings tetap terpisah di bagian bawah.
3. Activity Log memperlihatkan akses dan aktivitas yang aman tanpa credential,
   token, answer key, atau full content.
4. Compose tetap menyiapkan serta memeriksa modul untuk browser Print / Save as
   PDF. File Drive hanya dapat dibuat dari future aksi eksplisit `Publish ke
   Drive` setelah P5–P6 diaktifkan kembali dan preflight lulus.
5. Published Modules adalah list app-native, bukan iframe folder Drive.
6. Satu publish membuat versi immutable baru. File lama tidak di-rename;
   record terbaru diberi `Latest`, record lama menjadi versi sebelumnya.
7. Account deployment Apps Script melakukan upload ke folder yang telah
   diberikan Content Manager access. Renderer tidak menerima akses Drive.
8. Browser `Print / Save as PDF` tetap tersedia sebagai fallback sampai direct
   Drive publish lulus seluruh acceptance gate.

## 3. Product dan Safety Invariants

- Spreadsheet tetap SSOT untuk content, layout, audit, dan publish registry;
  Drive menjadi SSOT binary artifact PDF, bukan source akademik.
- Client tetap hanya mengirim `courseKey`, normalized level, request ID, dan
  acknowledgement yang diizinkan. Folder ID dan Spreadsheet ID server-owned.
- `quiz_answers` tidak boleh mencapai renderer worker, publish payload, PDF,
  registry, log, screenshot, atau error detail.
- Publish selalu memakai latest saved revision dari seluruh session; unsaved
  atau unstable draft memblokir publish.
- Missing image, overflow, stale table anchor, pagination failure, atau blocking
  diagnostic lain memblokir publish seperti memblokir print.
- Publish request wajib idempotent. Retry tidak boleh membuat file atau version
  record ganda.
- Version reservation atomik per course + level. Dua user yang publish bersamaan
  tidak boleh memperoleh nomor versi sama.
- File versi lama immutable. `Latest` adalah metadata registry, bukan rename atau
  overwrite file lama.
- Drive upload yang gagal tidak boleh mengubah source content atau menghilangkan
  local recovery draft.
- Test write hanya memakai fixture Spreadsheet dan temporary/non-production
  Drive folder.
- Hidden-tab auto-healing tetap additive; duplicate/ambiguous/corrupt publish
  schema masuk safe mode dan memblokir mutation.
- Tidak ada production push/deploy sebagai efek samping test atau phase gate.

## 4. Target Information Architecture

| Position | Label | Behavior |
|---|---|---|
| Brand | Kalananti logo | unboxed portrait ratio, centered, visible fallback |
| 1 | Dashboard | Course/level/readiness overview |
| 2 | Spreadsheet SSOT | Existing authenticated Sheet surface |
| 3 | Activity Log | Read-only bounded access/activity list |
| 4 | Published Modules | Versioned module list and Drive open action |
| Bottom | Settings | Session/configuration status |

Top profile memakai resolved authenticated editor identity, bukan hardcoded
copy. `New Module` dan `Logout` harus menjadi action terpisah dan sesuai dengan
behavior aktual.

## 5. Publish Registry Contract

Hidden tab baru `_Generator_Publishes` memakai schema app-managed berikut:

| Column | Purpose |
|---|---|
| `publish_id` | Stable UUID |
| `request_id` | Idempotency key dari client |
| `course_key` | Allowlisted course key |
| `level` | Normalized level |
| `version` | Positive integer per course + level |
| `source_revision_digest` | Digest seluruh saved session revisions |
| `publish_status` | `PENDING`, `RENDERING`, `UPLOADING`, `PUBLISHED`, atau `FAILED` |
| `is_latest` | Boolean latest pointer; bukan file rename |
| `file_id` | Drive file identity, kosong sampai upload berhasil |
| `file_name` | Sanitized deterministic filename |
| `page_count` | Verified PDF page count |
| `file_size_bytes` | Bounded artifact size |
| `renderer_version` | Pinned renderer/build identity |
| `published_by` | Safe authenticated editor label |
| `created_at` | Reservation timestamp |
| `completed_at` | Success/failure completion timestamp |
| `error_code` | Allowlisted safe error code |
| `metadata_json` | Bounded technical metadata only |

`metadata_json` tidak boleh menyimpan HTML, normalized content, image URL
lengkap, signed URL, token, folder ID, answer key, atau PDF bytes.

Server membuat authenticated Drive open URL dari `file_id` saat read response;
folder identity tidak dikirim ke client. Read API memakai pagination dan hard
limit agar ukuran audit/publish tab tidak menjadi unbounded client payload.

## 6. Versioning dan Idempotency Transaction

1. Client flush autosave dan compose ulang latest saved project.
2. Server menghitung `source_revision_digest` dari 12 session.
3. Di bawah `ScriptLock`, server mencari `request_id` yang sama.
4. Jika belum ada, server mereservasi `max(version) + 1` untuk course + level
   dan menulis record `PENDING`.
5. Renderer membuat artifact hanya untuk reserved publish ID dan digest itu.
6. Apps Script deployment owner meng-upload file dengan publish ID pada Drive
   app properties agar orphan/retry dapat direkonsiliasi.
7. Setelah upload terverifikasi, server menandai record baru `PUBLISHED` dan
   `is_latest=true`, lalu mengubah hanya latest pointer versi sebelumnya menjadi
   `false`.
8. Retry request yang sama mengembalikan record/file yang sama.
9. Failure menjadi `FAILED` dengan safe error code. Nomor versi tidak digunakan
   ulang karena artifact atau callback terlambat mungkin masih ada.

## 7. Acceptance Criteria V2

Acceptance criteria normatif dimiliki PRD Section 29.5. Ringkasan delivery
berikut mempertahankan ID yang sama:

- **V2-AC-001** — Logo/navigation/focus/desktop-mobile layout lulus rendered
  browser test.
- **V2-AC-002** — Profile dinamis; New Module dan Logout memiliki action benar.
- **V2-AC-003** — Successful activity dan failed-login aggregate dicatat aman.
- **V2-AC-004** — Activity RPC authenticated, allowlisted, paginated, bounded,
  dan bebas secret/full content/answer.
- **V2-AC-005** — Publish schema additive; corruption memblokir mutation.
- **V2-AC-006** — Compose tidak membuat file; publish hanya dari stable saved
  project yang lulus blocking preflight.
- **V2-AC-007** — Idempotent retry menghasilkan satu record dan maksimal satu
  Drive file.
- **V2-AC-008** — Concurrent publish menghasilkan unique integer versions dan
  tepat satu latest pointer.
- **V2-AC-009** — Folder server-side; deployment owner upload; renderer tidak
  memiliki Drive credential.
- **V2-AC-010** — Drive PDF lulus authoritative A4/quality/completeness/privacy
  acceptance.
- **V2-AC-011** — Drive PDF match browser-print fixture dalam approved parity
  tolerance.
- **V2-AC-012** — Published Modules bounded dan app-native tanpa folder iframe.
- **V2-AC-013** — Failure tidak mengubah source/menggandakan artifact; browser
  print fallback tetap tersedia.
- **V2-AC-014** — Registry/log/DOM/artifact QA bebas data yang dilarang.
- **V2-AC-015** — Local/HEAD/renderer/production status dan rollback terpisah.

## 8. Phase Delivery

Hanya satu phase yang boleh `In progress`. Setiap phase besar dapat dibagi
checkpoint, tetapi phase berikutnya tidak dimulai sebelum exit gate phase aktif
lulus dan evidence dicatat pada `WORKLOG.md`.

### V2-P0 — Contract, Threat Model, and Fixture Baseline

**Status:** Complete

**Primary acceptance:** V2-AC-006, V2-AC-009, V2-AC-014–V2-AC-015

#### Tasks

- [x] Finalize PRD V2 scope, decisions, architecture, security, test, and runbook
  contract before runtime changes.
- [x] Confirm whether the target is Shared Drive and verify the deployment-owner
  role through a read-only capability check.
- [x] Define an app-created temporary child folder for the single synthetic P4
  write; no automatic cleanup.
- [x] Decide renderer hosting owner, GCP project/billing owner, region, maximum
  render duration, and maximum PDF byte size.
- [x] Build a sanitized three-course fixture manifest without production data.
- [x] Record current browser-print golden hashes/page counts as comparison
  baseline.
- [x] Define renderer hosting, limits, signing-key rotation, and incident
  response before P5 activation; these are not required by the P0–P4 runtime.

#### Exit Gate

- All configuration owners and non-production targets are explicit.
- Threat model covers public web app, render endpoint, replay, Drive scope,
  orphan file, content retention, and answer isolation.
- Baseline PDF evidence is reproducible without production Spreadsheet/Drive
  mutation.

### V2-P1 — Sidebar, Brand, and Identity UX

**Status:** Locally verified; historical production release not reverified against latest source

**Primary acceptance:** V2-AC-001–V2-AC-002

#### Tasks

- [x] Replace the `K` badge with the approved unboxed portrait Kalananti image,
  native aspect ratio, focus treatment, and safe visible fallback.
- [x] Map Dashboard, Spreadsheet, Activity Log, Published Modules, and Settings
  to distinct accessible navigation states.
- [x] Add empty/loading/error states for the two new views without backend
  mutation.
- [x] Bind top profile to authenticated identity.
- [x] Separate New Module navigation from Logout.
- [x] Add desktop/mobile keyboard and overflow regression coverage.

#### Exit Gate

- All navigation states work against local fixture data.
- Logo failure does not block login or workspace use.
- No profile/action remains hardcoded or mislabeled.

### V2-P2 — Safe Access and Activity Log

**Status:** Locally verified; historical production release not reverified against latest source

**Primary acceptance:** V2-AC-003–V2-AC-004, V2-AC-014

#### Tasks

- [x] Add login success/logout/project-open/compose audit events.
- [x] Keep failed login audit aggregate and free of attempted label/passcode.
- [x] Define allowlisted event types and bounded metadata schema.
- [x] Add authenticated, paginated, newest-first activity-list RPC.
- [x] Render Activity Log with identity provenance (`verified` or
  `self-declared`) without presenting self-declared identity as verified.
- [x] Keep audit append-only for this phase with bounded reads and no automatic
  destructive cleanup; retention/archival requires a later owner decision.
- [x] Add auth, privacy, pagination, malformed-row, and safe-mode tests.

#### Exit Gate

- Activity view answers who accessed and what safe action occurred.
- Secret/full-content/answer sentinels are absent from Sheet records, RPC, DOM,
  logs, and screenshots.
- Corrupt audit schema cannot silently expose or mutate data.

### V2-P3 — Publish Registry and Version Reservation

**Status:** Locally verified; storage activation/production state not reverified

**Primary acceptance:** V2-AC-005, V2-AC-007–V2-AC-008, V2-AC-012

#### Tasks

- [x] Add `_Generator_Publishes` schema, additive repair, protection, and safe
  mode.
- [x] Implement atomic course+level version reservation and request-ID
  idempotency using fixture Spreadsheet only.
- [x] Implement bounded authenticated publish-history RPC.
- [x] Add Latest/previous/failed status semantics without renaming a file.
- [x] Implement reconciliation metadata for orphan Drive files and late retry.
- [x] Render Published Modules using in-memory fixture records; Drive action
  remains disabled until P4.
- [x] Test two-editor same-level reservation, duplicate retry, one latest
  pointer, corrupt schema, and failure reconciliation under `ScriptLock`.

#### Exit Gate

- Concurrent and repeated requests cannot duplicate version or registry record.
- Registry repair is non-destructive and corrupt schema blocks mutation.
- UI list remains bounded and does not use a Drive iframe.

### V2-P4 — Drive API Foundation and Temporary Upload

**Status:** Local source foundation verified; replacement owner fixture pending

**Primary acceptance:** V2-AC-007, V2-AC-009, V2-AC-013

#### Tasks

- [x] Add an allowlisted Script Property for the target folder identity.
- [ ] Complete deployment-owner consent for the minimum Advanced Drive
  service/scope after rotating the exposed target; source manifest is locally
  verified and contains no dummy scope.
- [x] Implement a read-only folder capability probe that returns no folder ID.
- [ ] Upload a small synthetic PDF blob to a rotated temporary Drive folder using the
  deployment owner and Shared Drive support.
- [x] Persist publish ID in Drive app properties for reconciliation.
- [x] Verify returned file metadata and authenticated Open in Drive action in
  the non-production fake-Drive integration gate.
- [x] Test permission loss, folder-not-found, quota, duplicate retry, and
  oversize rejection without production Drive.
- [x] Remove source-embedded folder identity, verbose Drive exception logging,
  and unused dummy OAuth scope; add regression coverage.
- [x] Document scope consent, setup, recovery, rotation, and rollback.

#### Exit Gate

- One explicitly authorized synthetic fixture is stored in the temporary
  folder and maps to exactly one registry record.
- Folder ID is absent from client source, DOM, logs, and test artifacts.
- No source row or production Drive file is changed.

### V2-P5 — Browser-Faithful Chrome Renderer

**Status:** Deferred future track (excluded from current manual-print completion gate)

**Primary acceptance:** V2-AC-010–V2-AC-011, V2-AC-013–V2-AC-014

#### Tasks

- [ ] Provision a minimal managed Chrome renderer only after explicit GCP
  infrastructure authorization.
- [ ] Pin Chromium/runtime/build identity and use the authoritative publisher
  DOM/CSS rather than a second layout implementation.
- [ ] Define a short-lived signed render protocol with nonce, expiry, replay
  rejection, body/response byte caps, and bounded timeout.
- [ ] Use a renderer signing secret separate from the app-session signing
  secret; store it only in managed secret/configuration surfaces.
- [ ] Ensure worker receives answer-filtered render data only, has no Drive
  credential, and does not persist payload/PDF after response completion.
- [ ] Wait for fonts/images, repaginate, run preflight, then call Chromium
  print-to-PDF with A4/background settings.
- [ ] Compare renderer PDF to current browser-print golden for Roblox, Scratch,
  and Python.
- [ ] Exercise timeout, image failure, large PDF, replay, invalid signature,
  worker unavailable, and response truncation paths.

#### Exit Gate

- Three fixture PDFs satisfy V2-AC-010–V2-AC-011 through actual PDF inspection.
- Worker logs and retained storage contain no content/answer/secret sentinel.
- Failure never creates a Drive file or marks a publish record successful.

### V2-P6 — End-to-End Publish to Drive

**Status:** Deferred future track (blocked by V2-P5 and excluded from current manual-print completion gate)

**Primary acceptance:** V2-AC-006–V2-AC-014

#### Tasks

- [ ] Add `Publish ke Drive` only after compose/preflight readiness.
- [ ] Flush autosave, reload latest level, and bind render to the stable
  12-session revision digest.
- [ ] Show non-blocking progress for reserving, rendering, uploading,
  finalizing, and failure recovery.
- [ ] Upload through Apps Script, verify PDF metadata, finalize registry, and
  update Latest pointer using patch-oriented writes.
- [ ] Keep browser print fallback available throughout rollout.
- [ ] Add safe retry/reconcile flow for upload-success/registry-failure and
  client-timeout/server-success cases.
- [ ] Refresh Published Modules immediately and expose authenticated Open in
  Drive action.
- [ ] Test two users publishing the same level and different levels.

#### Exit Gate

- One action produces one immutable PDF and one registry record.
- Latest/previous status is correct under concurrency and retry.
- Content edits, recovery drafts, old files, and prior registry records remain
  intact across every tested failure boundary.

### V2-P7 — Full QA, Operations, and Separately Authorized Release

**Status:** Locally verified for route/recovery and browser-print regression; external release pending

**Primary acceptance:** V2-AC-001–V2-AC-015

**Supporting existing recovery acceptance:** AC-033A, AC-034–AC-036

#### Tasks

- [x] Add a durable client route for the active course, level, and session so
  the Apps Script single-shell UI can reconstruct the same editor after refresh
  instead of returning a blank or context-free workspace.
- [x] Persist bounded workspace context and the latest local recovery draft on
  every edit and synchronous lifecycle boundary; warn on browser navigation
  while dirty without relying on asynchronous save during unload.
- [x] Persist stable per-tab edit-session identity and existing lease credential in
  `sessionStorage`. Same-tab refresh must resume the existing server lock, not acquire
  as a new editor. Refresh must not release the active lock, wait for stale expiry, or
  display `Aktifkan edit lagi` when ownership is still valid.
- [x] Implement `resumeSessionLease` server contract:
  - Token lama tetap dipakai setelah refresh.
  - Transient timeout tidak membuang hak edit.
  - Jika lock stale tetapi belum diambil orang lain, resume/reacquire berlangsung atomik.
  - Hanya konflik dengan editor lain yang membuat read-only.
  - Refresh dicatat sebagai `edit_resumed`, bukan session editing baru.
- [x] Add real-browser coverage for Back, immediate refresh, refresh during the
  five-second autosave window, refresh while save is in flight, stale access,
  changed source revision, and offline recovery. Each scenario must restore an
  actionable session view with no blank page, silent draft loss, duplicate
  history entry, or last-write-wins overwrite.
- [x] Run static, unit, fixture integration, browser, two-context, security, and
  actual browser-print PDF regression gates.
- [ ] Future P5–P6: inspect every page for Drive PDFs from Roblox, Scratch, and Python,
  including late Session 12 and back cover.
- [ ] Future P5–P6: compare Drive artifact and browser-print fallback for page count, text,
  TOC, parity, geometry, images, and answer isolation.
- [ ] Future P4/P6: perform explicitly authorized rotated temporary-Drive recovery/rollback drill.
- [x] Update setup, scope-consent, renderer deployment, monitoring, incident,
  orphan reconciliation, release, and rollback runbooks. (Done di RUNBOOK.md)
- [x] Push Apps Script HEAD only after separate authorization and fresh-pull
  compare it with local source.
- [ ] Future P5–P6: deploy renderer and immutable Apps Script production revisions as separate
  recorded mutations with independent rollback targets.
- [x] Run public shell smoke after the authorized Apps Script release.
- [ ] Run authenticated application smoke with owner-provided passcode; future
  P6 additionally requires one owner-approved production publish canary.

#### Local Evidence — 8 Agustus 2026

- `npm run check` passed 85/85 static/unit/fixture tests, including regression
  checks for minimum OAuth scope, safe Drive error logging, and no
  source-embedded Drive target.
- `npm run qc:v2:recovery` passed immediate refresh, stable tab/edit-session
  identity, explicit dirty-draft recovery, exactly-once in-flight save retry,
  transient reconnect, atomic stale same-owner resume, changed-revision safety,
  Back release, and Forward reconstruction with zero overflow or browser error.
- `npm run qc:m7:full` passed 12/12 local commands in 153.79 seconds. Three
  browser-print PDFs each contained 34 A4 pages with selectable text, complete
  Session 12/back cover, zero content-bounds overflow, and inspected full-page
  contact sheets in `/private/tmp/kalananti-scl-phase7-qc`.
- Fixture boundary was synthetic/local. No Spreadsheet, Drive, Apps Script
  HEAD, or production mutation was performed.

#### Production Evidence — 8 Agustus 2026

- Fresh pre-release `npm run qc:m7:full` passed 12/12 commands in 133.85
  seconds.
- Apps Script HEAD received 25 runtime files; a fresh temporary pull matched
  local `src/` with zero differences.
- Immutable production version 18 was created and the existing production
  deployment updated; version 17 remains available as the rollback target.
- Read-only `/exec` browser smoke returned HTTP 200 with configuration ready,
  login shell visible, workspace hidden, required editor identity, disabled
  initial login button, route-recovery signature, zero console/page error, and
  zero checked answer/Drive/Spreadsheet identity leak.
- No application passcode was used and no Spreadsheet or Drive content mutation
  was performed. Authenticated application smoke and rotated P4 owner fixture
  remain pending.

#### Exit Gate

- Refresh or browser Back from a dirty editor reconstructs the same
  course/level/session route and exposes the correct saved source or explicit
  recovery-draft choice; it never leaves a blank workspace or silently discards
  edits.
- Same-tab refresh returns directly to the same editable course/level/session
  without waiting for the editor's own lock to expire. It preserves the same edit
  lifecycle and does not create duplicate acquire/history/activity events.
- Route restoration and edit-access recovery pass same-revision,
  changed-revision, offline, and in-flight-save browser scenarios without
  duplicate mutation or silent overwrite.
- Current manual-print acceptance (sidebar, activity, registry read surface,
  route/recovery, browser PDF fallback, privacy) has recorded local evidence.
- Product/Academic Content acceptance and Apps Script production smoke remain
  external release gates.
- V2-AC-010–V2-AC-011 and the direct-publish portions of V2-AC-006–V2-AC-015
  remain explicitly unclaimed while P5–P6 are deferred.
- Local source, Apps Script HEAD, renderer deployment (when activated), and
  immutable production deployment are identified and rollback-tested separately.

## 9. Phase Matrix

| Phase | Main mutation boundary | Required environment | Production write allowed? |
|---|---|---|---|
| P0 | Documentation/fixtures | Local | No |
| P1 | Client UI | Local browser fixture | No |
| P2 | Audit fixture | In-memory/temporary Sheet | No |
| P3 | Publish registry fixture | In-memory/temporary Sheet | No |
| P4 | Synthetic PDF upload | Temporary Drive folder | Only explicit temporary target authorization |
| P5 | Renderer infrastructure/fixture | Authorized non-production GCP | No production Drive write |
| P6 | Integrated fixture publish | Temporary Sheet + Drive | No production Drive write |
| P7 | Release/canary | Staged then production | Only separately authorized steps |

## 10. Required Evidence Per Phase

Setiap phase completion harus mencatat:

- exact source status: local, Apps Script HEAD, renderer revision, production;
- command/method dan fixture/target yang digunakan;
- actual pass/fail count dan elapsed time;
- console/page/server errors;
- Spreadsheet and Drive mutation target;
- artifact path atau Drive fixture identity yang aman;
- untested boundary;
- rollback target untuk external mutation.

Claim PDF pass wajib berasal dari actual PDF, bukan HTML source atau `%PDF`
signature saja. Contact sheet, representative full-size pages, extracted text,
media box, page parity, image readiness, overflow, and answer-leak checks tetap
wajib.

## 11. Open Configuration Gates

- Temporary/non-production Drive folder owner and identity.
- Verified production folder type and deployment-owner Content Manager role.
- GCP project, billing owner, Cloud Run region, and technical owner.
- Renderer concurrency, timeout, memory, maximum request/response, and PDF size.
- Renderer secret rotation owner and monitoring destination.
- Drive OAuth scope accepted by deployment owner.
- Publish history retention and orphan-file reconciliation owner.
- Production canary course + level and acceptance owner.

Open configuration tidak boleh diisi dengan tebakan atau dicatat sebagai secret
di repository. Nilainya dipasang pada managed runtime configuration saat phase
yang relevan telah diotorisasi.
