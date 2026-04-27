const TRACKS={
  ham:{title:"HAM",meta:"Hyph Life — prod by 1ManBand",src:""},
  kiki:{title:"KIKI",meta:"Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",src:""},
  ongod:{title:"ON GOD",meta:"BooGotGluu x No Flash",src:""},
  time:{title:"TIME",meta:"SIXX FIGGAZ x Hyph Life",src:""},
  tez:{title:"25/8",meta:"Young Tez — prod by Marty McPhresh",src:""}
};
function selectTrack(key){
  const t=TRACKS[key]; if(!t) return;
  document.querySelectorAll("[data-now-title]").forEach(e=>e.textContent=t.title);
  document.querySelectorAll("[data-now-meta]").forEach(e=>e.textContent=t.meta);
  const audio=document.querySelector("[data-audio]");
  if(audio){const s=audio.querySelector("source"); if(s) s.src=t.src||""; audio.load();}
  document.querySelectorAll("[data-track]").forEach(b=>b.classList.toggle("active",b.dataset.track===key));
}
const CODES={510:"Main Room unlocked. Richmond is in the building. +10 Cool Points.",HYPH:"HYPHSWORLD access granted. +10 Cool Points.",DUCK:"Duck Sauce opened the door. +25 Cool Points.",AMS:"AMS WEST access granted. +10 Cool Points.",RICHMOND:"Richmond code accepted. +10 Cool Points.",QUARANTINE:"Level 1 unlocked. +50 Cool Points.",WORLD5:"Level 2 unlocked. +75 Cool Points.",CASINO:"Hidden Casino teaser unlocked. +100 Cool Points."};
function addPoints(amount){
  document.querySelectorAll("[data-points]").forEach(el=>{
    const current=parseInt(el.textContent||"0",10)||0;
    el.textContent=String(current+amount);
  });
}
function fillCode(v){const i=document.querySelector("#code"); if(i)i.value=v; unlockVault();}
function unlockVault(){
  const i=document.querySelector("#code"), m=document.querySelector("#msg"); if(!i||!m) return;
  const raw=i.value.trim().toUpperCase(), hit=CODES[raw];
  if(!hit){m.textContent="Code not recognized. Try 510, HYPH, DUCK, AMS, RICHMOND, QUARANTINE, WORLD5, or CASINO.";m.style.color="#ffd43b";return;}
  m.textContent=hit; m.style.color="#35ff75";
  if(["510","HYPH","DUCK","AMS","RICHMOND"].includes(raw)){document.querySelector("#main")?.classList.add("unlocked"); addPoints(10);}
  if(raw==="DUCK"){addPoints(15);}
  if(raw==="QUARANTINE"){document.querySelector("#level1")?.classList.add("unlocked"); addPoints(50);}
  if(raw==="WORLD5"){document.querySelector("#level2")?.classList.add("unlocked"); addPoints(75);}
  if(raw==="CASINO"){document.querySelector("#casino")?.classList.add("unlocked"); addPoints(100);}
}
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("[data-track]").forEach(b=>b.addEventListener("click",()=>selectTrack(b.dataset.track)));
  document.querySelector("[data-code-form]")?.addEventListener("submit",e=>{e.preventDefault();unlockVault();});
  document.querySelectorAll("[data-duck]").forEach(d=>d.addEventListener("click",()=>{addPoints(5); alert("Duck Sauce: +5 Cool Points. Stop pokin' me and find the code.");}));
});
