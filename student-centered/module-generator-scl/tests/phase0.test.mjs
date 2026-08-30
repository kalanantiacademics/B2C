import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_FILES = ['Errors.gs', 'Config.gs', 'Storage.gs', 'Auth.gs', 'Code.gs'];

function createRuntime(initialProperties = {}) {
  const properties = { ...initialProperties };
  const cacheValues = new Map();
  let spreadsheetReads = 0;
  let uuidCounter = 0;

  const cache = {
    get(key) { return cacheValues.has(key) ? cacheValues.get(key) : null; },
    put(key, value) { cacheValues.set(key, value); },
    remove(key) { cacheValues.delete(key); }
  };

  const context = vm.createContext({
    CacheService: { getScriptCache: () => cache },
    Date,
    JSON,
    Math,
    Number,
    Object,
    Session: {
      getActiveUser: () => ({ getEmail: () => '' }),
      getTemporaryActiveUserKey: () => 'test-user-key'
    },
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET' },
      openById() {
        spreadsheetReads += 1;
        throw new Error('Spreadsheet access is not allowed in this test.');
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...properties })
      })
    },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      base64EncodeWebSafe(value) {
        return toBuffer(value).toString('base64url');
      },
      base64DecodeWebSafe(value) {
        return Array.from(Buffer.from(value, 'base64url'));
      },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash('sha256').update(String(value)).digest());
      },
      computeHmacSha256Signature(value, key) {
        return Array.from(crypto.createHmac('sha256', String(key)).update(String(value)).digest());
      },
      getUuid() {
        uuidCounter += 1;
        return `runtime-uuid-${uuidCounter}`;
      },
      newBlob(value) {
        return { getDataAsString: () => toBuffer(value).toString('utf8') };
      }
    }
  });

  const source = SERVER_FILES
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'))
    .join('\n');
  vm.runInContext(source, context, { filename: 'phase0-server-bundle.gs' });

  return {
    context,
    getSpreadsheetReads: () => spreadsheetReads,
    properties
  };
}

function toBuffer(value) {
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  return Buffer.from(value);
}

function createConfiguredRuntime() {
  const salt = crypto.randomBytes(24).toString('base64url');
  const signingSecret = crypto.randomBytes(32).toString('base64url');
  const passcode = crypto.randomBytes(18).toString('base64url');
  const runtime = createRuntime({
    SCL_SPREADSHEET_ID: crypto.randomBytes(20).toString('hex'),
    SCL_PASSWORD_SALT: salt,
    SCL_PASSWORD_HASH: 'pending',
    SCL_SESSION_SIGNING_SECRET: signingSecret,
    SCL_IMAGE_MAX_BYTES: '10485760'
  });
  runtime.properties.SCL_PASSWORD_HASH = runtime.context.derivePasscodeHash_(passcode, salt);
  return { ...runtime, passcode };
}

test('public bootstrap returns only shell status and performs zero Spreadsheet reads', () => {
  const runtime = createRuntime();
  const result = runtime.context.getAppBootstrap();
  assert.equal(result.ok, true);
  assert.equal(result.data.requiresLogin, true);
  assert.equal(result.data.configurationStatus, 'SETUP_REQUIRED');
  assert.equal(runtime.getSpreadsheetReads(), 0);
  assert.deepEqual(Object.keys(result.data).sort(), ['appName', 'configurationStatus', 'requiresLogin']);
});

test('course allowlist accepts only canonical course keys', () => {
  const runtime = createRuntime();
  assert.equal(runtime.context.resolveCourse_('roblox').sheetName, 'B2C_RobloxStudio_Modul');
  assert.equal(runtime.context.resolveCourse_('scratch').sheetName, 'B2C_Scratch_Modul');
  assert.equal(runtime.context.resolveCourse_('python').sheetName, 'B2C_Python_Modul');
  assert.throws(() => runtime.context.resolveCourse_('B2C_Python_Modul'), (error) => error.code === 'UNKNOWN_COURSE');
  assert.throws(() => runtime.context.resolveCourse_('_INS'), (error) => error.code === 'UNKNOWN_COURSE');
});

test('valid passcode issues a signed absolute-expiry session and invalid passcode stays generic', () => {
  const runtime = createConfiguredRuntime();
  const issued = runtime.context.authenticateEditor_(runtime.passcode, 'Synthetic Editor', 1000);
  const payload = runtime.context.validateSessionToken_(issued.token, 1001);
  assert.equal(payload.label, 'Synthetic Editor');
  assert.equal(payload.selfDeclared, true);
  assert.equal(payload.exp - payload.iat, 43200);
  assert.throws(
    () => runtime.context.validateSessionToken_(issued.token, 44200),
    (error) => error.code === 'SESSION_EXPIRED'
  );
  assert.throws(
    () => runtime.context.authenticateEditor_('definitely-not-valid', 'Synthetic Editor', 1000),
    (error) => error.code === 'AUTHENTICATION_FAILED'
  );
});

test('self-declared identity is required when Apps Script cannot provide an email', () => {
  const runtime = createConfiguredRuntime();
  assert.throws(
    () => runtime.context.authenticateEditor_(runtime.passcode, '', 1000),
    (error) => error.code === 'EDITOR_LABEL_REQUIRED'
  );
});

test('storage plan is idempotent and preserves unknown columns', () => {
  const runtime = createRuntime();
  const definition = runtime.context.SCL_STORAGE_DEFINITIONS_[0];
  const headers = [...definition.headers, 'future_column'];
  const plan = runtime.context.planStorageRepair_(definition, {
    headers,
    rows: [],
    metadataValues: ['scl-generator/v1']
  });
  assert.equal(plan.safeMode, false);
  assert.deepEqual([...plan.missingHeaders], []);
  assert.equal(plan.addSchemaMetadata, false);
});

