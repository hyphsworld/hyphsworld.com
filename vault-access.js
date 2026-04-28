// SECURE FRONTEND VAULT (NO RAW CODES)

const HASHES = {
  master: "9f3c2f6c7d6f8b6e0a2f3dcd4b7c3e6a7c2c4a9a6d3c8e7f9a1b2c3d4e5f6a7b",
  level1: "REPLACE_WITH_LEVEL1_HASH",
  level2: "REPLACE_WITH_LEVEL2_HASH"
};

async function hashInput(input) {
  const enc = new TextEncoder().encode(input.trim().toUpperCase());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function unlock(level) {
  sessionStorage.setItem("vault_" + level, "1");

  if (level === "master") {
    sessionStorage.setItem("vault_level1", "1");
    sessionStorage.setItem("vault_level2", "1");
  }

  location.href = "vault.html";
}

async function check(level, inputId) {
  const input = document.getElementById(inputId).value;
  const hash = await hashInput(input);

  if (hash === HASHES[level]) {
    unlock(level);
  } else {
    alert("Access denied.");
  }
}

// LOCK VAULT PAGE
(function () {
  if (window.location.pathname.includes("vault.html")) {
    const allowed =
      sessionStorage.getItem("vault_master") ||
      sessionStorage.getItem("vault_level1") ||
      sessionStorage.getItem("vault_level2");

    if (!allowed) {
      window.location.href = "/";
    }
  }
})();
