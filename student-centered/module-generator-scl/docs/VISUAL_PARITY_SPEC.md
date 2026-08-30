# Visual Parity Specification — SCL Module Editor and PDF

Dokumen ini adalah kontrak visual turunan PRD v2. Jika ada konflik requirement,
`../PRD.md` menang. Tujuannya bukan membuat desain baru, melainkan menjaga
renderer/editor `book-editor-rework` sambil memindahkan runtime ke Apps Script
dan mengganti export raster dengan browser print.

## 1. Authoritative References

Urutan authority visual:

1. komponen, typography, content flow, resize, reflow, dan editing behavior pada
   `../../book-editor-rework/templates/modern.html`;
2. serialized component behavior pada `../../book-editor-rework/app.py`;
3. geometri content viewport pada `../../book-editor-rework/export_slides.gs`;
4. enam background template kanonis pada `../back-module/`;
5. golden screenshots/PDF yang dibuat pada Migration M0.

Source baru tidak boleh menafsirkan ulang baseline berdasarkan nama class,
PRD historis, atau renderer Apps Script lama. Perbandingan dilakukan terhadap
DOM/render artifact aktual.

## 2. Physical Page and Coordinate System

Semua halaman menggunakan A4 portrait:

- physical page: `21 cm × 29.7 cm`;
- CSS print page: `@page { size: A4 portrait; margin: 0; }`;
- design viewport: `793.700787 × 1122.519685 px` pada 96 CSS px/in;
- screen zoom tidak mengubah print geometry.

Legacy reference tetap dicatat oleh M0, tetapi target template non-cover memakai
geometry yang disetujui pada 4 Agustus 2026:

| Property | Value |
|---|---:|
| Left | `1.38 cm` |
| Top | `3.22 cm` |
| Width | `18.38 cm` |
| Height | `23.86 cm` |
| Internal padding | `0.25 cm` tiap sisi |

Posisi tersebut berlaku pada `beginning-kiri`, `beginning-kanan`, `plain-kiri`,
dan `plain-kanan`, tetapi tidak pada cover. Renderer mengisi viewport dengan DOM
legacy; background A4 berada di layer terpisah. Body copy default memakai
Poppins `14 pt`; heading dan semantic label mengikuti registry tersendiri.

## 3. Canonical Page Roles

| Role | Background asset | Dynamic overlay |
|---|---|---|
| Cover | `cover-scl.svg` | course title + level subtitle |
| Guide left/right | `beginning-kiri-scl.svg` / `beginning-kanan-scl.svg` sesuai parity | native HTML component guide |
| TOC left/right | `beginning-kiri-scl.svg` / `beginning-kanan-scl.svg` sesuai parity | native HTML entries + page numbers |
| Session opener left | `beginning-kiri-scl.svg` | session label + complete topic |
| Session opener right | `beginning-kanan-scl.svg` | reserved; not default |
| Content left | `plain-kiri-scl.svg` | header, topic, legacy content, page number |
| Content right/filler | `plain-kanan-scl.svg` | header/topic/content when applicable |
| Back cover | `back-cover-scl.svg` | none unless explicitly approved |

The SVG files are immutable design assets. Generated pages clone them without
editing the source files.

## 4. Dynamic Text Geometry

Title, subtitle, session header, topic, TOC text, and page numbers must remain
native HTML. They must not be baked into raster background images or generated
as Google Slides text boxes.

Initial cover geometry from the approved Slides evidence:

| Element | X | Y | Width | Reference height |
|---|---:|---:|---:|---:|
| Cover title | `0.72 cm` | `10.31 cm` | `19.57 cm` | `2.46 cm` |
| Cover subtitle | `0.72 cm` | `12.77 cm` | `19.57 cm` | `1.82 cm` |

Initial content footer geometry:

| Element | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| Left page number | `0.99 cm` | `28.00 cm` | `1.19 cm` | `0.90 cm` |
| Right page number | `18.93 cm` | `28.01 cm` | `1.17 cm` | `0.90 cm` |

Content-header geometry after the 6 Agustus 2026 optical correction:

| Element | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| Session header ribbon copy | `1.50 cm` | `1.28 cm` | `8.20 cm` | `1.22 cm` |

