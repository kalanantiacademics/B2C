import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adapterSource = fs.readFileSync(
  path.join(ROOT, 'src', 'LegacyAdapter.html'),
  'utf8'
).replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const context = vm.createContext({
  Array,
  Boolean,
  JSON,
  Math,
  Number,
  Object,
  String,
  window: {}
});
new vm.Script(adapterSource, { filename: 'LegacyAdapter.html' }).runInContext(context);

function plain(text) {
  return { text, runs: text ? [{ start: 0, end: text.length, link: '' }] : [] };
}

function fixtureSession() {
  return {
    session: '1',
    topic: 'Build a deterministic project',
    fields: {
      objectives: plain('- Understand the concept\n- Explain the result'),
      materials: plain('Intro\nfyk4*\nhttps://cdn.example.invalid/image.png\nTahap 1: Build\nOpen the editor'),
      kamus_coder: plain('kc1: Tutor definition'),
      for_your_knowledge: plain('fyk4: Knowledge definition'),
      must_do: plain('Create the main project'),
      should_do: plain('Add one improvement'),
      aspire_to_do: plain('Try an advanced challenge'),
      'self-check': plain('I can explain the result'),
      quiz_questions: plain('1. What did you build?'),
      quiz_options: plain('1. A. A project|B. Nothing'),
      'Session-topic': plain('Build a deterministic project')
    },
    materialBlocks: [
      { type: 'paragraph', text: 'Intro', richText: plain('Intro') },
      { type: 'did-you-know', marker: 'fyk4', text: 'Knowledge definition' },
      { type: 'image', text: 'https://cdn.example.invalid/image.png', displayWidthPercent: 55 },
      { type: 'paragraph', text: 'Tahap 1: Build', richText: plain('Tahap 1: Build') },
      { type: 'paragraph', text: 'Open the editor', richText: plain('Open the editor') }
    ],
    quiz: [{
      number: '1',
      question: 'What did you build?',
      options: [{ label: 'A', text: 'A project' }, { label: 'B', text: 'Nothing' }]
    }],
    tables: [{
      tableId: 'table-1',
      orderIndex: 4,
      table: { caption: 'Evidence', headers: ['Item'], rows: [['Preserved']] }
    }],
    serverOnly: { quiz_answers: 'SYNTHETIC_ANSWER_SENTINEL' }
  };
}

test('legacy adapter creates deterministic component model in source order', () => {
  const first = context.window.SclLegacyAdapter.adaptSession(fixtureSession());
  const second = context.window.SclLegacyAdapter.adaptSession(fixtureSession());
  assert.equal(first.schemaVersion, 'scl-legacy-component/v1');
  assert.deepEqual(
    Array.from(first.components, (component) => component.type),
    ['objectives', 'paragraph', 'bubble', 'image', 'step', 'task', 'task', 'task', 'task', 'quiz', 'table']
  );
  assert.deepEqual(
    Array.from(first.components, (component) => component.id),
    Array.from(second.components, (component) => component.id)
  );
  assert.equal(first.components[4].title, 'Build');
  assert.equal(first.components[4].items[0].model.text, 'Open the editor');
});

test('legacy adapter preserves collaboration-safe field identity and excludes answers', () => {
  const result = context.window.SclLegacyAdapter.adaptSession(fixtureSession());
  const serialized = JSON.stringify(result);
  assert.match(serialized, /"field":"must_do"/);
  assert.match(serialized, /"field":"materials"/);
  assert.doesNotMatch(serialized, /quiz_answers|SYNTHETIC_ANSWER_SENTINEL/);
});

test('legacy adapter chunks table rows and repeats semantic header on continuation', () => {
  const session = fixtureSession();
  session.tables[0].table.rows = Array.from({ length: 8 }, (_, index) => ['Row ' + (index + 1)]);
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const tables = result.components.filter((component) => component.type === 'table');
  assert.equal(tables.length, 2);
  assert.deepEqual(Array.from(tables, (component) => component.table.rows.length), [5, 3]);
  assert.equal(tables[0].continuation, false);
  assert.equal(tables[1].continuation, true);
  assert.deepEqual(Array.from(tables[1].table.headers), ['Item']);
});

