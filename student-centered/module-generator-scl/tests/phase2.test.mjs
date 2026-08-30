import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_FILES = [
  'Errors.gs',
  'Config.gs',
  'Storage.gs',
  'Auth.gs',
  'RichText.gs',
  'DataStore.gs',
  'Parser.gs',
  'TableStore.gs',
  'LayoutStore.gs',
  'Collaboration.gs',
  'Activity.gs',
  'PublishStore.gs',
  'DrivePublisher.gs',
  'Code.gs'
];
const SOURCE_HEADERS = [
  'Level',
  'Session',
  'objectives',
  'materials',
  'must_do',
  'should_do',
  'aspire_to_do',
  'self-check',
  'kamus_coder',
  'for_your_knowledge',
  'quiz_questions',
  'quiz_options',
  'quiz_answers',
  'Session-topic'
];
const STORAGE_HEADERS = {
  _Generator_Layouts: [
    'layout_id', 'row_key', 'field', 'block_key', 'order_index', 'layout_json',
    'created_at', 'updated_at', 'updated_by'
  ],
  _Generator_Tables: [
    'table_id', 'row_key', 'field', 'order_index', 'anchor_hash', 'table_json',
    'created_at', 'updated_at', 'updated_by'
  ],
  _Generator_Locks: [
    'lock_key', 'editor_label', 'editor_email', 'token_hash', 'acquired_at',
    'heartbeat_at', 'expires_at'
  ],
  _Generator_History: [
    'history_id', 'row_key', 'revision_before', 'revision_after', 'changed_fields',
    'snapshot_json', 'tables_snapshot_json', 'layouts_snapshot_json', 'editor_label', 'created_at'
  ],
  _Generator_Audit: [
    'audit_id', 'event_type', 'request_id', 'status', 'error_code', 'course_key',
    'level', 'session', 'editor_label', 'duration_ms', 'metadata_json', 'created_at'
  ],
  _Generator_Publishes: [
    'publish_id', 'request_id', 'course_key', 'level', 'version',
    'source_revision_digest', 'publish_status', 'is_latest', 'file_id',
    'file_name', 'page_count', 'file_size_bytes', 'renderer_version',
    'published_by', 'created_at', 'completed_at', 'error_code', 'metadata_json'
  ]
};

function createRuntime() {
  const properties = {
    SCL_SPREADSHEET_ID: 'phase2-fixture-spreadsheet',
    SCL_PASSWORD_SALT: crypto.randomBytes(24).toString('base64url'),
    SCL_PASSWORD_HASH: 'pending',
    SCL_SESSION_SIGNING_SECRET: crypto.randomBytes(32).toString('base64url'),
    SCL_IMAGE_MAX_BYTES: '10485760'
  };
  const sheets = new Map();
  sheets.set('B2C_RobloxStudio_Modul', createSheet([
    SOURCE_HEADERS.slice(),
    sourceRow(1, 1, 'Session one'),
    sourceRow(1, 2, 'Session two')
  ]));
  for (const [name, headers] of Object.entries(STORAGE_HEADERS)) {
    sheets.set(name, createSheet([headers.slice()], true));
  }
  const spreadsheet = {
    getSheetByName(name) { return sheets.get(name) || null; }
  };
  const cacheValues = new Map();
  const driveFiles = new Map();
  driveFiles.set('phase2-drive-root', {
    id: 'phase2-drive-root',
    name: 'Temporary fixture root',
    mimeType: 'application/vnd.google-apps.folder',
    driveId: 'phase2-shared-drive',
    capabilities: { canAddChildren: true },
    parents: [],
    appProperties: {}
  });
  properties.SCL_DRIVE_FOLDER_ID = 'phase2-drive-root';
  let uuidCounter = 0;
  let sourceWrites = 0;
  let activeEmail = '';
  let effectiveEmail = 'owner@example.invalid';
  let driveCreateCount = 0;
  let driveCreateError = null;

  const context = vm.createContext({
    CacheService: {
      getScriptCache: () => ({
        get(key) { return cacheValues.has(key) ? cacheValues.get(key) : null; },
        put(key, value) { cacheValues.set(key, value); },
        remove(key) { cacheValues.delete(key); }
      })
    },
    Date,
    JSON,
    Math,
    Number,
    Object,
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    },
    Drive: {
      Files: {
        create(resource, blob) {
          if (driveCreateError) throw driveCreateError;
          driveCreateCount += 1;
          const id = `phase2-drive-file-${driveCreateCount}`;
          const file = {
            id,
            name: String(resource.name || ''),
            mimeType: String(resource.mimeType || ''),
            size: blob && typeof blob.getBytes === 'function' ? String(blob.getBytes().length) : undefined,
            parents: Array.isArray(resource.parents) ? resource.parents.slice() : [],
            appProperties: { ...(resource.appProperties || {}) }
          };
          driveFiles.set(id, file);
          return { ...file };
        },
        get(id) {
          const file = driveFiles.get(String(id));
          if (!file) throw new Error('not found');
          return { ...file, capabilities: file.capabilities ? { ...file.capabilities } : undefined };
        },
        list(options) {
          const query = String(options && options.q || '');
          const parent = Array.from(driveFiles.keys()).find((id) => query.includes(`'${id}' in parents`));
          const purposeMatch = query.match(/key='sclFixturePurpose' and value='([^']+)'/);
          const publishMatch = query.match(/key='sclPublishId' and value='([^']+)'/);
          const files = Array.from(driveFiles.values()).filter((file) => {
            if (parent && !file.parents.includes(parent)) return false;
            if (purposeMatch && file.appProperties.sclFixturePurpose !== purposeMatch[1]) return false;
            if (publishMatch && file.appProperties.sclPublishId !== publishMatch[1]) return false;
            if (query.includes("mimeType = 'application/pdf'") && file.mimeType !== 'application/pdf') return false;
            if (query.includes("mimeType = 'application/vnd.google-apps.folder'") &&
                file.mimeType !== 'application/vnd.google-apps.folder') return false;
            return true;
          });
          return { files: files.map((file) => ({ ...file })) };
        }
      }
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => activeEmail }),
      getEffectiveUser: () => ({ getEmail: () => effectiveEmail }),
      getTemporaryActiveUserKey: () => 'phase2-user-key'
    },
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET' },
      newRichTextValue: createRichTextBuilder,
      newTextStyle: createTextStyleBuilder,
      openById(id) {
        assert.equal(id, properties.SCL_SPREADSHEET_ID);
        return spreadsheet;
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...properties }),
        setProperty(key, value) { properties[key] = String(value); return this; }
      })
    },
    Utilities: {
      Charset: { UTF_8: 'UTF-8' },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      base64EncodeWebSafe(value) { return toBuffer(value).toString('base64url'); },
      base64DecodeWebSafe(value) { return Array.from(Buffer.from(value, 'base64url')); },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash('sha256').update(String(value)).digest());
      },
      computeHmacSha256Signature(value, key) {
        return Array.from(crypto.createHmac('sha256', String(key)).update(String(value)).digest());
      },
      getUuid() {
        uuidCounter += 1;
        return `phase2-uuid-${uuidCounter}`;
      },
      newBlob(value, contentType, name) {
        const bytes = toBuffer(value);
        return {
          getBytes: () => Array.from(bytes),
          getContentType: () => String(contentType || ''),
          getDataAsString: () => bytes.toString('utf8'),
          getName: () => String(name || '')
        };
      }
    }
  });

  for (const sheet of sheets.values()) {
    sheet.onSourceWrite = () => { sourceWrites += 1; };
  }
  const source = SERVER_FILES
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'))
    .join('\n');
  vm.runInContext(source, context, { filename: 'phase2-server-bundle.gs' });
  const passcode = crypto.randomBytes(18).toString('base64url');
  properties.SCL_PASSWORD_HASH = context.derivePasscodeHash_(passcode, properties.SCL_PASSWORD_SALT);

  return {
    context,
    passcode,
    sheets,
    driveFiles,
    getSourceWrites: () => sourceWrites,
    getDriveCreateCount: () => driveCreateCount,
    setActiveEmail(value) { activeEmail = String(value || ''); },
    setEffectiveEmail(value) { effectiveEmail = String(value || ''); },
    setDriveCreateError(value) { driveCreateError = value; },
    editor(label) {
      const session = context.authenticateEditor_(passcode, label);
      return { token: session.token, payload: context.validateSessionToken_(session.token) };
    }
  };
}

