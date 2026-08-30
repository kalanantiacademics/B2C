# Decision Index

Dokumen ini mengindeks keputusan yang sudah diterima agar agent cepat menemukan
batas scope. Detail normatif tetap berada di `../PRD.md`.

## Accepted Decisions

| ID | Decision | Source |
|---|---|---|
| DEC-001 | Apps Script Web App memakai surface `Anyone` + team passcode | PRD 1.2, 17 |
| DEC-002 | Spreadsheet adalah SSOT dan save kembali ke source row | PRD 5 |
| DEC-003 | Source hanya tiga allowlisted `_Modul` tabs | PRD 5.3 |
| DEC-004 | Satu project adalah satu course + level, target 12 session | PRD 1.2, 5.6 |
| DEC-005 | Lock per session memakai heartbeat 30 detik dan stale expiry 1 menit; bukan real-time co-editing | PRD 10 |
| DEC-006 | Autosave revision-aware, idempotent, dan memiliki history | PRD 11 |
| DEC-007 | Grammar lama `kc`/`fyk` dibekukan dan dipertahankan | PRD 6 |
| DEC-008 | Tabel visual disimpan di hidden app-managed storage | PRD 7 |
| DEC-009 | Gambar hanya dari HTTPS URL; invalid/broken image memblokir print | PRD 8, 14 |
| DEC-010 | `quiz_answers` server-only dan tidak masuk renderer/PDF | PRD 6.8, 17 |
| DEC-011 | Session opener selalu page side kiri; filler boleh ditambahkan | PRD 12.6–12.7 |
| DEC-012 | Browser print A4, bukan Google Slides, menjadi output MVP | PRD 3.3, 14 |
| DEC-013 | Legacy-parity paged document adalah authoring surface; normalized blocks tetap internal | PRD 9.6, AC-018A, AC-062 |
| DEC-014 | DOM measurement memiliki ownership pagination | PRD 13 |
| DEC-015 | Hidden storage auto-healing harus additive/non-destructive | PRD 5.7 |
| DEC-016 | Load level memakai one browser RPC dan bounded batch reads | PRD 16.3 |
| DEC-017 | Session token default 12 jam absolute expiry | PRD 17 |
| DEC-018 | TOC stabilization default maksimal lima iterasi | PRD 13.3, 17 |
| DEC-019 | `Session-topic` soft limit 80, source tidak dipotong | PRD 12.6, 17 |
| DEC-020 | `book-editor-rework/templates/modern.html` adalah authority DOM/CSS/editor; `back-module/*.svg` adalah authority background template | PRD 1.2, 12.2, 12.9 |
| DEC-021 | Deployment status local, HEAD, dan production selalu terpisah | PRD 20.2 |
| DEC-022 | Hidden-tab schema version memakai sheet-scoped developer metadata; `_Generator_Audit` memakai bounded metadata columns tanpa full payload | Phase 0 implementation detail, PRD 5.7/11.5/20.1 |
| DEC-023 | Authoring lock tetap per session; publishing menghasilkan satu PDF per course + level | PRD 1.2, 9, AC-066, AC-068 |
| DEC-024 | Content edits kembali ke source fields; layout edits shared sebagai structured revision-aware records, bukan raw full-page HTML | PRD 1.2, AC-067 |
| DEC-025 | Legacy content viewport memakai `x=0.74 cm`, `y=3.32 cm`, `19.55 cm × 23.93 cm` di atas A4 | PRD 12.1, AC-063 |
| DEC-026 | Dynamic template text adalah native HTML pada coordinate registry; Slides textbox/autofit dilarang | PRD 12.4, 12.6, 12.8, AC-064 |
| DEC-027 | Editor, full-level preview, dan print memakai authoritative component renderer yang sama | PRD 14, AC-069 |
| DEC-028 | Authoring UX memakai direct Google-Docs-like normal flow: text/image edit mereflow page secara real-time; hanya template overlay yang memakai fixed coordinates | PRD 9.6, AC-018B–AC-018D |
| DEC-029 | Target non-cover viewport memakai `1.38 × 3.22 cm`, ukuran `18.38 × 23.86 cm`, padding `0.25 cm`, dan Poppins 14 pt; nilai DEC-025 tetap historical reference tetapi superseded untuk target renderer | PRD 12.1, AC-063 |
| DEC-030 | Guide menjelaskan treatment bagian buku; Guide dan TOC memakai background beginning kiri/kanan sesuai physical parity | PRD 12.2, 12.5, AC-065A |
| DEC-031 | Hardcover front matter berurutan cover → blank verso → Hak Cipta beginning-right → Peringatan beginning-left → Guide lengkap → TOC; legal page hanya memiliki centered card dan roman footer number di atas canonical background | PRD 12.3, AC-065B, AC-065D |
| DEC-032 | Guide mengarahkan murid ke INS melalui URL publik tercetak/clickable `https://www.kalananti.id/scl-student`; QR eksternal runtime tidak digunakan | PRD 12.5, AC-065C |
| DEC-033 | Setiap penjelasan komponen pada Guide disertai miniature visual yang memakai treatment DOM/CSS aktual agar dapat dikenali anak | PRD 12.5, AC-065D |
| DEC-034 | Gambar tanpa resize eksplisit mulai pada 69% dan rata tengah; seluruh gambar nested maupun top-level harus selesai load, direpaginate, dan tetap di actual content bounds | PRD 8.3–8.4, AC-019, AC-019A, AC-057 |
| DEC-035 | Login shell menampilkan passcode dan fallback nama/email kerja sejak awal; identity wajib tidak boleh baru muncul sebagai error setelah submit pertama | PRD 9.1, AC-002 |
| DEC-036 | Aktivitas backend tampil melalui soft notification closable dengan loading/success/warning/error dan bounded client timeout; native alert/confirm tidak dipakai untuk error backend | PRD 15.3, AC-034–AC-034A |
| DEC-037 | UI memakai istilah `akses edit`, bukan lease/heartbeat; akses yang berakhir menyediakan CTA `Aktifkan edit lagi` dengan revision-check recovery dan draft lama tidak diterapkan otomatis bila source berubah | PRD 15.3, AC-032–AC-033A |
| DEC-038 | Post-MVP V2 menambahkan explicit `Publish ke Drive` setelah compose/preflight; Compose sendiri tidak membuat file dan browser print tetap fallback sampai parity diterima | PRD 29.1, V2-AC-006/V2-AC-013 |
| DEC-039 | Published Modules memakai app-native registry/list; setiap publish adalah immutable integer version, latest ditandai metadata, file lama tidak di-rename/overwrite, dan folder Drive tidak di-iframe | PRD 29.1–29.4, V2-AC-007–V2-AC-012 |
| DEC-040 | Deployment owner Apps Script melakukan Shared Drive-capable upload; folder identity tetap server-side dan renderer tidak memiliki Drive credential | PRD 29.2–29.3, V2-AC-009 |
| DEC-041 | Direct Drive PDF menargetkan controlled pinned-Chrome renderer dengan authoritative DOM/CSS; Apps Script-only conversion tidak boleh menggantikan output resmi tanpa actual-PDF parity evidence | PRD 29.3, V2-AC-010–V2-AC-011 |
| DEC-042 | Sidebar V2 berurutan Dashboard, Spreadsheet SSOT, Activity Log, Published Modules, dengan Settings terpisah; top profile memakai identity aktual dan New Module dipisahkan dari Logout | PRD 29.1, V2-AC-001–V2-AC-002 |
| DEC-043 | Logo sidebar memakai asset portrait tanpa box/crop, mempertahankan native aspect ratio dengan visible fallback dan focus treatment; keputusan ini menggantikan detail square-crop awal pada V2-AC-001 | PRD 29.1, V2-AC-001 |
| DEC-044 | Controlled renderer P5 dan end-to-end Drive publish P6 ditunda; browser Print / Save as PDF tetap output resmi dan current closeout tidak boleh mengklaim acceptance direct-Drive P5–P6 | PRD 29, V2 plan 8 |
| DEC-045 | Same-tab refresh mempertahankan structured edit-session identity dan raw lease token hanya di `sessionStorage`; resume memakai request identity idempotent, dapat memperpanjang record stale yang belum diambil alih secara atomik, dan transient transport failure tidak langsung membuang hak edit | PRD 9–11, V2-P7 |
| DEC-046 | Reader menerima legacy Markdown headings (`#`–`###`) dan inline emphasis (`**`, `*`, `__`, `_`, `***`) sebagai compatibility input; normalized model/serializer memakai semantic styles/native rich text dan tidak mengubah fenced-code literal | User request 2026-08-30, PRD 6.2 |

## Open Configuration Items

Item berikut bukan izin untuk membuka ulang scope. Nilainya harus diputuskan
owner yang tepat sebelum production:

- deployment owner;
- production Spreadsheet ID;
- rotated passcode material and signing secret;
- image byte limit;
- official QA browser list;
- hidden-tab protection owner/group;
- final Academic Content acceptance owner;
- override default token/TOC/topic limit bila diperlukan.
- temporary and production Drive folder owner/capability;
- renderer GCP project, billing/technical owner, region, limits, and monitoring;
- Drive OAuth scope consent owner and renderer secret-rotation owner;
- publish retention, orphan reconciliation, and production canary owner.

Lihat PRD Section 27 untuk daftar authoritative.

## Adding or Changing a Decision

1. Jelaskan masalah dan pilihan yang dipertimbangkan.
2. Minta owner sesuai PRD Section 4.4.
3. Ubah PRD terlebih dahulu bila product contract berubah.
4. Tambahkan decision baru; jangan diam-diam mengubah arti decision lama.
5. Perbarui implementation plan, tests, changelog, dan worklog yang terdampak.
