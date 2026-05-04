(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const DEFAULT_LIMIT = 8;
  const REFRESH_MS = 45000;

  let clientPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        setTimeout(resolve, 200);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  function safeText(value, fallback) {
    return String(value || fallback || "").replace(/[<>]/g, "").trim();
  }

  function num(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(num(value));
  }

  function isConfigReady(config) {
    const url = String(config?.url || "").trim();
    const anonKey = String(config?.anonKey || config?.anon_key || "").trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getClient() {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      if (!window.HW_SUPABASE_CONFIG) await loadScript(CONFIG_FILE);

      const config = window.HW_SUPABASE_CONFIG || {};
      if (!isConfigReady(config)) throw new Error("Supabase config missing.");

      if (!window.supabase || !window.supabase.createClient) await loadScript(CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client unavailable.");

      return window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();

    return clientPromise;
  }

  function renderEmpty(target, message) {
    if (!target) return;
    target.innerHTML = `<div class="hw-leaderboard-empty">${safeText(message, "No leaderboard data yet.")}</div>`;
  }

  function playerName(row) {
    return safeText(row.display_name || row.player_name || row.username, "HYPHSWORLD Player");
  }

  function renderRows(target, rows, mode) {
    if (!target) return;

    if (!rows || !rows.length) {
      renderEmpty(
        target,
        mode === "games"
          ? "No game scores yet. First player to run it owns the board."
          : "No Cool Points yet. Login, play, unlock, and the board wakes up."
      );
      return;
    }

    target.innerHTML = rows.map((row, index) => {
      const rank = index + 1;
      const name = playerName(row);
      const icon = safeText(row.avatar_icon, "🧢");
      const score = mode === "games" ? row.score : row.points;
      const label = mode === "games" ? safeText(row.game_key, "game score") : "cool points";
      const meta = mode === "games"
        ? `${safeText(row.game_key, "game")} • +${formatNumber(row.points_delta)} points`
        : `${row.level_2_unlocked ? "Level 2" : row.level_1_unlocked ? "Level 1" : "Lobby"} clearance`;

      return `
        <article class="hw-leaderboard-row">
          <div class="hw-rank">#${rank}</div>
          <div class="hw-player-main">
            <p class="hw-player-name"><span>${icon}</span><strong>${name}</strong></p>
            <p class="hw-player-meta">${safeText(meta, "Lobby clearance")}</p>
          </div>
          <div class="hw-player-score">
            <strong>${formatNumber(score)}</strong>
            <span>${safeText(label, "score")}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  async function fetchPoints(limit) {
    const sb = await getClient();
    const { data, error } = await sb
      .from("cool_points_leaderboard")
      .select("user_id,display_name,username,avatar_icon,points,lifetime_points,level_1_unlocked,level_2_unlocked,updated_at")
      .order("points", { ascending: false })
      .order("lifetime_points", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function fetchGames(limit) {
    const sb = await getClient();
    const { data, error } = await sb
      .from("game_leaderboard")
      .select("id,user_id,display_name,avatar_icon,game_key,score,points_delta,created_at")
      .order("score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function hydrateLeaderboard(root) {
    const list = root.querySelector("[data-hw-leaderboard-list]");
    const buttons = Array.from(root.querySelectorAll("[data-hw-board-mode]"));
    const limit = num(root.getAttribute("data-limit")) || DEFAULT_LIMIT;
    let mode = root.getAttribute("data-default-mode") || "points";

    async function refresh(nextMode) {
      mode = nextMode || mode;
      buttons.forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-hw-board-mode") === mode);
      });

      renderEmpty(list, "Loading leaderboard...");

      try {
        const rows = mode === "games" ? await fetchGames(limit) : await fetchPoints(limit);
        renderRows(list, rows, mode);
      } catch (error) {
        console.warn("HYPHSWORLD leaderboard warning:", error?.message || error);
        renderEmpty(list, "Leaderboard is warming up. Refresh after Supabase finishes answering.");
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => refresh(button.getAttribute("data-hw-board-mode")));
    });

    await refresh(mode);
    setInterval(() => refresh(mode), REFRESH_MS);
  }

  async function hydrateMiniWidgets(root) {
    const topPlayer = root.querySelector("[data-hw-widget='top-player'] strong");
    const totalPlayers = root.querySelector("[data-hw-widget='total-players'] strong");
    const latestUnlock = root.querySelector("[data-hw-widget='latest-unlock'] strong");

    try {
      const sb = await getClient();
      const { data: topRows } = await sb
        .from("cool_points_leaderboard")
        .select("display_name,username,points")
        .order("points", { ascending: false })
        .limit(1);

      const { data: playerRows } = await sb
        .from("cool_points_leaderboard")
        .select("user_id")
        .limit(500);

      const { data: unlockRows } = await sb
        .from("vault_unlocks")
        .select("level_key,unlocked_at")
        .order("unlocked_at", { ascending: false })
        .limit(1);

      if (topPlayer) {
        topPlayer.textContent = topRows && topRows[0]
          ? `${playerName(topRows[0])} • ${formatNumber(topRows[0].points)}`
          : "Waiting";
      }

      if (totalPlayers) totalPlayers.textContent = formatNumber((playerRows || []).length);

      if (latestUnlock) {
        latestUnlock.textContent = unlockRows && unlockRows[0]
          ? safeText(unlockRows[0].level_key, "Vault")
          : "None yet";
      }
    } catch (error) {
      console.warn("HYPHSWORLD mini widget warning:", error?.message || error);
      if (topPlayer) topPlayer.textContent = "Loading";
      if (totalPlayers) totalPlayers.textContent = "0";
      if (latestUnlock) latestUnlock.textContent = "Pending";
    }
  }

  function boot() {
    document.querySelectorAll("[data-hw-leaderboard]").forEach(hydrateLeaderboard);
    document.querySelectorAll("[data-hw-mini-widgets]").forEach(hydrateMiniWidgets);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
