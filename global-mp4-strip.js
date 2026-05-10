(function(){
  'use strict';

  if(window.__HW_GLOBAL_MP4_STRIP__) return;
  window.__HW_GLOBAL_MP4_STRIP__ = true;

  var STORAGE_KEY = 'hyphsworld.globalVideo.minimized';
  var SOURCES = [
    {src:'hyphsworld-hero.mp4', title:'HYPHSWORLD TV', label:'Music / Skate / Comedy'},
    {src:'lobby-preview.mp4', title:'Lobby Highlights', label:'Vault / O1 / Duck Sauce'},
    {src:'01-show-teaser.mp4', title:'01 Show Preview', label:'Comedy / Motion / Episodes'},
    {src:'skate-highlights.mp4', title:'Skate Highlights', label:'Skate / Street / Motion'}
  ];

  function read(key){try{return localStorage.getItem(key)}catch(error){return null}}
  function write(key,value){try{localStorage.setItem(key,value)}catch(error){}}
  function existing(){return document.getElementById('hwGlobalVideoStrip')}
  function ensureCss(){
    if(document.querySelector('link[href="global-mp4-strip.css"]')) return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='global-mp4-strip.css';
    document.head.appendChild(link);
  }
  function pageLabel(){
    var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(path==='shop.html') return 'Merch Commercials';
    if(path==='games.html') return 'Arcade Clips';
    if(path==='vault.html') return 'Vault Security Feed';
    if(path==='leaderboard.html') return 'Ranking Report';
    if(path==='app-player.html') return 'Music Visuals';
    return 'Live Channel';
  }
  function build(){
    if(existing()) return;
    ensureCss();
    var strip=document.createElement('section');
    strip.id='hwGlobalVideoStrip';
    strip.className='hw-global-video-strip';
    strip.setAttribute('aria-label','HYPHSWORLD TV global video strip');
    if(read(STORAGE_KEY)==='true') strip.classList.add('hw-minimized');
    strip.innerHTML='<div class="hw-global-video-head"><div class="hw-global-video-title"><b>TV</b><div><small>'+pageLabel()+'</small><span id="hwGlobalVideoTitle">HYPHSWORLD TV</span></div></div><div class="hw-global-video-actions"><span class="hw-global-video-status" id="hwGlobalVideoStatus">Muted autoplay</span><button class="hw-video-btn" type="button" id="hwVideoPrev">Prev</button><button class="hw-video-btn primary" type="button" id="hwVideoToggleSound">Sound</button><button class="hw-video-btn" type="button" id="hwVideoNext">Next</button><button class="hw-video-btn" type="button" id="hwVideoMinimize">Hide</button></div></div><div class="hw-global-video-shell"><video id="hwGlobalVideo" muted autoplay loop playsinline preload="metadata" controls poster="album-art.jpg"></video></div><div class="hw-global-video-caption"><small id="hwGlobalVideoLabel">Music / Skate / Comedy</small><span>Skate highlights, O1 Show comedy, music clips, merch motion, and Duck Sauce moments.</span></div>';
    var target=document.querySelector('header')||document.body.firstElementChild;
    if(target&&target.parentNode) target.parentNode.insertBefore(strip,target.nextSibling);
    else document.body.insertBefore(strip,document.body.firstChild);
    bind(strip);
  }
  function bind(strip){
    var video=strip.querySelector('#hwGlobalVideo');
    var title=strip.querySelector('#hwGlobalVideoTitle');
    var label=strip.querySelector('#hwGlobalVideoLabel');
    var status=strip.querySelector('#hwGlobalVideoStatus');
    var index=0;
    function load(i){
      index=(i+SOURCES.length)%SOURCES.length;
      var item=SOURCES[index];
      if(title) title.textContent=item.title;
      if(label) label.textContent=item.label;
      if(status) status.textContent='Loading';
      video.innerHTML='';
      var source=document.createElement('source');
      source.src=item.src+'?v=global-tv-20260509';
      source.type='video/mp4';
      video.appendChild(source);
      video.load();
      video.muted=true;
      video.play().then(function(){if(status)status.textContent='Playing muted';}).catch(function(){if(status)status.textContent='Tap play';});
    }
    var prev=strip.querySelector('#hwVideoPrev');
    var next=strip.querySelector('#hwVideoNext');
    var sound=strip.querySelector('#hwVideoToggleSound');
    var minimize=strip.querySelector('#hwVideoMinimize');
    if(prev) prev.addEventListener('click',function(){load(index-1)});
    if(next) next.addEventListener('click',function(){load(index+1)});
    if(sound) sound.addEventListener('click',function(){video.muted=!video.muted;sound.textContent=video.muted?'Sound':'Mute';if(status)status.textContent=video.muted?'Playing muted':'Sound on';video.play().catch(function(){})});
    if(minimize) minimize.addEventListener('click',function(){var mini=!strip.classList.contains('hw-minimized');strip.classList.toggle('hw-minimized',mini);write(STORAGE_KEY,mini?'true':'false');minimize.textContent=mini?'Show':'Hide';});
    video.addEventListener('error',function(){if(status)status.textContent='Clip not uploaded yet';if(index<SOURCES.length-1) window.setTimeout(function(){load(index+1)},700);},true);
    load(0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
