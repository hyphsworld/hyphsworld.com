(function(){
  'use strict';

  var TRACKS=[
    {title:'Back Up',src:'audio/back-up.mp3'},
    {title:'Go Mode',src:'audio/go-mode.mp3'},
    {title:'On God',src:'audio/on-god.mp3'},
    {title:'Purse 1st',src:'audio/purse-1st.mp3'},
    {title:'Wikked Wayz',src:'audio/wikked-wayz.mp3'},
    {title:'Youngin Remix',src:'audio/youngin-remix.mp3'}
  ];

  var index=0;
  var audio=null;
  var root=null;
  var titleEl=null;
  var playBtn=null;

  function current(){return TRACKS[index%TRACKS.length];}
  function setTitle(){if(titleEl)titleEl.textContent=current().title;}
  function ensureAudio(){
    if(audio)return audio;
    audio=new Audio();
    audio.preload='none';
    audio.addEventListener('ended',next);
    audio.addEventListener('play',function(){if(playBtn)playBtn.textContent='Pause';if(root)root.classList.add('is-playing');});
    audio.addEventListener('pause',function(){if(playBtn)playBtn.textContent='Play';if(root)root.classList.remove('is-playing');});
    return audio;
  }
  function load(){var a=ensureAudio();a.src=current().src;setTitle();}
  function play(){var a=ensureAudio();if(!a.src)load();a.play().catch(function(){if(titleEl)titleEl.textContent='Tap Play To Start Radio';});}
  function pause(){if(audio)audio.pause();}
  function toggle(){if(audio&&!audio.paused){pause();return;}play();}
  function next(){index=(index+1)%TRACKS.length;load();play();}
  function prev(){index=(index-1+TRACKS.length)%TRACKS.length;load();play();}

  function mount(){
    if(document.querySelector('[data-casino-soundtrack]'))return;
    root=document.createElement('aside');
    root.className='casino-soundtrack';
    root.setAttribute('data-casino-soundtrack','');
    root.innerHTML='<div class="casino-radio-mark">HW RADIO</div><div class="casino-radio-title">HYPHSWORLD Radio</div><div class="casino-radio-controls"><button type="button" data-radio-prev>Prev</button><button type="button" data-radio-play>Play</button><button type="button" data-radio-next>Next</button></div>';
    document.body.appendChild(root);
    titleEl=root.querySelector('.casino-radio-title');
    playBtn=root.querySelector('[data-radio-play]');
    root.querySelector('[data-radio-prev]').addEventListener('click',prev);
    playBtn.addEventListener('click',toggle);
    root.querySelector('[data-radio-next]').addEventListener('click',next);
    setTitle();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
