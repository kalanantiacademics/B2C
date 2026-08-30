import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8')
  .replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
const context = { window: {} };
vm.createContext(context);
new vm.Script(source, { filename: 'Publisher.html' }).runInContext(context);

test('global physical page model maps cover to right and even pages to left', () => {
  const side = context.window.SclPublisher.__test.nextSide;
  assert.equal(side(1), 'right');
  assert.equal(side(2), 'left');
  assert.equal(side(11), 'right');
  assert.equal(side(12), 'left');
});

test('TOC iteration limit accepts configured bounds and falls back to five', () => {
  const clamp = context.window.SclPublisher.__test.clampInteger;
  assert.equal(clamp(1, 1, 10, 5), 1);
  assert.equal(clamp(10, 1, 10, 5), 10);
  assert.equal(clamp(0, 1, 10, 5), 5);
  assert.equal(clamp(11, 1, 10, 5), 5);
  assert.equal(clamp('invalid', 1, 10, 5), 5);
});

test('default images start at sixty-nine percent while explicit full-width images remain height-safe', () => {
  const fit = context.window.SclPublisher.__test.fitImageWidthPercent;
  assert.equal(fit(undefined, 2400, 1200), 69);
  assert.equal(fit(undefined, 1200, 2400), 69);
  assert.equal(fit(100, 2400, 1200), 100);
  assert.equal(fit(100, 1200, 2400), 45);
  assert.equal(fit(55, 1200, 2400), 55);
  assert.equal(fit(undefined, 0, 0), 69);
});

test('print readiness mismatch is blocking and the app exposes an actionable button label', () => {
  assert.match(source, /IMAGE_READINESS_COUNT_MISMATCH/);
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(app, /Print diblokir — lihat alasan/);
  assert.match(app, /IMAGE_PREFLIGHT_BATCH_SIZE = 20/);
  assert.match(app, /function preflightImagesInBatches_\(token, urls\)/);
  assert.match(app, /IMAGE_PREFLIGHT_REQUEST_FAILED/);
  assert.match(app, /SclPublisher\.blockPrint/);
});

test('content-bound checks normalize CSS zoom before comparing geometry', () => {
  assert.match(source, /bodyRect\.width \/ body\.offsetWidth/);
  assert.match(source, /bodyRect\.height \/ body\.offsetHeight/);
  assert.match(source, /paddingBottom\) \|\| 0\) \* scaleY/);
  assert.match(source, /paddingRight\) \|\| 0\) \* scaleX/);
  assert.match(source, /getBoundingClientRect\(\)\.height \/ scaleY/);
});

test('M5 TOC planning grows deterministically for exceptionally long entries', () => {
  const plan = context.window.SclPublisher.__test.buildTocPlan;
  const shortSessions = Array.from({ length: 12 }, (_, index) => ({ session: String(index + 1), topic: 'Short topic' }));
  const longSessions = shortSessions.map((session, index) => ({
    ...session,
    topic: index === 11 ? 'Long topic '.repeat(100) : session.topic
  }));
  assert.equal(plan(shortSessions).length, 1);
  assert.equal(plan(longSessions).length, 2);
  assert.deepEqual(Array.from(plan(longSessions).flat(), (session) => session.session), shortSessions.map((session) => session.session));
});

test('publisher source uses canonical asset templates and excludes answer keys', () => {
  assert.match(source, /scl-page-asset-/);
  assert.match(source, /TOC_STABILIZATION_LIMIT/);
  assert.doesNotMatch(source, /quiz_answers/);
});

test('M5 runtime composes the complete hardcover front matter and safe INS CTA', () => {
  assert.match(source, /createPage_\('blank'/);
  assert.match(source, /createPage_\('copyright'/);
  assert.match(source, /createPage_\('warning'/);
  assert.match(source, /guidePage: 1/);
  assert.match(source, /guidePage: 2/);
  assert.match(source, /https:\/\/www\.kalananti\.id\/scl-student/);
  assert.match(source, /link\.rel = 'noopener noreferrer'/);
  assert.doesNotMatch(source, /quickchart|qrserver|chart\.googleapis/);
});

test('legal pages use a non-fragmenting safe-area wrapper for browser print', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(source, /safe\.className = 'a4-legal-safe'/);
  assert.match(source, /applySlotGeometry_\(safe, COORDINATE_REGISTRY\.contentViewport/);
  assert.match(source, /safe\.appendChild\(card\)/);
  assert.match(styles, /\.a4-legal-safe \{[^}]*display: flex;[^}]*align-items: center;[^}]*justify-content: center;/s);
  assert.match(styles, /\.a4-legal-card \{[^}]*position: static;[^}]*transform: none;[^}]*break-inside: avoid;[^}]*page-break-inside: avoid;/s);
  assert.doesNotMatch(styles, /\.a4-legal-card \{[^}]*translateY/s);
});

