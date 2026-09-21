(function(){
'use strict';
var client,user,form=document.getElementById('creatorApplicationForm'),panel=document.getElementById('applicationPanel'),submit=document.getElementById('applicationSubmit');
function el(id){return document.getElementById(id)}
function status(message){el('applicationStatus').textContent=message}
function categories(){return el('applicationCategories').value.split(',').map(function(x){return x.trim().toLowerCase()}).filter(Boolean).slice(0,8)}
async function load(){
  if(!window.HWAuth)throw new Error('Account service did not load.');
  client=await window.HWAuth.getClient();
  var auth=await client.auth.getUser();
  if(auth.error)throw auth.error;
  user=auth.data&&auth.data.user;
  if(!user){location.href='auth.html?next='+encodeURIComponent('creator-apply.html');return}
  var existing=await client.from('creator_applications').select('status,review_notes,created_at').eq('applicant_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data){
    panel.hidden=true;
    var label=String(existing.data.status||'pending').replace('_',' ').toUpperCase();
    status('APPLICATION '+label+(existing.data.review_notes?' • '+existing.data.review_notes:''));
    return;
  }
  el('applicationEmail').value=user.email||'';
  panel.hidden=false;
  status('SIGNED IN • APPLICATION READY');
}
form.addEventListener('submit',async function(event){
  event.preventDefault();
  submit.disabled=true;status('Submitting securely…');
  var row={applicant_id:user.id,display_name:el('applicationName').value.trim(),categories:categories(),city:el('applicationCity').value.trim(),contact_email:el('applicationEmail').value.trim().toLowerCase(),portfolio_url:el('applicationPortfolio').value.trim(),bio:el('applicationBio').value.trim()};
  if(!row.categories.length){status('Add at least one creative category.');submit.disabled=false;return}
  var result=await client.from('creator_applications').insert(row);
  if(result.error){status('Application not submitted: '+result.error.message);submit.disabled=false;return}
  form.reset();panel.hidden=true;status('APPLICATION RECEIVED • HUMAN REVIEW PENDING');
});
window.addEventListener('load',function(){load().catch(function(error){status('Application unavailable: '+(error.message||error))})});
})();
