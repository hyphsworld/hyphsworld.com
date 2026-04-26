
(function(){
  const POINTS_KEY = "hyphsworld_points_v2";
  const LEGACY_KEYS = ["hyphsworld_points","hyphsworld_points_v1"];

  LEGACY_KEYS.forEach(function(k){
    try { localStorage.removeItem(k); } catch(e){}
  });

  function getPoints(){
    const n = parseInt(localStorage.getItem(POINTS_KEY) || "0", 10);
    return isNaN(n) ? 0 : n;
  }

  function setPoints(v){
    localStorage.setItem(POINTS_KEY, String(Math.max(0, v)));
    render();
  }

  function addPoints(v){
    setPoints(getPoints() + v);
  }

  function rank(points){
    if(points >= 5000) return "Legend";
    if(points >= 2500) return "Major Motion";
    if(points >= 1000) return "Certified";
    if(points >= 500) return "Pressure";
    if(points >= 100) return "Active";
    return "Rookie";
  }

  function ensureWidget(){
    let el = document.getElementById("cool-points-widget");
    if(!el){
      el = document.createElement("div");
      el.id = "cool-points-widget";
      el.style.position = "fixed";
      el.style.left = "18px";
      el.style.bottom = "92px";
      el.style.zIndex = "9999";
      el.style.padding = "12px 18px";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(0,0,0,.78)";
      el.style.border = "1px solid rgba(241,210,138,.45)";
      el.style.color = "#fff";
      el.style.fontWeight = "800";
      el.style.fontFamily = "Arial,sans-serif";
      el.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";
      document.body.appendChild(el);
    }
    return el;
  }

  function render(){
    const points = getPoints();
    const el = ensureWidget();
    el.innerHTML = "😎 COOL POINTS: <span style='color:#f1d28a'>" + points +
                   "</span> <span style='opacity:.7;font-size:12px'>• " + rank(points) + "</span>";
  }

  function bindEarners(){
    document.querySelectorAll(".earn-points").forEach(function(node){
      if(node.dataset.boundPoints) return;
      node.dataset.boundPoints = "1";
      node.addEventListener("click", function(){
        const amt = parseInt(node.dataset.points || "5", 10);
        addPoints(isNaN(amt) ? 5 : amt);
      });
    });
  }

  function dailyBonus(){
    const today = new Date().toISOString().slice(0,10);
    const key = "hyphsworld_daily_bonus_v2";
    const last = localStorage.getItem(key);
    if(last !== today){
      localStorage.setItem(key, today);
      addPoints(25);
    }
  }

  window.HYPHSWORLD_POINTS = {
    add:addPoints,
    get:getPoints,
    set:setPoints,
    reset:function(){ setPoints(0); }
  };

  document.addEventListener("DOMContentLoaded", function(){
    render();
    bindEarners();
    dailyBonus();
    setInterval(bindEarners, 2000);
  });
})();
