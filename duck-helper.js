document.addEventListener("DOMContentLoaded", () => {
  const duckMount = document.getElementById("duck-helper");
  if (!duckMount) return;

  const pageName = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

  const pageTips = {
    "index.html": {
      tip: "Welcome 2 HYPHSWORLD",
      message: "Tap Stream Now for the homepage records, hit the Vault for exclusives, or check Merch to support direct.",
      primaryText: "Open Vault",
      primaryHref: "vault.html",
      secondText: "Merch",
      secondHref: "#shop"
    },
    "": {
      tip: "Welcome 2 HYPHSWORLD",
      message: "Tap Stream Now for the homepage records, hit the Vault for exclusives, or check Merch to support direct.",
      primaryText: "Open Vault",
      primaryHref: "vault.html",
      secondText: "Merch",
      secondHref: "#shop"
    },
    "vault.html": {
      tip: "Vault Mode",
      message: "Pick a level, test the codes, and check the records. If something feels locked, that means Duck Sauce is watching.",
      primaryText: "Back Home",
      primaryHref: "index.html",
      secondText: "Full Player",
      secondHref: "app-player.html"
    },
    "app-player.html": {
      tip: "Player Help",
      message: "Tap any song in the queue, use the progress bar to scrub, and keep the volume locked where you want it.",
      primaryText: "Back Home",
      primaryHref: "index.html",
      secondText: "Vault",
      secondHref: "vault.html"
    },
    "shop.html": {
      tip: "Merch Help",
      message: "Choose your item, then order direct by email, PayPal, or Cash App. Other colors are available on request.",
      primaryText: "Email Tone",
      primaryHref: "mailto:tone@amsenterprisecorp.com?subject=HYPHSWORLD%20Merch%20Order",
      secondText: "Cash App",
      secondHref: "https://cash.app/$TonioOsborne"
    },
    "videos.html": {
      tip: "Watch The World",
      message: "Start with The 01 Show, then tap into interviews and AMS WEST TV. More motion means more time in the world.",
      primaryText: "01 Show",
      primaryHref: "https://youtube.com/@the01showtv?si=ZzIx6jWoJQVdXt_8",
      secondText: "AMS WEST TV",
      secondHref: "https://youtube.com/@amswesttv?si=UQyRcQh6mSuTqt5b"
    },
    "about.html": {
      tip: "The Story",
      message: "This is where the Richmond, Hyph Life, AMS WEST, and hero energy all connect.",
      primaryText: "Music",
      primaryHref: "index.html#music",
      secondText: "Contact",
      secondHref: "contact.html"
    },
    "contact.html": {
      tip: "Tap In",
      message: "For booking, features, merch, and business, contact Tone direct. Keep it official.",
      primaryText: "Email Tone",
      primaryHref: "mailto:tone@amsenterprisecorp.com",
      secondText: "Instagram",
      secondHref: "https://www.instagram.com/hyphsworld"
    }
  };

  const data = pageTips[pageName] || pageTips["index.html"];

  duckMount.classList.add("duck-helper");
  duckMount.innerHTML = `
    <button class="duck-button" id="duckToggle" type="button" aria-label="Open Duck Sauce helper">
      <span class="duck-bulb">💡</span>
      <img src="duck-sauce.png" alt="Duck Sauce helper">
      <span class="duck-label">Need help?</span>
    </button>

    <div class="duck-panel" id="duckPanel">
      <div class="duck-panel-head">
        <div class="duck-panel-title">
          <img class="duck-mini" src="duck-sauce.png" alt="Duck Sauce">
          <div>
            <strong>Duck Sauce</strong>
            <span>Site helper</span>
          </div>
        </div>
        <button class="duck-close" id="duckClose" type="button" aria-label="Close Duck Sauce helper">×</button>
      </div>

      <div class="duck-panel-body">
        <p class="duck-tip">${data.tip}</p>
        <p class="duck-message">${data.message}</p>
        <div class="duck-actions">
          <a class="duck-action primary" href="${data.primaryHref}">${data.primaryText}</a>
          <a class="duck-action" href="${data.secondHref}">${data.secondText}</a>
        </div>
      </div>
    </div>
  `;

  const toggle = document.getElementById("duckToggle");
  const close = document.getElementById("duckClose");

  function trackDuck(eventLabel) {
    if (typeof gtag === "function") {
      gtag("event", "duck_helper", {
        event_category: "engagement",
        event_label: eventLabel
      });
    }
  }

  toggle.addEventListener("click", () => {
    duckMount.classList.toggle("open");
    trackDuck(duckMount.classList.contains("open") ? "open" : "close");
  });

  close.addEventListener("click", () => {
    duckMount.classList.remove("open");
    trackDuck("close_button");
  });
});
