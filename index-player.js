/*
  HYPHSWORLD player logic
  Replace the placeholder src values below with your actual MP3 file paths when ready.
  Example:
  src: "audio/young-tez-25-8.mp3"
*/

const HYPHSWORLD_TRACKS = [
  {
    title: "25/8",
    artist: "Young Tez",
    producer: "Prod. Marty McPhresh",
    src: "audio/young-tez-25-8.mp3"
  },
  {
    title: "HAM",
    artist: "Hyph Life",
    producer: "Prod. Hyph Life",
    src: "audio/hyph-life-ham.mp3"
  },
  {
    title: "ON GOD",
    artist: "BooGotGluu x No Flash",
    producer: "AMS WEST Spotlight",
    src: "audio/on-god.mp3"
  },
  {
    title: "KIKI",
    artist: "Cuz Zaid x JCrown x Ruzzo",
    producer: "Prod. Cuz Zaid",
    src: "audio/kiki.mp3"
  }
];

function setPlayerTrack(index, playerType) {
  const track = HYPHSWORLD_TRACKS[index];

  if (!track) {
    console.warn("Track not found:", index);
    return;
  }

  const isFull = playerType === "full";
  const audio = document.getElementById(isFull ? "fullAudio" : "homeAudio");
  const source = document.getElementById(isFull ? "fullAudioSource" : "homeAudioSource");
  const title = document.getElementById(isFull ? "fullNowTitle" : "homeNowTitle");
  const meta = document.getElementById(isFull ? "fullNowMeta" : "homeNowMeta");

  if (!audio || !source || !title || !meta) return;

  title.textContent = track.title;
  meta.textContent = `${track.artist} · ${track.producer}`;
  source.src = track.src;

  audio.load();

  const playAttempt = audio.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      meta.textContent = `${track.artist} · ${track.producer} · Tap play to start`;
    });
  }

  if (window.gtag) {
    window.gtag("event", "track_select", {
      track_title: track.title,
      track_artist: track.artist,
      player_type: playerType
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".track-card").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.track);
      setPlayerTrack(index, "home");
    });
  });

  document.querySelectorAll(".full-track").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.track);
      setPlayerTrack(index, "full");
    });
  });
});