function sourceRow(level, session, topic) {
  return [
    level,
    session,
    'Build one project',
    'Open the editor\nCreate the project',
    'Finish the project',
    '',
    '',
    'Review the result',
    '',
    '',
    '1. What did you make?',
    '1. A. Project | B. Nothing',
    'SYNTHETIC_SERVER_ONLY_ANSWER',
    topic
  ];
}

function createSheet(initialValues, managed = false) {
  const values = initialValues.map((row) => row.slice());
  const rich = initialValues.map((row) => row.map((value) => createRichTextValue(String(value ?? ''))));
  const sheet = {
    managed,
    values,
    rich,
    onSourceWrite: () => {},
    getLastRow() {
      for (let index = values.length - 1; index >= 0; index -= 1) {
        if (values[index].some((value) => value !== '' && value !== null && value !== undefined)) return index + 1;
      }
      return 0;
    },
    getLastColumn() {
      return values.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    },
    getRange(row, column, rowCount = 1, columnCount = 1) {
      ensureSize(values, row + rowCount - 1, column + columnCount - 1, '');
      ensureSize(rich, row + rowCount - 1, column + columnCount - 1, null);
      return {
        getValues: () => sliceMatrix(values, row, column, rowCount, columnCount),
        getDisplayValues: () => sliceMatrix(values, row, column, rowCount, columnCount)
          .map((sourceRow) => sourceRow.map((value) => String(value ?? ''))),
        getRichTextValues: () => sliceMatrix(rich, row, column, rowCount, columnCount)
          .map((sourceRow, rowIndex) => sourceRow.map((value, columnIndex) => value || createRichTextValue(
            String(values[row - 1 + rowIndex][column - 1 + columnIndex] ?? '')
          ))),
        setValues(nextValues) {
          writeMatrix(values, row, column, nextValues);
          writeMatrix(rich, row, column, nextValues.map((sourceRow) => sourceRow.map((value) =>
            createRichTextValue(String(value ?? ''))
          )));
          if (!managed) sheet.onSourceWrite();
        },
        setRichTextValues(nextValues) {
          writeMatrix(rich, row, column, nextValues);
          writeMatrix(values, row, column, nextValues.map((sourceRow) => sourceRow.map((value) => value.getText())));
          if (!managed) sheet.onSourceWrite();
        }
      };
    },
    createDeveloperMetadataFinder() {
      return {
        withKey() { return this; },
        find: () => managed ? [{ getValue: () => 'scl-generator/v1' }] : []
      };
    },
    isSheetHidden: () => true,
    hideSheet() {},
    getProtections: () => [{ getDescription: () => 'Kalananti SCL Generator managed storage' }],
    protect: () => ({
      setDescription() { return this; },
      setWarningOnly() { return this; }
    }),
    deleteRow(rowNumber) {
      values.splice(rowNumber - 1, 1);
      rich.splice(rowNumber - 1, 1);
    }
  };
  return sheet;
}

