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

  async function addPoints(amount, reason) {
    const client = await window.HWAuth?.getClient?.();
    if (!client || typeof client.rpc !== "function") throw new Error("Cool Points service unavailable.");
    const { data, error } = await client.rpc(amount < 0 ? "spend_cool_points" : "earn_cool_points", {
      p_amount: Math.abs(amount), p_source: reason, p_reason: reason,
      p_metadata: { source: "hidden_casino" }
    });
    if (error) throw error;
    if (!data || data.ok !== true || typeof data.balance !== "number" || !Number.isFinite(data.balance)) {
      throw new Error("The points service did not confirm this transaction.");
    }
    window.dispatchEvent(new CustomEvent("hyph:points:changed", { detail: { balance: data.balance } }));
    try { if (window.HWPoints) await window.HWPoints.refresh(); } catch (_) {}
    return setPoints(data.balance);
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
    let feeConfirmed = false;
    lockActions(true);
    try {
      await addPoints(-5, "hidden_casino_spin");
      feeConfirmed = true;
      reelBoxes.forEach((box) => box.classList.add("spin"));
      $("casinoResult").textContent = "Duck Sauce: “Back room machine spinning…”";
      await new Promise((resolve) => setTimeout(resolve, 900));
      const results = reels.map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      reels.forEach((el, i) => { if (el) el.textContent = results[i]; });

      let win = 0;
      let msg = "No match. Duck Sauce laughed.";
      if (results[0] === results[1] && results[1] === results[2]) {
        win = results[0] === "🦆" ? 150 : 50;
        msg = results[0] === "🦆" ? "DUCK BACK ROOM JACKPOT +150" : "THREE MATCH +50";
      } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
        win = 15;
        msg = "TWO MATCH +15";
      }
      if (win > 0) await addPoints(win, "hidden_casino_win");
      $("casinoResult").textContent = msg;
    } catch (_) {
      $("casinoResult").textContent = feeConfirmed
        ? "The 5-point spin fee was confirmed, but the reward could not be confirmed. Check your account balance."
        : "Spin could not be confirmed. Check your account balance before trying again.";
    } finally {
      reelBoxes.forEach((box) => box.classList.remove("spin"));
      lockActions(false);
    }
  }

  async function duckBonus() {
    if (actionPending) return;
    lockActions(true);
    try {
      if (Math.random() < 0.55) {
        await addPoints(10, "hidden_casino_duck_bonus");
        $("casinoResult").textContent = "Duck Bonus hit +10. Buck is suspicious.";
      } else {
        const fee = Math.min(5, getPoints());
        if (fee > 0) await addPoints(-fee, "hidden_casino_duck_tax");
        $("casinoResult").textContent = `Duck Sauce tax -${fee}. Diabolical.`;
      }
    } catch (_) {
      $("casinoResult").textContent = "Duck Bonus could not be confirmed. Check your account balance.";
    } finally {
      lockActions(false);
    }
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
