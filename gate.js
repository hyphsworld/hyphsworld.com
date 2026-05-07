const pad = document.getElementById("scanPad");
const statusText = document.getElementById("statusText");

const scanSound = document.getElementById("scanSound");
const grantedSound = document.getElementById("grantedSound");
const transportSound = document.getElementById("transportSound");

let active = false;

const statusMessages = {
  idle: "AWAITING INPUT",
  scan: "SCANNING USER PROFILE...",
  checking: "VERIFYING COOL POINTS...",
  granted: "ACCESS GRANTED",
  transport: "ENTERING HYPHSWORLD..."
};

pad.addEventListener("click", () => {
  if (active) return;

  active = true;

  document.body.classList.add("scanning");
  pad.style.boxShadow = `
    inset 0 0 30px rgba(255,255,255,0.12),
    0 0 45px rgba(0,255,136,0.4),
    0 0 85px rgba(255,0,85,0.3)
  `;

  statusText.innerText = statusMessages.scan;

  if (scanSound) {
    scanSound.currentTime = 0;
    scanSound.play();
  }

  setTimeout(() => {
    statusText.innerText = statusMessages.checking;
    statusText.style.color = "#00cfff";
  }, 1600);

  setTimeout(() => {
    document.body.classList.add("flash");

    statusText.innerText = statusMessages.granted;
    statusText.style.color = "#00ff88";

    if (grantedSound) {
      grantedSound.currentTime = 0;
      grantedSound.play();
    }

    pad.style.transform = "scale(1.06) rotate(1deg)";
  }, 3200);

  setTimeout(() => {
    statusText.innerText = statusMessages.transport;
    statusText.style.color = "#ff7eb3";

    if (transportSound) {
      transportSound.currentTime = 0;
      transportSound.play();
    }

    document.body.style.transition = "transform 1.2s ease, filter 1.2s ease";
    document.body.style.transform = "scale(1.12)";
    document.body.style.filter = "saturate(1.4) brightness(1.15)";
  }, 4500);

  setTimeout(() => {
    window.location.href = "/vault.html";
  }, 6200);
});
