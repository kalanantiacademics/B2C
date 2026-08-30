const fs = require('fs');
const path = require('path');

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('Usage: node check-local-links.js <directory> [directory...]');
  process.exit(2);
}

const missing = [];
const ignoredPrefixes = /^(?:https?:|data:|mailto:|about:|javascript:|#)/;

for (const root of roots) {
  const files = fs.readdirSync(root, { recursive: true })
    .map(String)
    .filter(file => file.endsWith('.html'));

  for (const file of files) {
    const fullPath = path.join(root, file);
    const html = fs.readFileSync(fullPath, 'utf8');
    const tagPattern = /<(?:a|link|script|img|iframe|source)\b[^>]*>/gi;
    let tagMatch;

    while ((tagMatch = tagPattern.exec(html))) {
      const attributePattern = /(?:href|src)=["']([^"']+)["']/i;
      const match = tagMatch[0].match(attributePattern);
      if (!match) continue;

      const reference = match[1];
      if (ignoredPrefixes.test(reference) || reference.includes('${') || /^\$\d+$/.test(reference)) continue;

      const cleanReference = reference.split(/[?#]/)[0];
      if (cleanReference) {
        const target = path.resolve(path.dirname(fullPath), cleanReference);
        if (!fs.existsSync(target)) missing.push(`${fullPath} -> ${reference}`);
      }
    }
  }
}

if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('All static local href/src targets exist.');
