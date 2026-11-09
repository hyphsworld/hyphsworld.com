/* CPU practice controls for the legacy Hold'em room entry. */
(function () {
  "use strict";
  const rules = window.HWTableRules;
  let hand = null, busy = false, expandedSeats = false, mode = "poker";
  let player = {name:"Your Seat",avatar:"🧢"};
  const $ = id => document.getElementById(id);
  const text = (id,value) => { if($(id)) $(id).textContent=String(value); };
  const escape = value => String(value || "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const label = card => ({1:"A",11:"J",12:"Q",13:"K"})[card.rank] || card.rank;
  const cards = (list,mini) => list.map(card=>`<span class="${mini ? "seat-mini-card" : "play-card"}">${label(card)}${card.suit}</span>`).join("");
  function seat(cls,name,avatar,chips,list,hidden) {
    return `<article class="table-seat ${cls}"><div class="seat-head"><span class="seat-avatar">${escape(avatar)}</span><div><div class="seat-name">${escape(name)}</div><div class="seat-points">${chips} practice chips</div></div></div><div class="seat-cards">${hidden ? '<span class="seat-mini-card">?</span><span class="seat-mini-card">?</span>' : cards(list,true)}</div></article>`;
  }
  function render() {
    if(mode!=="poker")return;
    const legal=rules.pokerActions(hand),done=hand?.phase==="done";
    text("tableTitle","Hold'em Practice Table");text("roomMode","CPU Practice");
    text("tableIntro","Check / Hold, Call, Bet, Raise, or Fold against CPU 01. Practice chips only; your Cool Points are unchanged.");
    text("previewPot",`${hand?.pot || 0} practice chips`);
    text("tableStatus",hand?.message || "Tap New Hand to start.");
    text("cpuStatus",done ? "Hand complete." : "CPU 01 is seated.");
    text("playerStatus",hand?.toCall ? `Call ${hand.toCall}, raise, or fold.` : done ? "New Hand is ready." : "Check / Hold, bet, or fold.");
    $("playZone").innerHTML=`<div class="poker-table-shell ${expandedSeats ? "is-expanded" : "is-simple"}"><div class="table-felt-logo">HW</div>${seat("seat-top","CPU 01","🤖",hand?.cpuStack ?? 1000,hand?.cpu || [],!done)}${expandedSeats ? '<div class="empty-seat empty-left">OPEN SEAT</div><div class="empty-seat empty-right">OPEN SEAT</div>' : ""}${seat("seat-player",player.name,player.avatar,hand?.stack ?? 1000,hand?.hand || [],false)}<div class="community-zone"><div class="hand-badge">${escape(hand?.phase?.toUpperCase() || "READY")}</div><div class="community-cards">${cards(hand?.community || [],false)}</div><div class="pot-badge">${done ? escape(hand.message) : "20-chip fixed bet / raise. No money or Cool Points wagered."}</div></div></div>`;
    const config={previewDealBtn:["New Hand",legal.deal],holdBtn:["Fold",legal.fold],hitBtn:["Check / Hold",legal.check],callBtn:[`Call${hand?.toCall ? " "+hand.toCall : ""}`,legal.call],betBtn:["Bet 20",legal.bet],stayBtn:["Raise +20",legal.raise],resetTableBtn:["Reset Practice",legal.deal]};
    for(const [id,[name,enabled]] of Object.entries(config)){text(id,name);$(id).disabled=busy || !enabled;}
  }
  function move(action) {
    if(busy || mode!=="poker")return;
    busy=true;
    try {
      if(action==="deal") {
        if(!rules.pokerActions(hand).deal)throw new Error("Finish the current hand before dealing again.");
        hand=rules.pokerStart();
      } else hand=rules.pokerMove(hand,action);
    } catch(error){text("tableStatus",error.message);}
    finally {busy=false;render();}
  }
  async function load() {
    text("year",new Date().getFullYear());
    const actions={previewDealBtn:"deal",holdBtn:"fold",hitBtn:"check",callBtn:"call",betBtn:"bet",stayBtn:"raise",resetTableBtn:"deal"};
    for(const [id,action] of Object.entries(actions))$(id)?.addEventListener("click",()=>move(action));
    const toggle=document.createElement("button");toggle.id="toggleSeatsBtn";toggle.type="button";toggle.className="table-btn secondary";toggle.textContent="Show Open Seats";
    toggle.addEventListener("click",()=>{expandedSeats=!expandedSeats;toggle.textContent=expandedSeats ? "Hide Open Seats" : "Show Open Seats";render();});
    document.querySelector(".table-actions")?.append(toggle);
    const room=new URLSearchParams(location.search).get("room") || new URLSearchParams(location.search).get("roomId");
    text("roomCode",room || "Practice");
    try {
      const user=await window.HWAuth?.getCurrentUser();
      if(user){player={name:user.displayName || user.username || "Your Seat",avatar:user.avatarIcon || "🧢"};text("playerName",player.name);text("playerAvatar",player.avatar);}
      if(window.HWPoints?.refresh)await window.HWPoints.refresh();
      if(window.HWPoints?.get)text("tableBalance",window.HWPoints.get());
      if(room) {
        const client=await window.HWAuth?.getClient();
        if(client) {
          let result=await client.from("game_rooms").select("id,room_code,game_type").eq("id",room).maybeSingle();
          if(!result.data)result=await client.from("game_rooms").select("id,room_code,game_type").eq("room_code",room.toUpperCase()).maybeSingle();
          if(result.data) {
            text("roomCode",result.data.room_code);
            if(["domino","dominos","dominoes"].includes(result.data.game_type)) {
              mode="dominoes";text("tableTitle","Dominoes Table");text("tableStatus","Use the live Domino Room for Play, Draw Bone, and Pass.");
              $("playZone").innerHTML='<p><a class="table-btn" href="dominos.html">Open Live Domino Room</a></p>';
              for(const id of Object.keys(actions))$(id).disabled=true;
              toggle.disabled=true;return;
            }
          }
        }
      }
    } catch (_) { text("tableStatus","Room lookup unavailable. CPU practice is available."); }
    hand=rules.pokerStart();render();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
