const pointsDisplay = document.getElementById("pointsDisplay");
const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");
const dealerScoreEl = document.getElementById("dealerScore");
const playerScoreEl = document.getElementById("playerScore");
const roundMessage = document.getElementById("roundMessage");
const dealButton = document.getElementById("dealButton");
const hitButton = document.getElementById("hitButton");
const standButton = document.getElementById("standButton");
const bonusSpinButton = document.getElementById("bonusSpinButton");
const miniReels = [
  document.getElementById("miniReel1"),
  document.getElementById("miniReel2"),
  document.getElementById("miniReel3")
];
const bonusMessage = document.getElementById("bonusMessage");

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SLOT_ICONS = ["💨", "🎰", "💎", "01", "AMS", "💰", "7"];

let deck = [];
let dealerHand = [];
let playerHand = [];
let roundOver = true;

function getPoints() {
  return Number(localStorage.getItem("hyphsworld_cool_points") || 0);
}
function setPoints(value) {
  localStorage.setItem("hyphsworld_cool_points", String(value));
  if (pointsDisplay) pointsDisplay.textContent = value;
}
setPoints(getPoints());

function buildDeck() {
  deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  deck.sort(() => Math.random() - 0.5);
}
function drawCard() {
  return deck.pop();
}
function cardValue(card) {
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  if (card.rank === "A") return 11;
  return Number(card.rank);
}
function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}
function renderCards(target, hand) {
  target.innerHTML = "";
  hand.forEach((card) => {
    const div = document.createElement("div");
    const isRed = card.suit === "♥" || card.suit === "♦";
    div.className = "playing-card" + (isRed ? " red" : "");
    div.innerHTML = `<div class="value">${card.rank}</div><div class="suit">${card.suit}</div>`;
    target.appendChild(div);
  });
}
function updateBoard() {
  renderCards(dealerCardsEl, dealerHand);
  renderCards(playerCardsEl, playerHand);
  dealerScoreEl.textContent = String(handValue(dealerHand));
  playerScoreEl.textContent = String(handValue(playerHand));
}
function startRound() {
  buildDeck();
  dealerHand = [drawCard(), drawCard()];
  playerHand = [drawCard(), drawCard()];
  roundOver = false;
  updateBoard();
  roundMessage.textContent = "Round live. Hit or stand.";
  if (handValue(playerHand) === 21) {
    finishRound();
  }
}
function finishRound() {
  if (roundOver) return;
  while (handValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }
  roundOver = true;
  updateBoard();

  const player = handValue(playerHand);
  const dealer = handValue(dealerHand);
  let message = "";
  let award = 0;

  if (player > 21) {
    message = "You busted. Dealer takes it.";
    award = 1;
  } else if (dealer > 21) {
    message = "Dealer busted. You win.";
    award = 20;
  } else if (player > dealer) {
    message = "You win the hand.";
    award = 20;
  } else if (player === dealer) {
    message = "Push. Nobody wins.";
    award = 5;
  } else {
    message = "Dealer wins.";
    award = 1;
  }

  setPoints(getPoints() + award);
  roundMessage.textContent = `${message} +${award} Cool Points.`;
}
function hit() {
  if (roundOver) return;
  playerHand.push(drawCard());
  updateBoard();
  if (handValue(playerHand) > 21) {
    finishRound();
  }
}
function stand() {
  finishRound();
}

function randIcon() {
  return SLOT_ICONS[Math.floor(Math.random() * SLOT_ICONS.length)];
}
function bonusSpin() {
  bonusSpinButton.disabled = true;
  bonusMessage.textContent = "Bonus spin rolling...";
  let ticks = 0;
  const interval = setInterval(() => {
    miniReels.forEach((reel) => reel.textContent = randIcon());
    ticks += 1;
    if (ticks > 10) {
      clearInterval(interval);
      const finalIcons = [randIcon(), randIcon(), randIcon()];
      miniReels.forEach((reel, i) => reel.textContent = finalIcons[i]);

      const counts = {};
      finalIcons.forEach((icon) => counts[icon] = (counts[icon] || 0) + 1);
      const maxMatch = Math.max(...Object.values(counts));
      let award = 0;

      if (maxMatch === 3) {
        award = 25;
        bonusMessage.textContent = "Bonus jackpot. +25 Cool Points.";
      } else if (maxMatch === 2) {
        award = 8;
        bonusMessage.textContent = "Bonus match. +8 Cool Points.";
      } else {
        award = 1;
        bonusMessage.textContent = "No bonus match. +1 pity point.";
      }
      setPoints(getPoints() + award);
      bonusSpinButton.disabled = false;
    }
  }, 120);
}

dealButton.addEventListener("click", startRound);
hitButton.addEventListener("click", hit);
standButton.addEventListener("click", stand);
bonusSpinButton.addEventListener("click", bonusSpin);

startRound();
