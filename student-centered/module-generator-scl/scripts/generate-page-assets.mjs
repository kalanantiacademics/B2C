import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roles = {
  cover: 'cover-scl.svg',
  beginningLeft: 'beginning-kiri-scl.svg',
  beginningRight: 'beginning-kanan-scl.svg',
  openerLeft: 'beginning-kiri-scl.svg',
  contentLeft: 'plain-kiri-scl.svg',
  contentRight: 'plain-kanan-scl.svg',
  backCover: 'back-cover-scl.svg'
};

const templates = Object.entries(roles).map(([role, filename]) => {
  const svg = fs.readFileSync(path.join(ROOT, 'back-module', filename), 'utf8');
  return `<template id="scl-page-asset-${role}" data-source="back-module/${filename}">${svg}</template>`;
});

const output = [
  '<div id="sclCanonicalPageAssets" hidden aria-hidden="true">',
  ...templates,
  '</div>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'src', 'PageAssets.html'), output);
console.log(`generated PageAssets.html from ${templates.length} canonical SVG assets`);