test('live draft adapter resolves markers, image width, and quiz without server-derived blocks', () => {
  const session = fixtureSession();
  session.liveDraft = true;
  session.fields.materials.runs = [{
    start: 0,
    end: session.fields.materials.text.length,
    link: 'https://cdn.example.invalid/image.png#scl-width=65'
  }];
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const bubble = result.components.find((component) => component.type === 'bubble');
  const image = result.components.find((component) => component.type === 'image');
  const quiz = result.components.find((component) => component.type === 'quiz');
  assert.equal(bubble.label, 'Did You Know?');
  assert.equal(bubble.model.text, 'Knowledge definition');
  assert.equal(image.displayWidthPercent, 65);
  assert.equal(quiz.items[0].options.length, 2);
});

test('live draft adapter normalizes common bullet glyphs without duplicating Kalananti markers', () => {
  const session = fixtureSession();
  session.liveDraft = true;
  session.fields.materials = plain('• First item\n\uFEFF‣ Invisible-prefix item\n◦ Hollow item\n1) Numbered item');
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const materialParagraphs = result.components.filter((component) =>
    component.field === 'materials' && component.type === 'paragraph'
  );

  assert.deepEqual(JSON.parse(JSON.stringify(materialParagraphs.map((component) => component.textStyle))), [
    'bullet',
    'bullet',
    'bullet',
    'numbered'
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(materialParagraphs.map((component) => component.model.text))), [
    'First item',
    'Invisible-prefix item',
    'Hollow item',
    'Numbered item'
  ]);
  assert.doesNotMatch(JSON.stringify(materialParagraphs), /✦\s*[•‣◦]|[•‣◦]\s+First/);
});

test('live draft adapter converts Markdown headings and inline emphasis', () => {
  const session = fixtureSession();
  session.liveDraft = true;
  session.fields.materials = plain('# Main title\n## Sub title\nThis is ***bold italic*** and **bold** and *italic* and __strong__ and _under_.');
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const paragraphs = result.components.filter((component) => component.field === 'materials' && component.type === 'paragraph');
  assert.equal(paragraphs[0].textStyle, 'heading1');
  assert.equal(paragraphs[0].model.text, 'Main title');
  assert.equal(paragraphs[1].textStyle, 'heading2');
  assert.equal(paragraphs[1].model.text, 'Sub title');
  assert.equal(paragraphs[2].model.text, 'This is bold italic and bold and italic and strong and under.');
  assert.deepEqual(
    paragraphs[2].model.runs.map((run) => [run.bold, run.italic]),
    [[true, true], [true, false], [false, true], [true, false], [false, true]]
  );
});

