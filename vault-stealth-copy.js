(function(){
  'use strict';
  function safeWords(){
    document.querySelectorAll('.gate-game-panel p,.gate-player-screen p,#gatePlayerStatus,#consoleMessage').forEach(function(el){
      var t=el.textContent||'';
      t=t.replace(/Hidden Track 06 appears only after ON finishes\.?/gi,'Play the lobby tape while the table gets warm.');
      t=t.replace(/Track 06[^.]*\./gi,'The official lobby tape is loaded.');
      t=t.replace(/05 complete[^.]*\./gi,'Lobby run complete. Bonus signal active.');
      t=t.replace(/code revealed[^.]*\./gi,'Bonus signal cleared.');
      if(t!==el.textContent)el.textContent=t;
    });
    document.querySelectorAll('button,a').forEach(function(el){
      if(/06|BOUNCE/i.test(el.textContent||''))el.textContent='BONUS TRACK';
    });
    document.querySelectorAll('.hw-code-reveal').forEach(function(el){el.remove();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safeWords);else safeWords();
  setTimeout(safeWords,600);setTimeout(safeWords,1600);
})();
