const TRACKS = {
  "young-tez": {
    title: "Young Tez â€” 25/8",
    meta: "Prod. by Marty McPhresh",
    src: ""
  },
  "ham": {
    title: "Hyph Life â€” HAM",
    meta: "Prod. by Hyph Life",
    src: ""
  },
  "ongod": {
    title: "BooGotGluu x No Flash â€” ON GOD",
    meta: "Spotlight Rotation",
    src: ""
  },
  "kiki": {
    title: "Cuz Zaid x JCrown x Ruzzo â€” KIKI",
    meta: "Prod. by Cuz Zaid",
    src: ""
  }
};

const VAULT_CODES = {
  "510": "Main Room unlocked. Richmond is in the building.",
  "HYPH": "Main Room unlocked. HYPHSWORLD access granted.",
  "DUCK": "Duck Sauce opened the door. Donâ€™t ask how.",
  "AMS": "AMS WEST access granted.",
  "RICHMOND": "Richmond code accepted.",
  "QUARANTINE": "Level 1 unlocked.",
  "WORLD5": "Level 2 unlocked. HYPHSWORLD 5 loading."
};

function selectTrack(key) {
  const track = TRACKS[key];
  if (!track) return;

  const title = document.querySelector("[data-now-title]");
  const meta = document.querySelector("[data-now-meta]");
  const audio = document.querySelector("[data-audio]");

  if (title) title.textContent = track.title;
  if (meta) meta.textContent = track.meta;

  if (audio) {
    const source = audio.querySelector("source");
    if (source) source.src = track.src || "";
    audio.load();
  }

  document.querySelectorAll("[data-track]").forEach((button) => {
    button.classList.toggle("active", button.dataset.track === key);
  });
}

function unlockVault(code) {
  const cleaned = String(code || "").trim().toUpperCase();
  const message = document.querySelector("[data-code-message]");
  const response = VAULT_CODES[cleaned];

  if (!message) return;

  if (!response) {
    message.textContent = "Code not recognized yet. Try 510, HYPH, DUCK, AMS, RICHMOND, QUARANTINE, or WORLD5.";
    message.style.color = "#ffd166";
    return;
  }

  message.textContent = response;
  message.style.color = "#30ff78";

  if (["510", "HYPH", "DUCK", "AMS", "RICHMOND"].includes(cleaned)) {
    document.querySelector('[data-room="main"]')?.classList.add("unlocked");
  }
  if (cleaned === "QUARANTINE") {
    document.querySelector('[data-room="level1"]')?.classList.add("unlocked");
  }
  if (cleaned === "WORLD5") {
    document.querySelector('[data-room="level2"]')?.classList.add("unlocked");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  navToggle?.addEventListener("click", () => {
    nav?.classList.toggle("open");
  });

  document.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => selectTrack(button.dataset.track));
  });

  document.querySelectorAll("[data-fill-code]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector("#vault-code");
      if (input) input.value = button.dataset.fillCode;
      unlockVault(button.dataset.fillCode);
    });
  });

  const form = document.querySelector("[data-code-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input[name='code']");
    unlockVault(input?.value);
  });
});
