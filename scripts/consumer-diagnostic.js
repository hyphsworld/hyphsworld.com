#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const KEY_PAGES = ['index.html', 'vault.html', 'games.html', 'games/cash-run/index.html'];
const REQUIRED_ASSETS = ['01_WITH_ME.mp3','02-bout-you.mp3','03_NEWKIE.mp3','04_ETG.mp3','05_ON.mp3','06_BOUNCE_OUT.mp3'];

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

function jsFiles(dir, out=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) jsFiles(full, out);
    else if (entry.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

const failures = [];

for (const page of KEY_PAGES) {
  if (!exists(page)) failures.push(`missing page: ${page}`);
}

for (const asset of REQUIRED_ASSETS) {
  if (!exists(asset)) failures.push(`missing required lobby track asset: ${asset}`);
}

if (exists('vault-gate-games.js')) {
  const src = read('vault-gate-games.js');
  const requiredTokens = ['HWPoints.add', 'HWPoints.refresh', 'playsinline', 'neon_slots_spin', 'multiplayer_table_created'];
  for (const token of requiredTokens) {
    if (!src.includes(token)) failures.push(`vault-gate-games.js missing token: ${token}`);
  }
}

for (const file of jsFiles(ROOT)) {
  const rel = path.relative(ROOT, file);
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel });
  } catch (e) {
    failures.push(`syntax error in ${rel}: ${e.message}`);
  }
}

if (failures.length) {
  console.error('Consumer diagnostic failed:');
  failures.forEach((f) => console.error('- ' + f));
  process.exit(1);
}

console.log('Consumer diagnostic passed: key pages/assets/hooks are present and JS syntax checks passed.');
