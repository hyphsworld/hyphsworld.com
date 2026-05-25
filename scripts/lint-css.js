#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function checkBalanced(file, src, openChar, closeChar, label) {
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === openChar) depth++;
    if (src[i] === closeChar) depth--;
    if (depth < 0) return `${file}: unmatched ${closeChar} in ${label}`;
  }
  if (depth !== 0) return `${file}: unbalanced ${openChar}${closeChar} in ${label}`;
  return null;
}

const files = walk(process.cwd());
const issues = [];
for (const file of files) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const braceIssue = checkBalanced(file, src, '{', '}', 'CSS blocks');
  if (braceIssue) issues.push(braceIssue);
  const parenIssue = checkBalanced(file, src, '(', ')', 'CSS functions');
  if (parenIssue) issues.push(parenIssue);
}

if (issues.length) {
  console.error('CSS diagnostics found issues:');
  for (const issue of issues) console.error(' - ' + issue);
  process.exit(1);
}

console.log(`CSS diagnostics passed (${files.length} files).`);