test('editor canonicalizes Markdown headings before rendering and serializing blocks', () => {
  const editor = fs.readFileSync(path.join(ROOT, 'src', 'Editor.html'), 'utf8');
  assert.match(editor, /function markdownHeadingModel_\(/);
  assert.match(editor, /textStyle: heading \? heading\.style : 'normal'/);
  assert.match(editor, /block\.textStyle && block\.textStyle !== 'normal'/);
  assert.match(editor, /block\.model = markdownRichModel_\(model\)/);
  assert.match(editor, /var pattern = \/\(\\\*\\\*\\\*\\|___\)/);
  assert.match(editor, /\(\[\*_]\)\(\?=\\S\)/);
});

test('legacy adapter preserves preflight image ratio for deterministic pagination', () => {
  const session = fixtureSession();
  session.materialBlocks[2].preflightWidth = 2400;
  session.materialBlocks[2].preflightHeight = 1200;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const image = result.components.find((component) => component.type === 'image');
  assert.equal(image.preflightWidth, 2400);
  assert.equal(image.preflightHeight, 1200);
});

test('legacy adapter defaults unconfigured images to sixty-nine percent', () => {
  const session = fixtureSession();
  delete session.materialBlocks[2].displayWidthPercent;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const image = result.components.find((component) => component.type === 'image');
  assert.equal(image.displayWidthPercent, 69);
});

test('Python fenced materials become safe IDE components while other courses remain unchanged', () => {
  const python = fixtureSession();
  python.courseKey = 'python';
  python.materialBlocks = [
    { type: 'paragraph', text: '```python' },
    { type: 'paragraph', text: 'print("hello")' },
    { type: 'paragraph', text: '<img src=x onerror=alert(1)>' },
    { type: 'paragraph', text: '```' },
    { type: 'paragraph', text: '```tezt```' }
  ];
  const result = context.window.SclLegacyAdapter.adaptSession(python);
  const codes = result.components.filter((component) => component.type === 'code');
  assert.deepEqual(Array.from(codes, (component) => component.code), [
    'print("hello")\n<img src=x onerror=alert(1)>',
    'tezt'
  ]);
  assert.deepEqual(Array.from(codes, (component) => component.source.blockKey), [
    'materials:line-0', 'materials:line-4'
  ]);
  assert.doesNotMatch(JSON.stringify(codes), /```/);

  const scratch = fixtureSession();
  scratch.courseKey = 'scratch';
  scratch.materialBlocks = [{ type: 'paragraph', text: '```tezt```', richText: plain('```tezt```') }];
  assert.equal(context.window.SclLegacyAdapter.adaptSession(scratch).components[1].type, 'paragraph');
});

test('M2 golden course shapes preserve component family, source identity, marker order, rich text, and answer isolation', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'm2', 'adapter-golden.json'), 'utf8'));
  assert.equal(golden.schemaVersion, 'scl-m2-adapter-golden/v1');
  assert.equal(golden.sanitized, true);
  assert.deepEqual(golden.courses.map((course) => course.key), ['roblox', 'scratch', 'python']);
  const flattenComponents = (components) => components.flatMap((component) => [
    component,
    ...(Array.isArray(component.items)
      ? flattenComponents(component.items.filter((item) => item && item.type && item.field))
      : [])
  ]);
  for (const course of golden.courses) {
    const first = JSON.parse(JSON.stringify(context.window.SclLegacyAdapter.adaptSession(course.session)));
    const second = JSON.parse(JSON.stringify(context.window.SclLegacyAdapter.adaptSession(course.session)));
    assert.deepEqual(first, second, course.key + ' deterministic');
    assert.deepEqual(first.components.map((component) => component.type), course.expected.types, course.key + ' types');
    assert.deepEqual(first.components.map((component) => component.field), course.expected.fields, course.key + ' fields');
    assert.deepEqual(
      flattenComponents(first.components).filter((component) => component.type === 'bubble').map((component) => component.marker),
      course.expected.markers,
      course.key + ' markers'
    );
    for (const component of first.components) {
      assert.equal(component.source.field, component.field, course.key + ' source field');
      assert.match(component.source.blockKey, new RegExp('^' + component.field + ':'), course.key + ' block key');
      assert.equal(Number.isInteger(component.source.blockIndex), true, course.key + ' block index');
    }
    const serialized = JSON.stringify(first);
    assert.doesNotMatch(serialized, /quiz_answers|M2_(?:ROBLOX|SCRATCH|PYTHON)_ANSWER_SENTINEL/);
  }
  const python = JSON.parse(JSON.stringify(context.window.SclLegacyAdapter.adaptSession(golden.courses[2].session)));
  assert.equal(python.components[0].items[0].runs[0].bold, true);
  assert.equal(python.components.find((component) => component.type === 'step').items[0].model.runs[0].italic, true);
  assert.deepEqual(python.components.filter((component) => component.type === 'table').map((table) => table.table.rows.length), [5, 1]);
});

test('PRD v2.2 and visual spec pin approved non-cover viewport and typography', () => {
  const prd = fs.readFileSync(path.join(ROOT, 'PRD.md'), 'utf8');
  const visual = fs.readFileSync(path.join(ROOT, 'docs', 'VISUAL_PARITY_SPEC.md'), 'utf8');
  assert.match(prd, /Versi:\*\* 2\.2/);
  assert.match(visual, /Left \| `1\.38 cm`/);
  assert.match(visual, /Top \| `3\.22 cm`/);
  assert.match(visual, /Width \| `18\.38 cm`/);
  assert.match(visual, /Height \| `23\.86 cm`/);
  assert.match(visual, /Poppins `14 pt`/);
  for (const asset of [
    'cover-scl.svg',
    'beginning-kiri-scl.svg',
    'beginning-kanan-scl.svg',
    'plain-kiri-scl.svg',
    'plain-kanan-scl.svg',
    'back-cover-scl.svg'
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, 'back-module', asset)), true, asset);
  }
});

test('generated content-left runtime asset exactly matches the canonical SVG', () => {
  const canonical = fs.readFileSync(path.join(ROOT, 'back-module', 'plain-kiri-scl.svg'), 'utf8');
  const generated = fs.readFileSync(path.join(ROOT, 'src', 'PageAssets.html'), 'utf8');
  const embedded = generated.match(/<template id="scl-page-asset-contentLeft"[^>]*>([\s\S]*?)<\/template>/);
  assert.ok(embedded, 'content-left template must exist');
  assert.equal(embedded[1], canonical);
});

test('M3 shared renderer uses approved non-cover viewport and Poppins body geometry', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(styles, /--legacy-display:\s*'Poppins', sans-serif/);
  assert.match(styles, /--legacy-body:\s*'Poppins', sans-serif/);
  const bodyRule = styles.match(/\.a4-page-body\s*\{[^}]+\}/)?.[0] || '';
  assert.match(bodyRule, /top:\s*3\.22cm/);
  assert.match(bodyRule, /left:\s*1\.38cm/);
  assert.match(bodyRule, /width:\s*18\.38cm/);
  assert.match(bodyRule, /height:\s*23\.86cm/);
  assert.match(bodyRule, /padding:\s*\.25cm/);
  assert.match(bodyRule, /font-size:\s*14pt/);
});

test('content pages move every objective to the opener and expose topic in each header', () => {
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(publisher, /component\.type !== 'objectives'/);
  assert.doesNotMatch(publisher, /filter\(Boolean\)\.slice\(0, 2\)/);
  assert.match(publisher, /sessionHeader\.querySelector\('strong'\)\.textContent = header/);
  assert.match(publisher, /sessionHeader\.querySelector\('span'\)\.textContent = topic/);
  assert.match(publisher, /paginateSession_\(pages, session, project, diagnostics, canvas, opener\)/);
  assert.match(publisher, /fitOpenerTitle_\(opener\.querySelector\('\.a4-opener-topic'\)\)/);
  assert.match(publisher, /function fitOpenerTitle_\(element\)/);
  assert.match(styles, /\.a4-opener-topic \{[^}]*overflow: visible;[^}]*white-space: normal;/s);
  assert.match(styles, /\.a4-content-block \.text-heading-1, \.a4-content-block \.text-heading-2 \{[^}]*border: 4px solid var\(--legacy-accent\)/);
  assert.match(styles, /\.a4-content-block \.text-heading-2 \{[^}]*font-size: 18px/);
  assert.match(styles, /\.text-list-bullet > li::before[^}]*content: "✦"/s);
  assert.match(styles, /\.text-list-numbered > li::before[^}]*content: counter\(scl-list\)/s);
});

test('live preview zoom and retryable server busy preserve the active lease', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  for (const id of ['previewZoomOut', 'previewZoomIn', 'previewZoomReset', 'previewZoomValue']) {
    assert.equal((index.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  assert.match(app, /function setSessionPreviewZoom_\(value\)/);
  assert.match(app, /function captureSessionPreviewAnchor_\(\)/);
  assert.match(app, /function restoreSessionPreviewAnchor_\(anchor\)/);
  assert.match(app, /var previewAnchor = captureSessionPreviewAnchor_\(\);[\s\S]*restoreSessionPreviewAnchor_\(previewAnchor\);/);
  assert.match(app, /error\.retryable \|\| error\.code === 'SERVER_BUSY'[\s\S]*akses edit tidak dibuang/);
  assert.match(app, /setSaveStatus\('Server sibuk · mencoba ulang', 'warning'\)/);
  assert.match(styles, /\.live-a4-preview-panel \{[^}]*position: sticky;[^}]*top: 12px;[^}]*align-self: start;/s);
  assert.match(styles, /body\.editor-focus-mode \.app-container,[\s\S]*body\.editor-focus-mode \.legacy-editor-shell \{ overflow: visible; \}/);
  assert.match(styles, /\.live-a4-canvas \{[^}]*flex-direction: column;[^}]*height: calc\(100vh - 150px\);[^}]*min-height: 760px;[^}]*overflow-y: auto;/s);
  assert.match(styles, /zoom: var\(--live-preview-zoom, \.43\)/);
});

test('M3 renderer splits structured semantic units with stable continuation identity', () => {
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  assert.match(publisher, /function structuredBlockDescriptor_\(block\)/);
  assert.match(publisher, /function splitStructuredBlock_\(pages, page, block, session, project, diagnostics, canvas\)/);
  assert.match(publisher, /dataset\.continuationIndex = String\(chunkIndex\)/);
  assert.match(publisher, /STRUCTURED_UNIT_OVERSIZE/);
});

test('M3 editor preserves exact selection offsets and scroll anchors across DOM reflow', () => {
  const editor = fs.readFileSync(path.join(ROOT, 'src', 'Editor.html'), 'utf8');
  assert.match(editor, /function captureSelectionOffsets_\(root\)/);
  assert.match(editor, /function restoreSelectionOffsets_\(root, offsets\)/);
  assert.match(editor, /function textPositionAtOffset_\(root, offset\)/);
  assert.match(editor, /restoredBlock\.getBoundingClientRect\(\)\.top - anchor\.blockTop/);
});

test('M3 runtime has explicit safe compound-flow flatten and continuation merge stages', () => {
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  assert.match(publisher, /mergeFlowContinuations_\(deepFlattenFlow_\(buildSessionBlocks_\(session, project\)\)\)/);
  assert.match(publisher, /block\.dataset\.flowContainer === 'true'/);
  assert.match(publisher, /block\.dataset\.mergeContinuation === 'true'/);
});

test('M0 golden fixture and manifest are sanitized, hashed, and cover required roles', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'm0', 'legacy-golden.json'), 'utf8'));
  assert.equal(fixture.sanitized, true);
  assert.deepEqual(fixture.courses.map((course) => course.key), ['roblox', 'scratch']);
  assert.doesNotMatch(JSON.stringify(fixture), /quiz_answers|SYNTHETIC_ANSWER_SENTINEL/);

  const manifestPath = path.join(ROOT, 'docs', 'golden', 'm0', 'manifest.json');
  assert.equal(fs.existsSync(manifestPath), true, 'run npm run qc:m0:golden');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 'scl-m0-golden-manifest/v1');
  assert.deepEqual(manifest.fixture.courses, ['roblox', 'scratch']);
  assert.equal(manifest.approvedTarget.schemaVersion, 'scl-m0-approved-target/v1');
  const target = JSON.parse(fs.readFileSync(path.join(ROOT, manifest.approvedTarget.path), 'utf8'));
  assert.deepEqual(
    [target.contentViewport.xCm, target.contentViewport.yCm, target.contentViewport.widthCm, target.contentViewport.heightCm, target.contentViewport.paddingCm],
    [1.38, 3.22, 18.38, 23.86, 0.25]
  );
  assert.deepEqual(target.bodyTypography, { fontFamily: 'Poppins', fontSizePt: 14 });
  assert.match(target.frontMatter.guideBackground, /beginning-kiri\/beginning-kanan/);
  assert.match(target.frontMatter.tocBackground, /beginning-kiri\/beginning-kanan/);
  for (const role of ['cover-title', 'ordinary-flow', 'steps-images', 'semantic-cards', 'left-right-page', 'page-number', 'late-session', 'back-cover']) {
    assert.equal(manifest.coverage.includes(role), true, role);
  }
  for (const artifact of manifest.artifacts) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.equal(fs.existsSync(path.join(ROOT, 'docs', 'golden', 'm0', artifact.path)), true, artifact.path);
  }
});

test('front matter prototype preserves hardcover order and safe public INS link', () => {
  const source = fs.readFileSync(path.join(ROOT, 'prototypes', 'front-matter-session-review.html'), 'utf8');
  const roles = [...source.matchAll(/data-review-page="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(roles, ['blank', 'copyright', 'warning', 'guide-1', 'guide-2', 'toc', 'opener']);
  assert.match(source, /href="https:\/\/www\.kalananti\.id\/scl-student"/);
  assert.match(source, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(source, /quickchart|qrserver|chart\.googleapis/);
  assert.match(source, /data-review-page="copyright">\s*<img class="page-bg" src="\.\.\/back-module\/beginning-kanan-scl\.svg"/);
  assert.match(source, /data-review-page="warning">\s*<img class="page-bg" src="\.\.\/back-module\/beginning-kiri-scl\.svg"/);
  assert.match(source, /<span class="legal-number right">i<\/span>/);
  assert.match(source, /<span class="legal-number left">ii<\/span>/);
  assert.equal((source.match(/class="real-preview"/g) || []).length, 12);
  assert.doesNotMatch(source, /class="mini-demo"/);
});

test('M1.1 exposes an isolated paged editor shell and persistent local review build', () => {
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build-local-preview.mjs'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(index, /class="selection-panel session-editor-panel legacy-editor-shell"/);
  assert.match(index, /data-editor-shell="legacy-paged-v1"/);
  assert.match(index, /data-editor-surface="paged-document-v1"/);
  assert.match(index, /data-editing-model="continuous-rich-document-v1"/);
  assert.match(index, /class="block-editor paged-document-surface"/);
  assert.match(styles, /\.block-editor\.paged-document-surface/);
  assert.match(styles, /\.document-flow-editor \{[^}]*font-size: 14pt;[^}]*outline: none;/s);
  assert.match(styles, /\.document-paragraph \{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
  const editor = fs.readFileSync(path.join(ROOT, 'src', 'Editor.html'), 'utf8');
  assert.match(editor, /flow\.contentEditable = state\.readOnly \? 'false' : 'true'/);
  assert.match(editor, /flow\.addEventListener\('paste', sanitizeDocumentPaste_\)/);
  assert.match(editor, /function captureVisibleBlocks_\(\)[\s\S]*flow\.childNodes/);
  assert.doesNotMatch(editor, /editable\.contentEditable = state\.readOnly/);
  assert.match(editor, /replace\.dataset\.imageAction = 'replace'/);
  assert.match(editor, /remove\.dataset\.imageAction = 'delete'/);
  assert.match(editor, /image-resize-handle/);
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  assert.doesNotMatch(app + editor + publisher, /fetch\s*\(\s*['"]\/(?:api|render|save)|localhost:\d+|flask/i);
  assert.match(styles, /body \* \{ visibility: hidden !important; \}/);
  assert.match(styles, /#publisherCanvas, #publisherCanvas \* \{ visibility: visible !important; \}/);
  assert.match(styles, /\.legacy-editor-shell\s*\{/);
  assert.match(styles, /\.legacy-editor-shell \.live-a4-canvas/);
  assert.match(styles, /body\.editor-focus-mode #sessionEditorPanel/);
  assert.match(styles, /\.a4-opener-objectives/);
  assert.match(index, /data-editor-shell="legacy-paged-v1"/);
  assert.match(publisher, /decorateOpener_\(opener, session, project\)/);
  assert.match(publisher, /DI SESI INI KAMU AKAN/);
  for (const include of ['Assets', 'Styles', 'PageAssets', 'LegacyAdapter', 'Editor', 'Publisher', 'App']) {
    assert.match(build, new RegExp("inline\\('" + include + "'"));
  }
  const collaborationBuild = fs.readFileSync(path.join(ROOT, 'scripts', 'build-phase2-preview.mjs'), 'utf8');
  assert.match(collaborationBuild, /include_\('Assets'\)/);
});

test('legacy adapter preserves rich text runs and lines in kc and fyk definitions', () => {
  const session = fixtureSession();
  session.fields.materials = plain('Intro\nkc1*\nTahap 1: Build\nOpen the editor');
  session.fields.kamus_coder = {
    text: 'kc1:\n• Biome - Area tertentu\n• Terrain - Permukaan dunia',
    runs: [
      { start: 7, end: 12, bold: true }, // "Biome"
      { start: 32, end: 39, italic: true } // "Terrain"
    ]
  };
  session.liveDraft = true;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const bubble = result.components.find((component) => component.type === 'bubble');
  assert.ok(bubble, 'bubble component should exist');
  assert.equal(bubble.treatment, 'tutor-says');
  assert.equal(bubble.lines.length, 2);
  assert.equal(bubble.lines[0].text, '• Biome - Area tertentu');
  assert.ok(bubble.lines[0].runs.some((run) => run.bold), 'Biome should have bold run preserved');
  assert.equal(bubble.lines[1].text, '• Terrain - Permukaan dunia');
  assert.ok(bubble.lines[1].runs.some((run) => run.italic), 'Terrain should have italic run preserved');
});

test('legacy adapter preserves explicit numbering ordinals across interspersed bullet lists', () => {
  const session = fixtureSession();
  session.fields.materials = plain(
    '1. Step one\n2. Step two\n• Bullet item alpha\n• Bullet item beta\n3. Step three\n4. Step four'
  );
  session.liveDraft = true;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const paragraphs = result.components.filter((component) => component.field === 'materials' && component.type === 'paragraph');
  assert.equal(paragraphs.length, 6);
  assert.equal(paragraphs[0].textStyle, 'numbered');
  assert.equal(paragraphs[0].listOrdinal, 1);
  assert.equal(paragraphs[1].textStyle, 'numbered');
  assert.equal(paragraphs[1].listOrdinal, 2);
  assert.equal(paragraphs[2].textStyle, 'bullet');
  assert.equal(paragraphs[3].textStyle, 'bullet');
  assert.equal(paragraphs[4].textStyle, 'numbered');
  assert.equal(paragraphs[4].listOrdinal, 3);
  assert.equal(paragraphs[5].textStyle, 'numbered');
  assert.equal(paragraphs[5].listOrdinal, 4);
});

test('legacy adapter parses single-line and multi-line code fences for Roblox Lua course', () => {
  const session = fixtureSession();
  session.courseKey = 'roblox';
  session.fields.materials = plain(
    'Mengenal Data Types\n```local a = 5```\n```local b = 3```\n```print(a + b)```\nPenjelasan tipe data\n```lua\nlocal username = "hero"\nprint(username)\n```'
  );
  session.liveDraft = true;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const codeComponents = result.components.filter((c) => c.type === 'code');
  assert.equal(codeComponents.length, 2);
  assert.equal(codeComponents[0].language, 'lua');
  assert.equal(codeComponents[0].code, 'local a = 5\nlocal b = 3\nprint(a + b)');
  assert.equal(codeComponents[1].language, 'lua');
  assert.equal(codeComponents[1].code, 'local username = "hero"\nprint(username)');
});

test('legacy adapter parses bullet-prefixed code fences in materials', () => {
  const session = fixtureSession();
  session.courseKey = 'roblox';
  session.fields.materials = plain(
    '2. Tuliskan script:\n• ```local NewPart= script.Parent```\n• ```NewPart.BrickColor = BrickColor.Red()```\n• ```NewPart.Transparency = 0.5```\n3. Klik Play'
  );
  session.liveDraft = true;
  const result = context.window.SclLegacyAdapter.adaptSession(session);
  const codeComponents = result.components.filter((c) => c.type === 'code');
  assert.equal(codeComponents.length, 1);
  assert.equal(codeComponents[0].language, 'lua');
  assert.equal(codeComponents[0].code, 'local NewPart= script.Parent\nNewPart.BrickColor = BrickColor.Red()\nNewPart.Transparency = 0.5');
});
