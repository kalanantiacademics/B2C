import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = '/private/tmp/kalananti-scl-phase1-preview';
const read = (file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');

const serverStub = `<script>
  (function () {
    window.__phase1RpcCounts = { listCoursesAndLevels: 0, loadLevelProject: 0, saveSessionPatch: 0, preflightImages: 0, maxPreflightBatch: 0 };
    window.__phase1RpcOrder = [];
    window.__phase1SavedSessions = {};
    var successHandler = function () {};
    var failureHandler = function () {};
    var runner = {
      withSuccessHandler: function (handler) { successHandler = handler; return runner; },
      withFailureHandler: function (handler) { failureHandler = handler; return runner; },
      getAppBootstrap: function () {
        setTimeout(function () { successHandler({ ok: true, data: {
          appName: 'Kalananti SCL Module Generator', requiresLogin: true, configurationStatus: 'READY'
        }}); }, 0);
      },
      authenticateEditor: function (passcode) {
        setTimeout(function () {
          if (passcode === 'synthetic-success') {
            successHandler({ ok: true, data: {
              session: { token: 'synthetic-session', expiresAt: '2099-01-01T00:00:00.000Z', editor: { label: 'Synthetic Editor', email: '', selfDeclared: true } },
              courses: [
                { key: 'roblox', label: 'Roblox Studio', coverLabel: 'ROBLOX STUDIO' },
                { key: 'scratch', label: 'Scratch', coverLabel: 'SCRATCH' },
                { key: 'python', label: 'Python', coverLabel: 'PYTHON' }
              ],
              storage: { ok: true, safeMode: false, schemaVersion: 'scl-generator/v1', diagnosticCodes: [] },
              phase: { key: 'phase-1', label: 'Normalized model', next: 'Pilih course dan level untuk memeriksa 12 session dalam mode hanya baca.' }
            }});
            return;
          }
          successHandler({ ok: false, error: {
            code: 'AUTHENTICATION_FAILED', message: 'Passcode tidak valid atau percobaan terlalu sering.', retryable: false, details: {}
          }});
        }, 0);
      },
      resumeEditorSession: function () { failureHandler(new Error('No preview session')); },
      listCoursesAndLevels: function () {
        window.__phase1RpcCounts.listCoursesAndLevels += 1;
        setTimeout(function () { successHandler({ ok: true, data: {
          schemaVersion: 'scl-level-catalog/v1',
          courses: [
            { key: 'roblox', label: 'Roblox Studio', coverLabel: 'ROBLOX STUDIO', levels: [
              { level: '1', readyCount: 9, incompleteCount: 1, needsFixCount: 1, missingCount: 1, warningCount: 3 }
            ] },
            { key: 'scratch', label: 'Scratch', coverLabel: 'SCRATCH', levels: [
              { level: '1', readyCount: 12, incompleteCount: 0, needsFixCount: 0, missingCount: 0, warningCount: 0 }
            ] },
            { key: 'python', label: 'Python', coverLabel: 'PYTHON', levels: [
              { level: '1', readyCount: 8, incompleteCount: 2, needsFixCount: 0, missingCount: 2, warningCount: 2 }
            ] }
          ]
        }}); }, 0);
      },
      listActivity: function () {
        setTimeout(function () { successHandler({ ok: true, data: {
          schemaVersion: 'scl-activity/v1', hasMore: false, nextCursor: null,
          items: [
            { eventType: 'login_success', status: 'SUCCESS', courseKey: '', level: '', session: '', editorLabel: 'Synthetic Editor', identityType: 'self-declared', createdAt: '2026-08-07T03:00:00.000Z' },
            { eventType: 'project_open', status: 'SUCCESS', courseKey: 'roblox', level: '1', session: '', editorLabel: 'Synthetic Editor', identityType: 'unknown', createdAt: '2026-08-07T03:05:00.000Z' }
          ]
        }}); }, 0);
      },
      recordComposeAttempt: function () {
        setTimeout(function () { successHandler({ ok: true, data: { recorded: true } }); }, 0);
      },
      listPublishedModules: function () {
        setTimeout(function () { successHandler({ ok: true, data: {
          schemaVersion: 'scl-publish-list/v1', hasMore: false, nextCursor: null,
          items: [{
            publishId: 'fixture-publish', courseKey: 'roblox', level: '1', version: 2,
            status: 'PUBLISHED', isLatest: true, fileName: 'Kalananti-SCL-ROBLOX-STUDIO-Level-1-v002.pdf',
            pageCount: 34, fileSizeBytes: 5000000, rendererVersion: 'fixture', publishedBy: 'Synthetic Editor',
            createdAt: '2026-08-07T03:10:00.000Z', completedAt: '2026-08-07T03:11:00.000Z', errorCode: '',
            openUrl: 'https://drive.google.com/file/d/synthetic-file/view'
          }]
        }}); }, 0);
      },
      getDrivePublishingCapability: function () {
        setTimeout(function () { successHandler({ ok: true, data: {
          configured: true, accessible: true, canAddChildren: true, sharedDrive: true
        }}); }, 0);
      },
      loadLevelProject: function (_token, courseKey, level) {
        window.__phase1RpcCounts.loadLevelProject += 1;
        window.__phase1RpcOrder.push('load');
        var statuses = window.__phase1PublishingFixtureReady
          ? Array(12).fill('Ready')
          : ['Ready', 'Ready', 'Needs Fix', 'Incomplete'];
        var sessions = Array.from({ length: 12 }, function (_unused, index) {
          var status = statuses[index] || 'Ready';
          var saved = window.__phase1SavedSessions[String(index + 1)] || {};
          var topic = saved['Session-topic'] ? saved['Session-topic'].text : 'Synthetic topic ' + String(index + 1);
          return {
            session: String(index + 1),
            rowKey: 'synthetic::' + courseKey + '::' + level + '::' + String(index + 1),
            topic: status === 'Incomplete' ? '' : topic,
            status: status,
            warnings: status === 'Ready' ? [] : [{ code: 'SYNTHETIC_DIAGNOSTIC', severity: 'WARNING' }],
            sourceRevision: 'fixture-revision-' + String(index + 1),
            lock: null,
            fields: Object.assign({
              'Session-topic': { text: 'Synthetic topic ' + String(index + 1), runs: [] },
              objectives: { text: '- Mengenali urutan perintah\\n- Menguji hasil proyek', runs: [] },
              materials: { text: 'Tahap 1: Siapkan project\\nBuka editor dan ikuti langkah secara berurutan.', runs: [] },
              must_do: { text: 'Selesaikan fitur utama pada project.', runs: [] },
              should_do: { text: 'Tambahkan satu peningkatan yang membantu pengguna.', runs: [] },
              aspire_to_do: { text: 'Rancang tantangan lanjutan secara mandiri.', runs: [] },
              'self-check': { text: 'Saya dapat menjelaskan proses dan hasilnya.', runs: [] },
              kamus_coder: { text: 'Script adalah kumpulan instruksi untuk komputer.', runs: [] },
              for_your_knowledge: { text: 'Program menjalankan instruksi secara berurutan.', runs: [] },
              quiz_questions: { text: 'Mengapa urutan perintah penting?', runs: [] },
              quiz_options: { text: 'A. Agar program bekerja sesuai rencana|B. Agar layar lebih besar', runs: [] }
            }, saved),
            tables: []
          };
        });
        setTimeout(function () { successHandler({ ok: true, data: {
          schemaVersion: 'scl-level/v1',
          course: { key: courseKey, label: courseKey === 'roblox' ? 'Roblox Studio' : courseKey, coverLabel: courseKey.toUpperCase() },
          level: level,
          readyCount: 9,
          totalSlots: 12,
          warningCount: 3,
          sessions: sessions,
          diagnostics: []
        }}); }, 0);
      },
      acquireSessionLease: function (_token, _courseKey, _level, session) {
        setTimeout(function () { successHandler({ ok: true, data: {
          leaseToken: 'synthetic-lease-' + session,
          sourceRevision: 'fixture-revision-' + session,
          heartbeatIntervalSeconds: 60,
          expiresAt: '2099-01-01T00:00:00.000Z'
        }}); }, 0);
      },
      heartbeatSessionLease: function () {
        setTimeout(function () { successHandler({ ok: true, data: { active: true, expiresAt: '2099-01-01T00:00:00.000Z' }}); }, 0);
      },
      releaseSessionLease: function () {
        setTimeout(function () { successHandler({ ok: true, data: { released: true }}); }, 0);
      },
      getSessionHistory: function () {
        setTimeout(function () { successHandler({ ok: true, data: [
          { historyId: 'fixture-history-1', editorLabel: 'Synthetic Editor', createdAt: '2026-08-04T00:00:00.000Z', changedFields: ['materials'] }
        ] }); }, 0);
      },
      saveSessionPatch: function (_token, _leaseToken, request) {
        window.__phase1RpcCounts.saveSessionPatch += 1;
        window.__phase1RpcOrder.push('save');
        window.__phase1SavedSessions[String(request.session)] = request.changes;
        setTimeout(function () { successHandler({ ok: true, data: {
          newRevision: request.requestId, savedAt: '2026-08-04T00:00:00.000Z', historyId: 'fixture-history-save'
        }}); }, 0);
      },
      restoreSessionRevision: function () {
        setTimeout(function () { successHandler({ ok: true, data: { sourceRevision: 'fixture-restored' }}); }, 0);
      },
      preflightImages: function (_token, urls) {
        window.__phase1RpcCounts.preflightImages += 1;
        window.__phase1RpcCounts.maxPreflightBatch = Math.max(window.__phase1RpcCounts.maxPreflightBatch, urls.length);
        setTimeout(function () { successHandler({ ok: true, data: { images: urls.map(function (_url, index) {
          return { index: index, ok: true, mime: 'image/png', bytes: 15000, width: 2400, height: 1200 };
        }) }}); }, 0);
      },
      logoutEditor: function () { successHandler({ ok: true, data: { loggedOut: true } }); }
    };
    window.google = { script: { run: runner } };
  })();
</script>`;

let html = read('index.html');
const inline = (name, source) => {
  html = html.replace(`<?!= include_('${name}'); ?>`, () => source);
};
inline('Assets', read('Assets.html'));
inline('FontAssets', read('FontAssets.html'));
inline('Styles', read('Styles.html'));
inline('PageAssets', read('PageAssets.html'));
inline('LegacyAdapter', read('LegacyAdapter.html'));
inline('Editor', read('Editor.html'));
inline('Publisher', read('Publisher.html'));
inline('App', serverStub + read('App.html'));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
console.log(OUTPUT_DIR);
