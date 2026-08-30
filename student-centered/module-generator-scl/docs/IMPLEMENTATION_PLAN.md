# Implementation Plan — PRD v2 Visual-Parity Migration

Dokumen ini adalah SSOT status delivery PRD v2. Requirement/acceptance tetap
dimiliki `../PRD.md`; geometry visual dimiliki `VISUAL_PARITY_SPEC.md`.

> Perluasan pasca-MVP untuk sidebar final, activity log, publish registry, dan
> direct PDF-to-Drive aktif sebagai parallel track pada
> `IMPLEMENTATION_PLAN_V2.md`. P1–P3 dan source P4 memiliki historical release
> evidence. Correction security/recovery 8 Agustus 2026 sudah dirilis sebagai
> production version 32 dengan version 31 sebagai rollback target.
> Actual owner Drive fixture P4 tetap pending dan P5–P6 deferred. Track ini tidak
> menutup exit gate M8 lama secara retroaktif.

## Current State

| Field              | Value                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Active migration   | M8 — Apps Script HEAD Sync and Production Release                                          |
| Status             | Production version 32 released; authenticated application smoke and rotated P4 owner fixture pending |
| Last verified      | 30 Agustus 2026 (local, HEAD, immutable production, public shell)                           |
| Reusable backend   | Auth, allowlist, parser, locking, revision save, history, table store, image preflight      |
| Superseded path    | Renderer/editor v1 in`src/Editor.html`, `src/Publisher.html`, and related v1 visual CSS |
| Visual authority   | `../book-editor-rework/templates/modern.html`                                             |
| Template authority | Six SVG files in`back-module/`                                                            |
| Output target      | One direct-browser A4 PDF per course + level                                                |
| Apps Script HEAD   | 25 runtime files; fresh-pull comparison has zero differences                               |
| Production         | Immutable version 32; public `/exec` smoke passed; version 31 retained for rollback          |

Phase 0–7 evidence from PRD v1 remains historical proof for reusable backend
capabilities. It is not visual acceptance for PRD v2. No migration phase is
complete until its new rendered evidence and tests pass.

### Local foundation already implemented during M0

The following work is available for fixture validation but does not advance the
active phase or close M1–M7:

- versioned `scl-legacy-component/v1` compatibility adapter with deterministic
  component/field identity and answer isolation;
- legacy component DOM/CSS in the shared session/full-level renderer;
- canonical legacy viewport and native-HTML cover/header/page-number geometry;
- repeated semantic table headers, preflight image-ratio propagation, font-ready
  re-pagination, and margin-aware overflow measurement;
- direct A4 browser-PDF fixtures for Roblox, Scratch, and Python.

M0 golden artifacts and the approved target override are recorded. The runtime
foundation remains provisional until M1–M7 implement and validate that target.
The permanent authoring surface is still the v1 editor with a separate A4
preview; M1 is not complete.

## Migration Rules

- Work one active migration phase at a time.
- Jalankan satu acceptance checkpoint per working turn; setelah validation,
  berhenti dan serahkan artifact/status kepada user sebelum checkpoint berikutnya.
- Jangan menghabiskan satu turn untuk menulis seluruh M1–M8. Jika suatu phase
  besar, gunakan numbered checkpoints di dalam phase tanpa mengubah exit gate.
- Preserve unrelated user changes and historical worklog entries.
- Do not rewrite the parser merely to fit the renderer; use a compatibility
  adapter.
- Do not change canonical `back-module/*.svg` assets without Design approval.
- Do not store raw full-page HTML as shared source state.
- Do not write tests against production Spreadsheet.
- Do not push Apps Script HEAD or deploy production as a validation side effect.
- Pixel/geometry claims require current rendered artifacts.
- A phase is complete only after source, tests, artifacts, documentation, and
  the stated exit gate pass.

## M0 — Documentation Rebaseline and Golden Baseline

**Status:** Complete

