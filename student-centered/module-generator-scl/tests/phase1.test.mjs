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
  'Code.gs'
];
const HEADERS = [
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
const ANSWER_SENTINEL = 'SYNTHETIC_ANSWER_SENTINEL';

function createRuntime(sheetsByName) {
  if (!sheetsByName._Generator_Layouts) {
    sheetsByName._Generator_Layouts = {
      managed: true,
      values: [[
        'layout_id', 'row_key', 'field', 'block_key', 'order_index', 'layout_json',
        'created_at', 'updated_at', 'updated_by'
      ]]
    };
  }
  const properties = {
    SCL_SPREADSHEET_ID: 'synthetic-spreadsheet-id',
    SCL_PASSWORD_SALT: crypto.randomBytes(24).toString('base64url'),
    SCL_PASSWORD_HASH: 'pending',
    SCL_SESSION_SIGNING_SECRET: crypto.randomBytes(32).toString('base64url'),
    SCL_IMAGE_MAX_BYTES: '10485760'
  };
  const metrics = {
    openById: 0,
    getRange: 0,
    getValues: 0,
    getRichTextValues: 0,
    writes: 0
  };
  const cacheValues = new Map();
  let uuidCounter = 0;
  const spreadsheet = {
    getSheetByName(name) {
      const fixture = sheetsByName[name];
      return fixture ? createSheet(fixture, metrics) : null;
    }
  };
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
      getActiveUser: () => ({ getEmail: () => 'synthetic@example.invalid' }),
      getTemporaryActiveUserKey: () => 'synthetic-user-key'
    },
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET' },
      newRichTextValue: createRichTextBuilder,
      newTextStyle: createTextStyleBuilder,
      openById(id) {
        assert.equal(id, 'synthetic-spreadsheet-id');
        metrics.openById += 1;
        return spreadsheet;
      }
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperties: () => ({ ...properties }) })
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
        return `phase1-uuid-${uuidCounter}`;
      },
      newBlob(value) { return { getDataAsString: () => toBuffer(value).toString('utf8') }; }
    }
  });
  const source = SERVER_FILES
    .map((file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'))
    .join('\n');
  vm.runInContext(source, context, { filename: 'phase1-server-bundle.gs' });

  const passcode = crypto.randomBytes(18).toString('base64url');
  properties.SCL_PASSWORD_HASH = context.derivePasscodeHash_(passcode, properties.SCL_PASSWORD_SALT);
  const token = context.authenticateEditor_(passcode, 'Synthetic Editor').token;
  return { context, metrics, token };
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
    setTextStyle(start, end, style) {
      runs.push({ start, end, ...style, link: '' });
      return this;
    },
    setLinkUrl(start, end, link) {
      const run = runs.find((candidate) => candidate.start === start && candidate.end === end);
      if (run) run.link = link;
      return this;
    },
    build() { return createRichTextValue(text, runs); }
  };
}

function createSheet(fixture, metrics) {
  return {
    getLastRow: () => fixture.values.length,
    getLastColumn: () => fixture.values.reduce((max, row) => Math.max(max, row.length), 0),
    getRange(row, column, rowCount, columnCount) {
      metrics.getRange += 1;
      const values = fixture.values
        .slice(row - 1, row - 1 + rowCount)
        .map((sourceRow) => sourceRow.slice(column - 1, column - 1 + columnCount));
      const richTextValues = values.map((sourceRow, localRow) => sourceRow.map((value, localColumn) => {
        const absoluteRow = row - 1 + localRow;
        const absoluteColumn = column - 1 + localColumn;
        const styleRuns = fixture.styles?.[`${absoluteRow}:${absoluteColumn}`] || [];
        return createRichTextValue(value, styleRuns);
      }));
      return {
        getDisplayValues() {
          return values.map((sourceRow) => sourceRow.map((value) => String(value ?? '')));
        },
        getValues() {
          metrics.getValues += 1;
          return values;
        },
        getRichTextValues() {
          metrics.getRichTextValues += 1;
          return richTextValues;
        },
        setValues() {
          metrics.writes += 1;
          throw new Error('Phase 1 fixture is read-only.');
        }
      };
    },
    createDeveloperMetadataFinder() {
      return {
        withKey() { return this; },
        find: () => fixture.managed ? [{ getValue: () => 'scl-generator/v1' }] : []
      };
    }
  };
}