test('storage plan appends missing canonical columns without moving existing headers', () => {
  const runtime = createRuntime();
  const definition = runtime.context.SCL_STORAGE_DEFINITIONS_.find((item) => item.key === 'locks');
  const plan = runtime.context.planStorageRepair_(definition, {
    headers: ['lock_key', 'editor_label', 'future_column'],
    rows: [],
    metadataValues: []
  });
  assert.equal(plan.safeMode, false);
  assert.deepEqual(
    [...plan.missingHeaders],
    ['editor_email', 'token_hash', 'acquired_at', 'heartbeat_at', 'expires_at']
  );
  assert.equal(plan.addSchemaMetadata, true);
});

test('duplicate headers and incompatible JSON enter safe mode with no repair plan', () => {
  const runtime = createRuntime();
  const definition = runtime.context.SCL_STORAGE_DEFINITIONS_[0];
  const duplicatePlan = runtime.context.planStorageRepair_(definition, {
    headers: ['table_id', ' table_id '],
    rows: [],
    metadataValues: ['scl-generator/v1']
  });
  assert.equal(duplicatePlan.safeMode, true);
  assert.deepEqual([...duplicatePlan.missingHeaders], []);

  const invalidJsonPlan = runtime.context.planStorageRepair_(definition, {
    headers: [...definition.headers],
    rows: [['id', 'row', 'materials', 1, 'hash', '{invalid', '', '', '']],
    metadataValues: ['scl-generator/v1']
  });
  assert.equal(invalidJsonPlan.safeMode, true);
  assert.equal(invalidJsonPlan.diagnostics[0].code, 'STORAGE_INCOMPATIBLE_ROW');
});

test('layout schema rejects raw HTML, answers, unknown fields, and invalid bounds', () => {
  const runtime = createRuntime();
  const valid = {
    schemaVersion: 'scl-layout/v1', blockKey: 'materials:block-1', orderIndex: 2,
    imageWidthPercent: 60, manualBreak: false, attributes: { keepTogether: true }
  };
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.context.validateLayoutJson_(valid))), valid);
  for (const invalid of [
    { ...valid, rawHtml: '<script>alert(1)</script>' },
    { ...valid, imageWidthPercent: 101 },
    { ...valid, attributes: { onclick: true } },
    { ...valid, answer_key: 'B' },
    { ...valid, blockKey: 'invalid key' }
  ]) assert.throws(() => runtime.context.validateLayoutJson_(invalid));
});

test('client files contain no server-owned tab mapping, Spreadsheet ID, or answer field', () => {
  const clientSource = ['index.html', 'Styles.html', 'App.html']
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'))
    .join('\n');
  for (const forbidden of [
    'B2C_RobloxStudio_Modul',
    'B2C_Scratch_Modul',
    'B2C_Python_Modul',
    'SCL_SPREADSHEET_ID',
    'quiz_answers'
  ]) {
    assert.equal(clientSource.includes(forbidden), false, `${forbidden} leaked to client source`);
  }
});

test('editor uses plain actionable access language instead of technical lease copy', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  for (const technicalCopy of [
    'Lease aktif',
    'Lease hilang',
    'Mengambil lease',
    'Heartbeat aktif',
    'Koneksi lease tertunda',
    'Dikunci editor lain',
    'Read-only'
  ]) {
    assert.equal(app.includes(technicalCopy) || index.includes(technicalCopy), false, technicalCopy);
  }
  assert.match(index, /id="reacquireEditButton"[^>]*>Aktifkan edit lagi<\/button>/);
  assert.match(app, /setLeaseStatus\('Akses edit berakhir', 'error'\)/);
  assert.match(app, /function reactivateEditAccess_\(\)/);
  assert.match(app, /lease\.sourceRevision === previousRevision/);
  assert.match(app, /setEditorReadOnly\(!state\.lease\)/);
});

test('hidden views remain hidden even when layout classes set display', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
});

test('login shell requests editor identity before the first authentication attempt', () => {
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(index, /<div id="editorLabelField" class="field-group">/);
  assert.match(index, /id="editorLabel"[\s\S]*?required[\s\S]*?placeholder="Contoh: Kak Nanti"/);
  assert.match(app, /elements\.editorLabel\.addEventListener\('input', updateLoginButtonState_\)/);
  assert.match(app, /!elements\.passcode\.value \|\| !elements\.editorLabel\.value\.trim\(\)/);
});

test('backend activity uses closable soft notifications and bounded RPC waits', () => {
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(index, /id="notificationCenter"[\s\S]*?aria-live="polite"/);
  assert.match(styles, /\.soft-notification[\s\S]*?\.soft-notification-close/);
  assert.match(app, /var RPC_TIMEOUT_MS = 45000;/);
  assert.match(app, /error\.code = 'CLIENT_TIMEOUT'/);
  assert.match(app, /notifyLoading_\('autosave'/);
  assert.match(app, /handleCloseSession_/);
  assert.doesNotMatch(app, /\b(?:alert|confirm)\s*\(/);
});

test('editor DOM contract includes every control bound during initialization', () => {
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  for (const id of [
    'editorFieldTabs', 'blockEditor', 'componentPreview', 'editorDiagnostics',
    'activeEditorFieldLabel', 'activeEditorFieldTitle', 'undoEditorButton',
    'redoEditorButton', 'addTextBlockButton', 'addImageBlockButton',
    'addTableButton', 'addPageBreakButton'
  ]) {
    assert.match(index, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('client source does not expose a Google Spreadsheet identity', () => {
  const clientSource = ['index.html', 'Styles.html', 'App.html', 'Editor.html']
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(clientSource, /docs\.google\.com\/spreadsheets\/d\//i);
});
