(function () {
  "use strict";

  const canvas = document.getElementById("bowlingLane");
  const context = canvas.getContext("2d");
  const angleControl = document.getElementById("angleControl");
  const rollButton = document.getElementById("rollButton");
  const newGameButton = document.getElementById("newGameButton");
  const callout = document.getElementById("resultCallout");
  const frameValue = document.getElementById("frameValue");
  const ballValue = document.getElementById("ballValue");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const pins = [];
  let frame = 1;
  let ball = 1;
  let score = 0;
  let rolls = [];
  let frameRolls = [];
  let power = 0;
  let chargeStart = 0;
  let chargeAnimation = 0;
  let rolling = false;
  let best = Number(localStorage.getItem("ss-bowling-best") || 0);

  function resetPins() {
    pins.length = 0;
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column <= row; column += 1) {
        pins.push({ x: 360 + (column - row / 2) * 54, y: 125 + row * 45, standing: true });
      }
    }
  }

  function drawLane(ballState) {
    const gradient = context.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "#58316f"); gradient.addColorStop(.35, "#d9a866"); gradient.addColorStop(1, "#f8d28e");
    context.fillStyle = "#13091f"; context.fillRect(0, 0, 720, 720);
    context.beginPath(); context.moveTo(195, 0); context.lineTo(525, 0); context.lineTo(660, 720); context.lineTo(60, 720); context.closePath(); context.fillStyle = gradient; context.fill();
    context.strokeStyle = "rgba(255,255,255,.16)"; context.lineWidth = 3;
    for (let stripe = 0; stripe < 8; stripe += 1) { const x = 120 + stripe * 68; context.beginPath(); context.moveTo(260 + stripe * 28, 0); context.lineTo(x, 720); context.stroke(); }
    pins.forEach(function (pin) {
      if (!pin.standing) return;
      context.save(); context.translate(pin.x, pin.y); context.fillStyle = "#fff"; context.beginPath(); context.ellipse(0, 0, 13, 24, 0, 0, Math.PI * 2); context.fill(); context.fillStyle = "#ff2c6f"; context.fillRect(-11, -7, 22, 5); context.restore();
    });
    const ballX = ballState ? ballState.x : 360;
    const ballY = ballState ? ballState.y : 650;
    context.fillStyle = "#101018"; context.shadowColor = "#ff2c9c"; context.shadowBlur = 22; context.beginPath(); context.arc(ballX, ballY, 25, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    context.fillStyle = "#ff2c9c"; context.beginPath(); context.arc(ballX - 7, ballY - 7, 3, 0, Math.PI * 2); context.arc(ballX + 4, ballY - 10, 3, 0, Math.PI * 2); context.fill();
  }

  function updateScoreboard() { frameValue.textContent = String(frame); ballValue.textContent = String(ball); scoreValue.textContent = String(score); bestValue.textContent = String(best); }
  function showResult(text) { callout.textContent = text; callout.classList.add("show"); window.setTimeout(function () { callout.classList.remove("show"); }, 1500); }

  function calculateScore(recordedRolls) {
    let total = 0;
    let rollIndex = 0;
    for (let scoredFrame = 1; scoredFrame <= 10 && rollIndex < recordedRolls.length; scoredFrame += 1) {
      const firstRoll = recordedRolls[rollIndex];
      if (scoredFrame === 10) {
        return total + recordedRolls.slice(rollIndex, rollIndex + 3).reduce(function (sum, pinsDown) { return sum + pinsDown; }, 0);
      }
      if (firstRoll === 10) {
        total += 10 + (recordedRolls[rollIndex + 1] || 0) + (recordedRolls[rollIndex + 2] || 0);
        rollIndex += 1;
      } else if (rollIndex + 1 < recordedRolls.length) {
        const secondRoll = recordedRolls[rollIndex + 1];
        total += firstRoll + secondRoll;
        if (firstRoll + secondRoll === 10) total += recordedRolls[rollIndex + 2] || 0;
        rollIndex += 2;
      } else {
        total += firstRoll;
        rollIndex += 1;
      }
    }
    return total;
  }

  function finishGame() {
    best = Math.max(best, score);
    localStorage.setItem("ss-bowling-best", String(best));
    showResult("Game: " + score);
    rollButton.disabled = true;
  }

  function finishRoll(shotX, shotPower) {
    let knocked = 0;
    pins.forEach(function (pin) {
      const spread = 30 + shotPower * .55;
      const lucky = Math.random() * 34;
      if (pin.standing && Math.abs(pin.x - shotX) < spread + lucky) { pin.standing = false; knocked += 1; }
    });
    const cleared = !pins.some(function (pin) { return pin.standing; });
    rolls.push(knocked);
    frameRolls.push(knocked);
    score = calculateScore(rolls);
    if (knocked === 10) showResult("Strike!");
    else if (cleared) showResult("Spare!");
    else showResult(knocked + (knocked === 1 ? " pin" : " pins"));
    if (frame < 10) {
      if (knocked === 10 || ball === 2) { frame += 1; ball = 1; frameRolls = []; resetPins(); } else { ball = 2; }
    } else if (frameRolls.length === 1) {
      if (knocked === 10) resetPins();
      ball = 2;
    } else if (frameRolls.length === 2) {
      if (frameRolls[0] === 10) {
        if (knocked === 10) resetPins();
        ball = 3;
      } else if (cleared) {
        resetPins();
        ball = 3;
      } else finishGame();
    } else finishGame();
    rolling = false; updateScoreboard(); drawLane();
  }

  function roll() {
    if (rolling || rollButton.disabled) return;
    rolling = true;
    const angle = Number(angleControl.value);
    const targetX = 360 + angle * 5;
    const started = performance.now();
    function animate(now) {
      const progress = Math.min(1, (now - started) / (920 - power * 4));
      const eased = 1 - Math.pow(1 - progress, 2);
      drawLane({ x: 360 + (targetX - 360) * eased, y: 650 - 520 * eased });
      if (progress < 1) requestAnimationFrame(animate); else finishRoll(targetX, power);
    }
    requestAnimationFrame(animate);
  }

  function startCharge(event) {
    if (rolling || rollButton.disabled || chargeStart) return;
    if (event) event.preventDefault();
    chargeStart = performance.now(); rollButton.classList.add("charging");
    function charge(now) { power = Math.min(100, (now - chargeStart) / 10); rollButton.textContent = "Power " + Math.round(power) + "%"; if (chargeStart) chargeAnimation = requestAnimationFrame(charge); }
    chargeAnimation = requestAnimationFrame(charge);
  }
  function releaseCharge(event) { if (!chargeStart) return; if (event) event.preventDefault(); chargeStart = 0; cancelAnimationFrame(chargeAnimation); rollButton.classList.remove("charging"); rollButton.textContent = "Hold to charge"; roll(); }
  function newGame() { frame = 1; ball = 1; score = 0; rolls = []; frameRolls = []; power = 0; rolling = false; rollButton.disabled = false; resetPins(); updateScoreboard(); drawLane(); showResult("Fresh game"); }

  rollButton.addEventListener("pointerdown", startCharge); window.addEventListener("pointerup", releaseCharge);
  window.addEventListener("keydown", function (event) { if (event.code === "ArrowLeft") angleControl.value = String(Math.max(-36, Number(angleControl.value) - 3)); if (event.code === "ArrowRight") angleControl.value = String(Math.min(36, Number(angleControl.value) + 3)); if (event.code === "Space" && !event.repeat) startCharge(event); });
  window.addEventListener("keyup", function (event) { if (event.code === "Space") releaseCharge(event); });
  newGameButton.addEventListener("click", newGame); document.getElementById("year").textContent = String(new Date().getFullYear());
  resetPins(); updateScoreboard(); drawLane();
}());
