#!/usr/bin/env node
const fs = require('fs');

const issues = [];

function assert(cond, msg) { if (!cond) issues.push(msg); }

const server = fs.readFileSync('backend/server.py', 'utf8');
assert(server.includes('TRUSTED_ORIGINS'), 'backend/server.py should define TRUSTED_ORIGINS fallback allowlist.');
assert(server.includes('parse_origins'), 'backend/server.py should use parse_origins for CORS env parsing.');
assert(server.includes('rate_limited'), 'backend/server.py should include in-memory rate limiting for leaderboard submit.');
assert(server.includes('X-Content-Type-Options'), 'backend/server.py should set security headers middleware.');

const cashRun = fs.readFileSync('games/cash-run/index.html', 'utf8');
assert(cashRun.includes('window.HW_SUPABASE_ANON_KEY'), 'cash-run page should define Supabase anon key variable for runtime auth.');
assert(cashRun.includes('overscroll-behavior:none'), 'cash-run should keep hard viewport lock for touch/overscroll.');

if (issues.length) {
  console.error('Security diagnostic failed:');
  issues.forEach((i) => console.error('- ' + i));
  process.exit(1);
}

console.log('Security diagnostic passed: CORS/rate-limit/header hardening and key page checks are in place.');
