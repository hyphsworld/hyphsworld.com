(() => {
  "use strict";

  const STORAGE_KEY = "hyphsworld_cool_points";
  const DEFAULT_POINTS = 203;

  const VALID_CODES = ["510", "HYPH", "DUCK", "AMS", "RICHMOND", "QUARANTINE", "WORLD5", "CASINO"];

  const DUCK_INTRO = [
    "💡 Aye… you made it to HYPHSWORLD.",
    "💡 Don’t just stand there… press something.",
    "💡 This ain’t no regular site.",
    "💡 I’m Duck Sauce. I run around here when nobody looking."
  ];

  const DUCK_IDLE = [
    "💡 You just scrolling? That’s crazy.",
    "💡 Tap something… Cool Points don’t earn themselves.",
    "💡 I know you see the Vault.",
    "💡 Don’t act lost. I put buttons everywhere.",
    "💡 Full Player got the real rotation."
  ];

  const DUCK_PLAY = [
    "💡 Yeah… run that record.",
    "💡 Music motion. Stop playing.",
    "💡 That’s how you earn points.",
    "💡 Speaker check. Don’t blame me if it slap."
  ];

  const DUCK_MERCH = [
    "💡 Supporter lane. Boss motion.",
    "💡 Merch tap? You might be important.",
    "💡 Buy something before Buck starts judging.",
    "💡 That cart looking lonely."
  ];

  const DUCK_SPOTLIGHT = [
    "💡 Tap Spotlight. That’s the play.",
    "💡 25/8 got the feature lane right now.",
    "💡 Spotlight ain’t decoration. Run it.",
    "💡 That’s the artist lane. Pay attention."
  ];

  const BUCK_LINES = [
    "Code first.",
    "Denied blood.",
    "I need you leave.",
    "Vault security active.",
    "Access gotta be earned."
  ];

  const BUCK_VAULT = [
    "Buck checking access. Code better be right.",
    "Careful… Buck be trippin.",
    "Code wrong and he sending you back outside.",
    "Vault door don’t open off vibes."
  ];

  function rand(list) {
    return list[Math.floor(Math.random() * list.length)];
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

  function pop(text) {
    let el = document.querySelector(".hw-points-pop");
    if (!el) {
      el = document.createElement("div");
      el.className = "hw-points-pop";
      document.body.appendChild(el);
    }

    el.textContent = text;
    el.classList.add("show");

    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 1700);
  }

  function addPoints(amount = 1, label = "") {
    const next = getPoints() + amount;
    setPoints(next);
    pop(`+${amount} COOL POINTS${label ? " • " + label : ""}`);
  }

  function speak(text, type = "duck") {
    const bubble = document.querySelector(".hw-speech");
    if (!bubble) return;

    bubble.dataset.type = type;
    bubble.textContent = text;
    bubble.classList.add("show");

    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => bubble.classList.remove("show"), 3900);
  }

  function buildGuide() {
    if (document.querySelector(".hw-duck-guide")) return;

    const wrap = document.createElement("aside");
    wrap.className = "hw-duck-guide";
    wrap.innerHTML = `
      <div class="hw-speech" role="status" aria-live="polite"></div>
      <div class="hw-guide-row">
        <button class="hw-guide-btn hw-duck-btn" type="button" aria-label="Talk to Duck Sauce">
          <span class="hw-bulb" aria-hidden="true">💡</span>
          <img src="duck-sauce.jpg" alt="Duck Sauce">
        </button>
        <button class="hw-guide-btn hw-buck-btn" type="button" aria-label="Talk to BuckTheBodyguard">
          <img src="buck-thebodyguard.jpg" alt="BuckTheBodyguard" onerror="this.closest('button').style.display='none'">
        </button>
      </div>
    `;

    document.body.appendChild(wrap);

    document.querySelector(".hw-duck-btn").addEventListener("click", () => {
      speak(rand(DUCK_IDLE), "duck");
      addPoints(2, "DUCK TAP");
    });

    const buckBtn = document.querySelector(".hw-buck-btn");
    if (buckBtn) {
      buckBtn.addEventListener("click", () => {
        speak(rand(BUCK_LINES), "buck");
        addPoints(1, "BUCK CHECK");
      });
    }
  }

  function wireSiteButtons() {
    document.querySelectorAll("a, button").forEach((el) => {
      if (el.dataset.hwGuideWired === "1") return;
      if (el.closest(".hw-duck-guide")) return;

      el.dataset.hwGuideWired = "1";

      el.addEventListener("click", () => {
        const text = (el.textContent || "").toLowerCase();
        const href = (el.getAttribute("href") || "").toLowerCase();

        if (text.includes("vault") || href.includes("vault")) {
          speak(rand(BUCK_VAULT), "buck");
          addPoints(1, "VAULT TAP");
          return;
        }

        if (text.includes("spotlight") || href.includes("track=25-8") || href.includes("#spotlight")) {
          speak(rand(DUCK_SPOTLIGHT), "duck");
          addPoints(1, "SPOTLIGHT");
          return;
        }

        if (text.includes("play") || href.includes("player")) {
          speak(rand(DUCK_PLAY), "duck");
          addPoints(1, "MUSIC TAP");
          return;
        }

        if (text.includes("merch") || href.includes("shop") || href.includes("cash") || href.includes("py.pl")) {
          speak(rand(DUCK_MERCH), "duck");
          addPoints(3, "MERCH TAP");
        }
      });
    });
  }

  function wireVaultForm() {
    const form = document.getElementById("vaultForm");
    const input = document.getElementById("vaultCode");

    if (!form || !input || form.dataset.hwGuideVaultWired === "1") return;

    form.dataset.hwGuideVaultWired = "1";

    form.addEventListener("submit", () => {
      const code = input.value.trim().toUpperCase();

      if (VALID_CODES.includes(code)) {
        speak("Access approved. Don’t embarrass me in here.", "buck");
        addPoints(10, "CODE HIT");
      } else {
        speak("Denied blood. I need you leave.", "buck");
      }
    });
  }

  function idleTalk() {
    setInterval(() => {
      if (document.hidden) return;
      const onVault = document.body.classList.contains("vault-page");
      speak(onVault && Math.random() > 0.5 ? rand(BUCK_LINES) : rand(DUCK_IDLE), onVault ? "buck" : "duck");
    }, 15000);
  }

  function init() {
    buildGuide();
    wireSiteButtons();
    wireVaultForm();
    setPoints(getPoints());

    window.addEventListener("hyphsworld:addpoints", (event) => {
      const amount = Number(event.detail?.amount || 1);
      const label = event.detail?.label || "SITE";
      addPoints(amount, label);
    });

    setTimeout(() => speak(rand(DUCK_INTRO), "duck"), 900);
    idleTalk();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
