document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "WHAT’S HANNIN",
      meta: "Hyph Life ft 3D The Capo, Thali — prod by Cuz Zaid",
      file: "whats-hannin.mp3"
    },
    {
      title: "WITH ME",
      meta: "Hyph Life — prod K.M.T.",
      file: "with-me.mp3"
    },
    {
      title: "BOUT YOU",
      meta: "Hyph Life",
      file: "bout-you.mp3"
    },
    {
      title: "NO TRACE SNIP",
      meta: "Hyph Life — prod by Cuz Zaid",
      file: "no-trace-snip.mp3"
    }
  ];

  const audio = document.getElementById("main-audio");
  const progress = document.getElementById("homeProgress");
  const currentTimeEl = document.getElementById("homeCurrentTime");
  const durationEl = document.getElementById("homeDuration");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stickyPlayBtn = document.getElementById("stickyPlayBtn");
  const sticky