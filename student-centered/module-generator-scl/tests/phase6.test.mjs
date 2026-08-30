import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({ Array, Error, Math, Number, Object, String });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'ImagePreflight.gs'), 'utf8'), context);

test('image preflight rejects non-HTTPS and private, local, metadata targets', () => {
  for (const url of [
    'http://cdn.example.test/image.png',
    'https://localhost/image.png',
    'https://127.0.0.1/image.png',
    'https://10.20.30.40/image.png',
    'https://169.254.169.254/latest/meta-data',
    'https://192.168.1.2/image.png',
    'https://metadata.google.internal/computeMetadata/v1/'
  ]) {
    assert.throws(() => context.validatePublicImageUrl_(url));
  }
  assert.equal(context.validatePublicImageUrl_('https://cdn.example.test/path//image.png').host, 'cdn.example.test');
});

test('image dimension parser reads PNG and WebP extended headers deterministically', () => {
  const png = Array(24).fill(0);
  png.splice(0, 8, 137, 80, 78, 71, 13, 10, 26, 10);
  png.splice(16, 8, 0, 0, 2, 0, 0, 0, 1, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.readImageDimensions_(png, 'image/png'))),
    { width: 512, height: 256 }
  );

  const webp = Array(30).fill(0);
  webp.splice(0, 4, 82, 73, 70, 70);
  webp.splice(12, 4, 86, 80, 56, 88);
  webp.splice(24, 6, 127, 2, 0, 255, 0, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.readImageDimensions_(webp, 'image/webp'))),
    { width: 640, height: 256 }
  );
});

test('image preflight manifest grants UrlFetchApp scope and classifies runtime failures', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'appsscript.json'), 'utf8'));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.external_request'));
  assert.equal(
    context.classifyImagePreflightError_(new Error('You do not have permission to call UrlFetchApp.fetch. Required permissions: script.external_request')),
    'IMAGE_FETCH_PERMISSION_REQUIRED'
  );
  assert.equal(
    context.classifyImagePreflightError_(new Error('Service invoked too many times for one day: urlfetch.')),
    'IMAGE_FETCH_QUOTA_EXCEEDED'
  );
  assert.equal(context.classifyImagePreflightError_(new Error('network failure')), 'IMAGE_FETCH_FAILED');
});

test('Phase 6 client source owns decode timeout, DPI policy, print gate, and A4 CSS', () => {
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'src', 'Styles.html'), 'utf8');
  assert.match(publisher, /image\.decode/);
  assert.match(publisher, /document\.fonts\.ready/);
  assert.match(publisher, /IMAGE_RENDER_TIMEOUT/);
  assert.match(publisher, /IMAGE_DECODE_CONCURRENCY = 6/);
  assert.match(publisher, /IMAGE_DECODE_RETRIES = 2/);
  assert.match(publisher, /mapWithConcurrency_\(images, IMAGE_DECODE_CONCURRENCY/);
  assert.match(publisher, /decodeLoadedImage_\(image, attempt \+ 1\)/);
  assert.match(publisher, /effectiveDpi < 120/);
  assert.match(publisher, /effectiveDpi < 200/);
  assert.match(publisher, /expectedImages === result\.renderedImages/);
  assert.match(publisher, /Deployment owner harus mengotorisasi scope external request lalu deploy ulang/);
  assert.match(styles, /@page\s*\{\s*size:\s*A4 portrait;\s*margin:\s*0;/);
  assert.match(styles, /print-color-adjust:\s*exact/);
});

test('full-level publishing flushes and reloads SSOT before composition', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  assert.match(app, /flushActiveDraftForPublishing_\(0\)/);
  assert.match(app, /callLoadLevelProject\(state\.session\.token, courseKey, level\)/);
  assert.match(app, /state\.activeProject = project;\s*return prepareFullLevelPublisher_\(project\)/);
  assert.match(app, /ACTIVE_DRAFT_UNSTABLE/);
  assert.match(app, /Compose ulang untuk print/);
});

test('print path is direct browser A4 and exposes deterministic save instructions', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.html'), 'utf8');
  const publisher = fs.readFileSync(path.join(ROOT, 'src', 'Publisher.html'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const allRuntime = app + publisher;
  assert.match(publisher, /window\.print\(\)/);
  assert.doesNotMatch(allRuntime, /html2canvas|html2pdf|SlidesApp|createPresentation|\.screenshot\(/i);
  assert.match(app, /Kalananti-SCL-/);
  assert.match(index, /A4 portrait · Scale 100% · Margins none/);
  assert.match(index, /Background graphics aktif · Headers and footers nonaktif/);
});

test('M7 full gate covers regression commands and rasterizes every actual PDF page', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const m7 = fs.readFileSync(path.join(ROOT, 'scripts', 'qc_m7_full.py'), 'utf8');
  const rasterizer = fs.readFileSync(path.join(ROOT, 'scripts', 'render_pdf_contact_sheet.swift'), 'utf8');
  assert.equal(pkg.scripts['qc:m7:full'], 'python3 scripts/qc_m7_full.py');
  for (const command of [
    'qc:phase1:browser',
    'qc:phase2:browser',
    'qc:phase3:browser',
    'qc:phase4:browser',
    'qc:m1:direct-edit',
    'qc:m1:image-reflow',
    'qc:m2:adapter',
    'qc:m3:compare',
    'qc:phase5:browser',
    'qc:phase6:pdf'
  ]) {
    assert.match(m7, new RegExp(command.replaceAll(':', '\\:')));
  }
  assert.match(m7, /scl-m7-qa\/v1/);
  assert.match(m7, /actual-pdf-contact-sheet\.png/);
  assert.match(rasterizer, /PDFDocument\(url: inputURL\)/);
  assert.match(rasterizer, /for index in 0\.\.<document\.pageCount/);
  assert.match(rasterizer, /page\.thumbnail/);
  assert.match(rasterizer, /for: \.mediaBox/);
});
