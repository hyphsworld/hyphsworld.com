(()=>{
  'use strict';

  if(window.__HW_TRANSPORT_SYSTEM__) return;
  window.__HW_TRANSPORT_SYSTEM__ = true;

  const DESTINATIONS = {
    'vault.html': {
      title: 'VAULT TRANSPORT',
      line: 'Duck Sauce: "Buck scanning your fingerprints right now. Try not to look nervous, genius."'
    },
    'games.html': {
      title: 'ARCADE TRANSPORT',
      line: 'Duck Sauce: "Loading game pressure. Do not mash buttons like a raccoon with Wi-Fi."'
    },
    'leaderboard.html': {
      title: 'RANKING SYNC',
      line: 'Duck Sauce: "Synchronizing Cool Points. Somebody grandma still ahead of you."'
    },
    'shop.html': {
      title: 'MERCH GATE',
      line: 'Duck Sauce: "Reward terminal opening. Try not to spend points like a maniac."'
    },
    'app-player.html': {
      title: 'FULL PLAYER LINK',
      line: 'Duck Sauce: "Signal lock achieved. Real listener activity detected."'
    },
    'auth.html': {
      title: 'ID VERIFICATION',
      line: 'Duck Sauce: "Identity scan running. Use a real email this time, astronaut."'
    },
    'account.html': {
      title: 'ACCOUNT ACCESS',
      line: 'Duck Sauce: "Cool Points syncing. Adult behavior finally detected."'
    },
    'booking.html': {
      title: 'BUSINESS CHANNEL',
      line: 'Duck Sauce: "Connecting to business transport. Act professional for once."'
    },
    'visuals.html': {
      title: 'VISUAL FEED',
      line: 'Duck Sauce: "Projectors warming up. Cinema pressure incoming."'
    },
    'socials.html': {
      title: 'SOCIAL SIGNAL',
      line: 'Duck Sauce: "Linking official channels. Fake pages smell like hot pennies."'
    }
  };

  function normalizeHref(href){
    try{
      return new URL(href,location.href);
    }catch(e){
      return null;
    }
  }

  function getDestination(pathname){
    const lower = pathname.toLowerCase();
    const match = Object.keys(DESTINATIONS).find((key)=>lower.endsWith(key));
    return match ? DESTINATIONS[match] : {
      title:'GLOBAL TRANSPORT',
      line:'Duck Sauce: "Hold still. The page moving, not your feet, butthead."'
    };
  }

  function ensureOverlay(){
    let overlay = document.getElementById('hwTransportOverlay');
    if(overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'hwTransportOverlay';
    overlay.className = 'hw-transport-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = [
      '<div class="hw-transport-card">',
      '<h2 class="hw-transport-title" id="hwTransportTitle">GLOBAL TRANSPORT</h2>',
      '<p class="hw-transport-destination" id="hwTransportDestination">Destination Locked</p>',
      '<p class="hw-transport-line" id="hwTransportLine">Duck Sauce warming up the transport lane.</p>',
      '<div class="hw-transport-bars">',
      '<span></span><span></span><span></span><span></span><span></span>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    return overlay;
  }

  function activateTransport(url){
    const overlay = ensureOverlay();
    const data = getDestination(url.pathname);

    const title = document.getElementById('hwTransportTitle');
    const destination = document.getElementById('hwTransportDestination');
    const line = document.getElementById('hwTransportLine');

    if(title) title.textContent = data.title;
    if(destination) destination.textContent = `Destination: ${url.pathname.split('/').pop() || 'home'}`;
    if(line) line.textContent = data.line;

    overlay.classList.add('is-live');

    setTimeout(()=>{
      location.href = url.href;
    },820);
  }

  function shouldIntercept(anchor,url){
    if(!anchor || !url) return false;
    if(anchor.hasAttribute('download')) return false;
    if(anchor.target === '_blank') return false;
    if(url.origin !== location.origin) return false;
    if(url.href === location.href) return false;
    if(url.protocol.indexOf('mailto') === 0) return false;
    if(url.protocol.indexOf('tel') === 0) return false;
    if(url.pathname.match(/\.(mp3|mp4|zip|pdf)$/i)) return false;
    return true;
  }

  document.addEventListener('click',(event)=>{
    const anchor = event.target.closest('a[href]');
    if(!anchor) return;

    const url = normalizeHref(anchor.getAttribute('href'));
    if(!shouldIntercept(anchor,url)) return;

    event.preventDefault();
    activateTransport(url);
  },true);
})();
