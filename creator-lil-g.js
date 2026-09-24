(function(){
'use strict';
var share=document.getElementById('shareAthlete');
var toast=document.getElementById('worldToast');
var video=document.getElementById('athleteHighlights');
var shell=document.getElementById('videoShell');
var timer;
function show(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){toast.classList.remove('show')},2600)}
function applyHighlightSource(){if(!video||!shell)return;var source=video.getAttribute('data-mp4');if(source){video.src=source;shell.classList.add('has-source')}else{video.removeAttribute('src');shell.classList.remove('has-source')}}
async function copyLink(){if(!navigator.clipboard)return false;try{await navigator.clipboard.writeText(location.href);return true}catch(error){return false}}
if(share)share.addEventListener('click',async function(){var data={title:'LIL G — HYPHSWORLD Athlete',text:'Meet Lil G, a Baseball Youth All-American on HYPHSWORLD.',url:location.href};try{if(navigator.share){await navigator.share(data);return}if(await copyLink())show('Profile link copied')}catch(error){if(error&&error.name!=='AbortError'&&await copyLink())show('Profile link copied')}});
var year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
applyHighlightSource();
})();