function createRichTextValue(value, styleRuns) {
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

function createCourseFixture(levelValue) {
  const empty = Array(HEADERS.length).fill('');
  const values = [
    ['Panduan internal sintetis', ...empty.slice(1)],
    empty.slice(),
    HEADERS.slice(),
    [
      levelValue,
      1,
      '- Build an object\r\n- Test the result',
      'Intro\nfyk4*\nhttps://example.invalid/synthetic-image.png\nkc1*\nfyk1*',
      'Create the main project',
      'Add one variation',
      'Explain the design',
      'Review the output',
      'kc1: A reusable instruction\nkc2: An unused definition',
      'fyk1: First note\nfyk4: Fourth note',
      '1. Which block?\n2. Why test?',
      '1. A. Move | B. Stop\n2. A. To verify | B. To guess',
      ANSWER_SENTINEL,
      'Synthetic Project'
    ],
    [
      levelValue,
      2,
      'One objective',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ANSWER_SENTINEL,
      ''
    ],
    [levelValue, 3, 'Objective', 'Material', '', '', '', '', '', '', '', '', ANSWER_SENTINEL, 'First duplicate'],
    [levelValue, 3, 'Objective', 'Material', '', '', '', '', '', '', '', '', ANSWER_SENTINEL, 'Second duplicate']
  ];
  const objectiveColumn = HEADERS.indexOf('objectives');
  const objectiveText = values[3][objectiveColumn];
  return {
    values,
    styles: {
      [`3:${objectiveColumn}`]: [
        { start: 0, end: 17, bold: true },
        { start: 17, end: objectiveText.length, italic: true, link: 'https://example.invalid/reference' }
      ]
    }
  };
}

function createAllCourseFixtures() {
  return {
    B2C_RobloxStudio_Modul: createCourseFixture(1),
    B2C_Scratch_Modul: createCourseFixture('Scratch Level 1'),
    B2C_Python_Modul: createCourseFixture('Python Level 1.0')
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function toBuffer(value) {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
}

test('header discovery reads one bounded values/rich-text rectangle and normalizes twelve slots', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const response = runtime.context.loadLevelProject(runtime.token, 'scratch', 'Level 1');
  assert.equal(response.ok, true);
  assert.equal(response.data.level, '1');
  assert.equal(response.data.sessions.length, 12);
  assert.equal(response.data.readyCount, 1);
  assert.equal(response.data.sessions[0].status, 'Ready');
  assert.equal(response.data.sessions[1].status, 'Incomplete');
  assert.equal(response.data.sessions[2].status, 'Needs Fix');
  assert.equal(response.data.sessions[11].status, 'On Progress');
  assert.deepEqual(runtime.metrics, {
    openById: 1,
    getRange: 2,
    getValues: 1,
    getRichTextValues: 1,
    writes: 0
  });
});

test('rich text, CRLF, marker order, tasks, image URL, and quiz pipes normalize deterministically', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const project = runtime.context.loadLevelProject_(
    runtime.context.requireConfiguration_(),
    runtime.context.resolveCourse_('roblox'),
    1
  );
  const session = plain(project.sessions[0]);
  assert.equal(session.fields.objectives.text.includes('\r'), false);
  assert.equal(session.fields.objectives.runs[0].bold, true);
  assert.equal(session.fields.objectives.runs[1].italic, true);
  assert.equal(session.fields.objectives.runs[1].link, 'https://example.invalid/reference');
  const rebuilt = runtime.context.buildRichTextValue_(project.sessions[0].fields.objectives);
  const renormalized = plain(runtime.context.normalizeRichTextValue_(rebuilt, ''));
  assert.deepEqual(renormalized, session.fields.objectives);
  assert.deepEqual(
    session.materialBlocks.map((block) => block.type),
    ['paragraph', 'did-you-know', 'image', 'tutor-says', 'did-you-know']
  );
  assert.deepEqual(
    session.materialBlocks.filter((block) => block.marker).map((block) => block.marker),
    ['fyk4', 'kc1', 'fyk1']
  );
  assert.equal(session.tasks.mustDo[0].text, 'Create the main project');
  assert.equal(session.quiz[0].options.length, 2);
  assert.equal(session.quiz[0].options[0].label, 'A');
  assert.equal(session.materialBlocks.some((block) => block.type === 'table'), false);
  assert.equal(session.warnings.some((warning) => warning.code === 'KC_DEFINITION_UNUSED'), true);
});

test('legacy Markdown is converted to rich runs without breaking native styles or code fences', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const source = 'Native **bold** and *italic* and ***both*** and __strong__ and _under_.\n```python\nprint("***literal***")\n```';
  const native = {
    getText: () => source,
    getRuns: () => [{
      getStartIndex: () => 0,
      getEndIndex: () => 6,
      getLinkUrl: () => null,
      getTextStyle: () => ({
        isBold: () => true,
        isItalic: () => false,
        isUnderline: () => false,
        isStrikethrough: () => false
      })
    }]
  };
  const model = plain(runtime.context.normalizeRichTextValue_(native, ''));
  assert.equal(
    model.text,
    'Native bold and italic and both and strong and under.\n```python\nprint("***literal***")\n```'
  );
  const styleFor = (needle) => {
    const start = model.text.indexOf(needle);
    assert.notEqual(start, -1);
    return model.runs.find((run) => run.start <= start && run.end > start);
  };
  assert.equal(styleFor('Native').bold, true);
  assert.equal(styleFor('bold').bold, true);
  assert.equal(styleFor('italic').italic, true);
  assert.equal(styleFor('both').bold, true);
  assert.equal(styleFor('both').italic, true);
  assert.equal(styleFor('strong').bold, true);
  assert.equal(styleFor('under').italic, true);
  assert.equal(styleFor('***literal***').bold, false);
  assert.equal(styleFor('***literal***').italic, false);
  const markerSafe = plain(runtime.context.normalizeRichTextValue_(
    {
      getText: () => 'kc1* and *italic*',
      getRuns: () => []
    },
    ''
  ));
  assert.equal(markerSafe.text, 'kc1* and italic');
  assert.equal(markerSafe.runs.find((run) => run.start <= 9 && run.end > 9).italic, true);
  const materials = plain(runtime.context.parseMaterials_(model, '', ''));
  assert.deepEqual(
    materials.blocks.slice(0, 5).map((block) => [block.text, block.textStyle || 'normal']),
    [
      ['Native bold and italic and both and strong and under.', 'normal'],
      ['```python', 'normal'],
      ['print("***literal***")', 'normal'],
      ['```', 'normal']
    ]
  );
  const headings = plain(runtime.context.parseMaterials_(
    { text: '# Main title\n## Sub title\n### Detail', runs: [] },
    '',
    ''
  ));
  assert.deepEqual(
    headings.blocks.map((block) => [block.text, block.textStyle]),
    [['Main title', 'heading1'], ['Sub title', 'heading2'], ['Detail', 'heading2']]
  );
});

