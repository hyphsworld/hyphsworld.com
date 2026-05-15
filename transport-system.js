(()=>{
  'use strict';

  if(window.__HW_TRANSPORT_SYSTEM__) return;
  window.__HW_TRANSPORT_SYSTEM__ = true;

  const DESTINATIONS={
    'index.html':{title:'HOME PORTAL',line:'Duck Sauce: "Sending you back to the front door. Try not to trip over the welcome mat."'},
    'vault.html':{title:'LEVEL 1 VAULT TRANSPORT',line:'Duck Sauce: "Buck scanning the route. Hold still while the portal checks your access."'},
    'games.html':{title:'CASINO FLOOR',line:'Duck Sauce: "Casino floor opening. Poker, dominoes, slots, Cash Run, and Cool Points only."'},
    'leaderboard.html':{title:'RANKING SYNC',line:'Duck Sauce: "Synchronizing Cool Points. The board knows who really been moving."'},
    'shop.html':{title:'CASINO REROUTE',line:'Duck Sauce: "Old shop lane retired. Sending you to the Casino floor instead."'},
    'merch.html':{title:'CASINO REROUTE',line:'Duck Sauce: "Merch floor retired. Casino lobby is the active route now."'},
    'app-player.html':{title:'FULL PLAYER LINK',line:'Duck Sauce: "Signal lock achieved. Real listener room incoming."'},
    'auth.html':{title:'ID VERIFICATION',line:'Duck Sauce: "Identity scan running. Create the ID so progress follows you."'},
    'account.html':{title:'ACCOUNT ACCESS',line:'Duck Sauce: "Cool Points syncing. Account tunnel opening."'},
    'quarantine-mixtape.html':{title:'LEVEL 1 TRANSPORT',line:'Duck Sauce: "Quarantine vault opening. This route is not for random hallway walkers."'},
    'floor1.html':{title:'LEVEL 1 FLOOR',line:'Duck Sauce: "Floor 1 loading. Buck said keep your hands where the scanner can see them."'}
  };

  function normalizeHref(href){try{return new URL(href,location.href)}catch(e){return null}}
  function getDestination(pathname){const lower=pathname.toLowerCase();const match=Object.keys(DESTINATIONS).find((key)=>lower.endsWith(key));return match?DESTINATIONS[match]:{title:'GLOBAL TRANSPORT',line:'Duck Sauce: "Portal warming up. Page moving in three, two... now."'}}

  function ensureStyles(){
    if(document.getElementById('hwTransportStyles')) return;
    const style=document.createElement('style');
    style.id='hwTransportStyles';
    style.textContent=`.hw-transport-overlay{position:fixed;inset:0;z-index:2147482600;display:none;place-items:center;padding:18px;background:radial-gradient(circle at 50% 45%,rgba(0,255,230,.18),transparent 26%),rgba(0,0,0,.88);backdrop-filter:blur(10px);overflow:hidden}.hw-transport-overlay.is-live{display:grid}.hw-transport-overlay::before{content:"";position:absolute;width:82vmin;aspect-ratio:1;border-radius:50%;border:18px solid rgba(0,255,230,.16);box-shadow:0 0 0 4px rgba(57,255,20,.18),inset 0 0 48px rgba(0,255,230,.18),0 0 80px rgba(0,255,230,.22);background:conic-gradient(from 0deg,rgba(57,255,20,.55),transparent 12%,rgba(0,229,255,.55) 25%,transparent 40%,rgba(255,43,214,.45) 55%,transparent 72%,rgba(255,230,0,.55),transparent);animation:hwPortalSpin 1.05s linear infinite}.hw-transport-overlay::after{content:"";position:absolute;inset:-20%;background:linear-gradient(rgba(0,255,230,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(57,255,20,.05) 1px,transparent 1px);background-size:38px 38px;animation:hwGridMove 1.4s linear infinite}.hw-transport-card{position:relative;z-index:2;width:min(720px,94vw);border:2px solid rgba(0,255,230,.48);border-radius:30px;padding:clamp(22px,5vw,42px);text-align:center;color:#fff;background:linear-gradient(145deg,rgba(4,17,20,.92),rgba(0,0,0,.72));box-shadow:0 0 46px rgba(0,255,230,.24),0 28px 80px rgba(0,0,0,.58)}.hw-transport-title{margin:0 0 8px;font:1000 clamp(2rem,7vw,4.6rem)/.88 Arial,sans-serif;text-transform:uppercase;letter-spacing:-.06em;text-shadow:4px 4px 0 rgba(255,43,214,.55),0 0 20px rgba(0,255,230,.34)}.hw-transport-destination{margin:0 0 10px;color:#39ff14;font:1000 12px/1.2 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase}.hw-transport-line{margin:0 auto 18px;max-width:560px;color:#eaffef;font:850 14px/1.35 Arial,sans-serif}.hw-transport-bars{display:flex;gap:8px;justify-content:center}.hw-transport-bars span{height:9px;width:54px;border-radius:999px;background:linear-gradient(90deg,#39ff14,#00ffe6,#ffe600,#ff2bd6);animation:hwBar 680ms ease-in-out infinite alternate}.hw-transport-bars span:nth-child(2){animation-delay:.08s}.hw-transport-bars span:nth-child(3){animation-delay:.16s}.hw-transport-bars span:nth-child(4){animation-delay:.24s}.hw-transport-bars span:nth-child(5){animation-delay:.32s}@keyframes hwPortalSpin{to{transform:rotate(360deg) scale(1.04)}}@keyframes hwGridMove{to{transform:translate(38px,38px)}}@keyframes hwBar{from{opacity:.3;transform:scaleX(.45)}to{opacity:1;transform:scaleX(1)}}@media(max-width:560px){.hw-transport-bars span{width:34px}.hw-transport-card{border-radius:24px}}`;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    ensureStyles();
    let overlay=document.getElementById('hwTransportOverlay');
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id='hwTransportOverlay';
    overlay.className='hw-transport-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="hw-transport-card"><h2 class="hw-transport-title" id="hwTransportTitle">GLOBAL TRANSPORT</h2><p class="hw-transport-destination" id="hwTransportDestination">Destination Locked</p><p class="hw-transport-line" id="hwTransportLine">Duck Sauce warming up the transport lane.</p><div class="hw-transport-bars"><span></span><span></span><span></span><span></span><span></span></div></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function rerouteRetired(url){
    const lower=url.pathname.toLowerCase();
    if(lower.endsWith('/shop.html')||lower.endsWith('/merch.html')){
      return new URL('games.html',location.origin + location.pathname.replace(/[^/]*$/,''));
    }
    return url;
  }

  function activateTransport(url){
    url=rerouteRetired(url);
    const overlay=ensureOverlay();
    const data=getDestination(url.pathname);
    const title=document.getElementById('hwTransportTitle');
    const destination=document.getElementById('hwTransportDestination');
    const line=document.getElementById('hwTransportLine');
    if(title) title.textContent=data.title;
    if(destination) destination.textContent=`Destination: ${url.pathname.split('/').pop()||'home'}`;
    if(line) line.textContent=data.line;
    overlay.classList.add('is-live');
    overlay.setAttribute('aria-hidden','false');
    document.body.style.pointerEvents='none';
    setTimeout(()=>{location.href=url.href},650);
  }

  function shouldIntercept(anchor,url){
    if(!anchor||!url)return false;
    if(anchor.dataset.noTransport==='true')return false;
    if(anchor.hasAttribute('download'))return false;
    if(anchor.target==='_blank')return false;
    if(url.origin!==location.origin)return false;
    if(url.href===location.href)return false;
    if(url.protocol.indexOf('mailto')===0||url.protocol.indexOf('tel')===0)return false;
    if(url.hash&&url.pathname===location.pathname)return false;
    if(url.pathname.match(/\.(mp3|mp4|zip|pdf|jpg|jpeg|png|webp|gif)$/i))return false;
    return true;
  }

  document.addEventListener('click',(event)=>{
    const anchor=event.target.closest('a[href]');
    if(!anchor)return;
    const url=normalizeHref(anchor.getAttribute('href'));
    if(!shouldIntercept(anchor,url))return;
    event.preventDefault();
    activateTransport(url);
  },true);
})();
