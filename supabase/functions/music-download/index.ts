import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const response=(status:number,obj:unknown)=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json","access-control-allow-origin":"https://hyphsworld.com","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return response(200,{ok:true});
 if(req.method!=="POST")return response(405,{error:"method_not_allowed"});
 try{
  const auth=req.headers.get("authorization");
  if(!auth?.startsWith("Bearer "))return response(401,{error:"login_required"});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await client.auth.getUser();
  if(!user||user.is_anonymous)return response(401,{error:"login_required"});
  const {track_id}=await req.json();
  if(typeof track_id!=="string"||!/^[0-9a-f-]{36}$/i.test(track_id))return response(400,{error:"invalid_track"});
  const db=createClient(url,service);
  const {data:track}=await db.from("music_tracks").select("id,release_id").eq("id",track_id).single();
  if(!track)return response(404,{error:"track_not_found"});
  const {data:licenses}=await db.from("music_licenses").select("id").eq("buyer_id",user.id).eq("release_id",track.release_id).eq("status","active").limit(1);
  if(!licenses?.length)return response(403,{error:"purchase_required"});
  const {data:master}=await db.from("music_master_files").select("bucket,object_path").eq("track_id",track_id).single();
  if(!master)return response(404,{error:"master_unavailable"});
  const {data,error}=await db.storage.from(master.bucket).createSignedUrl(master.object_path,60);
  if(error||!data)return response(500,{error:"download_unavailable"});
  return response(200,{url:data.signedUrl,expires_in:60});
 }catch{return response(500,{error:"download_failed"});}
});
