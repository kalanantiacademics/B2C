# Kalananti SCL Module Generator & Editor

Repository ini akan berisi Google Apps Script Web App untuk membaca, mengedit,
menyimpan, menyusun, dan mencetak modul SCL per course dan level. Google
Spreadsheet tetap menjadi single source of truth; output PDF dibuat melalui
browser print A4.

> Status saat ini: **Title fitting dan hierarchy Markdown heading telah dirilis
> sebagai immutable production version 33 pada 30 Agustus 2026; version 32
> tersedia
> sebagai rollback target. Apps
> Script HEAD telah diverifikasi identik dengan 25 runtime files lokal dan
> public read-only `/exec` smoke lulus. P4 source foundation sudah diamankan,
> tetapi target folder yang pernah terpapar tetap harus dirotasi dan actual
> synthetic owner fixture belum memiliki evidence lengkap. P5–P6 direct Drive
> publish deferred; browser Print / Save as PDF tetap output resmi.**
> Backend Apps Script v1
> (parser, collaboration, persistence, history, image preflight) tetap reusable,
> tetapi editor/renderer v1 superseded karena belum match
> `book-editor-rework`. Approved non-cover viewport adalah `18.38 × 23.86 cm`
> pada `x=1.38 cm`, `y=3.22 cm`, dengan Poppins 14 pt. Version 17 dipertahankan
> sebagai rollback target; authenticated application smoke dengan passcode dan
> rotated P4 owner fixture tetap pending.

## Start Here

AI agent dan contributor harus membaca dalam urutan berikut:

1. [`AGENTS.md`](AGENTS.md) — aturan kerja repository.
2. [`PRD.md`](PRD.md) — kontrak produk dan acceptance criteria utama.
3. [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — fase aktif,
   task, dan gate.
4. [`docs/IMPLEMENTATION_PLAN_V2.md`](docs/IMPLEMENTATION_PLAN_V2.md) — plan
   active parallel track untuk sidebar, activity log, publish history, dan
   PDF-to-Drive.
5. Entri terbaru [`docs/WORKLOG.md`](docs/WORKLOG.md) — status operasional dan
   evidence terakhir.
6. Dokumen domain yang relevan di bawah.

## Documentation Map

| Dokumen | Fungsi | Authority |
|---|---|---|
| `PRD.md` | Scope, requirement, AC, design/pagination contract | Product SSOT |
| `AGENTS.md` | Cara agent bekerja dan menjaga repository | Workflow contract |
| `docs/IMPLEMENTATION_PLAN.md` | Fase, status, dependencies, exit gates | Delivery status SSOT |
| `docs/IMPLEMENTATION_PLAN_V2.md` | Active post-MVP Drive publishing phases and gates | V2 delivery SSOT |
| `docs/WORKLOG.md` | Riwayat operasional append-only | Evidence log |
| `CHANGELOG.md` | Perubahan notable dan release | Release summary |
| `docs/ARCHITECTURE.md` | Boundary dan target component/data flow | Technical overview |
| `docs/DECISIONS.md` | Keputusan accepted dan konfigurasi terbuka | Decision index |
| `docs/TESTING.md` | Test layers, fixtures, dan acceptance evidence | QA contract |
| `docs/VISUAL_PARITY_SPEC.md` | Geometry, component, dan golden parity | Visual contract |
| `docs/RUNBOOK.md` | Setup, operations, release, rollback | Operational procedure |
| `SECURITY.md` | Secret, auth, privacy, SSRF, dan safe logging | Security contract |
| `prd-awal.md` | Discovery awal | Historical only |

Baseline visual/editor authoritative berada di
`../book-editor-rework/templates/modern.html`; requirement produk aktif tetap
`PRD.md` di repository ini. Aset halaman kanonis berada di `back-module/`.

## Target Scope

- Course: Roblox Studio, Scratch, dan Python.
- Satu generate: satu course + satu level, dengan slot Session 1–12.
- Editor: paged legacy-parity editing, rich text, gambar URL, task/self-check,
  tabel, resize, reflow, undo/redo, dan history.
- Collaboration: lock per session dan revision-aware autosave.
- Publishing: satu PDF per course + level, termasuk cover, guide, TOC, opener
  kiri, content pages, filler, dan back cover.
- Output: PDF A4 melalui browser print; tidak memakai Google Slides.
- Active post-MVP V2: sidebar final, Activity Log, publish registry, dan
  route/recovery dan parser Markdown legacy sudah dirilis pada production
  version 33. P4 actual rotated
  synthetic Drive fixture dan P5–P6 direct publish belum lulus.

Detail lengkap dan pengecualian berada di `PRD.md`.

## Current Repository Shape

```text
module-generator-scl/
├── AGENTS.md
├── CHANGELOG.md
├── PRD.md
├── README.md
├── SECURITY.md
├── back-module/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── IMPLEMENTATION_PLAN_V2.md
│   ├── RUNBOOK.md
│   ├── TESTING.md
│   └── WORKLOG.md
├── scripts/
├── src/
├── tests/
├── package.json
├── package-lock.json
└── prd-awal.md
```

Runtime v1 berada di `src/`. Migrasi PRD v2 mengikuti M0–M8 pada
`docs/IMPLEMENTATION_PLAN.md`; jangan menganggap visual v1 sebagai target final.
Command yang ada tetap menjadi regression backend sampai parity commands M0–M7
ditambahkan.

## Status Vocabulary

- `Not started`: belum ada implementation evidence.
- `In progress`: source sedang dikerjakan; exit gate belum lulus.
- `Locally verified`: checks lokal lulus, belum tentu sudah di-push.
- `Current code`: source sudah di-push ke Apps Script HEAD.
- `Production`: immutable deployment sudah diperbarui dan smoke-tested.
- `Blocked`: ada dependency/decision eksplisit yang mencegah progres aman.