function ensureSize(matrix, rows, columns, fill) {
  while (matrix.length < rows) matrix.push([]);
  for (const row of matrix) while (row.length < columns) row.push(fill);
}

function sliceMatrix(matrix, row, column, rowCount, columnCount) {
  return matrix.slice(row - 1, row - 1 + rowCount)
    .map((sourceRow) => sourceRow.slice(column - 1, column - 1 + columnCount));
}

function writeMatrix(matrix, row, column, nextValues) {
  ensureSize(matrix, row + nextValues.length - 1, column + nextValues[0].length - 1, '');
  nextValues.forEach((sourceRow, rowIndex) => {
    sourceRow.forEach((value, columnIndex) => {
      matrix[row - 1 + rowIndex][column - 1 + columnIndex] = value;
    });
  });
}

function createTextStyleBuilder() {
  const style = { bold: false, italic: false, underline: false, strikethrough: false };
  return {
    setBold(value) { style.bold = Boolean(value); return this; },
    setItalic(value) { style.italic = Boolean(value); return this; },
    setUnderline(value) { style.underline = Boolean(value); return this; },
    setStrikethrough(value) { style.strikethrough = Boolean(value); return this; },
    build() { return { ...style }; }
  };
}

function createRichTextBuilder() {
  let text = '';
  const runs = [];
  return {
    setText(value) { text = String(value); return this; },
    setTextStyle(start, end, style) { runs.push({ start, end, ...style, link: '' }); return this; },
    setLinkUrl(start, end, link) {
      const run = runs.find((candidate) => candidate.start === start && candidate.end === end);
      if (run) run.link = link;
      return this;
    },
    build() { return createRichTextValue(text, runs); }
  };
}

function createRichTextValue(value, styleRuns = []) {
  const text = String(value ?? '');
  const runs = styleRuns.length ? styleRuns : (text ? [{ start: 0, end: text.length }] : []);
  return {
    getText: () => text,
    getRuns: () => runs.map((run) => ({
      getStartIndex: () => run.start,
      getEndIndex: () => run.end,
      getLinkUrl: () => run.link || null,
      getTextStyle: () => ({
        isBold: () => Boolean(run.bold),
        isItalic: () => Boolean(run.italic),
        isUnderline: () => Boolean(run.underline),
        isStrikethrough: () => Boolean(run.strikethrough)
      })
    }))
  };
}

function toBuffer(value) {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
}

function plainModel(text) {
  return { text, runs: text ? [{ start: 0, end: text.length }] : [] };
}

function records(sheet) {
  const headers = sheet.values[0];
  return sheet.values.slice(1).filter((row) => row.some((value) => value !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

test('two editors cannot lease one session while different sessions stay editable and stale leases recover', () => {
  const runtime = createRuntime();
  const editorA = runtime.editor('Editor A');
  const editorB = runtime.editor('Editor B');
  const start = Date.parse('2026-08-03T08:00:00.000Z');
  const leaseA = runtime.context.acquireSessionLease_(editorA.payload, 'roblox', '1', '1', start);

  assert.throws(
    () => runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '1', start + 1000),
    (error) => error.code === 'SESSION_LOCKED' && error.details.editorLabel === 'Editor A'
  );
  const leaseB = runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '2', start + 1000);
  assert.ok(leaseB.leaseToken);

  const heartbeat = runtime.context.heartbeatSessionLease_(
    editorA.payload,
    leaseA.leaseToken,
    'roblox',
    '1',
    '1',
    start + 30000
  );
  assert.equal(heartbeat.expiresAt, '2026-08-03T08:02:30.000Z');
  assert.throws(
    () => runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '1', start + 149999),
    (error) => error.code === 'SESSION_LOCKED'
  );
  const recovered = runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '1', start + 150001);
  assert.ok(recovered.leaseToken);
  assert.notEqual(recovered.leaseToken, leaseA.leaseToken);
});

