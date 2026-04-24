(function () {
  const STORAGE_KEY = "hyphsworld_cool_points";

  function getPoints() {
    return Number(localStorage.getItem(STORAGE_KEY) || "0");
  }

  function setPoints(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
    syncPoints(value);
  }

  function addPoints(amount, reason) {
    const next = getPoints() + amount;
    setPoints(next);

    if (typeof gtag === "function") {
      gtag("event", "duck_sauce_points", {
        section: "duck_sauce",
        points_added: amount,
        reason: reason || "duck_sauce_action",
        total_points: next
      });
    }
  }

  function syncPoints(value) {
    document.querySelectorAll("[data-duck-points]").forEach((el) => {
      el.textContent = String(value);
    });

    const homepageTotal = document.getElementById("coolPointsTotal");
    if (homepageTotal) homepageTotal.textContent = String(value);
  }

  function track(eventName, details) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "duck_sauce",
        ...(details || {})
      });
    }
  }

  function createDuckSauce() {
    if (document.querySelector(".duck-sauce-launcher")) return;

    const launcher = document.createElement("button");
    launcher.className = "duck-sauce-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Duck Sauce");
    launcher.innerHTML = `
      <span class="duck-sauce-orb" aria-hidden="true">🦆</span>
      <span class="duck-sauce-launcher-text">
        <strong>Duck Sauce</strong>
        <span>Tap In</span>
      </span>
    `;

    const panel = document.createElement("aside");
    panel.className = "duck-sauce-panel";
    panel.setAttribute("aria-label", "Duck Sauce site guide");
    panel.innerHTML = `
      <div class="duck-sauce-head">
        <div>
          <span class="duck-sauce-kicker">01 World Guide</span>
          <h2 class="duck-sauce-title">DUCK SAUCE</h2>
        </div>
        <button class="duck-sauce-close" type="button" aria-label="Close Duck Sauce">×</button>
      </div>
      <div class="duck-sauce-body">
        <p class="duck-sauce-line">
          I’m everywhere now. Music, Vault, points, 01 Show — tap the right door and keep moving.
        </p>
        <div class="duck-sauce-points">
          <span>Cool Points</span>
          <strong><span data-duck-points>0</span></strong>
        </div>
        <div class="duck-sauce-actions">
          <a class="duck-sauce-primary" href="vault.html" data-duck-action="vault">Enter The Vault</a>
          <a class="duck-sauce-secondary" href="app-player.html" data-duck-action="player">Open Full Player</a>
          <a class="duck-sauce-secondary" href="https://youtube.com/@the01showtv?si=ZzIx6jWoJQVdXt_8" target="_blank" rel="noreferrer" data-duck-action="01show">Watch 01 Show</a>
          <button class="duck-sauce-secondary" type="button" data-duck-claim>Claim Duck Sauce Points</button>
        </div>
        <p class="duck-sauce-note">Hint: trivia answers live inside the 01 World.</p>
      </div>
    `;

    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    const closeBtn = panel.querySelector(".duck-sauce-close");
    const claimBtn = panel.querySelector("[data-duck-claim]");

    function togglePanel(force) {
      const shouldOpen = typeof force === "boolean" ? force : !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", shouldOpen);
      launcher.setAttribute("aria-expanded", String(shouldOpen));
      track(shouldOpen ? "duck_sauce_open" : "duck_sauce_close");
    }

    launcher.addEventListener("click", () => togglePanel());
    closeBtn.addEventListener("click", () => togglePanel(false));

    claimBtn.addEventListener("click", () => {
      addPoints(25, "duck_sauce_claim");
      claimBtn.textContent = "+25 COOL POINTS ADDED";
      setTimeout(() => {
        claimBtn.textContent = "Claim Duck Sauce Points";
      }, 1600);
    });

    panel.querySelectorAll("[data-duck-action]").forEach((link) => {
      link.addEventListener("click", () => {
        const action = link.getAttribute("data-duck-action") || "duck_link";
        addPoints(action === "vault" ? 50 : 25, action);
        track("duck_sauce_link_click", { action });
      });
    });

    syncPoints(getPoints());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createDuckSauce);
  } else {
    createDuckSauce();
  }
})();
