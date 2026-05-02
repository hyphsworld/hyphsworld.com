(() => {
  "use strict";

  const POINTS_KEY = "coolPoints";
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
    return Number(localStorage.getItem(POINTS_KEY) || 0);
  }

  function setPoints(value) {
    const clean = Math.max(0, Math.floor(Number(value) || 0));
    localStorage.setItem(POINTS_KEY, String(clean));
    if ($("casinoPoints")) $("casinoPoints").textContent = String(clean);
    return clean;
  }

  function addPoints(amount) {
    return setPoints(getPoints() + amount);
  }

  function rotateLine() {
    if ($("casinoLine")) {
      $("casinoLine").textContent = lines[Math.floor(Math.random() * lines.length)];
    }
  }

  function spinCasino() {
    if (getPoints() < 5) {
      $("casinoResult").textContent = "Buck: “You need 5 Cool Points to spin.”";
      return;
    }

    addPoints(-5);

    const reels = [document.querySelector("#c1"), document.querySelector("#c2"), document.querySelector("#c3")];
    const reelBoxes = document.querySelectorAll(".reel");
    const button = $("casinoSpin");

    if (button) button.disabled = true;
    reelBoxes.forEach((box) => box.classList.add("spin"));
    $("casinoResult").textContent = "Duck Sauce: “Back room machine spinning…”";

    setTimeout(() => {
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

      if (win > 0) addPoints(win);
      $("casinoResult").textContent = msg;

      if (button) button.disabled = false;
    }, 900);
  }

  function duckBonus() {
    if (Math.random() < 0.55) {
      addPoints(10);
      $("casinoResult").textContent = "Duck Bonus hit +10. Buck is suspicious.";
    } else {
      const fee = Math.min(5, getPoints());
      addPoints(-fee);
      $("casinoResult").textContent = `Duck Sauce tax -${fee}. Diabolical.`;
    }
  }

  function bind() {
    setPoints(getPoints());
    rotateLine();
    setInterval(rotateLine, 4200);

    if ($("casinoSpin")) $("casinoSpin").addEventListener("click", spinCasino);
    if ($("freeBonus")) $("freeBonus").addEventListener("click", duckBonus);
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
