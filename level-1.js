(() => {
  "use strict";

  const POINTS_KEY = "coolPoints";

  const tracks = [
    {
      title: "KIKI",
      meta: "Cuz Zaid x JCrown x Ruzzo • Prod. Cuz Zaid",
      src: "kiki.mp3"
    },
    {
      title: "HAM",
      meta: "Hyph Life • Prod. Hyph Life",
      src: "ham.mp3"
    },
    {
      title: "ON GOD",
      meta: "BooGotGluu x No Flash",
      src: "on-god.mp3"
    },
    {
      title: "GOTTA GO REMIX",
      meta: "HYPHSWORLD Vault Drop",
      src: "gotta-go-remix.mp3"
    },
    {
      title: "MONEY IS THE ROOT",
      meta: "HYPHSWORLD Vault Drop",
      src: "money-is-the-root.mp3"
    }
  ];

  const symbols = [
    { name: "duck", img: "duck-sauce.jpg", points: 5 },
    { name: "buck", img: "buck-thebodyguard.jpg", points: 8 },
    { name: "kiki", img: "kiki.png", points: 6 },
    { name: "ham", img: "ham.jpg", points: 6 },
    { name: "gold-duck", img: "duck-sauce.jpg", points: 100 }
  ];

  const duckLines = [
    "Aye… lemme hold 20 points. I got a play.",
    "You just ran it up… share that.",
    "Trust me. I’m basically customer service.",
    "Don’t act broke now. I seen the slot hit.",
    "You played the song… now play me."
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

  function setResult(text) {
    if ($("slotResult")) $("slotResult").textContent = text;
  }

  function pickSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function renderTracks() {
    const wrap = $("trackButtons");
    if (!wrap) return;

    wrap.innerHTML = "";

    tracks.forEach((track, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-button";
      button.textContent = `${String(index + 1).padStart(2, "0")} ${track.title}`;
      button.addEventListener("click", () => loadTrack(index, true));
      wrap.appendChild(button);
    });

    updateActiveTrack(0);
  }

  function updateActiveTrack(index) {
    document.querySelectorAll(".track-button").forEach((button, i) => {
      button.classList.toggle("active", i === index);
    });
  }

  function loadTrack(index, shouldPlay) {
    const track = tracks[index];
    const audio = $("audioPlayer");
    const source = $("audioSource");

    if (!track || !audio || !source) return;

    $("trackNumber").textContent = `TRACK ${String(index + 1).padStart(2, "0")}`;
    $("trackTitle").textContent = track.title;
    $("trackMeta").textContent = track.meta;
    source.src = track.src;
    audio.load();

    updateActiveTrack(index);
    addPoints(2);

    if (shouldPlay) {
      audio.play().catch(() => {});
    }

    maybeShowDuckOffer("music");
  }

  function setReelImage(id, symbol) {
    const img = $(id);
    if (!img) return;

    img.src = symbol.img;
    img.alt = symbol.name;
  }

  function startReelAnimation() {
    document.querySelectorAll(".reel").forEach((reel) => reel.classList.add("spinning"));
  }

  function stopReelAnimation() {
    document.querySelectorAll(".reel").forEach((reel) => reel.classList.remove("spinning"));
  }

  function spinSlot() {
    const spinButton = $("spinButton");
    if (spinButton) spinButton.disabled = true;

    startReelAnimation();
    setResult("Duck Sauce: “Hold on… machine thinking.”");

    setTimeout(() => {
      const one = pickSymbol();
      const two = pickSymbol();
      const three = pickSymbol();

      setReelImage("reelOne", one);
      setReelImage("reelTwo", two);
      setReelImage("reelThree", three);

      stopReelAnimation();

      let win = 5;
      let line = "TRY AGAIN BONUS +5";

      if (one.name === two.name && two.name === three.name) {
        win = one.name === "gold-duck" ? 100 : 35;
        line = one.name === "gold-duck" ? "DUCK JACKPOT +100" : "THREE MATCH +35";
      } else if (one.name === two.name || two.name === three.name || one.name === three.name) {
        win = 15;
        line = "TWO MATCH +15";
      }

      addPoints(win);
      setResult(line);

      if (spinButton) spinButton.disabled = false;
      maybeShowDuckOffer("slot");
    }, 950);
  }

  function openScamModal(context) {
    const modal = $("duckScamModal");
    if (!modal) return;

    $("scamTitle").textContent = "Lemme hold 20 points.";
    $("scamText").textContent = duckLines[Math.floor(Math.random() * duckLines.length)];

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeScamModal() {
    const modal = $("duckScamModal");
    if (!modal) return;

    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");
  }

  function maybeShowDuckOffer(context) {
    if (getPoints() < 20) return;

    const chance = context === "slot" ? 0.82 : 0.48;
    if (Math.random() > chance) return;

    setTimeout(() => openScamModal(context), 650);
  }

  function trustDuck() {
    if (getPoints() < 20) {
      $("scamTitle").textContent = "You short.";
      $("scamText").textContent = "Duck Sauce: “Come back when the points grow up.”";
      setTimeout(closeScamModal, 1300);
      return;
    }

    addPoints(-20);

    if (Math.random() < 0.68) {
      $("scamTitle").textContent = "Duck vanished 😂";
      $("scamText").textContent = "Buck: “I told you. He ran the sauce play.”";
      try { localStorage.setItem("duckOwesUser", "true"); } catch (error) {}
    } else {
      addPoints(45);
      $("scamTitle").textContent = "Duck paid back 😎";
      $("scamText").textContent = "Duck Sauce: “See? I take care of mine.” +25 net.";
    }

    setTimeout(closeScamModal, 1800);
  }

  function listenToBuck() {
    addPoints(10);
    $("scamTitle").textContent = "Buck protected the bag 🛡️";
    $("scamText").textContent = "Buck: “Safe bonus. Don’t give Duck everything.” +10";
    setTimeout(closeScamModal, 1500);
  }

  function bindEvents() {
    renderTracks();
    setPoints(getPoints());

    const audio = $("audioPlayer");
    if (audio) {
      audio.addEventListener("play", () => {
        addPoints(1);
        maybeShowDuckOffer("music");
      });
    }

    if ($("spinButton")) $("spinButton").addEventListener("click", spinSlot);
    if ($("closeScam")) $("closeScam").addEventListener("click", closeScamModal);
    if ($("trustDuck")) $("trustDuck").addEventListener("click", trustDuck);
    if ($("listenBuck")) $("listenBuck").addEventListener("click", listenToBuck);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeScamModal();
    });
  }

  document.addEventListener("DOMContentLoaded", bindEvents);
})();
