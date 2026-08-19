#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('auth-client.js', 'utf8');
const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }

check(source.includes("sb.rpc('update_my_profile'"), 'profile writes must use update_my_profile RPC');
check(!/\.upsert\(row,\s*\{\s*onConflict:\s*'id'/.test(source), 'auth client must not upsert browser-authored point fields');
check(source.includes("if (error) throw new Error(error.message || 'Profile fetch failed.')"), 'profile reads must fail closed');
check(source.includes('session.profileSyncPending = true'), 'auth success must expose pending profile sync');
check(source.includes('session.emailConfirmationPending'), 'signup must expose pending email confirmation');
check(source.includes('saveAccountPoints(session.userId, localPoints())'), 'logout must preserve a user-scoped points cache');

const storage = new Map();
const window = {
  HW_SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'sb_publishable_test', profileTable: 'profiles' },
  supabase: { createClient: () => ({ from() {}, auth: {} }) },
  addEventListener() {},
  dispatchEvent() {}
};
const context = {
  window,
  document: { scripts: [], dispatchEvent() {}, head: { appendChild() {} }, createElement() { return {}; } },
  localStorage: { getItem: (key) => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) },
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
  console,
  setTimeout,
  btoa: (value) => Buffer.from(value).toString('base64')
};
vm.runInNewContext(source, context, { filename: 'auth-client.js' });
check(window.HWAuth && typeof window.HWAuth.signInWithEmail === 'function', 'HWAuth email login API missing');
check(typeof window.HWAuth.signUpWithEmail === 'function', 'HWAuth email signup API missing');
check(typeof window.HWAuth.signInWithGoogle === 'function', 'HWAuth Google API missing');
check(typeof window.HWAuth.signOut === 'function', 'HWAuth logout API missing');
check(typeof window.HWAuth.getCurrentUser === 'function', 'HWAuth account loading API missing');
check(typeof window.HWAuth.getPoints === 'function', 'HWAuth Cool Points API missing');

const authUi = fs.readFileSync('auth.js', 'utf8');
check(authUi.includes('emailConfirmationPending'), 'auth UI must stop redirecting while email confirmation is pending');
check(authUi.includes('profileSyncPending'), 'auth UI must disclose pending profile synchronization');

if (failures.length) {
  console.error('Auth client diagnostic failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Auth client diagnostic passed: safe profile sync, persistent account cache, and public auth APIs are present.');