test('manual page break and image width metadata survive normalized material parsing', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const imageUrl = 'https://cdn.example.invalid/lesson.png';
  const text = `Intro\n[[SCL_PAGE_BREAK]]\n${imageUrl}`;
  const model = {
    text,
    runs: [
      { start: 0, end: 5, bold: false, italic: false, underline: false, strikethrough: false, link: '' },
      { start: 6, end: 24, bold: false, italic: false, underline: false, strikethrough: false, link: '' },
      {
        start: 25,
        end: text.length,
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        link: `${imageUrl}#scl-width=55`
      }
    ]
  };
  const result = plain(runtime.context.parseMaterials_(model, '', ''));
  assert.deepEqual(result.blocks.map((block) => block.type), ['paragraph', 'page-break', 'image']);
  assert.equal(result.blocks[1].manual, true);
  assert.equal(result.blocks[2].text, imageUrl);
  assert.equal(result.blocks[2].displayWidthPercent, 55);
});

test('image URL attached to prose becomes a separate image block without losing text', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const imageUrl = 'https://cdn-web-2.ruangguru.com/landing-pages/assets/example-image.png';
  const text = `Komputer menunggu perintah darimu.${imageUrl}`;
  const model = {
    text,
    runs: [{ start: 0, end: text.length, bold: false, italic: false, underline: false, strikethrough: false, link: '' }]
  };
  const result = plain(runtime.context.parseMaterials_(model, '', ''));
  assert.deepEqual(result.blocks.map((block) => block.type), ['paragraph', 'image']);
  assert.equal(result.blocks[0].text, 'Komputer menunggu perintah darimu.');
  assert.equal(result.blocks[1].text, imageUrl);
  assert.equal(result.blocks[1].displayWidthPercent, 69);
});

