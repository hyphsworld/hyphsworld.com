(function(){
'use strict';
var follow=document.getElementById('followCreator');
var share=document.getElementById('shareCreator');
var toast=document.getElementById('worldToast');
var creatorSlug='rojasonthebeat';
var creatorLabel='Rojas';
var rewardBase='hyphsworld.creator.rojas.reward.follow.';
var client=null,user=null,creator=null,isFollowing=false,followBusy=false,timer;
function show(message){toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){toast.classList.remove('show')},2600)}
function storageGet(key){try{return localStorage.getItem(key)}catch(error){return null}}
function storageSet(key,value){try{localStorage.setItem(key,value)}catch(error){}}
function ensureFollowerStat(){var stats=document.querySelector('.creator-stats');if(!stats)return null;var node=stats.querySelector('[data-creator-followers]');if(node)return node;var box=document.createElement('div');node=document.createElement('strong');var label=document.createElement('span');node.setAttribute('data-creator-followers','');node.textContent='—';label.textContent='Followers';box.append(node,label);stats.append(box);return node}
function renderCount(){var node=ensureFollowerStat();if(node&&creator)node.textContent=Math.max(0,Number(creator.follower_count)||0).toLocaleString()}
function render(){if(!follow)return;follow.disabled=followBusy;follow.classList.toggle('is-following',isFollowing);follow.setAttribute('aria-pressed',String(isFollowing));follow.textContent=followBusy?'Please wait…':(isFollowing?'✓ Following '+creatorLabel:'＋ Follow '+creatorLabel)}
async function reward(){if(!user||!window.HWPoints||typeof window.HWPoints.add!=='function')return;var key=rewardBase+user.id;if(storageGet(key)==='true')return;try{var state=await window.HWPoints.add(10,'creator_follow_rojas',{creator_id:creatorSlug,reward_id:'follow'});if(state&&state.user){storageSet(key,'true');show('+10 Cool Points saved')}}catch(error){show('Follow saved • Cool Points will retry later')}}
async function refreshCreator(){var response=await client.from('creators').select('id,slug,follower_count').eq('slug',creatorSlug).maybeSingle();if(response.error||!response.data)throw response.error||new Error('Creator unavailable');creator=response.data;renderCount()}
async function refreshFollowing(){isFollowing=false;if(!user){render();return}var response=await client.from('creator_follows').select('creator_id').eq('creator_id',creator.id).eq('user_id',user.id).maybeSingle();if(response.error)throw response.error;isFollowing=Boolean(response.data);render()}
async function init(){ensureFollowerStat();render();if(!window.HWAuth)return;try{client=await window.HWAuth.getClient();if(!client)return;await refreshCreator();var session=await client.auth.getSession();user=session.data&&session.data.session?session.data.session.user:null;await refreshFollowing()}catch(error){console.warn('Rojas follow state unavailable.',error)}}
if(follow)follow.addEventListener('click',async function(){if(followBusy)return;if(!client||!creator){show('Creator connection is still loading');return}if(!user){show('Log in to follow creators');return}followBusy=true;render();try{if(isFollowing){var remove=await client.from('creator_follows').delete().eq('creator_id',creator.id).eq('user_id',user.id);if(remove.error)throw remove.error;isFollowing=false;show('Creator unfollowed')}else{var add=await client.from('creator_follows').insert({creator_id:creator.id,user_id:user.id});if(add.error&&add.error.code!=='23505')throw add.error;isFollowing=true;show('You’re following Creator #002');reward()}await refreshCreator()}catch(error){show('Could not update follow yet');console.warn('Rojas follow update failed.',error)}finally{followBusy=false;render()}});
if(share)share.addEventListener('click',async function(){var data={title:'RojasOnTheBeat — Creator #002',text:'Enter RojasOnTheBeat’s Creators World on HYPHSWORLD.',url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);show('Profile link copied')}}catch(error){if(error&&error.name!=='AbortError')show('Share link ready')}});
var year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();init();
})();