test('M5 coordinate registry owns every fixed native HTML slot', () => {
  const registry = JSON.parse(JSON.stringify(context.window.SclPublisher.__test.coordinateRegistry));
  assert.deepEqual(registry.contentViewport, {
    xCm: 1.38, yCm: 3.22, widthCm: 18.38, heightCm: 23.86, paddingCm: 0.25
  });
  assert.deepEqual(registry.coverTitle, { xCm: 0.72, yCm: 10.31, widthCm: 19.57, heightCm: 2.46 });
  assert.deepEqual(registry.sessionHeader, { xCm: 1.5, yCm: 1.28, widthCm: 8.2, heightCm: 1.22 });
  assert.deepEqual(registry.pageNumberLeft, { xCm: 0.99, yCm: 28, widthCm: 1.19, heightCm: 0.9 });
  assert.deepEqual(registry.pageNumberRight, { xCm: 18.93, yCm: 28.01, widthCm: 1.17, heightCm: 0.9 });
  assert.match(source, /applyTextPolicy_\(coverTitle, 'cover-title'/);
  assert.match(source, /applyTextPolicy_\(sessionHeader\.querySelector\('strong'\), 'session-header'/);
  assert.match(source, /applyTextPolicy_\(sessionHeader\.querySelector\('span'\), 'session-topic'/);
  assert.match(source, /applyTextPolicy_\(title, 'opener-topic'/);
});

test('M5 guide miniatures reuse authoritative component class families', () => {
  for (const className of ['think-bubble', 'activity-card', 'challenge-card', 'step-card', 'quiz-item']) {
    assert.match(source, new RegExp("'" + className + "'"));
  }
  assert.match(source, /GUIDE_ENTRIES\.slice/);
  assert.match(source, /buildGuideMiniature_/);
});

test('editor session preview and full-level publishing share SclPublisher component construction', () => {
  assert.match(source, /function renderSessionPreview\(project, session, options\)/);
  assert.match(source, /paginateSession_\(pages, session, project, diagnostics, canvas, opener\)/);
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(app, /SclPublisher\.render\(project\)/);
  assert.match(app, /SclPublisher\.renderSessionPreview\(state\.activeProject, draftSession/);
  assert.match(app, /layouts:\s*SclVisualEditor\.serializeLayouts\(\)/);
  assert.match(app, /SclPublisher\.preparePrint\(result, serverResult\.images\)/);
  assert.match(source, /options\.fontsReadyPromise \|\| \(document\.fonts && document\.fonts\.ready\)/);
  assert.match(source, /fontsReady: true,[\s\S]*restoreScrollTop: canvas\.scrollTop/);
});

test('live session preview derives image width from draft and groups continuous material paragraphs', () => {
  assert.match(source, /session\.liveDraft \? buildLiveMaterialBlocks_\(fields\)/);
  assert.match(source, /#scl-width=\(\\d\{1,3\}\)/);
  assert.match(source, /!currentSection \|\| currentTreatment !== treatment/);
});

test('print styling keeps ordinary content continuous and reserves cards for semantic components', () => {
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(styles, /\.a4-content-block \{[^}]*padding: 0;[^}]*border: 0;[^}]*border-radius: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
  assert.match(styles, /\.a4-must-do, \.a4-self-check, \.a4-should-do, \.a4-aspire, \.a4-tutor-says, \.a4-did-you-know, \.a4-table-block \{[^}]*padding: 18px 20px;/s);
  assert.match(styles, /\.a4-page-number \{[^}]*top: 28\.01cm;[^}]*left: 18\.93cm;[^}]*display: flex;[^}]*width: 1\.17cm;[^}]*height: \.9cm;[^}]*align-items: center;[^}]*justify-content: center;[^}]*line-height: \.9cm;/s);
  assert.match(styles, /\.a4-role-content-left \.a4-page-number, \.a4-role-opener \.a4-page-number \{[^}]*top: 28cm;[^}]*left: \.99cm;[^}]*width: 1\.19cm;[^}]*height: \.9cm;/s);
  assert.match(styles, /\.a4-opener-topic \{[^}]*flex: 0 0 auto;[^}]*padding-bottom: \.18em;/s);
  assert.match(styles, /\.a4-image-block img \{[^}]*width: 100%;[^}]*height: auto;[^}]*object-fit: contain;[^}]*object-position: center;/s);
  assert.match(styles, /\.a4-image-block \{[^}]*margin: 0 auto;[^}]*text-align: center;/s);
  assert.match(styles, /\.document-image-atom \{[^}]*width: 100%;[^}]*text-align: center;/s);
  assert.match(styles, /\.image-block-controls \{[^}]*width: 100%;[^}]*justify-items: center;[^}]*text-align: center;/s);
  assert.match(styles, /\.a4-page \.step-content-item > \.a4-content-block \{[^}]*margin-left: auto;[^}]*margin-right: auto;/s);
});

test('publisher uses approved literal task labels and floating badge treatment', () => {
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  const editor = fs.readFileSync(path.join(ROOT, 'src', 'Editor.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  for (const label of ['MUST DO', 'SHOULD DO', 'ASPIRE TO DO', 'SELF-CHECK']) {
    assert.match(publisher, new RegExp("'" + label + "'"));
    assert.match(editor, new RegExp("label: '" + label + "'"));
  }
  assert.match(styles, /\.a4-must-do > h3, \.a4-self-check > h3, \.a4-should-do > h3, \.a4-aspire > h3 \{[^}]*position: absolute;[^}]*top: -20px;/s);
  assert.doesNotMatch(publisher, /Definisi belum tersedia\./);
});

test('publisher rich text renderer converts runs to formatted DOM nodes', () => {
  const renderRichText = context.window.SclPublisher.__test.renderRichTextContent;
  const nodes = [];
  const fakeElement = {
    replaceChildren() { nodes.length = 0; },
    appendChild(n) { nodes.push(n); },
    textContent: ''
  };
  context.document = {
    createElement(tag) {
      return { tagName: tag, style: {}, textContent: '', href: '' };
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    }
  };
  renderRichText(fakeElement, {
    text: 'Hello World',
    runs: [{ start: 6, end: 11, bold: true }]
  });
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].textContent, 'Hello ');
  assert.equal(nodes[1].tagName, 'span');
  assert.equal(nodes[1].style.fontWeight, '800');
  assert.equal(nodes[1].textContent, 'World');
});
