# Security Policy

Dokumen ini melengkapi security requirement pada PRD Sections 8, 17, dan 20.
Jika ada konflik, PRD yang telah disetujui menjadi authority utama.

## Secrets

Secret runtime hanya disimpan sebagai Apps Script Script Properties. Nama
property kanonis tercantum di PRD; nilainya tidak boleh masuk repository.

Dilarang menyimpan atau menampilkan:

- plaintext passcode/password;
- password salt/hash atau session signing secret;
- OAuth authorization URL, access/refresh token, cookie, atau API key;
- signed/private download URL;
- secret di screenshot, fixture, command output, worklog, atau changelog.

Credential yang pernah dibagikan dalam discovery dianggap terpapar. Deployment
owner harus merotasinya sebelum production. Jangan menyalin credential lama ke
Script Properties hanya karena pernah disebut user.

Phase 0 menyediakan `scripts/phase0-secrets.html` sebagai helper offline. Tool
ini hanya boleh dibuka lokal, tidak boleh di-host, dan nilainya harus ditempel
langsung ke Apps Script Project Settings. Tutup halaman setelah digunakan;
jangan menyimpan output melalui screenshot, console, file, chat, atau worklog.

## Authentication and Session

- Public `doGet()` hanya mengirim login shell, tanpa module content.
- Passcode diverifikasi server-side terhadap salted hash dengan comparison yang
  tidak membocorkan detail kegagalan.
- Session token signed, memiliki absolute expiry default 12 jam, dan disimpan
  pada `sessionStorage`.
- Semua read sensitif dan semua mutation memvalidasi token, expiry, allowlist,
  dan input schema.
- Login failure menggunakan best-effort rate limiting.
- Identitas email bersifat best effort; fallback label harus ditandai
  self-declared dan bukan identitas terverifikasi.

## Spreadsheet and Data Boundary

- Spreadsheet ID dan tab mapping dimiliki server.
- Client hanya mengirim course key, normalized level, session, dan patch yang
  tervalidasi.
- Backend tidak menerima arbitrary tab/range dari client.
- Test tidak boleh membaca/menulis production Spreadsheet kecuali smoke test
  read-only yang secara eksplisit diotorisasi.
- Hidden-tab schema corrupt/ambigu memblokir mutation; jangan auto-repair dengan
  menebak atau menghapus data.
- Client tidak mengirim row key atau nama tab pada acquire/save/restore; server
  menyelesaikan identity dari allowlisted course, normalized level, dan session.
- Raw lease token tidak disimpan di Spreadsheet, audit, atau log. Hidden lock
  record hanya menyimpan hash dan bounded lifecycle metadata.
- `_Generator_Layouts` hanya menerima schema allowlisted untuk stable block ID,
  order, bounded image display size, manual page break, dan layout attributes
  yang disetujui. Raw HTML, free-form `style`, event handler, script, data URL,
  blob, arbitrary selector, dan unknown key ditolak.
- Layout save berada pada lease/revision/history boundary yang sama dengan
  content patch agar collaborative reload tidak menghasilkan mixed revision.

## Academic Answer Isolation

`quiz_answers` adalah server-only sensitive academic data:

- parser harus membuangnya sebelum normalized client response dibuat;
- field tidak boleh muncul di serialized payload, DOM, HTML comment, log,
  analytics, local draft, print DOM, atau PDF text layer;
- test answer-leak wajib memeriksa source response, live DOM, dan extracted PDF
  text.
- Legacy compatibility adapter dan structured layout store tidak pernah menerima
  answer field; answer isolation terjadi sebelum keduanya dipanggil.

Phase 1 menghitung `sourceRevision` dari normalized server-only fields, lalu
membentuk allowlisted client fields tanpa answer sebelum RPC response
diserialisasi. Fixture memakai sentinel sintetis dan membuktikan sentinel serta
nama field answer tidak muncul pada normalized response; static check tetap
melarang field tersebut pada client source. DOM/PDF extraction penuh tetap gate
fase renderer/print.

Phase 2 history snapshot boleh menyimpan answer field di hidden server-owned
history agar restore row tetap utuh, tetapi history RPC hanya mengembalikan ID,
revision hash, changed-field names, editor label, dan timestamp. Local recovery
draft hanya berisi changed client field dan tidak pernah memuat answer field.

## Image and SSRF Boundary

- Hanya URL HTTPS yang diterima.
- Manifest Apps Script wajib meminta scope
  `https://www.googleapis.com/auth/script.external_request`; deployment owner
  harus mengotorisasi ulang scope tersebut sebelum release yang pertama kali
  menambahkannya. Jangan mencatat URL/token authorization ke repository atau
  worklog.
- Server wajib menolak localhost, loopback, link-local, private IP, metadata
  endpoints, non-image MIME, oversized response, dan redirect chain berbahaya.
- Lakukan DNS/IP validation kembali setelah redirect bila fetch mengikuti
  redirect.
- Terapkan timeout dan byte cap; jangan log image bytes atau signed final URL.
- Client image failure tetap memblokir print walaupun server preflight lulus.
- Proxy/cache masa depan harus bounded, tidak menurunkan kualitas, dan memiliki
  keputusan retention sebelum diaktifkan.

