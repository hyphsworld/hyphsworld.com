(() => {
  "use strict";

  const POINTS_KEY = "coolPoints";

  const tracks = [
    { title: "Im a Beast", meta: "Quarantine Mixtape", src: "im-a-beast.mp3" },
    { title: "Gotta Go", meta: "Quarantine Mixtape", src: "gotta-go-remix.mp3" },
    { title: "JAYZ Shit", meta: "Quarantine Mixtape", src: "jay-z-shit.mp3" },
    { title: "Share My Money", meta: "Quarantine Mixtape", src: "money-is-the-root.mp3" },
    { title: "Free Hyph", meta: "Quarantine Mixtape", src: "mula.mp3" },
    { title: "50 Cent Shit", meta: "Quarantine Mixtape", src: "no-trace-snip.mp3" }
  ];

  const symbols = ["🦆", "🛡️", "🔥", "💿", "🎰", "💎", "🛹"];

  const duoLines = [
    "Duck brings the chaos. Buck keeps the floor secure.",
    "Duck Sauce: “Run the tape and break me off points.”",
    "Buck: “Enjoy the floor. Do not let Duck manage your wallet.”",
    "Duck & Buck are posted. Level 1 is active."
  ];

  const duckLines = [
    "Aye… lemme hold 20 points. I got a play.",
    "You just played the tape. Now play me.",
    "Trust me. I’m basically customer service.",
    "Don’t act broke. I seen the points go up."
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
    if ($("coolPoints")) $("coolPoints").textContent = String(clean);
    return clean;
  }

  function addPoints(amount) {
    return setPoints(getPoints() + amount);
  }

  function renderTracks() {
    const list = $("trackList");
    if (!list) return;

    list.innerHTML = "";

    tracks.forEach((track, index) => {
      const btn = document.createElement("button");
      btn.className = "track-btn";
      btn.type = "button";
      btn.textContent = `${String(index + 1).padStart(2, "0")} ${track.title}`;
      btn.addEventListener("click", () => loadTrack(index, true));
      list.appendChild(btn);
    });

    setActiveTrack(0);
  }

  function setActiveTrack(index) {
    document.querySelectorAll(".track-btn").forEach((btn, i) => {
      btn.classList.toggle("active", i === index);
    });
  }

  function loadTrack(index, play) {
    const track = tracks[index];
    const audio = $("audioPlayer");
    const source = $("audioSource");

    if (!track || !audio || !source) return;

    $("trackNumber").textContent = `TRACK ${String(index + 1).padStart(2, "0")}`;
    $("trackTitle").textContent = track.title;
    $("trackMeta").textContent = track.meta;
    source.src = track.src;
    audio.load();
    setActiveTrack(index);

    addPoints(2);

    if (play) {
      audio.play().catch(() => {});
      maybeDuckOffer("music");
    }
  }

  function spinSlot() {
    const reels = [document.querySelector("#r1"), document.querySelector("#r2"), document.querySelector("#r3")];
    const reelBoxes = document.querySelectorAll(".reel");
    const button = $("spinBtn");

    if (button) button.disabled = true;
    reelBoxes.forEach((box) => box.classList.add("spin"));
    $("slotResult").textContent = "Duck Sauce: “Machine thinking…”";

    setTimeout(() => {
      const results = reels.map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      reels.forEach((el, i) => { if (el) el.textContent = results[i]; });
      reelBoxes.forEach((box) => box.classList.remove("spin"));

      let win = 5;
      let msg = "Try Again Bonus +5";

      if (results[0] === results[1] && results[1] === results[2]) {
        win = results[0] === "🦆" ? 100 : 35;
        msg = results[0] === "🦆" ? "DUCK JACKPOT +100" : "THREE MATCH +35";
      } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
        win = 15;
        msg = "TWO MATCH +15";
      }

      addPoints(win);
      $("slotResult").textContent = msg;

      if (button) button.disabled = false;
      maybeDuckOffer("slot");
    }, 900);
  }

  function maybeDuckOffer(context) {
    if (getPoints() < 20) return;

    const chance = context === "slot" ? 0.8 : 0.45;
    if (Math.random() > chance) return;

    setTimeout(() => {
      $("duckTitle").textContent = "Lemme hold 20 points.";
      $("duckText").textContent = duckLines[Math.floor(Math.random() * duckLines.length)];
      $("duckModal").classList.add("active");
      $("duckModal").setAttribute("aria-hidden", "false");
    }, 650);
  }

  function closeDuck() {
    $("duckModal").classList.remove("active");
    $("duckModal").setAttribute("aria-hidden", "true");
  }

  function trustDuck() {
    if (getPoints() < 20) {
      $("duckTitle").textContent = "You short.";
      $("duckText").textContent = "Duck Sauce: “Come back when the points grow up.”";
      setTimeout(closeDuck, 1200);
      return;
    }

    addPoints(-20);

    if (Math.random() < 0.68) {
      $("duckTitle").textContent = "Duck vanished 😂";
      $("duckText").textContent = "Buck: “I told you. He ran the sauce play.”";
    } else {
      addPoints(45);
      $("duckTitle").textContent = "Duck paid back 😎";
      $("duckText").textContent = "Duck Sauce: “See? I take care of mine.”";
    }

    setTimeout(closeDuck, 1700);
  }

  function listenBuck() {
    addPoints(10);
    $("duckTitle").textContent = "Buck protected the bag 🛡️";
    $("duckText").textContent = "Buck: “Safe bonus. Don’t give Duck everything.” +10";
    setTimeout(closeDuck, 1450);
  }

  function rotateDuoLine() {
    const line = duoLines[Math.floor(Math.random() * duoLines.length)];
    if ($("duoLine")) $("duoLine").textContent = line;
  }

  function bind() {
    setPoints(getPoints());
    renderTracks();
    rotateDuoLine();
    setInterval(rotateDuoLine, 4200);

    const audio = $("audioPlayer");
    if (audio) {
      audio.addEventListener("play", () => {
        addPoints(1);
        maybeDuckOffer("music");
      });
    }

    if ($("spinBtn")) $("spinBtn").addEventListener("click", spinSlot);
    if ($("closeDuck")) $("closeDuck").addEventListener("click", closeDuck);
    if ($("trustDuck")) $("trustDuck").addEventListener("click", trustDuck);
    if ($("listenBuck")) $("listenBuck").addEventListener("click", listenBuck);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDuck();
    });
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
