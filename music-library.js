(async function(){
"use strict";
const status=document.getElementById("library-status"),list=document.getElementById("library-releases");
const config={url:"https://yuhxtdkhsltaqiagrtys.supabase.co",key:"sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e"};
if(!window.supabase?.createClient){status.textContent="Music library unavailable. Please try again.";return;}
const client=window.supabase.createClient(config.url,config.key);
const {data:{user},error}=await client.auth.getUser();
if(error||!user){status.textContent="Sign in to access your music.";const a=document.createElement("a");a.href="auth.html?next=music-library.html";a.textContent=" Sign in";status.append(a);return;}
const {data:licenses,error:licenseError}=await client.from("music_licenses").select("release_id").eq("buyer_id",user.id).eq("status","active");
if(licenseError){status.textContent="Your library is not available yet.";return;}
if(!licenses?.length){status.textContent="No purchased music yet.";return;}
const ids=[...new Set(licenses.map(x=>x.release_id))];
const {data:releases,error:releaseError}=await client.from("music_releases").select("id,title,featured_artist,producer_credit").in("id",ids);
if(releaseError){status.textContent="Unable to load purchased releases.";return;}
status.textContent=releases.length+" release(s) in your library.";
for(const release of releases){
 const card=document.createElement("article");card.className="card";
 const h=document.createElement("h2");h.textContent=release.title;card.append(h);
 const {data:tracks}=await client.from("music_tracks").select("id,title,track_number").eq("release_id",release.id).order("track_number");
 for(const track of tracks||[]){
  const row=document.createElement("div"),name=document.createElement("span"),btn=document.createElement("button");
  name.textContent=track.title+" ";btn.textContent="Download WAV";
  btn.addEventListener("click",async()=>{
   btn.disabled=true;btn.textContent="Preparing…";
   try{
    const {data:{session}}=await client.auth.getSession();
    if(!session)throw Error("Sign in required");
    const response=await fetch(config.url+"/functions/v1/music-download",{method:"POST",headers:{"content-type":"application/json",apikey:config.key,authorization:"Bearer "+session.access_token},body:JSON.stringify({track_id:track.id})});
    const result=await response.json();
    if(!response.ok||!result.url)throw Error(result.error||"Download unavailable");
    window.location.assign(result.url);
   }catch(e){alert("Unable to download: "+e.message);}
   finally{btn.disabled=false;btn.textContent="Download WAV";}
  });
  row.append(name,btn);card.append(row);
 }
 list.append(card);
}
})();
