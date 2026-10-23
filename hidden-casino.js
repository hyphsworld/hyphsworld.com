(() => {
  "use strict";

  let actionPending = false;

  const symbols = ["🦆", "🎰", "🛡️", "🔥", "💎", "🛹", "💿"];

  const lines = [
    "Duck wants a cut. Buck wants order.",
    "Buck: “House is open, but rules still apply.”",
    "Duck Sauce: “This machine got personality.”",
    "Buck: “Do not let Duck touch the math.”"
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function getPoints() {
    return window.HWPoints ? window.HWPoints.get() : 0;
  }

  function setPoints(value) {
    const clean = Math.max(0, Math.floor(Number(value) || 0));
    if ($("casinoPoints")) $("casinoPoints").textContent = String(clean);
    return clean;
  }

  // Slots are settled atomically by Supabase. Never charge or credit the
  // shared wallet using a browser-selected amount or prize.
  async function confirmedSpin() {
    const client = await window.HWAuth?.getClient?.();
    if (!client || typeof client.rpc !== "function") throw new Error("Cool Points service unavailable.");
    const { data, error } = await client.rpc("spin_slots", {});
    if (error) throw error;
    if (!data || data.ok !== true || !Array.isArray(data.reels) ||
        !Number.isFinite(Number(data.balance)) || !Number.isFinite(Number(data.payout))) {
      throw new Error("Supabase did not confirm the slot result.");
    }
    window.dispatchEvent(new CustomEvent("hyph:points:changed", {
      detail: { balance: Number(data.balance) }
    }));
    try { if (window.HWPoints) await window.HWPoints.refresh(); } catch (_) {}
    setPoints(data.balance);
    return data;
  }

  function rotateLine() {
    if ($("casinoLine")) {
      $("casinoLine").textContent = lines[Math.floor(Math.random() * lines.length)];
    }
  }

  function lockActions(locked) {
    actionPending = locked;
    if ($("casinoSpin")) $("casinoSpin").disabled = locked;
    if ($("freeBonus")) $("freeBonus").disabled = locked;
  }

  async function spinCasino() {
    if (actionPending) return;
    const reels = [$("c1"), $("c2"), $("c3")];
    const reelBoxes = document.querySelectorAll(".reel");
    lockActions(true);
    try {
      $("casinoResult").textContent = "Duck Sauce: “Buck checking the spin with Supabase…”";
      const result = await confirmedSpin();
      reelBoxes.forEach((box) => box.classList.add("spin"));
      await new Promise((resolve) => setTimeout(resolve, 900));
      const themed = { "🍒": "🦆", "🍋": "🛹", "⭐": "🔥", "7": "🎰", "💎": "💎", "🍀": "💿" };
      reels.forEach((el, i) => {
        if (el) el.textContent = themed[result.reels[i]] || result.reels[i] || "🛡️";
      });
      const payout = Number(result.payout) || 0;
      $("casinoResult").textContent = payout > 0
        ? "Duck Sauce: “" + (result.result === "jackpot" ? "BACK ROOM JACKPOT!" : "WE HIT!") +
          " Buck confirmed +" + payout + " CP (net " + (Number(result.net) || 0) + ").”"
        : "Duck Sauce: “No match. Buck charged the confirmed 5 CP spin. Run it back!”";
    } catch (error) {
      $("casinoResult").textContent = "Spin not confirmed: " +
        String(error && error.message || "Check your session and points balance.");
    } finally {
      reelBoxes.forEach((box) => box.classList.remove("spin"));
      lockActions(false);
    }
  }

  async function duckBonus() {
    // The old Duck Bonus used browser Math.random() and directly mutated
    // wallets. Preserve its button and character, but never issue unverified
    // payouts or fees. A verified server bonus would require its own RPC.
    $("casinoResult").textContent =
      "Duck Sauce: “Buck locked the bonus vault until rewards are server-verified!”";
  }

  async function bind() {
    if (window.HWAccountWidgetReady) await window.HWAccountWidgetReady;
    if (window.HWPoints) await window.HWPoints.refresh();
    setPoints(getPoints());
    rotateLine();
    setInterval(rotateLine, 4200);

    if ($("casinoSpin")) $("casinoSpin").addEventListener("click", spinCasino);
    if ($("freeBonus")) $("freeBonus").addEventListener("click", duckBonus);
    window.addEventListener("hw:points-change", (event) => setPoints(event.detail && event.detail.points));
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
