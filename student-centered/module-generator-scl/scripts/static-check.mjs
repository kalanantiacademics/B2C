import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'src');
const files = fs.readdirSync(SOURCE).sort();
const gsFiles = files.filter((file) => file.endsWith('.gs'));
const htmlFiles = files.filter((file) => file.endsWith('.html'));

for (const file of gsFiles) {
  const source = fs.readFileSync(path.join(SOURCE, file), 'utf8');
  new vm.Script(source, { filename: file });
  if (/\beval\s*\(/.test(source)) {
    throw new Error(`${file}: eval is forbidden`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(SOURCE, 'appsscript.json'), 'utf8'));
if (manifest.runtimeVersion !== 'V8') throw new Error('Manifest must use V8 runtime.');
if (manifest.webapp?.executeAs !== 'USER_DEPLOYING') throw new Error('Web app must execute as deployment owner.');
if (!manifest.oauthScopes?.includes('https://www.googleapis.com/auth/script.external_request')) {
  throw new Error('Manifest must authorize UrlFetchApp image preflight.');
}

const client = htmlFiles.map((file) => fs.readFileSync(path.join(SOURCE, file), 'utf8')).join('\n');
for (const forbidden of [
  'B2C_RobloxStudio_Modul',
  'B2C_Scratch_Modul',
  'B2C_Python_Modul',
  'SCL_SPREADSHEET_ID',
  'quiz_answers'
]) {
  if (client.includes(forbidden)) throw new Error(`Client contains server-owned value: ${forbidden}`);
}
if (/\beval\s*\(/.test(client)) throw new Error('Client eval is forbidden.');
if (/docs\.google\.com\/spreadsheets\/d\//i.test(client)) {
  throw new Error('Client exposes a server-owned Spreadsheet identity.');
}

const allSource = [...gsFiles, ...htmlFiles]
  .map((file) => fs.readFileSync(path.join(SOURCE, file), 'utf8'))
  .join('\n');
if (/SCL_(?:PASSWORD_HASH|PASSWORD_SALT|SESSION_SIGNING_SECRET)\s*[:=]\s*['"][^'"]+['"]/.test(allSource)) {
  throw new Error('Possible hard-coded secret detected.');
}

console.log(`static-check: ${gsFiles.length} server files, ${htmlFiles.length} client files, manifest OK`);