test('same-tab resume renews active or stale ownership atomically and logs once per edit session', () => {
  const runtime = createRuntime();
  const editorA = runtime.editor('Editor A');
  const editorB = runtime.editor('Editor B');
  const start = Date.parse('2026-08-03T08:00:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editorA.payload, 'roblox', '1', '1', start);
  const editSessionId = 'edit-session-a-1';

  const activeResume = runtime.context.resumeSessionLease_(
    editorA.payload, lease.leaseToken, editSessionId, 'roblox', '1', '1', start + 30000
  );
  const staleResume = runtime.context.resumeSessionLease_(
    editorA.payload, lease.leaseToken, editSessionId, 'roblox', '1', '1', start + 121000
  );
  assert.equal(activeResume.leaseToken, lease.leaseToken);
  assert.equal(staleResume.leaseToken, lease.leaseToken);
  assert.equal(records(runtime.sheets.get('_Generator_Audit'))
    .filter((record) => record.event_type === 'edit_resumed').length, 1);

  const takeover = runtime.context.acquireSessionLease_(
    editorB.payload, 'roblox', '1', '1', start + 242000
  );
  assert.notEqual(takeover.leaseToken, lease.leaseToken);
  assert.throws(() => runtime.context.resumeSessionLease_(
    editorA.payload, lease.leaseToken, editSessionId, 'roblox', '1', '1', start + 243000
  ), (error) => error.code === 'LEASE_INVALID');
});

test('releaseSessionLease immediately frees the session for other editors without timeout delay', () => {
  const runtime = createRuntime();
  const editorA = runtime.editor('Editor A');
  const editorB = runtime.editor('Editor B');
  const start = Date.parse('2026-08-03T08:00:00.000Z');
  const leaseA = runtime.context.acquireSessionLease_(editorA.payload, 'roblox', '1', '1', start);

  // Locked for editor B
  assert.throws(
    () => runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '1', start + 1000),
    (error) => error.code === 'SESSION_LOCKED'
  );

  // Editor A closes session (releases lease immediately)
  const released = runtime.context.releaseSessionLease_(editorA.payload, leaseA.leaseToken, 'roblox', '1', '1', start + 2000);
  assert.equal(released.released, true);

  // Editor B can now immediately acquire the session without waiting for timeout
  const leaseB = runtime.context.acquireSessionLease_(editorB.payload, 'roblox', '1', '1', start + 2100);
  assert.ok(leaseB.leaseToken);
  assert.notEqual(leaseB.leaseToken, leaseA.leaseToken);
});

test('custom SCL_LEASE_SECONDS property overrides default lease duration', () => {
  const runtime = createRuntime();
  runtime.context.PropertiesService.getScriptProperties().setProperty('SCL_LEASE_SECONDS', '240');
  const editor = runtime.editor('Editor Custom');
  const start = Date.parse('2026-08-03T08:00:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', start);
  assert.equal(lease.expiresAt, '2026-08-03T08:04:00.000Z');
});

test('patch save is revision-aware and duplicate request IDs do not duplicate writes or history', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Editor A');
  const now = Date.parse('2026-08-03T09:00:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', now);
  const request = {
    requestId: 'request-save-1',
    courseKey: 'roblox',
    level: '1',
    session: '1',
    baseRevision: lease.sourceRevision,
    changes: { 'Session-topic': plainModel('Saved topic') }
  };
  const saved = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, request, now + 1000);
  const writesAfterFirst = runtime.getSourceWrites();
  const duplicate = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, request, now + 2000);

  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.newRevision, saved.newRevision);
  assert.equal(runtime.getSourceWrites(), writesAfterFirst);
  assert.equal(records(runtime.sheets.get('_Generator_History')).length, 1);

  const source = runtime.sheets.get('B2C_RobloxStudio_Modul');
  const topicColumn = SOURCE_HEADERS.indexOf('Session-topic') + 1;
  source.getRange(2, topicColumn).setValues([['Direct Sheet edit']]);
  assert.throws(
    () => runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
      ...request,
      requestId: 'request-save-2',
      baseRevision: saved.newRevision,
      changes: { 'Session-topic': plainModel('Must not overwrite') }
    }, now + 3000),
    (error) => error.code === 'REVISION_CONFLICT'
  );
  assert.equal(source.values[1][topicColumn - 1], 'Direct Sheet edit');
});

test('semantic tables persist outside materials and stale anchors are detected after direct edit', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Table Editor');
  const now = Date.parse('2026-08-03T09:30:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', now);
  const initialProject = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(), runtime.context.resolveCourse_('roblox'), '1'
  );
  assert.equal(initialProject.sessions[0].sourceRevision, lease.sourceRevision);
  const anchorHash = runtime.context.tableAnchorHash_('Open the editor');
  const table = {
    tableId: 'table-fixture-1',
    field: 'materials',
    orderIndex: 1,
    anchorHash,
    table: {
      schemaVersion: 'scl-table/v1',
      caption: 'Tools',
      headers: ['Tool', 'Purpose'],
      rows: [['Move', '<script>literal text only</script>'], ['Scale', 'Resize']],
      alignments: ['left', 'center']
    }
  };
  const saved = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
    requestId: 'table-save-1', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: lease.sourceRevision, changes: {}, tables: [table]
  }, now + 1000);

  assert.ok(saved.newRevision);
  assert.equal(records(runtime.sheets.get('_Generator_Tables')).length, 1);
  assert.equal(runtime.sheets.get('B2C_RobloxStudio_Modul').values[1][3].includes('table-fixture-1'), false);
  const loaded = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(), runtime.context.resolveCourse_('roblox'), '1'
  );
  assert.equal(loaded.sessions[0].tables[0].table.headers[0], 'Tool');
  assert.equal(loaded.sessions[0].tables[0].anchorStatus, 'RESOLVED');

  const materialsColumn = SOURCE_HEADERS.indexOf('materials') + 1;
  runtime.sheets.get('B2C_RobloxStudio_Modul').getRange(2, materialsColumn)
    .setValues([['Direct replacement without original anchor']]);
  const stale = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(), runtime.context.resolveCourse_('roblox'), '1'
  ).sessions[0];
  assert.equal(stale.tables[0].anchorStatus, 'STALE');
  assert.ok(stale.warnings.some((warning) => warning.code === 'TABLE_ANCHOR_STALE'));
});