**Primary acceptance:** AC-062–AC-065A

### Tasks

- [X] Confirm shared collaborative persistence.
- [X] Confirm edit lock per session and publish per course + level.
- [X] Confirm `book-editor-rework/templates/modern.html` as visual authority.
- [X] Confirm `back-module/*.svg` as canonical template assets.
- [X] Write PRD v2 migration contract and visual parity specification.
- [X] Produce sanitized legacy golden fixtures for Roblox and Scratch.
- [X] Capture representative legacy editor pages and page-role geometry.
- [X] Record typography/component computed styles and approved optical offsets.
- [X] Add golden manifest with artifact hashes and fixture identity.

### Exit Gate

- PRD v2, decisions, architecture, test plan, and visual spec agree.
- Golden artifacts cover cover/title, ordinary flow, steps/images, semantic
  cards, left/right content, page number, late session, and back cover.
- Baseline can be reproduced without production Spreadsheet mutation.

## M1 — Apps Script Legacy-Editor Shell

**Status:** Complete

**Primary acceptance:** AC-001–AC-004, AC-062, AC-066

### Tasks

#### M1.1 — Reviewable local shell

- [X] Preserve login, course/level selection, session sidebar, lock/save status,
  history, and print entry points.
- [X] Introduce isolated legacy-editor CSS namespace and paged session canvas.
- [X] Add a persistent local fixture/review command that user can open and use
  interactively, not only a headless screenshot.

**Checkpoint:** user can open the local shell and approve its overall editor
layout before editing behavior is expanded.

#### M1.2 — Direct document editing

- [X] Port legacy toolbar, direct structured `contenteditable`, undo/redo,
  selection-safe commands, and scroll anchoring without Flask/Tailwind runtime
  dependency.
- [X] Replace permanent v1 block-card authoring surface with the paged editor.

**Checkpoint:** typing, formatting, undo/redo, caret, selection, and scroll
behavior pass browser tests and user interaction review.

#### M1.3 — Image and live reflow

- [X] Convert standalone pasted/inserted HTTPS image URLs in-place to selected
  image blocks with replace/delete and proportional handles/percentage resize.
- [X] Reflow body content and page boundaries within 300 ms of typing/image
  resize while preserving caret, selection, and viewport anchor.

**Checkpoint:** paste URL, image conversion, resize, delete/replace, and
up/down page reflow pass browser tests and user interaction review.

#### M1.4 — Existing collaboration boundary

- [X] Keep active lease/read-only behavior per session.
- [X] Add local Apps Script-compatible fixture shell.

**Checkpoint:** existing per-session lease, autosave serializer, recovery, and
history regression checks pass without implementing `_Generator_Layouts` yet.

### Exit Gate

- Session editor runs in Apps Script-compatible HTML with zero Flask endpoint.
- Typing and image resize push subsequent content/pages up or down without
  overlap, fixed textbox positioning, or a separate form-to-preview workflow.
- Same-session lock/read-only behavior remains intact.
- No editor chrome enters print DOM.

## M2 — Normalized-to-Legacy Compatibility Adapter

**Status:** Complete — locally verified 4 Agustus 2026

**Primary acceptance:** AC-011–AC-017, AC-024, AC-062, AC-065

### Tasks

- [X] Define versioned `scl-legacy-component/v1` client model.
- [X] Adapt objectives, materials flow, steps, images, `kc`, `fyk`, tasks,
  self-check, quiz, rich text, manual breaks, and tables.
- [X] Preserve field/block identity for reverse serialization.
- [X] Preserve marker order and answer isolation.
- [X] Add adapter unit/golden tests for Roblox, Scratch, and Python shapes.
- [X] Correct Python fenced-code parity with a safe IDE component and real-browser
  evidence; keep Scratch/Roblox parsing unchanged (AC-017A).
- [X] Correct opener/content hierarchy: all objectives only on opener, visible
  session-topic headers, Kalananti list markers, and zero hidden overflow.
