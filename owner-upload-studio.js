(function(){'use strict';
const $=id=>document.getElementById(id), BUCKET='owner-upload-drafts', MAX=50*1024*1024;
let client,owner,previewURL;
const authorized=u=>!!(u&&u.app_metadata&&(u.app_metadata.role==='owner'||u.app_metadata.hw_owner===true));
const message=s=>{$('message').textContent=s};
async function checkOwner(){
  const verified=await client.auth.getUser();
  if(verified.error||!verified.data.user||verified.data.user.id!==owner.userId||!authorized(verified.data.user))throw Error('Owner authorization required');
}
async function init(){try{
 if(!window.HWAuth)throw Error('Login service unavailable');
 owner=await HWAuth.getCurrentUser(); client=await HWAuth.getClient();
 if(!owner||!owner.userId){$('gateMessage').textContent='Sign in with your owner account.';return}
 await checkOwner();$('gate').classList.add('hidden');$('studio').classList.remove('hidden');$('library').classList.remove('hidden');await list();
 }catch(e){$('gateMessage').textContent='Access unavailable: '+e.message}}
$('video').addEventListener('change',()=>{
 if(previewURL)URL.revokeObjectURL(previewURL);
 const f=$('video').files[0];$('preview').classList.add('hidden');$('preview').removeAttribute('src');
 if(!f)return;
 if(f.type!=='video/mp4'||f.size<1||f.size>MAX){message('Choose an MP4 under 50 MB.');return}
 previewURL=URL.createObjectURL(f);$('preview').src=previewURL;$('preview').classList.remove('hidden');message('Ready to save privately.');
});
$('form').addEventListener('submit',async e=>{e.preventDefault();
 const file=$('video').files[0],title=$('title').value.trim();
 if(!file||!title||file.type!=='video/mp4'||file.size<1||file.size>MAX){message('Select a valid MP4 under 50 MB and add a title.');return}
 $('save').disabled=true;$('progress').classList.remove('hidden');$('progress').value=10;
 try{await checkOwner();
 const path=owner.userId+'/'+crypto.randomUUID()+'.mp4';message('Uploading to private draft storage…');
 const uploaded=await client.storage.from(BUCKET).upload(path,file,{contentType:'video/mp4',upsert:false});
 if(uploaded.error)throw uploaded.error;$('progress').value=80;
 const record={owner_user_id:owner.userId,title,description:$('description').value.trim(),content_type:'video',destination:$('destination').value,visibility:'draft',storage_path:path,mime_type:'video/mp4',file_size:file.size};
 const saved=await client.from('owner_media_drafts').insert(record).select('id').single();
 if(saved.error){await client.storage.from(BUCKET).remove([path]);throw saved.error}
 $('progress').value=100;message('Saved as private draft. Nothing published.');$('form').reset();$('preview').classList.add('hidden');await list();
 }catch(err){message('Upload failed: '+err.message)}finally{$('save').disabled=false}
});
async function list(){const r=await client.from('owner_media_drafts').select('title,destination,visibility,created_at').order('created_at',{ascending:false}).limit(30);
 const ul=$('items');ul.replaceChildren();if(r.error){message('Draft list unavailable: '+r.error.message);return}
 for(const item of r.data){const li=document.createElement('li');li.textContent=item.title+' • '+item.destination+' • '+item.visibility+' • '+new Date(item.created_at).toLocaleString();ul.append(li)}
 if(!r.data.length){const li=document.createElement('li');li.textContent='No drafts yet';ul.append(li)}
}
init();})();
