# Changelog

## 2026-08-30 — Production version 35 automated Markdown checkbox prefix stripping in Self-Check & Tasks

- Automatically parsed and stripped Markdown checkbox prefixes (`[]`, `[ ]`, `- [ ]`, `* [ ]`, `[x]`, `[X]`, `- [x]`) from `self-check`, `must_do`, `should_do`, and `aspire_to_do` task cards.
- Rendered clean checkbox icons without duplicating literal `[ ]` text brackets in publisher view and live preview.
- Updated `Parser.gs`, `LegacyAdapter.html`, and `Publisher.html`.

## 2026-08-30 — Production version 34 Markdown heading card box hierarchy (#, ##, ###)

- Structured Markdown headings into unified card boxes matching Kalananti SCL components:
  - `# Heading 1`: Primary card box with solid white/light background, prominent 4px navy border, and 7px cyan drop shadow (`box-shadow: 7px 7px 0 #4CAAE4`).
  - `## Heading 2`: Secondary card box with 3.5px sky blue border and 5px shadow (`box-shadow: 5px 5px 0 #D9EEF9`), with compact 17px/18px font size.
  - `### Heading 3`: Tertiary sub-heading card with 2.5px border and 4px shadow (`box-shadow: 4px 4px 0 #EDF6FC`).
- Prevented background watermark bleed-through by giving heading containers solid opacity.
- Maintained Markdown-driven hierarchy across editor, live preview, opener flow, and A4 publisher.
- Validated with 98 automated tests passing cleanly.

## 2026-08-30 — Production version 33 title fitting and Markdown heading hierarchy

- Removed opener-title ellipsis/clamping and added progressive font fitting so
  long session titles remain fully visible.
- Session topics on content-page headers can wrap instead of being truncated.
- Added distinct accent-bar styles for Markdown H1 and the smaller H2 style in
  the editor and A4 publisher.
- Validated with 98 automated tests, preview build, and desktop/mobile browser
  smoke.
- Pushed current code, created immutable version 33, and updated the existing
  production deployment. Version 32 remains available as rollback target.

## 2026-08-30 — Production version 32 legacy Markdown compatibility

- Pushed the verified Markdown compatibility source to Apps Script HEAD and
  created immutable version 32.
- Updated the existing production `/exec` deployment from version 31 to version
  32; version 31 remains available for rollback.
- Public production smoke returned HTTP 200 with the login shell visible,
  workspace hidden, and zero console/page errors.
- Authenticated content smoke still requires the deployment owner's application
  passcode; no production Spreadsheet content was edited.

## 2026-08-30 — Local legacy Markdown rendering compatibility

- Fixed SSOT Markdown being shown literally in the editor/live preview when
  authors use `#`/`##`/`###` headings or `**bold**`, `*italic*`, `_italic_`,
  `__bold__`, and `***bold italic***`.
- The server normalizer now overlays legacy emphasis on native Sheets rich-text
  runs, preserves links/native styles, and leaves fenced-code literals untouched.
- The editor canonicalizes Markdown headings into semantic heading blocks before
  rendering and serialization, so the `#` prefix is not saved as visible prose.
- Added parser, editor-source, and local Chromium regression coverage. This is
  local source only; Apps Script HEAD and production deployment were not changed.

## 2026-08-24 — Production version 31 unblock print on acknowledgement & flexible MIME detection

- Unblocked Print / Save as PDF when user acknowledges image warnings, resolving blocked state on non-standard image formats.
- Added support for `image/jpg`, `image/pjpeg`, `image/x-png`, `image/gif`, and magic-bytes detection for `application/octet-stream`.
- Deployed immutable production version 31 (`@31`).

## 2026-08-24 — Production version 30 bullet stars and numbered lists in full module generation

- Fixed missing bullet stars (`✦`) and numbered badges (`1, 2, 3`) during full module generation (`Compose Module`).
- Linked `session.materialBlocks` and `session.layouts` to proper list styles (`text-list-bullet` and `text-list-numbered`).
- Deployed immutable production version 30 (`@30`).

## 2026-08-24 — Production version 29 left opener template and page parity

- Enforced canonical left-side opener template (`beginning-kiri-scl.svg` / `openerLeft`) with page number on the bottom-left.
- Aligned session editor preview parity: Opener (left) -> Content 1 (right) -> Content 2 (left).
- Deployed immutable production version 29 (`@29`).

## 2026-08-24 — Production version 28 custom image width in bubble cards

