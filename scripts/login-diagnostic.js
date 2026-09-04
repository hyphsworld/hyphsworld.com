#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const issues = [];
const authPage = fs.readFileSync('auth.html', 'utf8');
const authController = fs.readFileSync('auth.js', 'utf8');
const authClient = fs.readFileSync('auth-client.js', 'utf8');
const authStability = fs.readFileSync('auth-stability.js', 'utf8');
const accountBootstrap = fs.readFileSync('cool-points.js', 'utf8');
const pointsEngine = fs.readFileSync('global-points-engine.js', 'utf8');

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
assert(authClient.includes('signInWithOtp'), 'email login links should bypass password and confirmation dead-ends.');
assert(authClient.includes("type: 'signup'"), 'unconfirmed accounts should be able to resend confirmation email.');
assert(authClient.includes('onAuthStateChange'), 'all games should receive refreshed login state.');
assert(authClient.includes('if (hasSession) saveLocalSession(session)'), 'signup must not create a fake local login before confirmation.');
assert(authClient.includes("new CustomEvent('hyph:auth-signed-in'"), 'auth client should broadcast successful sign-in.');
assert(authStability.includes("window.HWAuth.getCurrentUser(true).catch"), 'profile hydration must not reject an otherwise successful first login.');
assert(accountBootstrap.includes("await load('auth-client.js'"), 'legacy pages should bootstrap the shared auth client.');
assert(accountBootstrap.includes("await load('global-points-engine.js'"), 'legacy pages should bootstrap the central points engine.');
assert(pointsEngine.includes('data-hw-account-name'), 'central widget should show the active account identity.');
assert(pointsEngine.includes('data-hw-account-action'), 'central widget should provide one login/account action.');
assert(/document\.addEventListener\(['"]hyph:auth-signed-in['"],\s*(?:refresh|bootAndSync)\)/.test(pointsEngine), 'central widget should refresh immediately after login.');
assert(/window\.addEventListener\(['"]pageshow['"],\s*(?:refresh|bootAndSync)\)/.test(pointsEngine), 'central widget should catch up after browser navigation.');

const accountFlowPages = new Set(['auth.html', 'forgot-password.html', 'login.html', 'logout.html', 'update-password.html']);
fs.readdirSync('.').filter((file) => file.endsWith('.html') && !accountFlowPages.has(file)).forEach((file) => {
  const html = fs.readFileSync(path.join('.', file), 'utf8');
  assert(html.includes('cool-points.js') || html.includes('global-points-engine.js'), file + ' should load the central account widget system.');
});

if (issues.length) {
  console.error('Login diagnostic failed:');
  issues.forEach((issue) => console.error('- ' + issue));
  process.exit(1);
}

console.log('Login diagnostic passed: first-submit binding, persisted session, and account points refresh are connected.');
