const pad = document.getElementById("scanPad");
const statusText = document.getElementById("statusText");

const scanSound = document.getElementById("scanSound");
const grantedSound = document.getElementById("grantedSound");
const transportSound = document.getElementById("transportSound");

let active = false;

pad.addEventListener("click", () => {
  if (active) return;
  active = true;

  // Phase 1 → Start Scan
  document.body.classList.add("scanning");
  statusText.innerText = "SCANNING...";
  scanSound.play();

  // Phase 2 → Processing
  setTimeout(() => {
    statusText.innerText = "ACCESS CHECKING...";
  }, 1500);

  // Phase 3 → Granted
  setTimeout(() => {
    document.body.classList.add("flash");
    statusText.innerText = "ACCESS GRANTED";
    grantedSound.play();
  }, 3000);

  // Phase 4 → Transport
  setTimeout(() => {
    statusText.innerText = "TRANSPORTING...";
    transportSound.play();

    document.body.style.transform = "scale(1.3)";
    document.body.style.transition = "1s ease-in-out";

  }, 4000);

  // Redirect
  setTimeout(() => {
    window.location.href = "/vault.html";
  }, 5200);
});
