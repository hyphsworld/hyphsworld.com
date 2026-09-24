(function(){
'use strict';
var share=document.getElementById('shareCreator');var toast=document.getElementById('worldToast');var toolsPanel=document.getElementById('coachOwnerTools');var timer;
function show(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){toast.classList.remove('show')},2600)}
async function copy(){if(!navigator.clipboard)return false;try{await navigator.clipboard.writeText(location.href);return true}catch(error){return false}}
if(share)share.addEventListener('click',async function(){var data={title:'SIXX FIGGAZ — Coach G',text:'Enter SIXX FIGGAZ’s Coach and Artist World on HYPHSWORLD.',url:location.href};try{if(navigator.share){await navigator.share(data);return}if(await copy())show('Profile link copied')}catch(error){if(error&&error.name!=='AbortError'&&await copy())show('Profile link copied')}});
async function revealOwnerTools(){if(!toolsPanel||!window.HWAuth)return;try{var client=await window.HWAuth.getClient();if(!client)return;var userResult=await client.auth.getUser();var user=userResult.data&&userResult.data.user;if(!user)return;var ownership=await client.from('creators').select('id').eq('slug','sixx-figgaz').eq('owner_user_id',user.id).limit(1).maybeSingle();var isAdmin=Boolean(user.app_metadata&&user.app_metadata.creator_admin===true);if(isAdmin||(!ownership.error&&ownership.data))toolsPanel.hidden=false}catch(error){console.warn('Coach tools remain protected.',error)}}
var year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();revealOwnerTools();
})();
