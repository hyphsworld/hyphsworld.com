const tracks = [
  "01-the-way.mp3",
  "02-you-bad.mp3",
  "03-bout-you.mp3"
];

let current = 0;
const audio = document.getElementById("audio");

function load(){
  audio.src = tracks[current];
  document.getElementById("title").innerText = tracks[current];
}

function play(){
  audio.play();
}

function next(){
  current = (current + 1) % tracks.length;
  load();
  play();
}

function prev(){
  current = (current - 1 + tracks.length) % tracks.length;
  load();
  play();
}

function select(i){
  current = i;
  load();
  play();
}

load();const tracks = [
  { title: "THE WAY ft DejBae", meta: "prod by K.M.T.", file: "01-the-way.mp3" },
  { title: "YOU BAD ft DejBae", meta: "prod by Cuz Zaid", file: "02-you-bad.mp3" },
  { title: "BOUT YOU", meta: "prod by unknown", file: "03-bout-you.mp3" }
];
const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");
const trackButtons = Array.from(document.querySelectorAll(".track-item"));
let currentIndex = 0;
let isSeeking = false;
function formatTime(time){ if(!Number.isFinite(time)) return "0:00"; const mins=Math.floor(time/60); const secs=Math.floor(time%60); return `${mins}:${secs.toString().padStart(2,"0")}`; }
function loadTrack(index){
  currentIndex = index;
  const track = tracks[index];
  audio.src = track.file;
  trackTitle.textContent = track.title;
  trackMeta.textContent = track.meta;
  trackButtons.forEach((btn,i)=>btn.classList.toggle("active", i===index));
  progress.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
}
playBtn.addEventListener("click", ()=>{ if(audio.paused) audio.play(); else audio.pause(); });
prevBtn.addEventListener("click", ()=>{ const i = currentIndex===0 ? tracks.length-1 : currentIndex-1; loadTrack(i); audio.play(); });
nextBtn.addEventListener("click", ()=>{ const i = currentIndex===tracks.length-1 ? 0 : currentIndex+1; loadTrack(i); audio.play(); });
trackButtons.forEach(btn=>btn.addEventListener("click", ()=>{ loadTrack(Number(btn.dataset.index)); audio.play(); }));
audio.addEventListener("play", ()=>{ playBtn.textContent = "⏸"; });
audio.addEventListener("pause", ()=>{ playBtn.textContent = "▶"; });
audio.addEventListener("loadedmetadata", ()=>{ durationEl.textContent = formatTime(audio.duration); });
audio.addEventListener("timeupdate", ()=>{
  if(!isSeeking && Number.isFinite(audio.duration) && audio.duration > 0){ progress.value = (audio.currentTime / audio.duration) * 100; }
  currentTimeEl.textContent = formatTime(audio.currentTime);
});
progress.addEventListener("input", ()=>{ isSeeking = true; });
progress.addEventListener("change", ()=>{
  if(Number.isFinite(audio.duration) && audio.duration > 0){ audio.currentTime = (progress.value / 100) * audio.duration; }
  isSeeking = false;
});
audio.addEventListener("ended", ()=>{ const i = currentIndex===tracks.length-1 ? 0 : currentIndex+1; loadTrack(i); audio.play(); });
loadTrack(0);
