/* HYPHSWORLD Casino Arcade — visual table game extension
   Adds Blackjack and Dominos as visible table games in casino-arcade.html.
*/
(function(){
  "use strict";
  var $=function(q,r){return (r||document).querySelector(q)};
  var $$=function(q,r){return Array.prototype.slice.call((r||document).querySelectorAll(q))};
  var current="";
  var bj={deck:[],player:[],dealer:[],phase:"idle"};
  var dom={hand:[[0,1],[1,3],[2,3],[3,5],[5,6],[6,6],[2,6]],board:[[1,6],[6,5],[5,5],[5,2],[2,4]],turn:"You"};

  function card(rank,suit){return {rank:rank,suit:suit}}
  function makeDeck(){var suits=["♠","♥","♦","♣"],ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],d=[];suits.forEach(function(s){ranks.forEach(function(r){d.push(card(r,s))})});for(var i=d.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=d[i];d[i]=d[j];d[j]=t}return d}
  function val(c){if(c.rank==="A")return 11;if(/[JQK]/.test(c.rank))return 10;return Number(c.rank)}
  function score(hand){var s=0,a=0;hand.forEach(function(c){s+=val(c);if(c.rank==="A")a++});while(s>21&&a){s-=10;a--}return s}
  function cardHtml(c,back){if(back)return '<div class="hw-card-face back"><strong>?</strong><span>?</span></div>';var red=(c.suit==="♥"||c.suit==="♦")?" red":"";return '<div class="hw-card-face'+red+'"><strong>'+c.rank+'</strong><span>'+c.suit+'</span></div>'}
  function boneDots(n){return n===0?"—":"•".repeat(n)}
  function boneHtml(b,h){return '<div class="hw-bone '+(h?'horizontal ':'')+(b[0]===b[1]?'gold':'')+'"><div>'+boneDots(b[0])+'</div><div>'+boneDots(b[1])+'</div></div>'}
  function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v}
  function status(v){setText("casinoStatus",'Duck Sauce: “'+v+'”')}
  function activeTile(g){$$('[data-game]').forEach(function(b){b.classList.toggle('is-active',b.dataset.game===g)})}
  function setHeader(title,kicker,desc){setText("casinoGameTitle",title);setText("casinoGameKicker",kicker);setText("casinoGameDescription",desc)}
  function button(t,a,c){return '<button class="arcade-btn '+(c||'')+'" type="button" data-table-action="'+a+'">'+t+'</button>'}
  function bindActions(){$$('[data-table-action]').forEach(function(b){b.onclick=function(){act(b.dataset.tableAction)}})}

  function renderBlackjack(){
    current="blackjack";activeTile("blackjack");setHeader("Blackjack","CARD TABLE","Play against Duck Dealer. Deal, hit, or stand. Closest to 21 wins the bonus.");
    var stage=$("#casinoStage"),controls=$("#casinoControls");if(!stage||!controls)return;
    var hide=bj.phase==="player";
    stage.innerHTML='<div class="hw-table-room"><div class="hw-felt-table"><div class="hw-table-label">BLACK<br>JACK</div><div class="hw-score-strip"><span>Dealer: '+(bj.dealer.length?(hide?score([bj.dealer[0]]):score(bj.dealer)):0)+'</span><span>You: '+(bj.player.length?score(bj.player):0)+'</span></div><div class="hw-seat-chip top"><span class="avatar">🦆</span><b>Duck Dealer</b></div><div class="hw-card-row dealer">'+(bj.dealer.length?bj.dealer.map(function(c,i){return cardHtml(c,hide&&i===1)}).join(''):cardHtml(null,true)+cardHtml(null,true))+'</div><div class="hw-card-row center">'+cardHtml({rank:"A",suit:"♠"},false)+cardHtml({rank:"K",suit:"♦"},false)+'</div><div class="hw-card-row player">'+(bj.player.length?bj.player.map(function(c){return cardHtml(c,false)}).join(''):cardHtml(null,true)+cardHtml(null,true))+'</div><div class="hw-seat-chip bottom"><span class="avatar">🧢</span><b>You</b></div><div class="hw-table-help">Goal: get close to 21 without going over. Hit = draw. Stand = hold.</div></div></div>';
    controls.innerHTML='<div class="casino-button-row">'+button('Deal','bj-deal')+button('Hit','bj-hit','secondary')+button('Stand','bj-stand','secondary')+'</div>';
    bindActions();
  }
  function bjDeal(){bj.deck=makeDeck();bj.player=[bj.deck.pop(),bj.deck.pop()];bj.dealer=[bj.deck.pop(),bj.deck.pop()];bj.phase="player";status("Hand live. Hit or stand.");renderBlackjack()}
  function bjHit(){if(bj.phase!=="player")return status("Deal first.");bj.player.push(bj.deck.pop());if(score(bj.player)>21){bj.phase="done";status("Bust. Duck Dealer got this one.")}else status("You hit. Choose again.");renderBlackjack()}
  function bjStand(){if(bj.phase!=="player")return status("Deal first.");while(score(bj.dealer)<17)bj.dealer.push(bj.deck.pop());var ps=score(bj.player),ds=score(bj.dealer);bj.phase="done";if(ds>21||ps>ds)status("You beat Duck Dealer. Bonus progress should jump.");else if(ps===ds)status("Push. Nobody wins.");else status("Duck Dealer wins. Run it back.");renderBlackjack()}

  function renderDominos(){
    current="dominos";activeTile("dominos");setHeader("Dominos","BONES TABLE","Match the open ends. Play bones from your hand onto the center board.");
    var stage=$("#casinoStage"),controls=$("#casinoControls");if(!stage||!controls)return;
    stage.innerHTML='<div class="hw-table-room"><div class="hw-felt-table"><div class="hw-table-label">DOM<br>INOS</div><div class="hw-seat-chip top"><span class="avatar">🤖</span><b>CPU 25/50</b></div><div class="hw-seat-chip left"><span class="avatar">🦆</span><b>Duck 20/50</b></div><div class="hw-seat-chip right"><span class="avatar">🛡️</span><b>Buck 25/50</b></div><div class="hw-seat-chip bottom"><span class="avatar">🧢</span><b>You</b></div><div class="hw-boneyard">Boneyard<br>13</div><div class="hw-bone-board">'+dom.board.map(function(b){return boneHtml(b,true)}).join('')+'</div><div class="hw-bone-hand">'+dom.hand.map(function(b){return boneHtml(b,false)}).join('')+'</div><div class="hw-table-help">Tap Play Bone to place the left-most playable bone. Match open ends.</div></div></div>';
    controls.innerHTML='<div class="casino-button-row">'+button('New Bones','dom-new')+button('Play Bone','dom-play','secondary')+button('Draw Bone','dom-draw','secondary')+'</div>';
    bindActions();
  }
  function domNew(){dom={hand:[[0,1],[1,3],[2,3],[3,5],[5,6],[6,6],[2,6]],board:[[1,6],[6,5],[5,5],[5,2],[2,4]],turn:"You"};status("New domino table loaded.");renderDominos()}
  function domPlay(){if(!dom.hand.length)return status("No bones left. Round over.");var b=dom.hand.shift();dom.board.push(b);status("Bone played. Match the ends and keep moving.");renderDominos()}
  function domDraw(){var a=Math.floor(Math.random()*7),b=Math.floor(Math.random()*7);dom.hand.push([Math.min(a,b),Math.max(a,b)]);status("Drew from boneyard.");renderDominos()}

  function act(a){if(a==="bj-deal")bjDeal();if(a==="bj-hit")bjHit();if(a==="bj-stand")bjStand();if(a==="dom-new")domNew();if(a==="dom-play")domPlay();if(a==="dom-draw")domDraw()}
  function addTiles(){var picker=$(".casino-game-picker");if(!picker||$("[data-game='blackjack']"))return;var bj=document.createElement('button');bj.className='casino-game-tile';bj.type='button';bj.dataset.game='blackjack';bj.innerHTML='<span>🂡</span><strong>Blackjack</strong><small>Card table</small>';var dm=document.createElement('button');dm.className='casino-game-tile';dm.type='button';dm.dataset.game='dominos';dm.innerHTML='<span>🁬</span><strong>Dominos</strong><small>Bones table</small>';picker.insertBefore(bj,picker.firstElementChild);picker.insertBefore(dm,picker.children[1]);bj.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();renderBlackjack()});dm.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();renderDominos()})}
  function boot(){addTiles();document.addEventListener('click',function(e){var btn=e.target.closest('[data-game="blackjack"],[data-game="dominos"]');if(!btn)return;e.preventDefault();e.stopPropagation();btn.dataset.game==='blackjack'?renderBlackjack():renderDominos()},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
