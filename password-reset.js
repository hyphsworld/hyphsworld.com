(function (global) {
  'use strict';

  const CONFIG_FILE = 'supabase-config.js';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const RESET_REDIRECT_URL = 'https://hyphsworld.com/update-password.html';

  let cfgPromise = null;
  let clientPromise = null;
  let client = null;

  function isPlaceholder(value) {
    const text = String(value || '').trim();
    return !text || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(text);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = Array.from(document.scripts).find((s) => s.src && s.src.includes(src));
      if (old) {
        old.addEventListener('load', resolve, { once: true });
        setTimeout(resolve, 200);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
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
      if (isPlaceholder(c.url) || isPlaceholder(c.anonKey)) throw new Error('Supabase is not configured yet.');
      if (!global.supabase || !global.supabase.createClient) await loadScript(CDN);
      if (!global.supabase || !global.supabase.createClient) throw new Error('Supabase client failed to load.');
      client = global.supabase.createClient(c.url, c.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return client;
    })();
    return clientPromise;
  }

  async function sendResetEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Enter the email on your HYPHSWORLD account.');
    const sb = await getClient();
    const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, { redirectTo: RESET_REDIRECT_URL });
    if (error) throw new Error(error.message || 'Password reset email failed.');
    return true;
  }

  async function updatePassword(newPassword) {
    const password = String(newPassword || '').trim();
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const sb = await getClient();

    try {
      await sb.auth.getSession();
    } catch {}

    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new Error(error.message || 'Password update failed. Open the newest reset email and try again.');
    return true;
  }

  global.HWPasswordReset = { sendResetEmail, updatePassword };
})(window);
