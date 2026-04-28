(() => {
  "use strict";

  const STORAGE_KEY = "hyphsworld_cool_points";
  const DEFAULT_POINTS = 203;
  const VALID_CODES = ["510", "HYPH", "DUCK", "AMS", "RICHMOND", "QUARANTINE", "WORLD5", "CASINO"];

  const DUCK_LINES = [
    "I’m in the site now. Don’t act regular.",
    "Tap something. Cool Points don’t earn themselves.",
    "Full Player open. Vault open. Merch open. We major.",
    "HYPHSWORLD got rooms now. Don’t get lost."
  ];

  const BUCK_LINES = [
    "Code first.",
    "Denied blood.",
    "I need you leave.",
    "Vault security active.",
    "Access gotta be earned."
  ];

  function randomLine(type = "duck") {
    const pool = type === "buck" ? BUCK_LINES : DUCK_LINES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getPoints() {
    return Number(localStorage.getItem(STORAGE_KEY) || DEFAULT_POINTS);
  }

  function setPoints(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
    document.querySelectorAll("#coolPoints, #vaultPoints").forEach((el) => {
      el.textContent = String(value);
    });
  }

  function showPop(text) {
    let pop = document.querySelector(".hw-points-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.className = "hw-points-pop";
      document.body.appendChild(pop);
    }
    pop.textContent = text;
    pop.classList.add("show");
    clearTimeout(pop._hideTimer);
    pop._hideTimer = setTimeout(() => pop.classList.remove("show"), 1700);
  }

  function addPoints(amount = 1, label = "") {
    const next = getPoints() + amount;
    setPoints(next);
    showPop(`+${amount} COOL POINTS${label ? " • " + label : ""}`);
  }

  function speak(type = "duck", text = "") {
    const speech = document.querySelector(".hw-speech");
    if (!speech) return;
    speech.textContent = text || randomLine(type);
    speech.classList.add("show");
    clearTimeout(speech._hideTimer);
    speech._hideTimer = setTimeout(() => speech.classList.remove("show"), 3900);
  }

  function buildMascots() {
    if (document.querySelector(".hw-float-wrap")) return;

    const wrap = document.createElement("aside");
    wrap.className = "hw-float-wrap";
    wrap.innerHTML = `
      <div class="hw-speech" role="status" aria-live="polite"></div>
      <div class="hw-mascot-row">
        <button class="hw-mascot-btn hw-duck-btn" type="button" aria-label="Talk to Duck Sauce">
          <img src="duck-sauce.jpg" alt="Duck Sauce">
        </button>
        <button class="hw-mascot-btn hw-buck-btn" type="button" aria-label="Talk to BuckTheBodyguard">
          <img src="buck-thebodyguard.jpg" alt="BuckTheBodyguard" onerror="this.style.display='none'">
        </button>
      </div>
    `;
    document.body.appendChild(wrap);

    document.querySelector(".hw-duck-btn").addEventListener("click", () => {
      speak("duck");
      addPoints(2, "DUCK TAP");
    });

    document.querySelector(".hw-buck-btn").addEventListener("click", () => {
      speak("buck");
      addPoints(1, "BUCK CHECK");
    });
  }

  function wireButtons() {
    document.querySelectorAll("a, button").forEach((el) => {
      if (el.dataset.hwWired === "1") return;
      if (el.closest(".hw-float-wrap")) return;

      el.dataset.hwWired = "1";
      el.addEventListener("click", () => {
        const text = (el.textContent || "").toLowerCase();
        const href = (el.getAttribute("href") || "").toLowerCase();

        if (text.includes("vault") || href.includes("vault")) {
          speak("buck", "Buck checking access. Code better be right.");
          addPoints(1, "VAULT TAP");
        } else if (text.includes("play") || href.includes("player")) {
          speak("duck", "Music motion. Run it up.");
          addPoints(1, "MUSIC TAP");
        } else if (text.includes("merch") || href.includes("shop") || href.includes("cash") || href.includes("py.pl")) {
          speak("duck", "Supporter lane. Boss motion.");
          addPoints(3, "MERCH TAP");
        }
      });
    });
  }

  function wireVaultForm() {
    const form = document.getElementById("vaultForm");
    const input = document.getElementById("vaultCode");
    if (!form || !input || form.dataset.hwVaultWired === "1") return;

    form.dataset.hwVaultWired = "1";
    form.addEventListener("submit", () => {
      const code = input.value.trim().toUpperCase();
      if (VALID_CODES.includes(code)) {
        speak("buck", "Access approved. Don’t embarrass me in here.");
        addPoints(10, "CODE HIT");
      } else {
        speak("buck", "Denied blood. I need you leave.");
      }
    });
  }

  function init() {
    buildMascots();
    wireButtons();
    wireVaultForm();
    setPoints(getPoints());

    window.addEventListener("hyphsworld:addpoints", (event) => {
      addPoints(Number(event.detail?.amount || 1), event.detail?.label || "SITE");
    });

    setTimeout(() => speak("duck", "Duck Sauce online. Tap around and earn points."), 900);
    setInterval(() => {
      if (!document.hidden) speak(Math.random() > 0.72 ? "buck" : "duck");
    }, 30000);
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
