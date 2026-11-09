/* Play-chip practice rules. No wallets, payments, or Cool Points are changed here. */
(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  else root.HWTableRules = rules;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const clone = (state) => JSON.parse(JSON.stringify(state));
  const value = (card) => card.rank === 1 ? 14 : card.rank;
  function deck(random = Math.random) {
    const cards = [];
    for (const suit of ["♠", "♥", "♦", "♣"]) for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  const names = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];
  function five(cards) {
    const ranks = cards.map(value).sort((a,b) => b-a), counts = new Map();
    ranks.forEach(rank => counts.set(rank, (counts.get(rank) || 0) + 1));
    const groups = [...counts].sort((a,b) => b[1]-a[1] || b[0]-a[0]);
    const flush = cards.every(card => card.suit === cards[0].suit);
    const unique = [...new Set(ranks)];
    const straight = unique.length === 5 && (ranks[0]-ranks[4] === 4 ? ranks[0] : ranks.join() === "14,5,4,3,2" ? 5 : 0);
    if (flush && straight) return [8, straight];
    if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
    if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
    if (flush) return [5, ...ranks];
    if (straight) return [4, straight];
    if (groups[0][1] === 3) return [3, ...groups.map(g => g[0])];
    if (groups[0][1] === 2 && groups[1][1] === 2) return [2, ...groups.map(g => g[0])];
    if (groups[0][1] === 2) return [1, ...groups.map(g => g[0])];
    return [0, ...ranks];
  }
  function compare(a,b) {
    for (let i = 0; i < Math.max(a.length,b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0) ? 1 : -1;
    return 0;
  }
  function best(cards) {
    let result = [-1];
    for (let a=0;a<cards.length-4;a++) for(let b=a+1;b<cards.length-3;b++) for(let c=b+1;c<cards.length-2;c++) for(let d=c+1;d<cards.length-1;d++) for(let e=d+1;e<cards.length;e++) {
      const score=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);
      if(compare(score,result)>0) result=score;
    }
    return result;
  }
  function finishPoker(s, folded) {
    let result;
    if (folded) { result=-1; s.message="You folded. CPU wins the practice pot."; }
    else {
      const you=best(s.hand.concat(s.community)), cpu=best(s.cpu.concat(s.community));
      result=compare(you,cpu); s.message=`${result>0 ? "You win" : result<0 ? "CPU wins" : "Split pot"}. You: ${names[you[0]]}; CPU: ${names[cpu[0]]}.`;
    }
    if(result===0){s.stack+=s.pot/2;s.cpuStack+=s.pot/2;}
    else if(result>0)s.stack+=s.pot;
    else s.cpuStack+=s.pot;
    s.result=result>0 ? "win" : result<0 ? "loss" : "push"; s.settledPot=s.pot; s.pot=0;s.phase="done";s.toCall=0;
    return s;
  }
  function nextStreet(s) {
    s.toCall=0;s.raises=0;s.streetPaid=0;
    if(s.phase==="river")return finishPoker(s,false);
    const count=s.phase==="preflop" ? 3 : 1;
    s.deck.shift(); // burn
    for(let i=0;i<count;i++)s.community.push(s.deck.shift());
    s.phase=({preflop:"flop",flop:"turn",turn:"river"})[s.phase];
    s.message=`${s.phase.toUpperCase()}: your move. Check or bet 20 practice chips.`;
    return s;
  }
  function pokerStart(random = Math.random) {
    const cards=deck(random);
    return {version:2,phase:"preflop",hand:cards.splice(0,2),cpu:cards.splice(0,2),deck:cards,community:[],stack:995,cpuStack:990,pot:15,toCall:5,streetPaid:5,raises:0,result:"playing",message:"Small blind 5, CPU big blind 10. Call 5, raise, or fold. Practice chips only."};
  }
  function pokerActions(s) {
    const live=s?.version===2 && s.phase!=="done";
    return {deal:!live,fold:live,check:live && s.toCall===0,call:live && s.toCall>0,bet:live && s.toCall===0 && s.stack>=20 && s.cpuStack>=20,raise:live && s.toCall>0 && s.raises<3 && s.stack>=s.toCall+20 && s.cpuStack>=20};
  }
  function pokerMove(state, action, random = Math.random) {
    if(!pokerActions(state)[action] || action==="deal")throw new Error("That poker move is not available.");
    const s=clone(state);
    if(action==="fold")return finishPoker(s,true);
    if(action==="call") {
      s.stack-=s.toCall;s.pot+=s.toCall;s.toCall=0;
      return nextStreet(s);
    }
    if(action==="check") {
      if(s.stack>=20 && s.cpuStack>=20 && random()<0.35){s.cpuStack-=20;s.pot+=20;s.toCall=20;s.message="CPU bets 20 practice chips. Call, raise, or fold.";return s;}
      return nextStreet(s);
    }
    const cost=s.toCall+20;
    s.stack-=cost;s.cpuStack-=20;s.pot+=cost+20;s.raises++;
    // CPU calls the fixed 20-chip bet/raise; advance one street, never auto-reveal the river.
    return nextStreet(s);
  }

  function legalCards(s,seat) {
    const hand=s.hands[seat];
    const lead=s.trick[0]?.card.suit;
    const follow=lead && hand.some(card=>card.suit===lead);
    return hand.map((card,i)=>({card,i})).filter(({card})=>follow ? card.suit===lead : lead || s.broken || hand.every(c=>c.suit==="♠") || card.suit!=="♠").map(({i})=>i);
  }
  function estimate(hand){return Math.min(8,Math.max(1,hand.filter(c=>value(c)>=13 || c.suit==="♠" && value(c)>=10).length));}
  function spadesStart(random = Math.random) {
    const cards=deck(random),hands=[];
    for(let i=0;i<4;i++)hands.push(cards.splice(0,13).sort((a,b)=>a.suit.localeCompare(b.suit)||value(a)-value(b)));
    return {version:2,phase:"bid",hands,bids:[null,estimate(hands[1]),estimate(hands[2]),estimate(hands[3])],tricks:[0,0,0,0],trick:[],lastTrick:[],turn:0,broken:false,message:"Choose a bid from 0 (Nil) to 13. You and CPU 2 are partners."};
  }
  function tallySpades(s) {
    s.scores=[0,0];s.bags=[0,0];
    for(let team=0;team<2;team++) {
      const seats=[team,team+2],bid=seats.reduce((n,i)=>n+s.bids[i],0);
      const taken=seats.filter(i=>s.bids[i]>0).reduce((n,i)=>n+s.tricks[i],0);
      s.bags[team]=Math.max(0,taken-bid);
      s.scores[team]=(taken>=bid ? bid*10+s.bags[team] : -bid*10)+seats.filter(i=>s.bids[i]===0).reduce((n,i)=>n+(s.tricks[i]===0 ? 100 : -100),0);
      if(s.bags[team]>=10)s.scores[team]-=100;
    }
    s.phase="done";s.message=`Hand complete. Your team: ${s.scores[0]}; CPU team: ${s.scores[1]}. Bags: ${s.bags.join(" / ")}.`;
  }
  function playCard(s,index) {
    const seat=s.turn,card=s.hands[seat].splice(index,1)[0];
    s.trick.push({seat,card});if(card.suit==="♠")s.broken=true;
    if(s.trick.length===4) {
      const lead=s.trick[0].card.suit;
      const strength=c=>(c.suit==="♠" ? 100 : c.suit===lead ? 50 : 0)+value(c);
      const winner=s.trick.reduce((win,p)=>strength(p.card)>strength(win.card) ? p : win);
      s.tricks[winner.seat]++;s.lastTrick=clone(s.trick);s.trick=[];s.turn=winner.seat;
      s.message=`${winner.seat===0 ? "You" : "CPU "+winner.seat} won the trick. Follow suit; spades ${s.broken ? "are broken" : "not broken"}.`;
      if(s.hands.every(h=>!h.length))tallySpades(s);
    } else s.turn=(seat+1)%4;
  }
  function runCpus(s) {
    // Each iteration consumes one card. Stop at the human's next decision.
    while(s.phase==="play" && s.turn!==0) {
      const seat=s.turn,legal=legalCards(s,seat);
      legal.sort((a,b)=>value(s.hands[seat][a])-value(s.hands[seat][b]));
      playCard(s,legal[0]);
    }
    return s;
  }
  function spadesBid(state,bid) {
    if(state.phase!=="bid" || !Number.isInteger(bid) || bid<0 || bid>13)throw new Error("Choose a bid from 0 to 13.");
    const s=clone(state);s.bids[0]=bid;s.phase="play";s.message="Tap a legal card, then Play Card. You lead the first trick.";return s;
  }
  function spadesPlay(state,index) {
    if(state.phase!=="play" || state.turn!==0 || !legalCards(state,0).includes(index))throw new Error("Follow suit and play a legal card on your turn.");
    const s=clone(state);playCard(s,index);return runCpus(s);
  }
  return {deck,best,compare,names,pokerStart,pokerActions,pokerMove,spadesStart,spadesBid,spadesPlay,legalCards};
});
