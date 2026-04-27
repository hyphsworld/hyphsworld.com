(() => {
  const tracks = [
    { title: "HAM", artist: "Hyph Life", src: "ham.mp3", cover: "album-art.jpg" },
    { title: "25/8", artist: "Young Tez", src: "25-8.mp3", cover: "25-8.jpg" },
    { title: "KIKI", artist: "Cuz Zaid x JCrown x Ruzzo", src: "kiki.mp3", cover: "album-art.jpg" },
    { title: "ON GOD", artist: "BooGotGluu x No Flash", src: "on-god.mp3", cover: "album-art.jpg" },
    { title: "DA VAULT FREESTYLE", artist: "Hyph Life", src: "da-vault-freestyle.mp3", cover: "album-art.jpg" },
    { title: "FREE HYPH", artist: "Hyph Life", src: "free-hyph.mp3", cover: "album-art.jpg" },
    { title: "BOUT THAT", artist: "Hyph Life", src: "bout-that.mp3", cover: "bout-that-art.jpg" },
    { title: "50 CENT SHIT", artist: "Hyph Life", src: "50-cent-shit.mp3", cover: "album-art.jpg" }
  ];

  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const playBtn = $("playBtn");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const shuffleBtn = $("shuffleBtn");
  const repeatBtn = $("repeatBtn");
  const seekBar = $("seekBar");
  const volumeBar = $("volumeBar");
  const title = $("songTitle");
  const artist = $("songArtist");
  const cover = $("coverArt");
  const currentTime = $("currentTime");
  const duration = $("duration");
  const playlist = $("playlist");
  const status = $("playerStatus");

  let index = 0;
  let shuffle = false;
  let repeat = false;
  let seeking = false;

  function fmt(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function trackEvent(name, data = {}) {
    if (typeof gtag === "function") gtag("event", name, data);
  }

  function renderQueue() {
    playlist.innerHTML = "";
    tracks.forEach((track, i) => {
      const row = document.createElement("button");
      row.className = "track" + (i === index ? " active" : "");
      row.type = "button";
      row.innerHTML = `<img src="${track.cover}" alt="" onerror="this.src='album-art.jpg'"><span><strong>${track.title}</strong><em>${track.artist}</em></span><small>${i === index ? "NOW" : "PLAY"}</small>`;
      row.addEventListener("click", () => {
        loadTrack(i, true);
      });
      playlist.appendChild(row);
    });
  }

  function loadTrack(i, shouldPlay = false) {
    index = (i + tracks.length) % tracks.length;
    const track = tracks[index];
    title.textContent = track.title;
    artist.textContent = track.artist;
    cover.src = track.cover;
    audio.src = track.src;
    status.textContent = `Loaded: ${track.title}`;
    renderQueue();
    trackEvent("player_load_track", { track_title: track.title });
    if (shouldPlay) play();
  }

  async function play() {
    try {
      await audio.play();
      playBtn.textContent = "❚❚";
      status.textContent = `Playing: ${tracks[index].title}`;
      trackEvent("player_play", { track_title: tracks[index].title });
    } catch (err) {
      status.textContent = "Audio file missing or browser blocked playback. Check the MP3 filename in the repo.";
      console.warn(err);
    }
  }

  function pause() {
    audio.pause();
    playBtn.textContent = "▶";
    status.textContent = "Paused.";
  }

  function next() {
    if (shuffle) {
      let nextIndex = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1 && nextIndex === index) nextIndex = (nextIndex + 1) % tracks.length;
      loadTrack(nextIndex, true);
    } else {
      loadTrack(index + 1, true);
    }
  }

  playBtn.addEventListener("click", () => audio.paused ? play() : pause());
  prevBtn.addEventListener("click", () => loadTrack(index - 1, true));
  nextBtn.addEventListener("click", next);
  shuffleBtn.addEventListener("click", () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle("active", shuffle);
  });
  repeatBtn.addEventListener("click", () => {
    repeat = !repeat;
    repeatBtn.classList.toggle("active", repeat);
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (!seeking && Number.isFinite(audio.duration)) {
      seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
    }
    currentTime.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("ended", () => repeat ? loadTrack(index, true) : next());

  seekBar.addEventListener("input", () => seeking = true);
  seekBar.addEventListener("change", () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
    seeking = false;
  });
  volumeBar.addEventListener("input", () => {
    audio.volume = Number(volumeBar.value);
  });

  audio.volume = Number(volumeBar.value);
  loadTrack(0, false);
})();
