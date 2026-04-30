let points = localStorage.getItem("coolPoints") || 0;
document.getElementById("points").innerText = points;

const audio = document.getElementById("audioPlayer");

// 🎧 MUSIC TRIGGER
audio.addEventListener("play", () => {
  maybeDuck();
});

// 🎰 SLOT
document.getElementById("spinBtn").onclick = () => {

  let win = Math.random() > 0.7 ? 25 : 5;

  points = parseInt(points) + win;
  updatePoints();

  maybeDuck();
};

// 🦆 DUCK TRIGGER
function maybeDuck() {
  if (points < 20) return;

  setTimeout(() => {
    document.getElementById("duckPopup").classList.remove("hidden");

    const lines = [
      "Aye… lemme hold 20 points.",
      "You got motion… share that.",
      "Trust me… I got a play.",
      "Don’t act broke now."
    ];

    document.getElementById("duckText").innerText =
      lines[Math.floor(Math.random() * lines.length)];

  }, 1000);
}

// 😈 TRUST DUCK
function trustDuck() {

  points -= 20;

  if (Math.random() < 0.7) {
    document.getElementById("duckText").innerText =
      "…I’ll be back 😂";
  } else {
    points += 40;
    document.getElementById("duckText").innerText =
      "See? I got you 😎";
  }

  updatePoints();
  hideDuck();
}

// ❌ IGNORE
function ignoreDuck() {
  document.getElementById("duckText").innerText =
    "Yeah… I see how you move.";
  hideDuck();
}

// 🔁 HELPERS
function hideDuck() {
  setTimeout(() => {
    document.getElementById("duckPopup").classList.add("hidden");
  }, 1500);
}

function updatePoints() {
  localStorage.setItem("coolPoints", points);
  document.getElementById("points").innerText = points;
}
