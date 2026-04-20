document.addEventListener("DOMContentLoaded", () => {
  const trackClicks = document.querySelectorAll(".track-click");
  const vaultStatusText = document.getElementById("vaultStatusText");

  const activeVaultEntry = {
    title: "YOUNGIN (REMIX)",
    artists: "Hyph Life, Nitti Bo, Brick Jamez, Top Cat, Champ Young, Young Tez",
    producer: "1ManBand",
    codes: ["HYPH2025", "MOTION2025"]
  };

  function safeTrackEvent(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "homepage_vault_entry",
        ...details
      });
    }
  }

  if (vaultStatusText) {
    vaultStatusText.textContent =
      `ACTIVE ENTRY: ${activeVaultEntry.title} — CODES: ${activeVaultEntry.codes.join(" / ")}`;
  }

  trackClicks.forEach((link) => {
    link.addEventListener("click", () => {
      const label = link.dataset.trackLink || "homepage_link";

      safeTrackEvent("homepage_link_click", {
        link_name: label,
        active_entry: activeVaultEntry.title
      });
    });
  });
});