Phase 6 mengimplementasikan preflight authenticated dengan HTTPS-only parsing,
blok localhost/private/link-local/metadata/IP-literal berbahaya, redirect cap
tiga hop yang divalidasi ulang, MIME allowlist PNG/JPEG/WebP, byte cap, dan
dimension parsing. Response client hanya memuat index dan metadata teknis;
image bytes serta final redirect URL tidak dikirim atau dicatat. Browser tetap
melakukan gate `load`/`decode` terpisah dan tidak memakai canvas/proxy cache.

## Logging

Log boleh memuat request ID, action, duration, safe course/session identity,
row count, warning count, call count, error code, dan lock lifecycle metadata.

Log tidak boleh memuat secret, full field values, Spreadsheet ID, answer key,
image bytes, raw token, atau user content lengkap.

Idempotency metadata audit boleh memuat request ID, revision hash, history ID,
changed-field names, dan timestamp. Metadata tidak boleh memuat patch value,
history snapshot, raw lease token, atau app session token.

## Incident Response

Jika secret atau answer key terpapar:

1. hentikan deployment/mutation yang relevan;
2. jangan menyalin secret ke issue/worklog;
3. beri tahu deployment owner secara ringkas;
4. rotasi credential atau signing secret;
5. invalidate session bila relevan;
6. periksa log, deployment version, dan repository history;
7. tambahkan worklog entry yang sudah direduksi tanpa secret;
8. tambahkan regression test sebelum release berikutnya.

## V2 Drive and Renderer Security

> Status: Apps Script Drive/publish source foundation tersedia secara lokal.
> Source-embedded folder setup dan verbose Drive error logging telah dihapus
> pada 8 Agustus 2026. Rotation runtime property, actual synthetic fixture, dan
> current production revision belum diverifikasi. Renderer security tetap
> contract-only karena P5–P6 deferred.

- Target folder identity disimpan hanya pada Script Properties dan tidak masuk
  client source, DOM, log, screenshot, atau public bootstrap.
- Source dan helper setup tidak boleh memuat literal folder identity. Error
  Drive hanya mencatat allowlisted diagnostic code, bukan serialized exception,
  request, file/folder metadata, atau response penuh.
- Advanced Drive v3 memakai explicit full Drive scope karena app harus mengakses
  existing Shared Drive folder tanpa Picker. Deployment-owner consent wajib
  diselesaikan sebelum fixture dan scope tidak boleh diteruskan ke renderer.
- Manifest tidak boleh menambahkan dummy scope untuk memaksa consent. Scope yang
  tidak dipakai runtime, termasuk Google Documents pada current implementation,
  harus dihapus sebelum release.
- Apps Script deployment owner melakukan upload. Renderer tidak menerima OAuth
  token, service-account access ke Drive, folder ID, atau file-management RPC.
- Renderer memakai secret signing khusus yang berbeda dari app-session signing
  secret. Secret berada pada managed runtime configuration, memiliki rotation
  owner, dan tidak masuk repository/command/artifact.
- Render request memiliki publish/request ID, expiry pendek, nonce/replay
  protection, pinned renderer version, body/response cap, dan timeout bounded.
- Content yang mencapai renderer sudah melewati answer isolation. Renderer
  tidak menerima `quiz_answers`, credential, Spreadsheet/folder identity, atau
  hidden history snapshot.
- Renderer tidak menyimpan request/PDF setelah response selesai. Access log
  hanya boleh berisi bounded metadata seperti request ID hash, duration, byte
  count, page count, status, dan safe error code.
- PDF response diverifikasi sebelum upload: MIME/signature, byte limit, A4/page
  metadata, source digest binding, dan renderer identity.
- Drive file memakai publish ID sebagai reconciliation metadata. Orphan recovery
  tidak boleh memilih atau menghapus file berdasarkan nama/glob.
- Activity Log tidak mengembalikan passcode, attempted login label pada failure,
  token, raw email bila policy tidak mengizinkan, full event payload, atau
  reversible anonymous fingerprint.
- Failed login digabung per jendela lima menit menjadi count global dengan label
  `Anonymous`; attempted passcode, attempted label, dan anonymous fingerprint
  tidak ditulis.
- Temporary Spreadsheet/Drive fixture wajib dipakai sebelum production; cleanup
  atau orphan deletion tetap destructive action yang memerlukan exact target
  verification dan otorisasi.

## Same-Tab Edit Recovery Security

- App-session token dan structured edit-session record hanya berada di
  `sessionStorage`; raw lease token tidak masuk URL hash, `localStorage`, audit,
  server log, atau Spreadsheet.
- Edit-session ID adalah random idempotency identity, bukan credential. Resume
  tetap harus membuktikan possession raw lease token yang hash-nya cocok dengan
  record lock server.
- Refresh mempertahankan record tersebut. Explicit close, navigation keluar dari
  editor, confirmed lock loss, logout, dan app-session expiry menghapusnya.
- Retryable timeout/connection failure tidak menghapus token. Retry memakai
  edit-session ID yang sama agar late success dan retry tidak menambah activity
  event ganda.
- Local recovery draft boleh menyimpan pending autosave request ID dan
  answer-filtered patch agar retry tetap idempotent. Draft tidak boleh memuat
  app-session token, lease token, `quiz_answers`, atau server-owned identity.