- Linked image resize slider to image rendering inside Did You Know / Tutor Says cards.
- Parsed `#scl-width=` metadata run dynamically for bubble images.
- Deployed immutable production version 28 (`@28`).

## 2026-08-24 — Production version 27 isolated bubble cards from step containers

- Separated Did You Know (`fyk*`) and Tutor Says (`kc*`) bubbles from step containers into standalone root components.
- Eliminated redundant step header repetition above bubble cards on page overflow.
- Resolved `STRUCTURED_UNIT_OVERSIZE` red border alerts and prevented bubble content truncation.
- Deployed immutable production version 27 (`@27`).

## 2026-08-24 — Production version 26 images, code blocks, and list continuity in bubbles

- Rendered HTTPS image URLs inside Did You Know / Tutor Says bubbles as visual images (`<img>`) rather than text links.
- Supported inline and multi-line code fences inside bubbles with dark styling and monospace font.
- Maintained sequential numbering continuity (1, 2, 3...) for numbered lists inside bubbles.
- Deployed immutable production version 26 (`@26`).

## 2026-08-24 — Production version 25 bullet-prefixed code fences support

- Supported code fences with leading bullet/list glyphs (`• ``` `, `- ``` `).
- Automatically grouped interspersed and list-nested script lines into styled IDE boxes.
- Deployed immutable production version 25 (`@25`).

## 2026-08-24 — Production version 24 Roblox Lua IDE code fences support

