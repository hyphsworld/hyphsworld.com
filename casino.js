/* HYPHSWORLD / AMS WEST — Hidden Casino: Blackjack, Duck Sauce Slots, Spin Wheel */

(function(){
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const slotSymbols = [
    { icon:"🦆", label:"DUCK", weight:16 },
    { icon:"💎", label:"ICE", weight:15 },
    { icon:"🔑", label:"KEY", weight:14 },
    { icon:"🦅", label:"FALCON", weight:12 },
    { icon:"🎧", label:"LOBBY", weight:18 },
    { icon:"🛡️", label:"BUCK", weight:10 }
  ];
  const wheelPrizes = [
    { label:"+25 Cool Points", points:25, message:"Wheel hit for +25. Duck said that was light work." },
    { label:"Duck Roast", points:0, message:"Duck Sauce: “You spun all that just to get roasted, P.”" },
    { label:"+100 Cool Points", points:100, message:"BIG WHEEL HIT! +100 Cool Points. Buck stamped it." },
    { label:"Vault Clue", points:15, message:"Vault clue: Falcon energy opens cold doors. +15 Cool Points." },
    { label:"Miss", points:-10, message:"Wheel missed. -10 Cool Points. Run it back clean." },
    { label:"+50 Cool Points", points:50, message:"Nice spin. +50 Cool Points. Casino lights came alive." }
  ];

  let deck = [];
  let dealer = [];
  let player = [];
  let inRound = false;
  let balance = Number(localStorage.getItem("hyphsworldCasinoBalance") || 500);
  let bet = Number(localStorage.getItem("hyphsworldCasinoBet") || 25);
  let streak = Number(localStorage.getItem("hyphsworldCasinoStreak") || 0);
  let wheelRotation = 0;

  const $ = (id) => document.getElementById(id);

  const dealerCards = $("dealerCards");
  const playerCards = $("playerCards");
  const dealerScore = $("dealerScore");
  const playerScore = $("playerScore");
  const message = $("message");
  const balanceEl = $("balance");
  const betEl = $("bet");
  const streakEl = $("streak");
  const announcer = $("casinoAnnouncer");
  const activeGameTitle = $("activeGameTitle");
  const activeGameSubtext = $("activeGameSubtext");

  const dealBtn = $("dealBtn");
  const hitBtn = $("hitBtn");
  const standBtn = $("standBtn");
  const resetBtn = $("resetBtn");
  const slotReels = $("slotReels");
  const slotsMessage = $("slotsMessage");
  const spinSlotsBtn = $("spinSlotsBtn");
  const vaultWheel = $("vaultWheel");
  const wheelMessage = $("wheelMessage");
  const spinWheelBtn = $("spinWheelBtn");

  const gameMeta = {
    blackjack: {
      title:"Blackjack Table",
      subtext:"Beat the dealer without going over 21.",
      line:"Duck Sauce: “Cards live. Don’t hit on 20 trying to be cinematic.”"
    },
    slots: {
      title:"Duck Sauce Slots",
      subtext:"Match symbols and chase the three-Duck jackpot.",
      line:"Duck Sauce: “Pull the machine, P. I put the pressure symbols in there myself.”"
    },
    wheel: {
      title:"Spin 4 Cool Points",
      subtext:"Spin for bonus points, clues, or comedy damage.",
      line:"BuckTheBodyguard: “One spin. One decision. Keep the line moving.”"
    }
  };

  document.querySelectorAll("[data-bet]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (inRound) return setBlackjackMessage("Finish this hand before changing the bet, P.");
      bet = Number(btn.dataset.bet);
      localStorage.setItem("hyphsworldCasinoBet", bet);
      renderStats();
      setAnnouncer(`Bet locked at ${bet} Cool Points.`);
      pulse(btn);
    });
  });

  document.querySelectorAll("[data-game]").forEach(btn => {
    btn.addEventListener("click", () => switchGame(btn.dataset.game));
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
    setBlackjackMessage("Casino Points reset. Fresh bankroll, P.");
    setAnnouncer("Buck reset the table. Duck already asking for another spin.");
  });

  spinSlotsBtn.addEventListener("click", spinSlots);
  spinWheelBtn.addEventListener("click", spinWheel);

  function switchGame(game){
    document.querySelectorAll("[data-game]").forEach(btn => {
      const active = btn.dataset.game === game;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    document.querySelectorAll("[data-game-view]").forEach(view => {
      view.classList.toggle("active", view.dataset.gameView === game);
    });

    activeGameTitle.textContent = gameMeta[game].title;
    activeGameSubtext.textContent = gameMeta[game].subtext;
    setAnnouncer(gameMeta[game].line);
  }

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
      setBlackjackMessage("Not enough Casino Points for that bet. Drop the bet or reset points.");
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
      setBlackjackMessage("Cards live. Hit or stand.");
      setAnnouncer("Duck Sauce: “I smell a clean hand… or a terrible decision.”");
    }
  }

  function hit(){
    if (!inRound) return;
    player.push(draw());
    renderHands(true);

    const score = handValue(player);
    if (score > 21) finish("bust");
    else if (score === 21) stand();
    else setBlackjackMessage("Duck Sauce: “You sure you want another one?”");
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
      setBlackjackMessage(`BLACKJACK! +${payout} Casino Points. Buck said that was clean.`);
    }

    if (result === "dealerBust") {
      balance += bet;
      streak += 1;
      setBlackjackMessage(`Dealer bust. +${bet} Casino Points. Duck yelling like he dealt the cards.`);
    }

    if (result === "win") {
      balance += bet;
      streak += 1;
      setBlackjackMessage(`You win. +${bet} Casino Points. Casino floor activated.`);
    }

    if (result === "lose" || result === "bust") {
      balance = Math.max(0, balance - bet);
      streak = 0;
      const line = result === "bust" ? "You bust." : "Dealer got you.";
      setBlackjackMessage(`${line} -${bet} Casino Points. Run it back.`);
    }

    if (result === "push") {
      setBlackjackMessage("Push. Nobody wins, nobody cries. Duck still talking though.");
    }

    saveStats();
  }

  function spinSlots(){
    if (balance < bet) {
      slotsMessage.textContent = "Not enough Casino Points for this spin. Lower the bet or reset at blackjack table.";
      return;
    }

    balance = Math.max(0, balance - bet);
    spinSlotsBtn.disabled = true;
    slotReels.classList.add("spinning");
    slotsMessage.textContent = "Reels spinning... Duck Sauce is yelling at the machine.";
    setAnnouncer("Duck Sauce: “Triple Duck or nothing, P!”");

    setTimeout(() => {
      const result = [pickSlotSymbol(), pickSlotSymbol(), pickSlotSymbol()];
      renderSlotResult(result);
      const payout = slotPayout(result);

      if (payout > 0) {
        balance += payout;
        streak += 1;
        slotsMessage.textContent = `Slots hit! +${payout} Casino Points.`;
        setAnnouncer(result.every(item => item.label === "DUCK") ? "JACKPOT! Three Ducks. Duck Sauce will never stop talking now." : "Buck stamped the slot hit. Keep it moving.");
      } else {
        streak = 0;
        slotsMessage.textContent = `No match. -${bet} Casino Points. Run it back.`;
        setAnnouncer("Duck Sauce: “That machine didn’t even blink. Spin again.”");
      }

      slotReels.classList.remove("spinning");
      spinSlotsBtn.disabled = false;
      saveStats();
    }, 850);
  }

  function spinWheel(){
    spinWheelBtn.disabled = true;
    const index = Math.floor(Math.random() * wheelPrizes.length);
    const prize = wheelPrizes[index];
    wheelRotation += 1080 + (index * 60) + Math.floor(Math.random() * 36);
    vaultWheel.style.transform = `rotate(${wheelRotation}deg)`;
    wheelMessage.textContent = "Wheel spinning... Vault lights charging up.";
    setAnnouncer("BuckTheBodyguard: “Let the wheel land before Duck starts lying.”");

    setTimeout(() => {
      balance = Math.max(0, balance + prize.points);
      if (prize.points > 0) streak += 1;
      if (prize.points < 0) streak = 0;
      wheelMessage.textContent = `${prize.label}: ${prize.message}`;
      setAnnouncer(prize.message);
      spinWheelBtn.disabled = false;
      saveStats();
    }, 1000);
  }

  function pickSlotSymbol(){
    const bag = [];
    slotSymbols.forEach(symbol => {
      for (let i = 0; i < symbol.weight; i++) bag.push(symbol);
    });
    return bag[Math.floor(Math.random() * bag.length)];
  }

  function renderSlotResult(result){
    slotReels.innerHTML = "";
    result.forEach(symbol => {
      const div = document.createElement("div");
      div.className = "slot-reel win-pop";
      div.innerHTML = `<span>${symbol.icon}</span><small>${symbol.label}</small>`;
      slotReels.appendChild(div);
    });
  }

  function slotPayout(result){
    const labels = result.map(item => item.label);
    const unique = new Set(labels);
    if (unique.size === 1 && labels[0] === "DUCK") return bet * 10;
    if (unique.size === 1) return bet * 5;
    if (labels.filter(label => label === "DUCK").length === 2) return bet * 3;
    if (unique.size === 2) return bet * 2;
    return 0;
  }

  function draw(){
    return deck.pop();
  }

  function cardValue(card){
    if (!card || card.rank === "0") return 0;
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
    dealerScore.textContent = hideDealer ? cardValue(dealer[0]) : handValue(dealer);
    playerScore.textContent = handValue(player);
  }

  function renderCards(container, hand, hideSecond){
    container.innerHTML = "";
    hand.forEach((card, index) => {
      const div = document.createElement("div");
      const red = ["♥", "♦"].includes(card.suit);
      div.className = `card ${red ? "red-card" : ""} deal-pop`;
      div.style.setProperty("--rot", `${(index % 2 === 0 ? -3 : 3)}deg`);

      if (hideSecond && index === 1) {
        div.className = "card back deal-pop";
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

  function setBlackjackMessage(text){
    message.textContent = text;
  }

  function setAnnouncer(text){
    announcer.textContent = text;
  }

  function renderStats(){
    balanceEl.textContent = balance;
    betEl.textContent = bet;
    streakEl.textContent = streak;
  }

  function saveStats(){
    localStorage.setItem("hyphsworldCasinoBalance", balance);
    localStorage.setItem("hyphsworldCasinoBet", bet);
    localStorage.setItem("hyphsworldCasinoStreak", streak);
    renderStats();
  }

  function pulse(el){
    el.classList.remove("win-pop");
    void el.offsetWidth;
    el.classList.add("win-pop");
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
