(function(){
'use strict';
var follow=document.getElementById('followCreator');
var share=document.getElementById('shareCreator');
var toast=document.getElementById('worldToast');
var audio=document.getElementById('creatorAudio');
var play=document.getElementById('playTrack');
var progress=document.getElementById('trackProgress');
var shell=document.getElementById('progressShell');
var time=document.getElementById('trackTime');
var title=document.getElementById('activeTitle');
var meta=document.getElementById('activeMeta');
var cover=document.getElementById('activeCover');
var creatorSlug='hyph-life';
var creatorLabel='HYPH LIFE';
var rewardPrefix='hyphsworld.creator.hyph-life.reward.';
var client=null;
var user=null;
var creator=null;
var isFollowing=false;
var followBusy=false;
var toastTimer;

function show(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){toast.classList.remove('show')},2600);
}
function followerText(value){var count=Math.max(0,Number(value)||0);return count.toLocaleString()}
function ensureFollowerStat(){
  var stats=document.querySelector('.creator-stats');
  if(!stats)return null;
  var existing=stats.querySelector('[data-creator-followers]');
  if(existing)return existing;
  var box=document.createElement('div');
  var strong=document.createElement('strong');
  var label=document.createElement('span');
  strong.setAttribute('data-creator-followers','');
  strong.textContent='—';
  label.textContent='Followers';
  box.append(strong,label);
  stats.append(box);
  return strong;
}
function renderFollowerCount(){var node=ensureFollowerStat();if(node&&creator)node.textContent=followerText(creator.follower_count)}
function renderFollow(){
  if(!follow)return;
  follow.disabled=followBusy;
  follow.classList.toggle('is-following',isFollowing);
  follow.setAttribute('aria-pressed',String(isFollowing));
  follow.textContent=followBusy?'Please wait…':(isFollowing?'✓ Following '+creatorLabel:'＋ Follow '+creatorLabel);
}
function rewardKey(userId,rewardId){return rewardPrefix+rewardId+'.'+userId}
function storageGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
function storageSet(key,value){try{localStorage.setItem(key,value)}catch(e){}}
function pointsUser(){
  if(user)return user;
  try{
    var state=window.HWPoints&&typeof window.HWPoints.getState==='function'?window.HWPoints.getState():null;
    return state&&state.user?state.user:null;
  }catch(e){return null}
}
async function awardOnce(amount,reason,rewardId){
  if(!window.HWPoints||typeof window.HWPoints.add!=='function')return;
  var rewardUser=pointsUser();
  var rewardUserId=rewardUser&&(rewardUser.id||rewardUser.userId||rewardUser.user_id);
  if(!rewardUserId)return;
  var key=rewardKey(rewardUserId,rewardId);
  if(storageGet(key)==='true')return;
  try{
    var state=await window.HWPoints.add(amount,reason,{creator_id:creatorSlug,reward_id:rewardId});
    if(state&&state.user){storageSet(key,'true');show('+'+amount+' Cool Points saved')}
  }catch(e){show('Could not save Cool Points yet')}
}
async function refreshCreator(){
  if(!client)return;
  var result=await client.from('creators').select('id,slug,follower_count').eq('slug',creatorSlug).maybeSingle();
  if(result.error||!result.data)throw result.error||new Error('Creator unavailable');
  creator=result.data;
  renderFollowerCount();
}
async function refreshFollowState(){
  isFollowing=false;
  if(!client||!creator||!user){renderFollow();return}
  var result=await client.from('creator_follows').select('creator_id').eq('creator_id',creator.id).eq('user_id',user.id).maybeSingle();
  if(result.error)throw result.error;
  isFollowing=Boolean(result.data);
  renderFollow();
}
async function initFollow(){
  ensureFollowerStat();
  renderFollow();
  if(!window.HWAuth)return;
  try{
    client=await window.HWAuth.getClient();
    if(!client)return;
    await refreshCreator();
    var sessionResult=await client.auth.getSession();
    user=sessionResult.data&&sessionResult.data.session?sessionResult.data.session.user:null;
    await refreshFollowState();
  }catch(error){console.warn('Creator follow state unavailable.',error)}
}
if(follow)follow.addEventListener('click',async function(){
  if(followBusy)return;
  if(!client||!creator){show('Creator connection is still loading');return}
  if(!user){show('Log in to follow creators');return}
  followBusy=true;
  renderFollow();
  try{
    if(isFollowing){
      var remove=await client.from('creator_follows').delete().eq('creator_id',creator.id).eq('user_id',user.id);
      if(remove.error)throw remove.error;
      isFollowing=false;
      show('Creator unfollowed');
    }else{
      var add=await client.from('creator_follows').insert({creator_id:creator.id,user_id:user.id});
      if(add.error&&add.error.code!=='23505')throw add.error;
      isFollowing=true;
      show('You’re following Creator #001');
      awardOnce(10,'creator_follow_hyph_life','follow');
    }
    await refreshCreator();
  }catch(error){show('Could not update follow yet');console.warn('Creator follow update failed.',error)}
  finally{followBusy=false;renderFollow()}
});
if(share)share.addEventListener('click',async function(){
  var data={title:'HYPH LIFE — Creators World',text:'Enter HYPH LIFE’s world on HYPHSWORLD.',url:location.href};
  try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);show('Profile link copied')}}catch(e){if(e&&e.name!=='AbortError')show('Share link ready: '+location.href)}
});
function format(seconds){if(!Number.isFinite(seconds))return'0:00';var m=Math.floor(seconds/60);var s=Math.floor(seconds%60);return m+':'+String(s).padStart(2,'0')}
function renderAudio(){if(!audio||!play||!progress||!time||!title)return;play.textContent=audio.paused?'▶':'❚❚';play.setAttribute('aria-label',(audio.paused?'Play ':'Pause ')+title.textContent);var percent=audio.duration?audio.currentTime/audio.duration*100:0;progress.style.width=percent+'%';time.textContent=format(audio.currentTime)}
async function revealOwnerControls(){var panel=document.getElementById('creatorOwnerControls');if(!panel||!window.HWAuth)return;try{var authClient=client||await window.HWAuth.getClient();if(!authClient||!authClient.auth)return;var sessionResult=await authClient.auth.getSession();var ownerUser=sessionResult.data&&sessionResult.data.session&&sessionResult.data.session.user;if(!ownerUser)return;var isAdmin=Boolean(ownerUser.app_metadata&&ownerUser.app_metadata.creator_admin===true);var ownership=await authClient.from('creators').select('id').eq('slug',creatorSlug).eq('owner_user_id',ownerUser.id).limit(1).maybeSingle();if(isAdmin||(!ownership.error&&ownership.data))panel.hidden=false}catch(error){console.warn('Creator owner controls remain protected.')}}
if(play&&audio){play.addEventListener('click',function(){if(audio.paused)audio.play().catch(function(){show('Tap play again to start audio')});else audio.pause()});audio.addEventListener('play',renderAudio);audio.addEventListener('pause',renderAudio);audio.addEventListener('timeupdate',renderAudio);audio.addEventListener('ended',function(){awardOnce(5,'creator_track_complete','track-'+title.textContent.toLowerCase().replace(/[^a-z0-9]+/g,'-'));renderAudio()})}
if(shell&&audio)shell.addEventListener('click',function(event){if(!audio.duration)return;var rect=shell.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*audio.duration});
document.querySelectorAll('.track').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('.track').forEach(function(item){item.classList.remove('is-active')});button.classList.add('is-active');audio.src=button.dataset.src;cover.src=button.dataset.cover;cover.alt=button.dataset.title+' cover artwork';title.textContent=button.dataset.title;meta.textContent=button.dataset.meta;renderAudio();audio.play().catch(function(){show('Tap the green play button to listen')})})});
var year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
renderAudio();
initFollow().then(revealOwnerControls);
})();
