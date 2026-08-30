import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = '/private/tmp/kalananti-scl-phase5-preview';
const read = (file) => fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8">${read('FontAssets.html')}${read('Styles.html')}</head><body>
${read('PageAssets.html')}
<div id="publisherDiagnostics" class="publisher-diagnostics"></div>
<div id="publisherCanvas" class="publisher-canvas"></div>
${read('LegacyAdapter.html')}
${read('Publisher.html')}
</body></html>`;
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'index.html'), html);
console.log(OUTPUT);
