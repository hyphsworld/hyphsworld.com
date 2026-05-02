/* HYPHSWORLD / AMS WEST — Live Blackjack */

(function(){
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  let deck = [];
  let dealer = [];
  let player = [];
  let inRound = false;
  let balance = Number(localStorage.getItem("hyphsworldCasinoBalance") || 500);
  let bet = Number(localStorage.getItem("hyphsworldCasinoBet") || 25);
  let streak = Number(localStorage.getItem("hyphsworldCasinoStreak") || 0);

  const $ = (id) => document.getElementById(id);

  const dealerCards = $("dealerCards");
  const playerCards = $("playerCards");
  const dealerScore = $("dealerScore");
  const playerScore = $("playerScore");
  const message = $("message");
  const balanceEl = $("balance");
  const betEl = $("bet");
  const streakEl = $("streak");

  const dealBtn = $("dealBtn");
  const hitBtn = $("hitBtn");
  const standBtn = $("standBtn");
  const resetBtn = $("resetBtn");

  document.querySelectorAll("[data-bet]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (inRound) return setMessage("Finish this hand before changing the bet, P.");
      bet = Number(btn.dataset.bet);
      localStorage.setItem("hyphsworldCasinoBet", bet);
      renderStats();
      setMessage(`Bet locked at ${bet} Cool Points.`);
    });
  });

  dealBtn.addEventListener("click", deal);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  resetBtn.addEventListener("click", () => {
    balance = 500;
    streak = 0;
    localStorage.setItem("hyphsworldCasinoBalance", balance);
    localStorage.setItem("hyphsworldCasinoStreak", streak);
    renderStats();
    setMessage("Cool Points reset. Fresh bankroll, P.");
  });

  function buildDeck(){
    deck = [];
    suits.forEach(suit => ranks.forEach(rank => deck.push({rank, suit})));
    for(let i = deck.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function deal(){
    if (balance < bet) {
      setMessage("Not enough Cool Points for that bet. Drop the bet or reset points.");
      return;
    }

    buildDeck();
    dealer = [draw(), draw()];
    player = [draw(), draw()];
    inRound = true;

    setControls(true);
    renderHands(true);

    if (handValue(player) === 21) {
      finish("blackjack");
    } else {
      setMessage("Cards live. Hit or stand.");
    }
  }

  function hit(){
    if (!inRound) return;
    player.push(draw());
    renderHands(true);

    const score = handValue(player);
    if (score > 21) finish("bust");
    else if (score === 21) stand();
    else setMessage("Duck Sauce: “You sure you want another one?”");
  }

  function stand(){
    if (!inRound) return;

    while(handValue(dealer) < 17){
      dealer.push(draw());
    }

    const p = handValue(player);
    const d = handValue(dealer);

    if (d > 21) finish("dealerBust");
    else if (p > d) finish("win");
    else if (p < d) finish("lose");
    else finish("push");
  }

  function finish(result){
    inRound = false;
    setControls(false);
    renderHands(false);

    if (result === "blackjack") {
      const payout = Math.floor(bet * 1.5);
      balance += payout;
      streak += 1;
      setMessage(`BLACKJACK! +${payout} Cool Points. Buck said that was clean.`);
    }

    if (result === "dealerBust") {
      balance += bet;
      streak += 1;
      setMessage(`Dealer bust. +${bet} Cool Points. Duck yelling like he dealt the cards.`);
    }

    if (result === "win") {
      balance += bet;
      streak += 1;
      setMessage(`You win. +${bet} Cool Points. Casino floor activated.`);
    }

    if (result === "lose" || result === "bust") {
      balance -= bet;
      streak = 0;
      const line = result === "bust" ? "You bust." : "Dealer got you.";
      setMessage(`${line} -${bet} Cool Points. Run it back.`);
    }

    if (result === "push") {
      setMessage("Push. Nobody wins, nobody cries. Duck still talking though.");
    }

    localStorage.setItem("hyphsworldCasinoBalance", balance);
    localStorage.setItem("hyphsworldCasinoStreak", streak);
    renderStats();
  }

  function draw(){
    return deck.pop();
  }

  function cardValue(card){
    if (card.rank === "A") return 11;
    if (["K","Q","J"].includes(card.rank)) return 10;
    return Number(card.rank);
  }

  function handValue(hand){
    let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
    let aces = hand.filter(card => card.rank === "A").length;

    while(total > 21 && aces > 0){
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function renderHands(hideDealer){
    renderCards(dealerCards, dealer, hideDealer);
    renderCards(playerCards, player, false);
    dealerScore.textContent = hideDealer ? cardValue(dealer[0] || {rank:"0"}) : handValue(dealer);
    playerScore.textContent = handValue(player);
  }

  function renderCards(container, hand, hideSecond){
    container.innerHTML = "";
    hand.forEach((card, index) => {
      const div = document.createElement("div");
      const red = ["♥", "♦"].includes(card.suit);
      div.className = `card ${red ? "red-card" : ""}`;
      div.style.setProperty("--rot", `${(index % 2 === 0 ? -3 : 3)}deg`);

      if (hideSecond && index === 1) {
        div.className = "card back";
        div.textContent = "H";
      } else {
        div.innerHTML = `<strong>${card.rank}</strong><span>${card.suit}</span>`;
      }

      container.appendChild(div);
    });
  }

  function setControls(active){
    dealBtn.disabled = active;
    hitBtn.disabled = !active;
    standBtn.disabled = !active;
  }

  function setMessage(text){
    message.textContent = text;
  }

  function renderStats(){
    balanceEl.textContent = balance;
    betEl.textContent = bet;
    streakEl.textContent = streak;
  }

  function bootEmptyTable(){
    dealerCards.innerHTML = '<div class="card back">H</div><div class="card back">W</div>';
    playerCards.innerHTML = '<div class="card back">A</div><div class="card back">M</div>';
    dealerScore.textContent = 0;
    playerScore.textContent = 0;
  }

  renderStats();
  bootEmptyTable();
})();
