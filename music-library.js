(async function () {
  'use strict';
  const status=document.getElementById('library-status');
  const list=document.getElementById('library-releases');
  const PROJECT='https://yuhxtdkhsltaqiagrtys.supabase.co';
  const KEY='sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e';
  function setStatus(message){status.textContent=message;}
  function errorText(e){return String(e?.message||e||'Unknown error');}
  try {
    if(!window.HWAuth)throw Error('HYPHSWORLD login is unavailable.');
    const user=await window.HWAuth.getCurrentUser();
    if(!user?.userId) {setStatus('Sign in to access your purchased music.');const a=document.createElement('a');a.href='auth.html?next=music-library.html';a.textContent=' Sign in';status.append(a);return;}
    const client=await window.HWAuth.getClient();
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError||!session||session.user.id!==user.userId)throw Error('Please sign in again using your HYPHSWORLD account.');
    const {data:licenses,error:licenseError}=await client.from('music_licenses').select('release_id').eq('buyer_id',session.user.id).eq('status','active');
    if(licenseError)throw licenseError;
    if(!licenses?.length){setStatus('No completed music purchases in this account yet.');return;}
    const ids=[...new Set(licenses.map(l=>l.release_id))];
    const {data:releases,error:releaseError}=await client.from('music_releases').select('id,title,featured_artist,producer_credit').in('id',ids);
    if(releaseError)throw releaseError;
    if(!releases?.length)throw Error('Your license exists, but release information is unavailable.');
    setStatus(releases.length+' purchased release(s) ready.');
    for(const release of releases){
      const card=document.createElement('article');card.className='card';
      const title=document.createElement('h2');title.textContent=release.title;card.append(title);
      const {data:tracks,error:trackError}=await client.from('music_tracks').select('id,title,track_number').eq('release_id',release.id).order('track_number');
      if(trackError){const message=document.createElement('p');message.textContent='Track list temporarily unavailable.';card.append(message);list.append(card);continue;}
      for(const track of tracks||[]){
        const row=document.createElement('p');const name=document.createElement('span');name.textContent=track.title+' ';
        const button=document.createElement('button');button.textContent='Download WAV';
        button.addEventListener('click',async()=>{
          button.disabled=true;button.textContent='Preparing download…';
          try{
            const {data:{session:current}}=await client.auth.getSession();
            if(!current)throw Error('Please sign in again.');
            const response=await fetch(PROJECT+'/functions/v1/music-download',{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+current.access_token},body:JSON.stringify({track_id:track.id})});
            const payload=await response.json();
            if(!response.ok||!payload.url)throw Error(payload.error||'Unable to prepare download.');
            const signed=new URL(payload.url);
            if(signed.protocol!=='https:'||signed.hostname!=='yuhxtdkhsltaqiagrtys.supabase.co')throw Error('Unexpected download destination.');
            window.location.assign(signed.href);
          }catch(e){setStatus('Download problem: '+errorText(e));}
          finally{button.disabled=false;button.textContent='Download WAV';}
        });
        row.append(name,button);card.append(row);
      }
      list.append(card);
    }
  }catch(e){setStatus('Music Library error: '+errorText(e));}
})();
