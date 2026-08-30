import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['src', 'tests', 'scripts'];
const extensions = new Set(['.gs', '.html', '.json', '.mjs']);
const failures = [];
let checked = 0;

for (const relativeRoot of roots) walk(path.join(ROOT, relativeRoot));

function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walk(target);
    } else if (extensions.has(path.extname(entry.name))) {
      checkFile(target);
    }
  }
}

function checkFile(file) {
  checked += 1;
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  if (!source.endsWith('\n')) failures.push(`${relative}: missing final newline`);
  source.split('\n').forEach((line, index) => {
    if (/[ \t]+$/.test(line)) failures.push(`${relative}:${index + 1}: trailing whitespace`);
  });
}

if (failures.length) throw new Error(failures.join('\n'));
console.log(`format-check: ${checked} files OK`);