test('table validation rejects malformed dimensions and anchor hashing stays deterministic', () => {
  const runtime = createRuntime();
  assert.throws(() => runtime.context.normalizeClientTables_([{
    tableId: 'bad-table', field: 'materials', orderIndex: 0, anchorHash: 'fnv1a32:00000000',
    table: { schemaVersion: 'scl-table/v1', headers: ['A', 'B'], rows: [['only one']], alignments: [] }
  }]), (error) => error.code === 'INVALID_TABLE');
  assert.equal(runtime.context.tableAnchorHash_('Stable anchor'), 'fnv1a32:aa5f41e3');
});

test('layout-only save is revision-aware, idempotent, and reloads from shared storage', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Layout Editor');
  const now = Date.parse('2026-08-03T09:45:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', now);
  const layout = {
    schemaVersion: 'scl-layout/v1',
    blockKey: 'materials:line-0',
    orderIndex: 2,
    imageWidthPercent: 55,
    manualBreak: true,
    attributes: { keepTogether: true }
  };
  const request = {
    requestId: 'layout-save-1', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: lease.sourceRevision, changes: {}, layouts: [layout]
  };
  const saved = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, request, now + 1000);
  const duplicate = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, request, now + 2000);

  assert.notEqual(saved.newRevision, lease.sourceRevision);
  assert.equal(saved.layoutsChanged, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(records(runtime.sheets.get('_Generator_Layouts')).length, 1);
  assert.equal(records(runtime.sheets.get('_Generator_History')).length, 1);
  const reloaded = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(), runtime.context.resolveCourse_('roblox'), '1'
  ).sessions[0];
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.layouts)), [layout]);
  assert.equal(reloaded.sourceRevision, saved.newRevision);

  assert.throws(() => runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
    ...request, requestId: 'layout-stale-1', baseRevision: lease.sourceRevision,
    layouts: [{ ...layout, orderIndex: 3 }]
  }, now + 3000), (error) => error.code === 'REVISION_CONFLICT');
  assert.equal(records(runtime.sheets.get('_Generator_Layouts')).length, 1);
});

test('layout restore is undoable and forbidden layout payloads never write', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Layout Restore Editor');
  const now = Date.parse('2026-08-03T09:50:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', now);
  const firstLayout = {
    schemaVersion: 'scl-layout/v1', blockKey: 'materials:line-0', orderIndex: 1,
    imageWidthPercent: 60, manualBreak: false, attributes: { keepTogether: false }
  };
  const first = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
    requestId: 'layout-restore-save-1', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: lease.sourceRevision, changes: { 'Session-topic': plainModel('Layout restore topic') },
    layouts: [firstLayout]
  }, now + 1000);
  const secondLayout = { ...firstLayout, orderIndex: 4, imageWidthPercent: 80, manualBreak: true };
  const second = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
    requestId: 'layout-restore-save-2', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: first.newRevision, changes: {}, layouts: [secondLayout]
  }, now + 2000);
  const secondHistory = runtime.context.getSessionHistory_('roblox', '1', '1')[0];
  const restored = runtime.context.restoreSessionRevision_(editor.payload, lease.leaseToken, {
    requestId: 'layout-restore-1', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: second.newRevision, historyId: secondHistory.historyId
  }, now + 3000);
  const reloaded = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(), runtime.context.resolveCourse_('roblox'), '1'
  ).sessions[0];
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.layouts)), [firstLayout]);
  assert.equal(reloaded.fields['Session-topic'].text, 'Layout restore topic');
  assert.equal(reloaded.sourceRevision, restored.newRevision);
  assert.equal(runtime.context.getSessionHistory_('roblox', '1', '1')[0].revisionBefore, second.newRevision);

  const layoutWritesBefore = records(runtime.sheets.get('_Generator_Layouts')).length;
  assert.throws(() => runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
    requestId: 'layout-forbidden-1', courseKey: 'roblox', level: '1', session: '1',
    baseRevision: restored.newRevision, changes: {}, layouts: [{ ...firstLayout, html: '<img onerror=alert(1)>' }]
  }, now + 4000));
  assert.equal(records(runtime.sheets.get('_Generator_Layouts')).length, layoutWritesBefore);
});

test('material parser normalizes common bullet glyphs and invisible prefixes into bullets and numbers', () => {
  const runtime = createRuntime();
  const result = runtime.context.parseMaterials_(plainModel('\u200B• First item\n\u200B‣ Second item\n◦ Third item\n1) Numbered item'), '', '');
  assert.deepEqual(JSON.parse(JSON.stringify(result.blocks.map((block) => [block.type, block.text]))), [
    ['bullet', 'First item'],
    ['bullet', 'Second item'],
    ['bullet', 'Third item'],
    ['numbered-item', 'Numbered item']
  ]);
  assert.doesNotMatch(JSON.stringify(result.blocks), /✦\s*[•‣◦]|[•‣◦]\s+First item/);
});

