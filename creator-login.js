(function () {
  'use strict';

  var client;
  var busy = false;
  var form = document.getElementById('creatorLoginForm');
  var email = document.getElementById('creatorEmail');
  var password = document.getElementById('creatorPassword');
  var loginButton = document.getElementById('creatorLoginButton');
  var magicButton = document.getElementById('creatorMagicLink');
  var googleButton = document.getElementById('creatorGoogleLogin');
  var ready = document.getElementById('creatorReady');
  var notLinked = document.getElementById('creatorNotLinked');

  function setStatus(message, state) {
    var box = document.getElementById('creatorLoginStatus');
    box.textContent = message;
    box.className = 'login-status' + (state ? ' ' + state : '');
  }

  function setBusy(value) {
    busy = value;
    [loginButton, magicButton, googleButton].forEach(function (button) { button.disabled = value; });
  }

  function normalizedEmail() { return String(email.value || '').trim().toLowerCase(); }

  async function creatorForUser(userId) {
    var result = await client.from('creators')
      .select('id,display_name,slug,status,verification_level')
      .eq('owner_user_id', userId)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function checkAccess(redirectOnSuccess) {
    var authResult = await client.auth.getUser();
    if (authResult.error) throw authResult.error;
    var user = authResult.data && authResult.data.user;
    if (!user) {
      ready.hidden = true;
      notLinked.hidden = true;
      form.hidden = false;
      setStatus('Enter the HYPHSWORLD ID connected to your Creator World.');
      return false;
    }
    var creator = await creatorForUser(user.id);
    form.hidden = true;
    if (!creator) {
      ready.hidden = true;
      notLinked.hidden = false;
      setStatus('Signed in securely • Creator access not connected', 'error');
      return false;
    }
    notLinked.hidden = true;
    ready.hidden = false;
    document.getElementById('connectedCreatorName').textContent = creator.display_name;
    setStatus((creator.status || 'draft').toUpperCase() + ' • CREATOR OWNER VERIFIED', 'success');
    if (redirectOnSuccess) window.setTimeout(function () { location.href = 'creator-dashboard.html'; }, 650);
    return true;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('Verifying Creator ID…');
    try {
      await window.HWAuth.signInWithEmail(normalizedEmail(), password.value);
      await checkAccess(true);
    } catch (error) {
      setStatus(error.message || 'Creator login failed.', 'error');
    } finally {
      setBusy(false);
    }
  });

  magicButton.addEventListener('click', async function () {
    if (busy) return;
    var address = normalizedEmail();
    if (!address) { setStatus('Enter your creator email first.', 'error'); email.focus(); return; }
    setBusy(true);
    setStatus('Sending secure Creator Login link…');
    try {
      var redirect = new URL('creator-login.html', location.href).href;
      var result = await client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false, emailRedirectTo: redirect } });
      if (result.error) throw result.error;
      setStatus('Creator Login link sent. Check your email.', 'success');
    } catch (error) {
      setStatus(error.message || 'Could not send the login link.', 'error');
    } finally {
      setBusy(false);
    }
  });

  googleButton.addEventListener('click', async function () {
    if (busy) return;
    setBusy(true);
    setStatus('Opening secure Google sign-in…');
    try {
      await window.HWAuth.signInWithGoogle({ redirectTo: new URL('creator-login.html', location.href).href });
    } catch (error) {
      setStatus(error.message || 'Google sign-in could not start.', 'error');
      setBusy(false);
    }
  });

  async function init() {
    try {
      if (!window.HWAuth) throw new Error('Account service did not load.');
      client = await window.HWAuth.getClient();
      if (!client) throw new Error('Creator Login is temporarily unavailable.');
      await checkAccess(false);
    } catch (error) {
      setStatus(error.message || 'Creator Login is temporarily unavailable.', 'error');
    }
  }

  window.addEventListener('load', init);
})();