- [X] Use remaining opener space as the first materials flow region and restore
  dominant session/smaller-topic hierarchy on continuation headers.
- [X] Add tall screen-only live-preview zoom controls and keep valid leases during
  retryable `SERVER_BUSY` heartbeat/autosave responses.

### Exit Gate

- Identical normalized fixture produces the legacy component order and family.
- No quiz answer name/value/sentinel reaches adapter output or DOM.
- Reverse mapping identifies the correct Spreadsheet field and block.

## M3 — Authoritative Legacy Renderer and DOM Pagination

**Status:** Complete — locally verified 4 Agustus 2026

**Primary acceptance:** AC-018–AC-024, AC-039–AC-045, AC-062–AC-065

### Tasks

- [X] Port authoritative component DOM/CSS from `modern.html`.
- [X] Port deep flatten, continuation merge, oversize splitting, page reflow,
  and image-triggered repagination.
- [X] Use the approved `18.38 cm × 23.86 cm` editor/content viewport at
  `x=1.38 cm`, `y=3.22 cm`, with `0.25 cm` padding and Poppins 14 pt body copy.
- [X] Remove v1 component reinterpretations from the active render path.
- [X] Add stable selection/scroll restoration during reflow.
- [X] Add rendered legacy-versus-Apps-Script comparison tooling.

### Exit Gate

- Golden fixtures match content order, component style, wrapping, and geometry
  within `VISUAL_PARITY_SPEC.md` tolerances.
- Editing/resizing does not duplicate, drop, or reorder content.
- Zero hidden overflow on representative session pages.

## M4 — Collaborative Inline Editing and Structured Layout Persistence

**Status:** Complete — locally verified 4 Agustus 2026

**Primary acceptance:** AC-030–AC-038, AC-066–AC-067

### Tasks

- [X] Define `_Generator_Layouts` schema and corruption/safe-mode rules.
- [X] Store only stable block identity, order, image size, manual break, and
  allowlisted layout attributes.
- [X] Include layout state in combined revision/history boundaries.
- [X] Map text/rich edits back to existing source field patches.
- [X] Preserve five-second autosave, local recovery, lease heartbeat, conflict
  rejection, history, and restore.
- [X] Add non-production migration, reload, cross-device, conflict, and
  two-context tests.

### Exit Gate

- Content and layout edits reload from another browser context.
- Different sessions can be edited concurrently; the same session cannot.
- Raw HTML, executable attributes, answer keys, and unknown fields are rejected.
- Direct Sheet conflicts never use silent last-write-wins.

## M5 — Deterministic A4 Template Composition

**Status:** Complete — locally verified 4 Agustus 2026

**Primary acceptance:** AC-039–AC-045, AC-063–AC-064, AC-069

### Tasks

- [X] Compose canonical SVG backgrounds per page role.
- [X] Place content on four non-cover templates at `x=1.38 cm`, `y=3.22 cm`,
  width `18.38 cm`, height `23.86 cm`, padding `0.25 cm`, with Poppins 14 pt
  default body copy.
- [X] Compose Guide and TOC on side-aware beginning-left/right backgrounds;
  Guide explains every approved book-part treatment.
- [X] Compose hardcover front matter in approved order: blank verso, static
  owner-approved copyright, static usage warning, complete two-page-capable
  Guide, then TOC.
- [X] Render Copyright/Warning on beginning-right/left with centered legal cards
  and roman footer numbers only; pair every Guide explanation with a
  shared-renderer visual miniature rather than text-only descriptions.
- [X] Add printed/clickable INS CTA to `https://www.kalananti.id/scl-student`
  without a runtime third-party QR dependency.
- [X] Implement native-HTML coordinate registry for title, subtitle, header,
  topic, TOC entries, and left/right page numbers.