test('history retains twenty revisions and restore creates an undoable revision without exposing snapshots', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Editor A');
  const now = Date.parse('2026-08-03T10:00:00.000Z');
  const lease = runtime.context.acquireSessionLease_(editor.payload, 'roblox', '1', '1', now);
  let revision = lease.sourceRevision;
  for (let index = 1; index <= 22; index += 1) {
    const result = runtime.context.saveSessionPatch_(editor.payload, lease.leaseToken, {
      requestId: `history-request-${index}`,
      courseKey: 'roblox',
      level: '1',
      session: '1',
      baseRevision: revision,
      changes: { 'Session-topic': plainModel(`Topic revision ${index}`) }
    }, now + index * 1000);
    revision = result.newRevision;
  }

  const historyBeforeRestore = runtime.context.getSessionHistory_('roblox', '1', '1');
  assert.equal(historyBeforeRestore.length, 20);
  assert.equal(JSON.stringify(historyBeforeRestore).includes('snapshot_json'), false);
  assert.equal(JSON.stringify(historyBeforeRestore).includes('SYNTHETIC_SERVER_ONLY_ANSWER'), false);

  const restoreTarget = historyBeforeRestore[historyBeforeRestore.length - 1];
  const restored = runtime.context.restoreSessionRevision_(editor.payload, lease.leaseToken, {
    requestId: 'restore-request-1',
    courseKey: 'roblox',
    level: '1',
    session: '1',
    baseRevision: revision,
    historyId: restoreTarget.historyId
  }, now + 23000);
  assert.notEqual(restored.newRevision, revision);
  assert.equal(runtime.context.getSessionHistory_('roblox', '1', '1').length, 20);
  assert.equal(runtime.sheets.get('B2C_RobloxStudio_Modul').values[1][13], 'Topic revision 2');
});

test('expired app session is rejected before a Phase 2 mutation touches Spreadsheet state', () => {
  const runtime = createRuntime();
  const expired = runtime.context.authenticateEditor_(runtime.passcode, 'Expired Editor', 1000).token;
  const writesBefore = runtime.getSourceWrites();
  const response = runtime.context.acquireSessionLease(expired, 'roblox', '1', '1');
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'SESSION_EXPIRED');
  assert.equal(runtime.getSourceWrites(), writesBefore);
  assert.equal(records(runtime.sheets.get('_Generator_Locks')).length, 0);
});