test('session topic exceeding character soft limit produces SESSION_TOPIC_TOO_LONG warning', () => {
  const fixture = createCourseFixture(1);
  const topicColumn = HEADERS.indexOf('Session-topic');
  fixture.values[3][topicColumn] = 'A'.repeat(85);
  const runtime = createRuntime({ B2C_RobloxStudio_Modul: fixture });
  const response = runtime.context.loadLevelProject(runtime.token, 'roblox', '1');
  assert.equal(response.ok, true);
  const session = response.data.sessions[0];
  const topicWarning = session.warnings.find((warning) => warning.code === 'SESSION_TOPIC_TOO_LONG');
  assert.notEqual(topicWarning, undefined);
  assert.equal(topicWarning.maxLength, 80);
  assert.equal(topicWarning.length, 85);
});

test('answer sentinel is isolated before the normalized client response', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const response = runtime.context.loadLevelProject(runtime.token, 'python', 'Python Level 1.0');
  const serialized = JSON.stringify(response);
  assert.equal(response.ok, true);
  assert.equal(serialized.includes(ANSWER_SENTINEL), false);
  assert.equal(serialized.includes('quiz_' + 'answers'), false);
  assert.match(response.data.sessions[0].sourceRevision, /^[A-Za-z0-9_-]{43}$/);
});

test('three-course catalog is built from read-only fixtures with normalized level summaries', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const response = runtime.context.listCoursesAndLevels(runtime.token);
  assert.equal(response.ok, true);
  assert.deepEqual(response.data.courses.map((course) => course.key), ['roblox', 'scratch', 'python']);
  assert.deepEqual(response.data.courses.map((course) => course.levels[0].level), ['1', '1', '1']);
  assert.deepEqual(response.data.courses.map((course) => course.levels[0].readyCount), [1, 1, 1]);
  assert.equal(runtime.metrics.openById, 1);
  assert.equal(runtime.metrics.getRange, 3);
  assert.equal(runtime.metrics.getValues, 3);
  assert.equal(runtime.metrics.getRichTextValues, 0);
  assert.equal(runtime.metrics.writes, 0);
});

test('ambiguous, duplicate, and invalid source identity states block silently unsafe normalization', () => {
  const duplicateHeaderFixture = createCourseFixture(1);
  duplicateHeaderFixture.values[2][4] = 'materials';
  const duplicateRuntime = createRuntime({
    B2C_RobloxStudio_Modul: duplicateHeaderFixture
  });
  const duplicateResponse = duplicateRuntime.context.loadLevelProject(duplicateRuntime.token, 'roblox', '1');
  assert.equal(duplicateResponse.ok, false);
  assert.equal(duplicateResponse.error.code, 'SOURCE_DUPLICATE_HEADER');

  const missingHeaderFixture = createCourseFixture(1);
  missingHeaderFixture.values[2] = ['Level', 'Session', 'objectives'];
  const missingRuntime = createRuntime({ B2C_RobloxStudio_Modul: missingHeaderFixture });
  const missingResponse = missingRuntime.context.loadLevelProject(missingRuntime.token, 'roblox', '1');
  assert.equal(missingResponse.ok, false);
  assert.equal(missingResponse.error.code, 'SOURCE_HEADER_NOT_FOUND');
});

test('arbitrary tab input cannot cross the server-owned course boundary', () => {
  const runtime = createRuntime(createAllCourseFixtures());
  const response = runtime.context.loadLevelProject(runtime.token, 'B2C_Python_Modul', '1');
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'UNKNOWN_COURSE');
  assert.equal(runtime.metrics.openById, 0);
});