- [X] Implement deterministic long-text font stepping/wrap/ellipsis.
- [X] Preserve session-opener-left, filler, global parity, numbering, and TOC
  stabilization.
- [X] Add geometry assertions at canonical scale.

### Exit Gate

- Short/long fixture text never moves its slot or changes page-role geometry.
- Header never collapses to placeholder width or wraps unpredictably.
- Left/right page numbers match approved optical centers.
- Editor, full-level preview, and print share the same composed page DOM.

## M6 — Direct Browser PDF and Preflight

**Status:** Complete — locally verified 4 Agustus 2026

**Primary acceptance:** AC-046–AC-051, AC-057, AC-068–AC-070

### Tasks

- [X] Flush active draft before full-level publishing.
- [X] Compose one complete course + level document.
- [X] Wait for fonts and expected image load/decode.
- [X] Run overflow, missing image, DPI, layout, save-state, and privacy gates.
- [X] Apply A4 print CSS and hide all editor chrome.
- [X] Invoke browser print without screenshot/Slides intermediate.
- [X] Provide recommended filename and browser instructions.

### Exit Gate

- Actual PDF uses A4 media boxes and selectable body text.
- No full-page PNG/JPEG payload or Google Slides call exists in the print path.
- Cover through Session 12 and back cover are complete.

## M7 — Full Parity, Collaboration, and PDF QA

**Status:** QA complete locally — Product/Design acceptance pending

**Primary acceptance:** AC-001–AC-070

### Tasks

- [X] Run static/unit/integration checks.
- [X] Run Roblox, Scratch, and Python browser fixtures.
- [X] Run two-context lock/save/history/layout tests.
- [X] Run 12-session pagination stress and long-text geometry fixtures.
- [X] Generate actual golden PDF per course.
- [X] Inspect every page via contact sheets and representative full-size renders.
- [X] Verify selectable text, no answer leak, no missing image, zero overflow,
  correct TOC/parity/page number, late Session 12, and back cover.
- [ ] Obtain Product/Design visual acceptance.

### Exit Gate

- All required commands pass with actual recorded counts.
- All pages of all golden PDFs are reviewed.
- Product/Design approves parity or records explicit accepted deviations.

## M8 — Apps Script HEAD Sync and Production Release

**Status:** In progress — P4 security correction and P7 durable route/same-tab
resume are live in immutable production version 19. Fresh HEAD pull/compare and
public shell smoke passed. Rotated P4 owner configuration/fixture and
authenticated application smoke remain pending external gates.

Latest local evidence on 8 Agustus 2026: `npm run qc:m7:full` passed all 12/12
commands in 153.79 seconds, including 85/85 static/unit/fixture tests, the
two-context collaboration regression, the dedicated P7 recovery matrix, and
full-page inspection of three 34-page actual A4 PDFs. A fresh pre-release rerun
also passed 12/12 in 133.85 seconds immediately before the release.

**Primary acceptance:** AC-052–AC-055

### Tasks

- [X] Run local checks for the latest source.
- [X] Push and pull-compare the latest Apps Script current code only after
  authorization.
- [ ] Smoke-test authenticated `/dev` with read-only/fixture-safe operations.
- [ ] Confirm rotated production configuration and ownership.
- [X] Create a new immutable version and update `/exec` only after separate
  production authorization.
- [X] Run unauthenticated `/exec` login-shell and content-leak smoke test for the
  new immutable release.
- [ ] Run authenticated production smoke test and verify rollback.

### Exit Gate

- Local source, Apps Script HEAD, and immutable production version are recorded
  separately.
- Production smoke test, rollback, and owner acceptance are complete.

## Open Operational Dependencies

- Deployment owner and production Spreadsheet target.
- Rotated passcode/signing material in Script Properties.
- Official QA browser list.
- Hidden-tab protection owner/group.
- Final Academic Content acceptance owner.

These dependencies do not block M0–M7 local/fixture implementation. They block
production configuration and release only.
