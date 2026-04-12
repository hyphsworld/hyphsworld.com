const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const current = document.getElementById("current");
const duration = document.getElementById("duration");

const title = document.getElementById("trackTitle");
const artist = document.getElementById("trackArtist");
const cover = document.getElementById("coverArt");

const queueEl = document.getElementById("queue");

const tracks = [
  {
    name: "WHAT’S HANNIN",
    artist: "Hyph Life ft 3D The Capo, Thali",
    file: "whats-hannin.mp3"
  },
  {
    name: "WITH ME",
    artist: "Hyph Life — prod KMT",
    file: "with-me.mp3"
  },
  {
    name: "BOUT YOU",
    artist: "Hyph Life",
    file: "bout-you.mp3"
  },
  {
    name: "NO TRACE",
    artist: "Hyph Life — prod Cuz Zaid",
    file: "no-trace.mp3"
  }
];

let index = 0;

function loadTrack(i) {
  const track = tracks[i];
  audio.src = track.file;
  title.textContent = track.name;
  artist.textContent = track.artist;
  cover.src = "album-art.jpg";

  highlight();
}

function playTrack() {
  audio.play();
}

function pauseTrack() {
  audio.pause();
}

playBtn.onclick = () => {
  if (audio.paused) {
    playTrack();
    playBtn.textContent = "⏸";
  } else {
    pauseTrack();
    playBtn.textContent = "▶";
  }
};

nextBtn.onclick = () => {
  index = (index + 1) % tracks.length;
  loadTrack(index);
  playTrack();
};

prevBtn.onclick = () => {
  index = (index - 1 + tracks.length) % tracks.length;
  loadTrack(index);
  playTrack();
};

audio.ontimeupdate = () => {
  progress.value = (audio.currentTime / audio.duration) * 100;
  current.textContent = format(audio.currentTime);
};

audio.onloadedmetadata = () => {
  duration.textContent = format(audio.duration);
};

progress.oninput = () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
};

volume.oninput = () => {
  audio.volume = volume.value;
};

function format(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function buildQueue() {
  tracks.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "track";
    div.innerHTML = `<strong>${t.name}</strong><br>${t.artist}`;
    div.onclick = () => {
      index = i;
      loadTrack(index);
      playTrack();
    };
    queueEl.appendChild(div);
  });
}

function highlight() {
  document.querySelectorAll(".track").forEach((el, i) => {
    el.classList.toggle("active", i === index);
  });
}

buildQueue();
loadTrack(index);