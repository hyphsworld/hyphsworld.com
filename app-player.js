const tracks = [
  {
    title: "HAM",
    slug: "ham",
    artist: "Hyph Life — prod by 1ManBand",
    src: "ham.mp3",
    cover: "album-art.jpg"
  },
  {
    title: "KIKI",
    slug: "kiki",
    artist: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
    src: "kiki.mp3",
    cover: "album-art.jpg"
  },
  {
    title: "ON GOD",
    slug: "on-god",
    artist: "BooGotGluu x No Flash",
    src: "on-god.mp3",
    cover: "album-art.jpg"
  },
  {
    title: "TIME",
    slug: "time",
    artist: "SIXX FIGGAZ x Hyph Life",
    src: "time.mp3",
    cover: "album-art.jpg"
  },
  {
    title: "25/8",
    slug: "25-8",
    artist: "Young Tez — prod by Marty McPhresh",
    src: "25-8.mp3",
    cover: "25-8.jpg"
  }
];

const audio = document.getElementById("audio");
const title = document.getElementById("songTitle");
const artist = document.getElementById("songArtist");
const cover = document.getElementById("coverArt");
const play = document.getElementById("playBtn");
const prev = document.getElementById("prevBtn");
const next = document.getElementById("nextBtn");
const seek = document.getElementById("seekBar");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const list = document.getElementById("playlist");
const quickTracks = document.getElementById("quickTracks");
const coolPoints = document.getElementById("coolPoints");

let i = 0;
let playing = false;
let points = Number(localStorage.getItem("hyphsworld_cool_points") || 203);

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function savePoints(add = 0) {
  points += add;
  localStorage.setItem("hyphsworld_cool_points", points);
  if (coolPoints) coolPoints.textContent = points;
}

function getInitialTrackIndex() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("track") || "").trim().toLowerCase();
  if (!requested) return 0;

  const found = tracks.findIndex((track) => {
    return (
      track.slug.toLowerCase() === requested ||
      track.title.toLowerCase().replace("/", "-") === requested ||
      track.title.toLowerCase() === requested
    );
  });

  return found >= 0 ? found : 0;
}

function load(index, autoplay = false) {
  i = (index + tracks.length) % tracks.length;
  const t = tracks[i];

  if (title) title.textContent = t.title;
  if (artist) artist.textContent = t.artist;
  if (cover) {
    cover.src = t.cover;
    cover.onerror = () => { cover.src = "album-art.jpg"; };
  }

  audio.src = t.src;

  document.querySelectorAll("[data-index]").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.index) === i);
  });

  const url = new URL(window.location.href);
  url.searchParams.set("track", t.slug);
  window.history.replaceState({}, "", url);

  if (autoplay) {
    audio.play().catch(() => {});
    playing = true;
    if (play) play.textContent = "⏸";
    savePoints(1);
  } else if (play) {
    play.textContent = playing ? "⏸" : "▶";
  }
}

function togglePlay() {
  if (!audio.src) load(i);
  if (playing) {
    audio.pause();
    if (play) play.textContent = "▶";
  } else {
    audio.play().catch(() => {});
    if (play) play.textContent = "⏸";
    savePoints(1);
  }
  playing = !playing;
}

function render() {
  if (list) list.innerHTML = "";
  if (quickTracks) quickTracks.innerHTML = "";

  tracks.forEach((t, index) => {
    if (list) {
      const row = document.createElement("article");
      row.className = "queue-row";
      row.dataset.index = index;
      row.innerHTML = `
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${t.title}</strong>
          <small>${t.artist}</small>
        </div>
        <button type="button">Play</button>
      `;
      row.querySelector("button").addEventListener("click", () => load(index, true));
      list.appendChild(row);
    }

    if (quickTracks) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.dataset.index = index;
      pill.textContent = t.title;
      pill.addEventListener("click", () => load(index, true));
      quickTracks.appendChild(pill);
    }
  });
}

if (play) play.addEventListener("click", togglePlay);
if (prev) prev.addEventListener("click", () => load(i - 1, true));
if (next) next.addEventListener("click", () => load(i + 1, true));

audio.addEventListener("loadedmetadata", () => {
  if (duration) duration.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
  if (audio.duration && seek) seek.value = (audio.currentTime / audio.duration) * 100;
});

if (seek) {
  seek.addEventListener("input", () => {
    if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
  });
}

audio.addEventListener("ended", () => load(i + 1, true));

render();
savePoints(0);
load(getInitialTrackIndex(), false);
