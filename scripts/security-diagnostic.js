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

const supabaseSetup = fs.readFileSync('HYPHSWORLD_SUPABASE_SETUP.sql', 'utf8');
assert(
  supabaseSetup.includes('security invoker') && supabaseSetup.includes('function public.hw_touch_updated_at()'),
  'The profile timestamp trigger should run as SECURITY INVOKER.'
);
assert(
  (supabaseSetup.match(/revoke all on function public\.hw_[^(]+\(\) from anon, authenticated;/g) || []).length === 2,
  'Both internal trigger functions should revoke execution from anon and authenticated.'
);
assert(
  supabaseSetup.includes("tg_table_schema <> 'auth'") && supabaseSetup.includes("tg_table_name <> 'users'"),
  'The SECURITY DEFINER signup function should reject calls outside the auth.users trigger.'
);
assert(
  !supabaseSetup.includes("new.raw_user_meta_data ->> 'coolPoints'") &&
    !supabaseSetup.includes("new.raw_user_meta_data ->> 'buckClearance'") &&
    !supabaseSetup.includes("new.raw_user_meta_data ->> 'duckStatus'"),
  'Client signup metadata must not control points, clearance, or account status.'
);

if (issues.length) {
  console.error('Security diagnostic failed:');
  issues.forEach((i) => console.error('- ' + i));
  process.exit(1);
}

console.log('Security diagnostic passed: API, Supabase function, and key page checks are in place.');