The header copy is vertically centered inside this fixed slot. Opener topics
reserve their complete two-line Poppins line box and must not flex-shrink or
clip glyphs. A source image with no persisted manual width starts at 69% of the
content viewport and every image block is horizontally centered; explicit user
widths from 25–100% remain unchanged.
Natural/preflight dimensions for top-level and nested images must be cached when
available, pagination reruns after images settle, and real descendant bounds
must remain inside the content safe area.

These values are starting coordinates, not permission to skip rendered
comparison. M0 geometry QA may apply small optical corrections and must record
them here.

M0 optical review menetapkan content viewport dan typography pada Section 2
sebagai target approved. Guide wajib menunjukkan nama, fungsi, dan treatment
visual bagian buku; TOC dan Guide wajib memakai background beginning sesuai
parity fisik.

Every dynamic text slot declares:

- fixed position and maximum box size;
- font family, weight, size, and line height;
- horizontal and vertical alignment;
- padding;
- maximum line count;
- deterministic long-text fallback.

`fit-content`, DOM-dependent centering, and browser/Slides autofit are forbidden
for template text slots.

## 5. Long-Text Policy

- Cover title: centered, bounded box, deterministic stepped font reduction.
- Cover subtitle: one line unless the approved baseline explicitly permits two.
- Content header: fixed safe area inside the blue ribbon; never sized to the
  placeholder text.
- Session topic: preserve full source; render at most two lines on opener and one
  bounded line on ordinary content pages.
- Page number: fixed line box and tabular numerals; left and right coordinates
  are separate.
- Ellipsis is visual only. Source text and saved content remain complete.

## 6. Legacy Component Contract

The following component families reuse their authoritative legacy DOM/CSS:

- objectives;
- lesson-flow paragraphs and steps;
- resizable image cards;
- Tutor Says;
- Did You Know;
- MUST DO;
- SHOULD DO;
- ASPIRE TO DO;
- self-check;
- quiz question/options without answer keys;
- semantic tables added by the Apps Script editor.

Ordinary content must not acquire new permanent card chrome. Semantic component
cards retain their approved borders, labels, colors, radii, and shadows.

## 7. Editor Parity

The Apps Script workspace preserves the legacy document-editing behavior:

- visible physical pages;
- direct structured text editing on the rendered module surface;
- formatting controls;
- standalone HTTPS image URL conversion to an in-flow visual block;
- proportional inline image resize that pushes following content up/down;
- automatic DOM-measured repagination;
- manual repagination;
- undo/redo;
- stable scroll anchor during reflow;
- clean print mode without caret, selection, handles, or toolbar.

Only fixed template overlays such as cover copy, session header, topic, TOC,
and page number use coordinate slots. Ordinary module content and images remain
in normal flow; they must never behave as free-floating Slides textboxes or
overlap neighboring content during editing.

Collaboration remains per session. Editing one session does not acquire a lock
for the entire level. Publishing composes every saved session in the selected
course + level into one PDF.

## 8. Responsive and Print Behavior

- Desktop is the authoritative editing viewport.
- Smaller screens may scale or stack controls but do not change A4 geometry.
- Preview and print use the same page DOM and component CSS.
- Print removes screen shadow/gap/zoom only.
- Text must remain selectable in the resulting PDF.
- SVG remains vector where the canonical asset itself is vector; source raster
  artwork is not upscaled and described as vector.

## 9. Parity Evidence and Thresholds

M0 creates golden artifacts for representative early, middle, and late pages.
Acceptance requires:

- matching page role and content order;
- matching content viewport geometry within `±1 CSS px` at canonical scale;
- dynamic text slot position within `±1 CSS px` after optical correction;
- no unexpected line-wrap difference for identical fixture text;
- no missing/duplicated component;
- zero hidden overflow;
- visual-diff review for anti-aliasing differences that cannot be evaluated by
  a raw pixel threshold alone.

No phase may claim exact parity from source inspection alone.

M0 local baseline berada di `golden/m0/manifest.json`. Artifact tersebut memakai
fixture sanitized Roblox/Scratch, mengikat source authority dan seluruh output
dengan SHA-256, serta mencatat computed styles dan page-role geometry. Artifact
menjadi golden approved hanya setelah Product/Design menyetujui optical offsets
dan review tersebut dicatat di `WORKLOG.md`.

## 10. Change Control

Any intentional visual change requires:

1. updated PRD/decision when behavior changes;
2. updated value or component rule in this document;
3. refreshed golden artifact;
4. before/after rendered evidence;
5. Design/Product approval recorded in `WORKLOG.md`.
