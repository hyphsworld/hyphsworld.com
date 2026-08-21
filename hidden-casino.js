(() => {
  "use strict";

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
    if (!window.HWPoints) return 0;
    const result = amount < 0
      ? await window.HWPoints.spend(Math.abs(amount), reason)
      : await window.HWPoints.add(amount, reason);
    return setPoints(result.points);
  }

  function rotateLine() {
    if ($("casinoLine")) {
      $("casinoLine").textContent = lines[Math.floor(Math.random() * lines.length)];
    }
  }

  async function spinCasino() {
    if (getPoints() < 5) {
      $("casinoResult").textContent = "Buck: “You need 5 Cool Points to spin.”";
      return;
    }

    const before = getPoints();
    await addPoints(-5, "hidden_casino_spin");
    if (getPoints() === before) return;

    const reels = [document.querySelector("#c1"), document.querySelector("#c2"), document.querySelector("#c3")];
    const reelBoxes = document.querySelectorAll(".reel");
    const button = $("casinoSpin");

    if (button) button.disabled = true;
    reelBoxes.forEach((box) => box.classList.add("spin"));
    $("casinoResult").textContent = "Duck Sauce: “Back room machine spinning…”";

    setTimeout(async () => {
      const results = reels.map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      reels.forEach((el, i) => { if (el) el.textContent = results[i]; });
      reelBoxes.forEach((box) => box.classList.remove("spin"));

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

      if (button) button.disabled = false;
    }, 900);
  }

  async function duckBonus() {
    if (Math.random() < 0.55) {
      await addPoints(10, "hidden_casino_duck_bonus");
      $("casinoResult").textContent = "Duck Bonus hit +10. Buck is suspicious.";
    } else {
      const fee = Math.min(5, getPoints());
      await addPoints(-fee, "hidden_casino_duck_tax");
      $("casinoResult").textContent = `Duck Sauce tax -${fee}. Diabolical.`;
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
