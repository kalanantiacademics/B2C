import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = [
  ['Poppins-Regular.ttf', 400],
  ['Poppins-SemiBold.ttf', 600],
  ['Poppins-Bold.ttf', 700],
  ['Poppins-ExtraBold.ttf', 800]
];
const rules = fonts.map(([filename, weight]) => {
  const source = fs.readFileSync(path.join(ROOT, 'assets', 'fonts', filename)).toString('base64');
  return `@font-face{font-family:'Poppins';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/ttf;base64,${source}) format('truetype');}`;
});
fs.writeFileSync(path.join(ROOT, 'src', 'FontAssets.html'), `<style>${rules.join('')}</style>\n`);
console.log(`generated FontAssets.html from ${fonts.length} local Poppins files`);