- Enabled code fence (` ```text``` ` or ` ```lua `) parsing for Roblox course.
- Rendered Roblox script blocks in styled dark IDE containers with `ROBLOX LUA IDE` title, window dots, and monospace coding font.
- Deployed immutable production version 24 (`@24`).

## 2026-08-24 — Production version 23 numbering continuity and silent lease resume

- Fixed numbered step sequence resetting to 1 when interspersed with bullet list items (`• `).
- Preserved explicit ordinal numbers from text prefixes (`4.`, `5.`) across pagination and structured step containers.
- Enhanced client heartbeat and autosave retry with silent lease resume fallback to prevent aggressive edit lockouts during editing.
- Deployed immutable production version 23 (`@23`).

## 2026-08-08 — Production version 18 P4/P7 correction

- Released the P4 security hardening and P7 durable same-tab recovery source as
  immutable production version 18; version 17 remains available for rollback.
- Passed the fresh 12-command gate in 133.85 seconds, pushed 25 runtime files,
  and fresh-pull verified zero differences between Apps Script HEAD and local
  `src/`.
- Public read-only `/exec` browser smoke returned HTTP 200 with configuration
  ready, login shell visible, workspace hidden, required identity, recovery
  signature present, and zero console/page error or checked answer/Drive/Sheet
  identity leak.
- Authenticated application login, rotated P4 Drive owner fixture, and P5–P6
  direct Drive publishing remain pending and are not claimed complete.

## 2026-08-08 — Local P4 security and P7 same-tab recovery correction

- Removed a source-embedded Drive target setup helper, reduced Drive failure
  logging to an allowlisted diagnostic code, and removed the unused dummy Google
  Documents OAuth scope.
- Added structured per-tab edit-session persistence, idempotent same-token
  `resumeSessionLease`, atomic stale-owner renewal, retry/backoff for transient
  heartbeat failures, dirty navigation protection, and pending autosave request
  recovery.
- Added real-Chromium coverage for immediate refresh, save-in-flight refresh,
  transient reconnect, stale resume, changed source revision, browser Back, and
  Forward reconstruction.
- Direct Drive renderer/publish P5–P6 remains deferred; browser Print / Save as
  PDF remains the supported output. This entry describes local source only and
  does not claim Apps Script HEAD or production release.

## 2026-08-07 — Production version 12 unboxed sidebar logo

- Removed the artificial white/background box and square crop from the
  Kalananti sidebar mark; the portrait asset now keeps its native proportions
  with a restrained transparent drop shadow and accessible focus treatment.
- Updated deterministic desktop/mobile browser coverage for the unboxed
  `object-fit: contain` treatment and retained the visible load-failure fallback.
- Passed 83/83 tests and the V2 browser gate, pushed Apps Script current code,
  and released immutable production version 12 with version 11 retained for
  rollback.
- Public production smoke returned HTTP 200, contained the updated logo
  signature, and exposed none of the checked folder/answer identities.

## 2026-08-07 — Production version 11 owner-safe P4 setup helper

- Added `runV2P4OwnerSetupAndFixture` so the deployment owner can repair/verify
  app-managed storage and run the authorized synthetic Drive fixture from one
  Apps Script editor action after setting the server-only folder property.
- The helper logs only bounded safe evidence (`storageReady`, created/duplicate,
  status, version, page count, file size, and Shared Drive boolean); it never
  logs folder/file identity, URL, token, or content.
- Passed 83/83 tests and the full 11-command regression/PDF gate in 102.09
  seconds, pushed and fresh-compare verified 25 runtime files, and released
  immutable production version 11 with version 10 retained for rollback.
- Public HTTP shell smoke passed. Actual OAuth consent and synthetic Drive
  fixture remain deployment-owner actions and are not claimed complete.

## 2026-08-07 — V2 P0–P4 foundation production version 10

- Replaced the sidebar badge with the approved center-cropped Kalananti asset,
  added accessible Dashboard/SSOT/Activity/Published/Settings navigation, and
  separated dynamic editor identity, New Module, and Logout behavior.
- Added privacy-bounded Activity Log events with five-minute failed-login
  aggregation, authenticated pagination, and no attempted credential/identity.
- Added the non-destructive `_Generator_Publishes` registry, atomic immutable
  version reservation, request idempotency, latest pointer, bounded Published
  Modules list, and authenticated Drive open links.
- Added owner-only Advanced Drive foundation, server-owned folder
  configuration, Shared Drive capability checks, synthetic PDF reconciliation,
  and safe permission/quota/oversize failure handling.
- Passed 82/82 tests, the desktop/mobile V2 browser gate, and the full 11-command
  regression/PDF gate; pushed and fresh-compare verified 25 runtime files,
  then released immutable production version 10 with version 9 retained for
  rollback.
- Public HTTP shell smoke passed. Deployment-owner OAuth consent, hidden storage
  setup, actual synthetic Drive fixture, and authenticated production smoke
  remain pending and are not claimed complete.

## 2026-08-07 — Immutable production redeploy version 9

- Re-pushed the verified runtime; Apps Script reported current code/HEAD was
  already up to date.
- Created immutable version 9 and repointed the existing production deployment
  without changing its URL; version 8 remains available for rollback.
- Fresh-pull verified all 22 version 9 runtime files and passed public HTTP and
  browser smoke with the edit-access CTA present and zero runtime errors.

## 2026-08-07 — Actionable edit-access expiry recovery

- Replaced user-facing lease, heartbeat, lock, and read-only jargon with clear
  edit-access states such as `Bisa diedit`, `Sedang diedit orang lain`, and
  `Akses edit berakhir`.
- Added an `Aktifkan edit lagi` CTA with loading feedback whenever edit access
  expires or another editor still owns the session.
- Made reactivation revision-safe: unchanged source resumes editing and
  autosave, while changed source loads the latest revision and preserves the
  local draft for explicit recovery instead of applying it automatically.
- Kept source reload read-only when no valid edit access exists and added
  two-context browser coverage for expiry, retry, unchanged/changed revisions,
  draft preservation, plain-language UI, and zero runtime errors.
- Passed the full 11-command release gate, push/pull-verified all 22 Apps Script
  runtime files, and released the correction as immutable production version 8
  with version 7 retained for rollback.

## 2026-08-07 — Non-blocking backend activity feedback

- Added a top-center closable notification system for loading, success,
  warning, and error states across level/session loading, autosave, recovery,
  close/release, history restore, source reload, compose, print, and SSOT refresh.
- Added visible busy states for long-running buttons and bounded client RPC
  timeouts so the interface no longer waits indefinitely without an outcome.
- Fixed recovery draft behavior so choosing `Gunakan draft` schedules autosave
  after five idle seconds instead of waiting for another edit or session close.
- Added delayed-backend browser coverage for loading/success/error notices,
  closable feedback, close-session progress, conflict preservation, and recovery
  autosave. The correction was subsequently included in immutable production
  version 8 together with actionable edit-access recovery.

## 2026-08-07 — Upfront editor identity on login

- Displayed the required name/work-email field alongside the team passcode on
  the initial login shell instead of revealing it only after a failed-looking
  authentication attempt.
- Kept login disabled until both fields are complete and added a visible
  disabled-button treatment.
- Added desktop/mobile browser regression coverage for initial visibility,
  required state, button gating, successful login, and console/page errors.
- Passed the complete 11-command release gate and push/pull-verified all 22
  runtime files in Apps Script current code/HEAD.
- Released the correction as immutable production version 7, retained version
  6 for rollback, and passed the public read-only `/exec` login-shell smoke with
  both required inputs visible and zero console/page errors.

## 2026-08-06 — Copyright-page print fragmentation correction

- Replaced transformed absolute centering on legal pages with an approved
  safe-area flex wrapper and non-fragmenting legal card so Chrome print keeps
  the closing copyright paragraph inside the card.
- Added browser geometry and actual-PDF text-position regression gates for the
  legal close instead of relying on generic overlay overflow scans.
- Verified 71/71 tests, a 56-page browser pagination fixture, three 34-page A4
  golden PDFs, and an inspected 11-page focused actual-PDF contact sheet. The
  correction is locally verified; Apps Script push and deployment have been successfully completed following user authorization.

## 2026-08-06 — One-minute stale session locks

- Reduced session lease expiry from three minutes to one minute after the last
  successful heartbeat while retaining the 30-second active-editor heartbeat.
- Preserved per-session isolation: another editor remains blocked only on the
  same session while other sessions stay editable.
- Updated the product contract and two-context recovery fixtures; 70/70 tests
  and the browser collaboration regression pass locally. This change is not yet
  in Apps Script HEAD or production version 5.

## 2026-08-06 — Immutable production version 5 image-preflight authorization

- Passed the complete 11-command release gate, push/pull-verified all 22 runtime
  files, and released the explicit UrlFetch image-preflight scope plus
  actionable permission/quota diagnostics as immutable production version 5.
- Updated the existing `/exec` deployment without changing its URL and retained
  immutable version 4 as the immediate rollback target.
- Verified HTTP 200 and a ready unauthenticated login shell containing the
  version 5 runtime signatures with zero sensitive client terms and zero browser
  console/page errors.

## 2026-08-06 — UrlFetch authorization for image preflight

- Added the explicit Apps Script `script.external_request` OAuth scope required
  by the existing server-side `UrlFetchApp` image preflight.
- Classified missing authorization and exhausted UrlFetch quota separately
  instead of collapsing both into generic `IMAGE_FETCH_FAILED` results.
- Collapsed repeated permission/quota failures into one actionable blocking
  diagnostic rather than rendering the same message for every image.
- Verified the correction with 70/70 tests, three 34-page golden PDFs, and a
  66-page/101-image print-ready fixture. This correction was released in
  immutable production version 5.

## 2026-08-06 — Immutable production version 4

- Push/pull-verified all 22 Apps Script runtime files after the complete 11-step
  local release gate passed.
- Released font-ready live-preview repagination, the updated content-left SVG,
  centered 69% default images, zoom-safe overflow checks, and resilient
  high-image-count print readiness as immutable production version 4.
- Updated the existing `/exec` deployment without changing its URL and retained
  immutable version 3 as the known-good rollback target.
- Verified the unauthenticated production login shell with HTTP 200,
  configuration ready, latest runtime signatures, zero sensitive client terms,
  and zero browser console/page errors.

## 2026-08-06 — Font-ready live-preview repagination

- Re-ran live session pagination after `document.fonts.ready` so a late-loading
  Poppins font cannot enlarge already-paginated content beneath the hidden
  footer boundary.
- Preserved the active preview scroll position and ignored stale asynchronous
  font callbacks when a newer draft render has already started.
- Added a delayed-font browser regression that grows an 18-paragraph fixture
  from two to seven pages with every paragraph preserved and zero page/bounds
  overflow. This correction was released in immutable production version 4.

## 2026-08-06 — Updated content-left template and centered 69% images

- Regenerated Apps Script `PageAssets.html` from the user-approved updated
  canonical `back-module/plain-kiri-scl.svg`; exact embedded/canonical content
  equality is regression-tested.
- Changed images without explicit persisted resize metadata from 50% to 69% of
  the available content width while preserving explicit 25–100% widths.
- Centered top-level and nested images in the editor, live preview, and PDF;
  removed the nested step rule that previously forced image blocks left.
- Changed the image range control to one-percent steps so the 69% default is not
  silently rounded to 70%.
- Verified the new asset and 69% centered image in browser and an inspected
  11-page actual PDF. This correction was released in immutable production
  version 4.

## 2026-08-06 — Zoom-safe pagination and high-image-count print readiness

- Normalized DOM-bound measurements against CSS zoom so the 43% live preview no
  longer reports false `PAGE_OVERFLOW`/structured-oversize blockers.
- Split image server preflight into bounded batches of 20 so modules with more
  than 100 images do not fail the per-request server limit.
- Limited browser image decode concurrency to six and retried transient decode
  rejection twice while preserving blocking behavior for genuinely broken
  images.
- Kept RPC failures actionable in the publisher diagnostic instead of showing a
  green pagination banner with an unexplained generic blocked button.
- Verified 101/101 images become print-ready across six preflight RPCs and an
  actual 66-page A4 PDF. This correction was released in immutable production
  version 4.

## 2026-08-06 — Content-bound pagination, default 50% images, and actionable print gate

- Re-paginated after all top-level and nested images have real dimensions and
  added DOM-bound checks so content cannot silently cross the footer safe area.
- Changed unconfigured images to start at 50% viewport width while preserving
  explicit user resize metadata.
- Preserved preview scroll through the asynchronous image-ready repagination.
- Made image-readiness count mismatches blocking with a visible reason; the clean
  path restores an enabled `Print / Save as PDF` button automatically.
- Verified the correction locally in browser and actual PDFs, then push/pull-
  verified all 22 runtime files in Apps Script HEAD and released them as
  immutable production version 3.
- Verified the version 3 public HTTP/browser login shell, latest correction
  signatures, zero unauthenticated sensitive-identity leak, and zero
  console/page error. Preserved version 2 as the previous production rollback
  target.

## 2026-08-06 — PDF opener, session header, and image auto-fit correction

- Prevented Poppins opener titles such as `Intro & Instance.new` from losing the
  bottom of their line box in browser print/PDF output.
- Lowered the content-page session ribbon while preserving vertical centering in
  the canonical header slot.
- Added aspect-ratio-aware auto-fit for images left at the default width so tall
  images remain completely visible; explicit user resize values remain intact.
- Added focused unit, browser, and actual-PDF regression evidence. This correction
  is locally verified, push/pull-verified in Apps Script HEAD, and released as
  immutable production version 2 after the full M7 gate passed.
- Verified the version 2 public HTTP/browser login shell, latest layout
  signatures, zero unauthenticated sensitive-identity leak, and zero
  console/page error; preserved immutable version 1 as rollback target.

## 2026-08-06 — Immutable production deployment verification

- Verified that the production `/exec` deployment points to immutable version
  1 and that its 22 runtime files match the latest local Apps Script source.
- Verified an HTTP 200 public login shell with the latest scroll-anchor runtime
  and no unauthenticated answer-field, source-tab, or Spreadsheet-property leak.
- Kept authenticated production behavior, configuration/ownership, and rollback
  verification as explicit pending release gates.

## 2026-08-04 — Tall zoomable preview and resilient busy handling

- Extended the live A4 preview toward the viewport bottom and added zoom out,
  zoom in, percentage, and fit controls without changing print geometry.
- Unified editor/publisher bullet stars with the opener objective marker.
- Preserved valid leases on retryable server-busy heartbeats and retried autosave
  after two seconds instead of leaving a persistent red conflict state.

## 2026-08-04 — Materials flow into session openers

- Used the remaining opener space after objectives as the first bounded materials
  flow region, reducing avoidable blank space before continuation pages.
- Restored large `Session N` and smaller topic hierarchy on each content-page
  ribbon while preserving the complete combined header as accessible metadata.
- Added long-flow browser evidence with exact-once units and zero overflow,
  blocking diagnostics, answer leak, console errors, or page errors.

## 2026-08-04 — Opener hierarchy, session headers, and list parity

- Moved every learning objective into the opener objective card and removed its
  duplicate content-page rendering so materials begin higher on the first page.
- Added session topic to every content-page ribbon and aligned editor/publisher
  bullet and numbered markers with the Kalananti visual language.
- Added focused browser evidence plus a 58-page stress render with zero hidden
  overflow, blocking diagnostics, console errors, or page errors.

## 2026-08-04 — Python fenced-code IDE rendering

- Rendered Python triple-backtick materials as polished IDE panels in the shared
  session/full-level A4 renderer, including one-line fenced content.
- Kept Scratch and Roblox parsing unchanged and inserted code through text-only
  DOM APIs so HTML-like content cannot execute.
- Added unit and real-browser evidence for source identity, delimiter removal,
  zero answer leak, zero overflow, and zero console/page errors.

## 2026-08-04 — Continuous session document editor

- Replaced the per-line editable card model with one continuous rich-document
  editing root; Enter creates normal-flow paragraphs without paragraph chrome.
- Converted standalone HTTPS image URLs into in-flow image atoms with resize,
  replace, and delete controls while keeping source serialization stable.
- Preserved canonical source identity during visual paragraph reorder and fixed
  lease acquisition so initial edits are not discarded by a late rerender.
- Added browser regression evidence for duplicate IDs after Enter, caret and
  scroll retention, autosave, two-context collaboration, image reflow, and live
  A4 preview.

## 2026-08-04 — M7 consolidated full QA evidence

- Added one reproducible M7 command covering static/unit/integration checks,
  browser editing, two-context collaboration, three-course adapter parity,
  pagination stress, and three actual A4 PDFs.
- Added PDFKit rasterization of every actual PDF page with labeled all-page
  contact sheets and a structured local QA summary.
- Completed local M7 QA evidence; Product/Design visual acceptance remains an
  explicit human gate before M7 can be marked complete.

## 2026-08-04 — M6 direct browser PDF and preflight

- Full-level composition now flushes the active revision-aware draft and reloads
  the selected course + level from saved SSOT state before rendering.
- Added stale-preview invalidation, deterministic recommended PDF filenames,
  and explicit A4 browser save settings.
- Added three-course rendered PDF evidence plus save/reload browser coverage,
  image decode/DPI failures, print-only chrome visibility, selectable text,
  answer isolation, A4 media boxes, and all-page visual inspection.

## 2026-08-04 — M5 deterministic A4 template composition

- Added the complete hardcover front matter, side-aware canonical backgrounds,
  static legal pages, two-page visual component Guide, safe printed/clickable
  INS CTA, stabilized TOC, and global session/filler parity.
- Added a native-HTML coordinate registry with deterministic long-text stepping
  for cover, session header/topic, content viewport, opener, and left/right page
  number slots.
- Added full 79-page rendered browser evidence covering Poppins readiness,
  geometry, opener parity, TOC anchors, continuation preservation, zero hidden
  overflow, and all-page visual inspection.

## 2026-08-04 — M4 collaborative structured layout persistence

- Added `_Generator_Layouts` load/write integration with combined field, table,
  and layout revisions plus undoable history/restore snapshots.
- Preserved canonical source order while persisting visual reorder, manual page
  breaks, image widths, and allowlisted layout attributes by stable block key.
- Added fixture and two-browser evidence for idempotent autosave, cross-context
  reload, recovery, exclusive same-session leases, parallel different-session
  editing, direct-source conflict rejection, and forbidden-payload isolation.

## 2026-08-04 — M3 authoritative renderer and DOM pagination

- Closed M3 with approved viewport geometry, locally bundled Poppins 14 pt,
  semantic oversize splitting, compound-flow stages, and exact caret/scroll
  restoration.
- Added matched M0-to-runtime visual comparison and numeric geometry/content
  order gates alongside three-course and 42-unit pagination stress evidence.
- Started M4 with the managed `_Generator_Layouts` schema and semantic safe-mode
  validation for collaborative layout records.

## 2026-08-04 — M2 normalized-to-legacy compatibility adapter

- Added stable field, block, marker, line, and table source identity for reverse
  serialization from the versioned legacy component model.
- Added sanitized Roblox, Scratch, and Python adapter goldens covering rich
  text, marker order, tasks, quiz isolation, manual breaks, and table splitting.
- Added real-browser three-course render QC with answer-leak and runtime-error
  assertions.
- Started M3 by correcting the shared non-cover renderer viewport to the
  approved geometry and applying the Poppins 14 pt body typography contract.
- Added DOM-measured semantic splitting for oversized knowledge bubbles, task
  cards, step groups, and quiz stacks with stable continuation identity.
- Preserved exact selection start/end offsets, focused block position, editor
  scroll, and preview scroll across editor DOM reflow.

## 2026-08-04 — M1.1 reviewable legacy-editor shell

- Added an isolated `legacy-paged-v1` session editor shell with live paged A4
  canvas while preserving course/level/session, lease/save, history, and print
  entry points.
- Refined the shell after review with a full-screen editing mode, compact
  section navigation, hidden empty diagnostics, and the approved visual session
  opener treatment in live A4 preview.
- Added a standalone synthetic local review build and browser QC command.
- Fixed local include bundling so Publisher regex replacement tokens remain
  intact in the generated review HTML.
- Replaced the remaining continuous block authoring presentation with a primary
  paged-document surface and added selection-safe formatting, undo/redo,
  caret/scroll anchoring browser evidence for M1.2.
- Added standalone HTTPS image paste conversion, selected image controls,
  proportional percentage resize, replace/delete, and sub-300 ms live A4
  reflow evidence for M1.3.
- Closed M1 after validating the paged shell in two browser contexts with
  same-session locking, different-session editing, autosave, crash recovery,
  revision conflict protection, and history.

Semua perubahan produk dan engineering yang notable dicatat di file ini.
Riwayat detail per task berada di `docs/WORKLOG.md`.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versi produk belum dimulai sampai runtime foundation tersedia.

## [Unreleased]

### Added

- Approved non-cover A4 viewport (`1.38 / 3.22 / 18.38 / 23.86 cm`), Poppins
  14 pt child-readable body copy, explanatory book-part guide, and side-aware
  beginning backgrounds for Guide/TOC.
- Hardcover front-matter contract with blank verso, copyright, usage warning,
  complete two-page-capable Guide, and a printed/clickable public INS link.
- Reproducible sanitized Roblox/Scratch M0 legacy golden baseline with
  representative rendered pages, computed styles, geometry, and hashed artifact
  manifest for PRD v2 visual review.
- Google-Docs-like editor contract: direct structured editing on the module
  surface, sub-300 ms normal-flow repagination, standalone image-URL conversion,
  proportional inline resize, and selection/scroll preservation.
- PRD v2 visual-parity migration contract, visual geometry specification,
  phased implementation gates, and explicit separation of local source, Apps
  Script HEAD, and production deployment.
- Versioned `scl-legacy-component/v1` adapter for objectives, material flow,
  `kc`/`fyk` bubbles, images, steps, task cards, self-check, quiz, semantic
  tables, and manual page breaks with deterministic field/component identity.
- Native-HTML coordinate slots for cover title/subtitle, session header, and
  left/right page numbers over the canonical `back-module/` SVG assets.
- PRD v2 browser/PDF regression coverage for adapter isolation, template
  geometry, table continuation, font/image-ready pagination, selectable text,
  Session 12, and back cover.
- Continuous document authoring surface dengan debounced live A4 session
  preview yang memakai background dan renderer kanonis yang sama dengan print.
- Phase 6 authenticated server image preflight, browser load/decode timeout,
  effective-DPI warning/acknowledgement, image-ready repagination, blocking print
  gate, A4 print CSS, and three-course rendered golden-PDF QA.
- Phase 6 PDF verification for A4 media box, selectable text, late Session 12,
  back cover, answer-sentinel isolation, accessibility IDs/image alt text, clean
  console/page path, and all-page contact sheets.

### Fixed

- Table continuation in the legacy adapter now repeats `<thead>` while
  preserving every row and stable table identity.
- Image preflight dimensions now survive the adapter, and legacy image wrappers
  reserve deterministic width before decode so late image load cannot introduce
  hidden page overflow.
- Print preparation now waits for document fonts and pagination accounts for
  legacy component margins before allowing a block to remain on a page.
- Nomor halaman kiri dan kanan kini menggunakan background transparan dan terpasang pas di tengah ikon planet SVG tanpa menutupi ornamen grafis planet.
- Teks materi pembelajaran biasa tidak lagi terbungkus kotak/card ber-border tebal dengan header `(Lanjutan)`, melainkan mengalir secara alami (`.text-reading`), sesuai dengan `book-editor-rework`.
- URL gambar HTTPS yang menempel atau berada di dalam kolom tugas (`must_do`, `should_do`, `aspire_to_do`, `self_check`, `objectives`) kini otomatis di-render sebagai elemen `<img>` alih-alih teks mentah.
- Marker `fyk*` dan `kc*` kini mendukung parsing definisi multi-baris pada kolom `kamus_coder` dan `for_your_knowledge`.
- Task sections kembali memakai label literal dan floating-badge treatment approved: `MUST DO`, `SHOULD DO`, `ASPIRE TO DO`, dan `SELF-CHECK`.
- URL gambar HTTPS yang menempel pada prose kini dipisahkan menjadi image block
  tanpa mengubah source text; missing `kc`/`fyk` definition tidak lagi mencetak
  placeholder error ke modul.
- Ordinary A4 content kini mengalir tanpa card chrome permanen, sementara
  semantic components tetap mempertahankan treatment visual approved.
- Angka pada badge nomor halaman kiri dan kanan kini terpusat konsisten pada
  ornamen footer kanonis.
- Live A4 preview kini memakai image-width metadata dari draft aktif sehingga
  slider resize bereflow real-time sebelum autosave.
- Paragraf berurutan dirender sebagai satu visual section dan hanya dipecah pada
  batas paragraf ketika berpindah halaman, bukan menjadi card per baris.

- Phase 5 full-level A4 composer with generated native canonical SVG templates,
  cover/guide/TOC/openers/content/fillers/back cover, DOM measurement, global
  page-side parity, visible-number TOC stabilization, long-topic policy,
  table continuation, and blocking overflow diagnostics.
- Phase 5 unit and real-browser 12-session stress tooling with forced TOC-limit
  failure coverage and an all-page visual contact sheet.
- Restored approved editor component/image styling inside the redesigned
  dashboard without rolling back its fullscreen layout.
- Phase 4 semantic visual tables dengan `_Generator_Tables` persistence,
  combined revision/history, deterministic anchor, stale-anchor recovery,
  repeated continuation header, dan whole-row pagination diagnostics.
- Restored the Phase 4 table toolbar DOM contract after the dashboard redesign,
  added initialization regression coverage, and removed the client-side direct
  Spreadsheet iframe to preserve the server-owned Spreadsheet boundary.

- PRD v1.1 sebagai implementation contract untuk SCL Module Generator & Editor.
- Repository-local AI workflow melalui `AGENTS.md`.
- Delivery plan, architecture overview, decision index, testing contract,
  security policy, operational runbook, dan append-only worklog.
- Apps Script Phase 0 runtime foundation: public login shell, signed absolute-
  expiry session, server-owned course allowlist, configuration validation, dan
  hidden-storage safe setup/repair.
- Project-local clasp tooling, static/unit/format gate, local browser preview,
  serta offline helper untuk menyiapkan Script Properties secret material.
- Phase 1 read-only Spreadsheet normalized model: deterministic header
  discovery, bounded batch values/rich-text reads, 12-session status,
  rich-text/grammar/task/quiz/image parsing, source revision, dan three-course
  synthetic fixtures dengan call-count instrumentation.
- Course → level → normalized 12-session browser workspace dengan explicit
  read-only status, desktop/mobile browser QC, dan authenticated real-source
  `/dev` acceptance untuk Roblox, Scratch, serta Python.
- Phase 2 local collaboration foundation: hashed per-session lease with
  heartbeat/stale expiry, revision-aware idempotent patch saves, immediate local
  recovery drafts, 20-entry history, restore-as-new-revision, bounded audit
  metadata, dan synthetic two-context browser QC tooling.
- Phase 3 approved visual editor: native rich-text block editing, marker-safe
  reorder, undo/redo, HTTPS image sizing, persisted manual page breaks, static
  task visuals, live component preview, and browser round-trip QC. Visual owner
  acceptance remains pending.

### Security

- Menetapkan Script Properties sebagai satu-satunya tempat credential runtime.
- Menetapkan larangan menyimpan plaintext credential dan answer key pada source,
  client payload, log, PDF, fixture, atau dokumentasi.
- Mengisolasi field answer sebelum normalized RPC serialization dan menambahkan
  synthetic sentinel regression test untuk response/client boundary.
- Memvalidasi absolute token expiry pada seluruh Phase 2 mutation, menyimpan
  hanya hash lease token, dan membatasi history response ke metadata tanpa
  snapshot atau answer content.

### Fixed

- Mengubah live preview session menjadi alur halaman vertikal penuh yang
  memanjangkan halaman editor, serta menghapus kontrol zoom duplikat.
- Menjaga live preview tetap terlihat saat editor menggulir ke konten bawah
  melalui panel sticky setinggi viewport dengan scroll halaman preview mandiri.
- Mempertahankan halaman dan offset scroll live preview saat edit, resize gambar,
  atau repagination membangun ulang DOM preview.
- Memastikan atribut `hidden` selalu menyembunyikan login view sehingga login
  sukses benar-benar berpindah ke Phase 0 workspace.
- Meminta self-declared editor label secara eksplisit ketika Apps Script tidak
  menyediakan email, sesuai fallback identity contract.
- Menangani rejection autosave pada jalur fire-and-forget setelah recovery dan
  conflict UI diperbarui, sehingga save conflict tidak menjadi unhandled browser
  page error.
