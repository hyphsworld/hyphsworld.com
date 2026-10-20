import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.0";
const ORIGIN="https://hyphsworld.com";
const OWNER="7f269ba1-8b39-4551-8afd-ab7190860b6a";
const RELEASE="634c67a4-da23-422d-85e2-320b0471f831";
const TRACK="c7197ac1-2dc1-4632-854e-1a6455c01852";
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return reply(200,{ok:true});
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==ORIGIN)return reply(403,{error:"invalid_origin"});
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return reply(401,{error:"login_required"});
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!anon||!service)return reply(503,{error:"not_configured"});
 try {
  const userDb=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error}=await userDb.auth.getUser();
  if(error||!user||user.is_anonymous)return reply(401,{error:"login_required"});
  if(user.id!==OWNER)return reply(403,{error:"owner_only"});
  const db=createClient(url,service);
  const {data:orders,error:orderError}=await db.from("music_orders").select("id").eq("buyer_id",OWNER).eq("release_id",RELEASE).eq("status","paid").like("stripe_session_id","cs_live_%");
  if(orderError)return reply(503,{error:"order_lookup_failed"});
  if(!orders?.length)return reply(200,{paid:false});
  const ids=orders.map(o=>o.id);
  const {data:licenses,error:licenseError}=await db.from("music_licenses").select("order_id").eq("buyer_id",OWNER).eq("release_id",RELEASE).eq("status","active").in("order_id",ids).limit(1);
  if(licenseError)return reply(503,{error:"license_lookup_failed"});
  if(!licenses?.length)return reply(200,{paid:false});
  const body=await req.json().catch(()=>({}));
  if(body.download!==true)return reply(200,{paid:true,track:"MULA"});
  const {data:master,error:masterError}=await db.from("music_master_files").select("bucket,object_path").eq("track_id",TRACK).single();
  if(masterError||!master)return reply(503,{error:"master_unavailable"});
  const {data,error:downloadError}=await db.storage.from(master.bucket).createSignedUrl(master.object_path,60,{download:true});
  if(downloadError||!data?.signedUrl)return reply(503,{error:"download_unavailable"});
  return reply(200,{paid:true,url:data.signedUrl});
 }catch{return reply(500,{error:"owner_test_library_unavailable"});}
});