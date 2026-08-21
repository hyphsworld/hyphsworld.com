#!/usr/bin/env node
const fs = require('fs');

const issues = [];
const authPage = fs.readFileSync('auth.html', 'utf8');
const authController = fs.readFileSync('auth.js', 'utf8');
const authClient = fs.readFileSync('auth-client.js', 'utf8');
const authStability = fs.readFileSync('auth-stability.js', 'utf8');

function assert(condition, message) {
  if (!condition) issues.push(message);
}

function position(source, value) {
  return source.indexOf(value);
}

const clientPosition = position(authPage, 'src="auth-client.js"');
const stabilityPosition = position(authPage, 'src="auth-stability.js"');
const bridgePosition = position(authPage, 'src="auth-points-bridge.js"');
const pointsPosition = position(authPage, 'src="global-points-engine.js"');
const controllerPosition = position(authPage, 'src="auth.js"');

assert(clientPosition >= 0, 'auth page should load the shared auth client.');
assert(stabilityPosition > clientPosition, 'auth stability should load after the auth client.');
assert(bridgePosition > stabilityPosition, 'auth points bridge should load after auth stability.');
assert(pointsPosition > bridgePosition, 'global points engine should load after the auth bridge.');
assert(controllerPosition > pointsPosition, 'auth controller should load after the login and points stack.');

const bindPosition = position(authController, "form.addEventListener('submit', submitAuth)");
const sessionCheckPosition = authController.lastIndexOf('const session = await HWAuth.getSession();');
assert(bindPosition >= 0 && bindPosition < sessionCheckPosition, 'login submit must bind before the asynchronous session check.');
assert(authController.includes('if (submitting) return;'), 'login should reject duplicate submissions.');
assert(authController.includes("if (!session) throw new Error('Login did not persist."), 'login should verify the persisted session before redirecting.');
assert(authController.includes('await refreshPoints();'), 'login should refresh the account-backed points wallet before redirecting.');

assert(authClient.includes('persistSession: true'), 'Supabase login should persist sessions.');
assert(authClient.includes('autoRefreshToken: true'), 'Supabase login should refresh sessions automatically.');
assert(authClient.includes("new CustomEvent('hyph:auth-signed-in'"), 'auth client should broadcast successful sign-in.');
assert(authStability.includes("window.HWAuth.getCurrentUser(true).catch"), 'profile hydration must not reject an otherwise successful first login.');

if (issues.length) {
  console.error('Login diagnostic failed:');
  issues.forEach((issue) => console.error('- ' + issue));
  process.exit(1);
}

console.log('Login diagnostic passed: first-submit binding, persisted session, and account points refresh are connected.');
