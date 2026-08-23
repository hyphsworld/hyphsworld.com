(function (global) {
  'use strict';

  const CONFIG_FILE = 'supabase-config.js';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const RESET_REDIRECT_URL = 'https://hyphsworld.com/update-password.html';
  const MIN_PASSWORD_LENGTH = 6;

  let cfgPromise = null;
  let clientPromise = null;
  let client = null;
  let sessionReadyPromise = null;

  // Capture the recovery URL before Supabase consumes and clears its hash.
  // This also prevents an ordinary signed-in session from being mistaken for
  // proof that the user opened a password-recovery email.
  const initialRecoveryUrl = String(global.location.href || '');

  function isPlaceholder(value) {
    const text = String(value || '').trim();
    return !text || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(text);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = Array.from(document.scripts).find((s) => s.src && s.src.includes(src));
      if (old) {
        if (old.dataset.loaded === 'true' || (src === CDN && global.supabase && global.supabase.createClient)) {
          resolve();
          return;
        }
        old.addEventListener('load', resolve, { once: true });
        old.addEventListener('error', () => reject(new Error('Could not load ' + src)), { once: true });
        setTimeout(resolve, 600);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function friendlyError(error, fallback) {
    const message = String((error && error.message) || error || fallback || '').trim();
    if (/rate limit|security purposes|only request/i.test(message)) {
      return 'Security cooldown active. Wait about 60 seconds before requesting another reset link.';
    }
    if (/expired|invalid|not found|session|token|recovery/i.test(message)) {
      return 'That reset link is expired or already used. Send a new reset link and open the newest email.';
    }
    if (/network|fetch|load|connection/i.test(message)) {
      return 'Connection issue. Open the newest reset email in Safari/Chrome, then try again.';
    }
    return message || fallback || 'Password reset failed. Try again.';
  }

  async function getConfig() {
    if (cfgPromise) return cfgPromise;

    cfgPromise = (async () => {
      if (!global.HW_SUPABASE_CONFIG) {
        try { await loadScript(CONFIG_FILE); } catch {}
      }

      const c = global.HW_SUPABASE_CONFIG || {};
      return {
        url: String(c.url || '').trim(),
        anonKey: String(c.anonKey || c.anon_key || '').trim()
      };
    })();

    return cfgPromise;
  }

  async function getClient() {
    if (client) return client;
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      const c = await getConfig();
      if (isPlaceholder(c.url) || isPlaceholder(c.anonKey)) {
        throw new Error('Supabase is not configured yet.');
      }

      if (!global.supabase || !global.supabase.createClient) {
        await loadScript(CDN);
      }

      if (!global.supabase || !global.supabase.createClient) {
        throw new Error('Supabase client failed to load.');
      }

      client = global.supabase.createClient(c.url, c.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Recovery emails are commonly opened in a different browser than
          // the one that requested them. The implicit flow keeps the secure
          // credentials in the email URL instead of requiring a local PKCE
          // verifier that may not exist in that browser.
          flowType: 'implicit'
        }
      });

      return client;
    })();

    return clientPromise;
  }

  function readUrlParams() {
    const url = new URL(initialRecoveryUrl, global.location.origin);
    const hash = new URLSearchParams(String(url.hash || '').replace(/^#/, ''));
    const search = url.searchParams;
    return { hash, search };
  }

  function hasRecoveryParams() {
    const { hash, search } = readUrlParams();
    return (
      hash.get('type') === 'recovery' ||
      search.get('type') === 'recovery' ||
      hash.has('access_token') ||
      hash.has('refresh_token') ||
      search.has('code') ||
      search.has('token_hash')
    );
  }

  function recoveryUrlError() {
    const { hash, search } = readUrlParams();
    return search.get('error_description') || hash.get('error_description') ||
      search.get('error') || hash.get('error') || '';
  }

  async function verifyRecoveryToken(sb) {
    const { search } = readUrlParams();
    const tokenHash = search.get('token_hash');
    if (!tokenHash || !sb.auth || typeof sb.auth.verifyOtp !== 'function') return null;

    const { data, error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery'
    });
    if (error) throw error;
    return data && data.session ? data.session : null;
  }

  async function exchangeRecoveryCode(sb) {
    const { search } = readUrlParams();
    const code = search.get('code');
    if (!code || !sb.auth || typeof sb.auth.exchangeCodeForSession !== 'function') return null;
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data && data.session ? data.session : null;
  }

  async function waitForAuthSession(sb) {
    if (sessionReadyPromise) return sessionReadyPromise;

    sessionReadyPromise = new Promise((resolve) => {
      let settled = false;

      function finish(session) {
        if (settled) return;
        settled = true;
        resolve(session || null);
      }

      sb.auth.getSession().then(({ data }) => {
        if (data && data.session) finish(data.session);
      }).catch(() => {});

      const timeout = setTimeout(() => finish(null), 4200);

      const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
          clearTimeout(timeout);
          finish(session);
          try { listener.subscription.unsubscribe(); } catch {}
        }
      });
    });

    return sessionReadyPromise;
  }

  async function ensureRecoverySession() {
    const urlError = recoveryUrlError();
    if (urlError) throw new Error(urlError);
    if (!hasRecoveryParams()) {
      throw new Error('Open this page from the newest password reset email so HYPHSWORLD can verify the reset session.');
    }

    const sb = await getClient();

    const verified = await verifyRecoveryToken(sb);
    if (verified) return verified;

    const exchanged = await exchangeRecoveryCode(sb).catch((error) => { throw error; });
    if (exchanged) return exchanged;

    const current = await sb.auth.getSession().catch(() => ({ data: null }));
    if (current && current.data && current.data.session) return current.data.session;

    await waitForAuthSession(sb);

    const next = await sb.auth.getSession().catch(() => ({ data: null }));
    if (next && next.data && next.data.session) return next.data.session;

    throw new Error('Reset session is still loading. Refresh once or open the newest reset email again.');
  }

  async function sendResetEmail(email) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Enter the email on your HYPHSWORLD account.');

    const sb = await getClient();
    const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: RESET_REDIRECT_URL
    });

    if (error) throw new Error(friendlyError(error, 'Password reset email failed.'));
    return true;
  }

  async function updatePassword(newPassword) {
    const password = String(newPassword || '').trim();
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error('Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
    }

    const sb = await getClient();
    await ensureRecoverySession();

    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new Error(friendlyError(error, 'Password update failed. Open the newest reset email and try again.'));

    return true;
  }

  global.HWPasswordReset = {
    sendResetEmail,
    updatePassword,
    ensureRecoverySession,
    hasRecoveryParams,
    friendlyError
  };
})(window);