test('V2 sidebar uses the approved unboxed logo mark and separates identity, New Module, and Logout actions', () => {
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(index, /828072b7-9198-4367-bce2-134b9fc8b486\.png/);
  assert.match(styles, /\.logo-badge\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*58px;/);
  assert.match(styles, /\.logo-badge img\s*\{[\s\S]*?object-fit:\s*contain;[\s\S]*?object-position:\s*center;/);
  assert.doesNotMatch(styles.match(/\.logo-badge\s*\{[\s\S]*?\n\s*\}/)[0], /background:|box-shadow:|overflow:\s*hidden/);
  for (const label of ['Buka Dashboard', 'Buka Spreadsheet SSOT', 'Buka Activity Log', 'Buka Published Modules', 'Buka Settings']) {
    assert.match(index, new RegExp(`aria-label="${label}"`));
  }
  assert.match(app, /function renderAuthenticatedIdentity_\(/);
  assert.match(app, /newModuleButton\.addEventListener\('click', handleNewModule_\)/);
  assert.match(app, /logoutButton\.addEventListener\('click', handleLogout\)/);
  assert.match(app, /function handleSessionExpiry[\s\S]*?activityView\.hidden = true;[\s\S]*?publishedView\.hidden = true;/);
  assert.match(styles, /@media \(max-width:\s*768px\)[\s\S]*?\.app-sidebar\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*0;/);
});

test('V2 Drive manifest enables owner-only execution and keeps folder identity out of client source', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'appsscript.json'), 'utf8'));
  const client = ['index.html', 'App.html', 'Styles.html']
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8')).join('\n');
  const server = SERVER_FILES
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8')).join('\n');
  assert.deepEqual(manifest.dependencies.enabledAdvancedServices, [{
    userSymbol: 'Drive', serviceId: 'drive', version: 'v3'
  }]);
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive'), true);
  assert.equal(manifest.oauthScopes.includes('https://www.googleapis.com/auth/documents'), false);
  assert.equal(manifest.executionApi.access, 'MYSELF');
  assert.doesNotMatch(client, /SCL_DRIVE_FOLDER_ID|drive\.google\.com\/drive\/folders\//);
  assert.doesNotMatch(server, /configureDrivePublishingForOwner\(\s*['"][A-Za-z0-9_-]{12,}['"]\s*\)/);
  assert.doesNotMatch(server, /DRIVE API ERROR|JSON\.stringify\(error\)|\| FULL:/);
});

test('P7 client persists same-tab edit identity and keeps retryable heartbeat failures recoverable', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(app, /TAB_INSTANCE_STORAGE_KEY/);
  assert.match(app, /function heartbeatDelaySeconds_\(intervalSeconds\)/);
  assert.match(app, /schemaVersion:\s*'scl-edit-session\/v1'/);
  assert.match(app, /window\.addEventListener\('beforeunload', handleBeforeUnload_\)/);
  assert.match(app, /window\.addEventListener\('pagehide', persistLifecycleDraft_\)/);
  assert.match(app, /window\.addEventListener\('online', retryHeartbeatOnReconnect_\)/);
  assert.match(app, /error\.retryable[\s\S]*?scheduleHeartbeatRetry_\(\)/);
  assert.match(app, /pendingSaveRequest:\s*state\.pendingSaveRequest/);
  assert.match(app, /runner\.resumeSessionLease\(token, leaseToken, editSessionId,/);
});

test('heartbeat delay helper keeps a safety margin under the server interval', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  const match = app.match(/function heartbeatDelaySeconds_\(intervalSeconds\) \{[\s\S]*?\n    \}/);
  assert.ok(match, 'heartbeat helper must exist');
  const sandbox = vm.createContext({ HEARTBEAT_SAFETY_MARGIN_SECONDS: 5, Math, Number });
  new vm.Script(`${match[0]}; this.heartbeatDelaySeconds_ = heartbeatDelaySeconds_;`).runInContext(sandbox);
  assert.equal(sandbox.heartbeatDelaySeconds_(60), 25);
  assert.equal(sandbox.heartbeatDelaySeconds_(30), 25);
  assert.equal(sandbox.heartbeatDelaySeconds_(10), 5);
});

test('V2 failed login activity is aggregated without attempted credential or identity', () => {
  const runtime = createRuntime();
  const bucket = Date.parse('2026-08-07T12:00:00.000Z');
  runtime.context.recordFailedLoginAggregate_(bucket + 1000);
  runtime.context.recordFailedLoginAggregate_(bucket + 2000);
  const audit = records(runtime.sheets.get('_Generator_Audit'));
  assert.equal(audit.length, 1);
  assert.equal(audit[0].event_type, 'login_failed');
  assert.equal(audit[0].editor_label, 'Anonymous');
  assert.equal(JSON.parse(audit[0].metadata_json).attemptCount, 2);
  const serialized = JSON.stringify(audit);
  assert.doesNotMatch(serialized, /wrong-passcode|attempted@example|SYNTHETIC_SERVER_ONLY_ANSWER/);

  const editor = runtime.editor('Activity Reviewer');
  const page = runtime.context.listActivity_(editor.payload, { cursor: 0, limit: 1 });
  assert.equal(page.items[0].attemptCount, 2);
  assert.equal(page.items[0].identityType, 'unknown');
  assert.equal(page.hasMore, false);
  assert.throws(() => runtime.context.listActivity_(null, {}), (error) => error.code === 'SESSION_INVALID');
});

test('V2 activity metadata is allowlisted, newest-first, authenticated, and bounded', () => {
  const runtime = createRuntime();
  const editor = runtime.editor('Self-declared Editor');
  runtime.context.recordActivityEvent_(editor.payload, 'project_open', {
    courseKey: 'roblox', level: '1'
  }, {
    identityType: 'self-declared',
    fullContent: 'SYNTHETIC_FULL_CONTENT_SENTINEL',
    quiz_answers: 'SYNTHETIC_SERVER_ONLY_ANSWER'
  }, 'SUCCESS', '', Date.parse('2026-08-07T10:00:00.000Z'));
  runtime.context.recordActivityEvent_(editor.payload, 'compose', {
    courseKey: 'roblox', level: '1'
  }, {
    pageCount: 34,
    secret: 'SYNTHETIC_SECRET_SENTINEL'
  }, 'FAILED', 'PREFLIGHT_BLOCKED', Date.parse('2026-08-07T10:01:00.000Z'));

  const first = runtime.context.listActivity_(editor.payload, { cursor: 0, limit: 1 });
  const second = runtime.context.listActivity_(editor.payload, { cursor: first.nextCursor, limit: 1 });
  assert.equal(first.items[0].eventType, 'compose');
  assert.equal(first.hasMore, true);
  assert.equal(second.items[0].eventType, 'project_open');
  assert.doesNotMatch(JSON.stringify([first, second]), /FULL_CONTENT|SERVER_ONLY_ANSWER|SECRET_SENTINEL|request_id|error_code/);
  assert.throws(() => runtime.context.listActivity_(editor.payload, { cursor: 0, limit: 101 }),
    (error) => error.code === 'INVALID_REQUEST');
});

test('V2 publish reservation is idempotent, versioned, and keeps exactly one latest pointer', () => {
  const runtime = createRuntime();
  const spreadsheet = runtime.context.SpreadsheetApp.openById('phase2-fixture-spreadsheet');
  const editorA = runtime.editor('Publisher A');
  const editorB = runtime.editor('Publisher B');
  const baseRequest = { courseKey: 'roblox', level: '1' };
  const first = runtime.context.reservePublishVersion_(spreadsheet, editorA.payload, {
    ...baseRequest, requestId: 'publish-request-1'
  }, 'revision-digest-1', Date.parse('2026-08-07T11:00:00.000Z'));
  const duplicate = runtime.context.reservePublishVersion_(spreadsheet, editorA.payload, {
    ...baseRequest, requestId: 'publish-request-1'
  }, 'revision-digest-1', Date.parse('2026-08-07T11:00:01.000Z'));
  const second = runtime.context.reservePublishVersion_(spreadsheet, editorB.payload, {
    ...baseRequest, requestId: 'publish-request-2'
  }, 'revision-digest-2', Date.parse('2026-08-07T11:00:02.000Z'));
  assert.equal(first.version, 1);
  assert.equal(duplicate.duplicate, true);
  assert.equal(second.version, 2);
  assert.equal(records(runtime.sheets.get('_Generator_Publishes')).length, 2);

  runtime.context.finalizePublish_(spreadsheet, first.publishId, {
    fileId: 'fixtureFileOne', fileName: first.fileName, pageCount: 34,
    fileSizeBytes: 5000000, rendererVersion: 'fixture-renderer-v1'
  }, Date.parse('2026-08-07T11:01:00.000Z'));
  runtime.context.finalizePublish_(spreadsheet, second.publishId, {
    fileId: 'fixtureFileTwo', fileName: second.fileName, pageCount: 34,
    fileSizeBytes: 5000001, rendererVersion: 'fixture-renderer-v1'
  }, Date.parse('2026-08-07T11:02:00.000Z'));
  const stored = records(runtime.sheets.get('_Generator_Publishes'));
  assert.equal(stored.filter((record) => String(record.is_latest) === 'true').length, 1);
  assert.equal(stored.find((record) => String(record.is_latest) === 'true').version, 2);

  const page = runtime.context.listPublishedModules_(editorA.payload, { cursor: 0, limit: 10 });
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].version, 2);
  assert.match(page.items[0].openUrl, /^https:\/\/drive\.google\.com\/file\/d\/fixtureFileTwo\/view$/);
  assert.doesNotMatch(JSON.stringify(page), /requestId|sourceRevisionDigest|fileId|metadata_json/);
  assert.equal(runtime.getSourceWrites(), 0);
});

