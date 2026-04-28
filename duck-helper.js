(() => {
  "use strict";

  const STORAGE_KEY = "hyphsworld_cool_points";
  const LEVEL_KEY = "hyphsworld_duck_buck_level";
  const DEFAULT_POINTS = 203;

  const VALID_CODES = ["510", "HYPH", "DUCK", "AMS", "RICHMOND", "QUARANTINE", "WORLD5", "CASINO"];

  const DUCK = {
    intro: [
      "💡 Aye… welcome to HYPHSWORLD. Don’t act regular.",
      "💡 I’m Duck Sauce. I give hints, points, and bad advice.",
      "💡 This ain’t just a site. It got rooms.",
      "💡 Tap around. I know where the buttons live."
    ],
    idle: [
      "💡 You just watching? That’s unpaid surveillance.",
      "💡 Tap something. Cool Points don’t earn themselves.",
      "💡 I know you see the Vault. Don’t be scary.",
      "💡 Full Player got the real rotation. Stop browsing like a civilian.",
      "💡 Hint: codes be looking like eras, cities, and inside jokes."
    ],
    play: [
      "💡 Music motion. Run it up.",
      "💡 Speaker check. Don’t blame me if it slap.",
      "💡 That play button got rent due. Press it.",
      "💡 This how the points start moving."
    ],
    spotlight: [
      "💡 Spotlight lane active. 25/8 is the play.",
      "💡 That ain’t just a card. That’s platform motion.",
      "💡 Tap Play and I’ll send you right to 25/8.",
      "💡 Artist Spotlight means somebody getting pushed correctly."
    ],
    merch: [
      "💡 Merch tap? Supporter lane detected.",
      "💡 Buy something before Buck starts judging.",
      "💡 That cart looking lonely.",
      "💡 Direct support. No middleman. You heard the homepage."
    ],
    hints: [
      "💡 Hint: Level 1 is a locked era.",
      "💡 Hint: Level 2 sounds like the current pressure.",
      "💡 Hint: CASINO ain’t subtle, but neither am I.",
      "💡 Hint: RICHMOND always got a key.",
      "💡 Hint: try QUARANTINE or WORLD5 when Buck not looking."
    ],
    roast: [
      "💡 You clicked that like you had a plan.",
      "💡 That was almost smart.",
      "💡 I’m not saying you lost… but you circling.",
      "💡 Don’t panic. That’s Buck’s job.",
      "💡 I seen worse navigation. Not much worse, but worse."
    ]
  };

  const BUCK = {
    intro: [
      "Buck on duty.",
      "Access gotta be earned.",
      "Code first.",
      "No weak codes.",
      "Door security active."
    ],
    vault: [
      "Buck checking access. Code better be right.",
      "Stand still.",
      "Vault door don’t open off vibes.",
      "I need code, not confidence.",
      "Wrong code and you’re back outside."
    ],
    denied: [
      "Denied blood.",
      "I need you leave.",
      "That code not it.",
      "Access rejected.",
      "Try again, but better."
    ],
    approved: [
      "Access approved. Don’t embarrass me in here.",
      "You good. Move right.",
      "Door cracked. Don’t act brand new.",
      "Approved. Keep it clean.",
      "You got clearance."
    ],
    merch: [
      "Supporter lane recognized.",
      "Merch tap approved.",
      "That’s business. Proceed.",
      "Receipt energy. I respect it."
    ]
  };

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
    updateLevel();
  }

  function getLevel() {
    return Number(localStorage.getItem(LEVEL_KEY) || 1);
  }

  function updateLevel() {
    const points = getPoints();
    let level = 1;
    if (points >= 500) level = 5;
    else if (points >= 350) level = 4;
    else if (points >= 250) level = 3;
    else if (points >= 150) level = 2;
    localStorage.setItem(LEVEL_KEY, String(level));
    document.querySelectorAll("[data-hw-level]").forEach((el) => {
      el.textContent = `Level ${level}`;
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
    bubble._timer = setTimeout(() => bubble.classList.remove("show"), 4200);
  }

  function duo(duckLine, buckLine, points = 0, label = "") {
    speak(duckLine, "duck");
    setTimeout(() => speak(buckLine, "buck"), 1850);
    if (points) addPoints(points, label);
  }

  function buildGuide() {
    if (document.querySelector(".hw-duck-guide")) return;

    const wrap = document.createElement("aside");
    wrap.className = "hw-duck-guide";
    wrap.innerHTML = `
      <div class="hw-speech" role="status" aria-live="polite"></div>
      <div class="hw-level-chip" data-hw-level>Level ${getLevel()}</div>
      <div class="hw-guide-row">
        <button class="hw-guide-btn hw-duck-btn" type="button" aria-label="Talk to Duck Sauce">
          <span class="hw-bulb" aria-hidden="true">💡</span>
          <img src="duck-sauce.jpg" alt="Duck Sauce">
        </button>
        <button class="hw-guide-btn hw-buck-btn" type="button" aria-label="Talk to BuckTheBodyguard">
          <img src="buck-thebodyguard.jpg" alt="BuckTheBodyguard" onerror="this.closest('button').style.display='none'">
        </button>
      </div>
      <div class="hw-guide-menu" aria-label="Duck and Buck quick actions">
        <button type="button" data-guide-action="hint">Hint</button>
        <button type="button" data-guide-action="points">Points</button>
        <button type="button" data-guide-action="rules">Rules</button>
      </div>
    `;

    document.body.appendChild(wrap);

    document.querySelector(".hw-duck-btn").addEventListener("click", () => {
      const points = getPoints();
      if (points < 250) speak(rand(DUCK.hints), "duck");
      else speak(rand(DUCK.roast), "duck");
      addPoints(2, "DUCK TAP");
    });

    const buckBtn = document.querySelector(".hw-buck-btn");
    if (buckBtn) {
      buckBtn.addEventListener("click", () => {
        speak(rand(BUCK.intro), "buck");
        addPoints(1, "BUCK CHECK");
      });
    }

    document.querySelectorAll("[data-guide-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.guideAction;
        if (action === "hint") {
          speak(rand(DUCK.hints), "duck");
          addPoints(1, "HINT");
        } else if (action === "points") {
          speak(`💡 You got ${getPoints()} Cool Points. Keep tapping, genius.`, "duck");
        } else if (action === "rules") {
          duo("💡 Rule one: tap around. Rule two: don’t annoy Buck.", "Rule three: code first.", 1, "RULES");
        }
      });
    });
  }

  function classify(text, href) {
    if (text.includes("vault") || href.includes("vault")) return "vault";
    if (text.includes("spotlight") || href.includes("track=25-8") || href.includes("#spotlight")) return "spotlight";
    if (text.includes("play") || href.includes("player")) return "play";
    if (text.includes("merch") || href.includes("shop") || href.includes("cash") || href.includes("py.pl")) return "merch";
    if (text.includes("login") || text.includes("join") || text.includes("create id")) return "join";
    if (text.includes("email") || text.includes("tap in") || href.includes("mailto")) return "connect";
    return "";
  }

  function wireSiteButtons() {
    document.querySelectorAll("a, button").forEach((el) => {
      if (el.dataset.hwGuideWired === "1") return;
      if (el.closest(".hw-duck-guide")) return;

      el.dataset.hwGuideWired = "1";

      el.addEventListener("click", () => {
        const text = (el.textContent || "").toLowerCase();
        const href = (el.getAttribute("href") || "").toLowerCase();
        const type = classify(text, href);

        if (type === "vault") {
          duo(rand(DUCK.hints), rand(BUCK.vault), 1, "VAULT TAP");
        } else if (type === "spotlight") {
          speak(rand(DUCK.spotlight), "duck");
          addPoints(2, "SPOTLIGHT");
        } else if (type === "play") {
          speak(rand(DUCK.play), "duck");
          addPoints(1, "MUSIC TAP");
        } else if (type === "merch") {
          duo(rand(DUCK.merch), rand(BUCK.merch), 3, "MERCH TAP");
        } else if (type === "join") {
          speak("💡 Login later. For now, move like you got access.", "duck");
          addPoints(1, "JOIN TAP");
        } else if (type === "connect") {
          speak("💡 Tap in clean. Business don’t wait.", "duck");
          addPoints(1, "CONNECT");
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
        speak(rand(BUCK.approved), "buck");
        setTimeout(() => speak("💡 I told you the hints work. Don’t act surprised.", "duck"), 1800);
        addPoints(10, "CODE HIT");
      } else {
        speak(rand(BUCK.denied), "buck");
        setTimeout(() => speak("💡 I would help but you typed that with no confidence.", "duck"), 1800);
      }
    });
  }

  function idleTalk() {
    setInterval(() => {
      if (document.hidden) return;
      const onVault = document.body.classList.contains("vault-page");
      const onPlayer = document.body.classList.contains("player-page");

      if (onVault) {
        speak(Math.random() > 0.55 ? rand(BUCK.vault) : rand(DUCK.hints), Math.random() > 0.55 ? "buck" : "duck");
      } else if (onPlayer) {
        speak(rand(DUCK.play), "duck");
      } else {
        speak(rand(DUCK.idle), "duck");
      }
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

    setTimeout(() => {
      const onVault = document.body.classList.contains("vault-page");
      if (onVault) duo("💡 Vault room loaded. Don’t embarrass me.", "Code first.", 0, "");
      else speak(rand(DUCK.intro), "duck");
    }, 900);

    idleTalk();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
