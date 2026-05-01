/* HYPHSWORLD / AMS WEST — Vault Floor Renderer */

(function(){
  const data = window.HYPHSWORLD_VAULT || { floors: [] };
  const floorMount = document.querySelector("[data-floor]");
  if (!floorMount) return;

  const floorId = floorMount.getAttribute("data-floor");
  const floor = data.floors.find(item => item.id === floorId) || data.floors[0];

  if (!floor) {
    floorMount.innerHTML = `
      <main class="vault-shell">
        <section class="alive-banner">
          Vault system loaded, but no floor data was found. Check vault-data.js.
        </section>
      </main>
    `;
    return;
  }

  document.title = `${floor.title} ${floor.subtitle} | HYPHSWORLD`;

  floorMount.innerHTML = `
    <main class="vault-shell ${floor.theme || ""}">
      <header class="topbar">
        <a class="brand-lockup" href="vault.html">
          <small>${data.brand?.label || "AMS WEST"} PRESENTS</small>
          <strong>${data.brand?.name || "HYPHSWORLD"}</strong>
        </a>
        <nav class="nav-pills">
          <a class="nav-pill" href="vault.html">Vault Gate</a>
          <a class="nav-pill" href="floor1.html">Level 1</a>
          <a class="nav-pill" href="floor2.html">Level 2</a>
          <a class="nav-pill" href="${floor.casino || "casino.html"}">Casino</a>
        </nav>
      </header>

      <section class="floor-grid">
        <article class="floor-hero">
          <div class="scanline"></div>
          <div class="floor-tag-row">
            <span class="tag green">${floor.badge || "FLOOR LIVE"}</span>
            <span class="tag red">${floor.status || "OPEN"}</span>
            <span class="tag cyan">NO BLANK PAGE</span>
            <span class="tag yellow">${data.brand?.tagline || "DO YOU KNOW THE CODE?"}</span>
          </div>

          <div class="floor-title">
            <h1>${floor.title}</h1>
            <h2>${floor.subtitle}</h2>
            <p>${floor.description || "Vault floor restored and live."}</p>
          </div>

          <div class="floor-actions">
            <button class="brand-btn fun" id="playFirst">Play First Track</button>
            <a class="brand-btn hot" href="${floor.next || "casino.html"}">Next Door</a>
            <a class="brand-btn gold" href="${floor.casino || "casino.html"}">Open Casino</a>
          </div>
        </article>

        <aside class="track-panel">
          <div class="panel-head">
            <div>
              <h3>Track Listing</h3>
              <p>Click a record. If the MP3 path is different, update vault-data.js.</p>
            </div>
            <span class="tag green">${floor.tracks.length} TRACKS</span>
          </div>

          <div class="now-playing">
            <small>NOW PLAYING</small>
            <strong id="nowTitle">Select a track</strong>
            <audio id="floorAudio" controls preload="metadata"></audio>
          </div>

          <div class="track-list" id="trackList"></div>
        </aside>
      </section>

      <div class="alive-banner">
        Duck Sauce: “No blank pages in my casino, P. Every door gotta do somethin’.”
      </div>
    </main>
  `;

  const list = document.getElementById("trackList");
  const audio = document.getElementById("floorAudio");
  const nowTitle = document.getElementById("nowTitle");

  floor.tracks.forEach((track, index) => {
    const btn = document.createElement("button");
    btn.className = "track-card";
    btn.type = "button";
    btn.innerHTML = `
      <span class="track-num">${String(index + 1).padStart(2, "0")}</span>
      <span class="track-meta">
        <strong>${track.title}</strong>
        <span>${track.artist || "Hyph Life"}${track.producer ? " · Prod. " + track.producer : ""}</span>
      </span>
      <span class="track-play">▶</span>
    `;
    btn.addEventListener("click", () => playTrack(track));
    list.appendChild(btn);
  });

  function playTrack(track){
    nowTitle.textContent = `${track.title} — ${track.artist || "Hyph Life"}`;
    audio.src = track.file || "";
    audio.play().catch(() => {
      nowTitle.textContent = `${track.title} loaded — tap play on the audio bar`;
    });
  }

  document.getElementById("playFirst")?.addEventListener("click", () => {
    if (floor.tracks[0]) playTrack(floor.tracks[0]);
  });
})();