test('V2 corrupt publish schema blocks reservation without repairing or mutating source', () => {
  const runtime = createRuntime();
  const sheet = runtime.sheets.get('_Generator_Publishes');
  sheet.values.push(sheet.values[0].map((header) => header === 'publish_id' ? 'broken' : ''));
  const spreadsheet = runtime.context.SpreadsheetApp.openById('phase2-fixture-spreadsheet');
  const editor = runtime.editor('Publisher');
  assert.throws(() => runtime.context.reservePublishVersion_(spreadsheet, editor.payload, {
    courseKey: 'roblox', level: '1', requestId: 'publish-corrupt-1'
  }, 'revision-digest-corrupt'), (error) => error.code === 'STORAGE_UNAVAILABLE');
  assert.equal(sheet.values.length, 2);
  assert.equal(runtime.getSourceWrites(), 0);
});

test('V2 Drive foundation uses owner identity, Shared Drive options, and one-file retry reconciliation', () => {
  const runtime = createRuntime();
  const denied = runtime.context.runDriveFoundationFixtureForOwner();
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, 'OWNER_ONLY');

  runtime.setActiveEmail('owner@example.invalid');
  const editor = runtime.editor('Capability Reader');
  const capability = runtime.context.getDrivePublishingCapability_(editor.payload);
  assert.deepEqual(JSON.parse(JSON.stringify(capability)), {
    configured: true, accessible: true, canAddChildren: true, sharedDrive: true
  });
  assert.doesNotMatch(JSON.stringify(capability), /phase2-drive-root|folderId|driveId/);

  const first = runtime.context.runDriveFoundationFixtureForOwner();
  const second = runtime.context.runDriveFoundationFixtureForOwner();
  assert.equal(first.ok, true);
  assert.equal(first.data.created, true);
  assert.equal(first.data.status, 'PUBLISHED');
  assert.equal(second.ok, true);
  assert.equal(second.data.duplicate, true);
  assert.equal(runtime.getDriveCreateCount(), 2);
  assert.equal(Array.from(runtime.driveFiles.values()).filter((file) => file.mimeType === 'application/pdf').length, 1);
  assert.equal(records(runtime.sheets.get('_Generator_Publishes')).length, 1);
  assert.equal(runtime.getSourceWrites(), 0);
});

test('V2 owner helper repairs storage and reports only safe fixture summary', () => {
  const runtime = createRuntime();
  runtime.setActiveEmail('owner@example.invalid');
  const first = runtime.context.runV2P4OwnerSetupAndFixture();
  const second = runtime.context.runV2P4OwnerSetupAndFixture();
  assert.equal(first.ok, true);
  assert.equal(first.data.storageReady, true);
  assert.equal(first.data.created, true);
  assert.equal(first.data.status, 'PUBLISHED');
  assert.equal(second.ok, true);
  assert.equal(second.data.duplicate, true);
  assert.doesNotMatch(JSON.stringify([first, second]), /folderId|fileId|driveId|phase2-drive-root/);
});

test('V2 Drive failure paths are safe and oversize blobs are rejected before upload', () => {
  const failed = createRuntime();
  failed.setActiveEmail('owner@example.invalid');
  failed.setDriveCreateError(new Error('synthetic quota failure'));
  const response = failed.context.runDriveFoundationFixtureForOwner();
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'DRIVE_UPLOAD_FAILED');
  const publishRows = records(failed.sheets.get('_Generator_Publishes'));
  assert.equal(publishRows.length, 1);
  assert.equal(publishRows[0].publish_status, 'FAILED');
  assert.equal(publishRows[0].error_code, 'DRIVE_UPLOAD_FAILED');
  assert.equal(failed.getSourceWrites(), 0);

  const permission = createRuntime();
  permission.setActiveEmail('owner@example.invalid');
  permission.driveFiles.get('phase2-drive-root').capabilities.canAddChildren = false;
  const denied = permission.context.runDriveFoundationFixtureForOwner();
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, 'DRIVE_PERMISSION_REQUIRED');
  assert.equal(records(permission.sheets.get('_Generator_Publishes')).length, 0);

  const invalidBlob = {
    getBytes: () => [1, 2, 3, 4],
    getContentType: () => 'application/pdf'
  };
  assert.throws(() => failed.context.validateDriveUploadBlob_(invalidBlob, 3),
    (error) => error.code === 'DRIVE_FILE_INVALID');
});

test('App client auto-discards identical drafts and rebases recovery revision to active session', () => {
  const appSource = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(appSource, /function isDraftIdenticalToSession_\(/);
  assert.match(appSource, /state\.pendingSaveRequest = null;\s*hideConflictBanner\(\);/);
  assert.match(appSource, /request\.baseRevision = state\.currentRevision;/);
});

