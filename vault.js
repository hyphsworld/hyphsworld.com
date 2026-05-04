(() => {
  "use strict";

  function loadLobbyWidgets() {
    if (window.__HYPHSWORLD_LOBBY_WIDGETS_BOOTSTRAP__) return;
    window.__HYPHSWORLD_LOBBY_WIDGETS_BOOTSTRAP__ = true;
    const script = document.createElement("script");
    script.src = "lobby-widgets.js";
    script.defer = true;
    document.body.appendChild(script);
  }

  loadLobbyWidgets();

  const DEFAULT_DESTINATION = "quarantine-mixtape.html";
  const DEFAULT_ROUTE = "quarantine-mixtape";
  const LEGACY_ACCESS_KEY = "hyphsworld_vault_access";
  const LEGACY_ACCESS_TIME_KEY = "hyphsworld_vault_access_time";
  const TRANSPORT_READY_KEY = "HW_LEVEL1_TRANSPORT_READY";
  const TRANSPORT_V6_KEY = "HW_LEVEL1_TRANSPORT_V6";
  const SUPABASE_CONFIG_FILE = "supabase-config.js";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const VERIFY_FUNCTION = "verify-vault-code";

  let supabaseClientPromise = null;

  const duckLines = [
    "“Aye the pad moving now. Don’t freeze up.”",
    "“If it start smoking, that means it like you.”",
    "“Buck too serious. I would’ve let you in off vibes.”",
    "“Type the code clean. This ain’t a microwave.”"
  ];

  const buckLines = [
    "“Code first. Scan second. No shortcuts.”",
    "“Stand still. The scan bar is active.”",
    "“Access depends on clearance, not confidence.”",
    "“I see everything touching this gate.”"
  ];

  const passSteps = [
    { delay: 0, progress: 12, status: "SCANNING", title: "Body Scan", message: "Buck: “Scanner live. Do not move.”", log: "SCAN BAR ACTIVE", visual: "scanning" },
    { delay: 850, progress: 34, status: "SCANNING", title: "Body Scan", message: "Duck Sauce: “The lights dancing now.”", log: "BODY TARGET LOCKED", visual: "scanning" },
    { delay: 1700, progress: 61, status: "VERIFYING", title: "Code Check", message: "Buck: “Code is being verified off-site.”", log: "SUPABASE CHECK RUNNING", visual: "scanning" },
    { delay: 2450, progress: 82, status: "APPROVED", title: "Access Granted", message: "Duck Sauce: “Aight, you in. Don’t act regular.”", log: "ACCESS GRANTED", visual: "granted" },
    { delay: 3300, progress: 100, status: "TRANSPORT", title: "Transport", message: "Portal opening. Player route ready.", log: "TRANSPORT TUNNEL ONLINE", visual: "transporting" }
  ];

  const failSteps = [
    { delay: 0, progress: 18, status: "SCANNING", title: "Body Scan", message: "Buck: “Checking it now.”", log: "SCAN STARTED", visual: "scanning" },
    { delay: 850, progress: 46, status: "VERIFYING", title: "Code Check", message: "Duck Sauce: “That code got fake shoes on.”", log: "SERVER CHECK DENIED", visual: "scanning" },
    { delay: 1600, progress: 0, status: "DENIED", title: "Access Denied", message: "Buck: “Denied. Back up from the rope.”", log: "ACCESS DENIED", visual: "" }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function setStatus(status, pad, message) {
    setText("gateStatus", status);
    setText("padStatus", pad);
    setText("consoleMessage", message);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) {
        if (existing.dataset.loaded === "true") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Could not load " + src)), { once: true });
        setTimeout(resolve, 250);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  function configReady(config) {
    const url = String(config?.url || "").trim();
    const anonKey = String(config?.anonKey || config?.anon_key || "").trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getSupabaseClient() {
    if (supabaseClientPromise) return supabaseClientPromise;

    supabaseClientPromise = (async () => {
      if (!window.HW_SUPABASE_CONFIG) {
        await loadScript(SUPABASE_CONFIG_FILE);
      }

      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error("Supabase is not configured.");

      if (!window.supabase || !window.supabase.createClient) {
        await loadScript(SUPABASE_CDN);
      }

      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("Supabase client did not load.");
      }

      return window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();

    return supabaseClientPromise;
  }

  async function verifyVaultCode(code) {
    const sb = await getSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData?.session?.access_token) {
      return { granted: false, error: "LOGIN_REQUIRED" };
    }

    const { data, error } = await sb.functions.invoke(VERIFY_FUNCTION, {
      body: { code }
    });

    if (error) {
      return { granted: false, error: error.message || "VERIFY_FAILED" };
    }

    return data || { granted: false, error: "EMPTY_RESPONSE" };
  }

  function rotateChatter() {
    const duck = duckLines[Math.floor(Math.random() * duckLines.length)];
    const buck = buckLines[Math.floor(Math.random() * buckLines.length)];

    setText("duckLine", duck);
    setText("buckLine", buck);
  }

  function openOverlay() {
    const overlay = $("scanOverlay");
    const visual = $("scanVisual");

    if (overlay) {
      overlay.classList.add("is-active");
      overlay.setAttribute("aria-hidden", "false");
    }

    if (visual) {
      visual.className = "scan-visual";
    }

    setText("scanTitle", "Body Scan");
    setText("scanMessage", "Scanner warming up...");
    if ($("progressBar")) $("progressBar").style.width = "0%";
    if ($("scanLog")) $("scanLog").innerHTML = "";
    if ($("manualEnter")) $("manualEnter").hidden = true;
  }

  function closeOverlay() {
    const overlay = $("scanOverlay");
    if (overlay) {
      overlay.classList.remove("is-active");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function addLog(text) {
    const log = $("scanLog");
    if (!log) return;

    const li = document.createElement("li");
    li.textContent = text;
    log.appendChild(li);
  }

  function runSteps(steps) {
    const visual = $("scanVisual");

    steps.forEach((step) => {
      setTimeout(() => {
        setStatus(step.status, step.visual ? "ACTIVE" : "LOCKED", step.message);
        setText("scanTitle", step.title);
        setText("scanMessage", step.message);

        if ($("progressBar")) $("progressBar").style.width = `${step.progress}%`;

        if (visual) {
          visual.classList.remove("scanning", "granted", "transporting");
          if (step.visual) visual.classList.add(step.visual);
        }

        addLog(step.log);
      }, step.delay);
    });

    const last = steps[steps.length - 1] ? steps[steps.length - 1].delay : 0;
    return new Promise((resolve) => setTimeout(resolve, last + 650));
  }

  function grantTransport(result) {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    const destination = result?.destination || DEFAULT_DESTINATION;
    const route = result?.route || DEFAULT_ROUTE;
    const level = result?.levelKey || "level_1";

    try {
      sessionStorage.setItem(LEGACY_ACCESS_KEY, "granted");
      sessionStorage.setItem(LEGACY_ACCESS_TIME_KEY, String(grantedAt));
      sessionStorage.setItem(TRANSPORT_READY_KEY, JSON.stringify({
        level,
        route: destination,
        href: destination,
        grantedAt,
        nonce
      }));
      sessionStorage.setItem(TRANSPORT_V6_KEY, JSON.stringify({
        level,
        route,
        href: destination,
        grantedAt,
        nonce
      }));
    } catch (error) {}

    return destination;
  }

  function friendlyError(error) {
    const text = String(error || "").toUpperCase();
    if (text.includes("LOGIN_REQUIRED") || text.includes("JWT") || text.includes("SESSION")) {
      return "Buck needs you logged in before the gate can verify clearance.";
    }
    if (text.includes("DENIED") || text.includes("FORBIDDEN")) {
      return "Buck denied the gate. Try the correct code.";
    }
    return "Gate server did not clear it. Try again after refresh.";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const input = $("accessCode");
    const button = document.querySelector(".scan-button");

    if (!input) return;

    const code = input.value.trim();

    if (!code) {
      setStatus("STANDBY", "MOVING", "Duck Sauce: “Type the code first. I can’t scan blank air.”");
      input.focus();
      return;
    }

    if (button) button.disabled = true;

    openOverlay();
    setStatus("SCANNING", "ACTIVE", "Buck is running the scanner. Supabase is checking clearance.");

    let result = { granted: false, error: "VERIFY_FAILED" };

    try {
      result = await verifyVaultCode(code);
    } catch (error) {
      result = { granted: false, error: error?.message || "VERIFY_FAILED" };
    }

    input.value = "";

    if (!result.granted) {
      await runSteps(failSteps);
      setTimeout(() => {
        closeOverlay();
        setStatus("DENIED", "MOVING", friendlyError(result.error));
        if (button) button.disabled = false;
        input.focus();
      }, 900);
      return;
    }

    const destination = grantTransport(result);

    if (window.HWAuth && typeof window.HWAuth.getCurrentUser === "function") {
      try { await window.HWAuth.getCurrentUser(); } catch (error) {}
    }

    await runSteps(passSteps);

    const manual = $("manualEnter");
    if (manual) {
      manual.href = destination;
      manual.hidden = false;
    }

    setTimeout(() => {
      window.location.href = destination;
    }, 900);
  }

  function bind() {
    const form = $("gateForm");
    const clear = $("clearCode");
    const close = $("closeOverlay");
    const manual = $("manualEnter");

    if (manual) manual.href = DEFAULT_DESTINATION;
    if (form) form.addEventListener("submit", handleSubmit);

    if (clear) {
      clear.addEventListener("click", () => {
        const input = $("accessCode");
        if (input) {
          input.value = "";
          input.focus();
        }
        setStatus("STANDBY", "MOVING", "Terminal cleared. Pad still live.");
      });
    }

    if (close) close.addEventListener("click", closeOverlay);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeOverlay();
    });

    const overlay = $("scanOverlay");
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeOverlay();
      });
    }

    rotateChatter();
    setInterval(rotateChatter, 4200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    setStatus("STANDBY", "MOVING", "Pad is live. Enter code and run the scan.");
    window.HYPHSWORLD_ACCESS_PAD_LIVE = true;
  });
})();
