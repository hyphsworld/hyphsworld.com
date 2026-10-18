// HYPHSWORLD live music checkout — NOT DEPLOYED. Launch requires security approval.
// Separate credentials and function name from the working sandbox flow.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const ORIGIN="https://hyphsworld.com";
const out=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return out(200,{ok:true});
 if(req.method!=="POST")return out(405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==ORIGIN)return out(403,{error:"invalid_origin"});
 // Always fail closed until explicit production launch authorization.
 if(Deno.env.get("HYPHSWORLD_LIVE_MUSIC_ENABLED")!=="true")return out(503,{error:"sales_not_open"});
 const stripe=Deno.env.get("STRIPE_MUSIC_LIVE_SECRET_KEY")||"";
 if(!(stripe.startsWith("rk_live_")||stripe.startsWith("sk_live_")))return out(503,{error:"live_key_not_configured"});
 const url=Deno.env.get("SUPABASE_URL")||"",pub=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!pub||!service)return out(503,{error:"service_unavailable"});
 const authorization=req.headers.get("authorization")||"";
 if(!authorization.startsWith("Bearer "))return out(401,{error:"login_required"});
 try{
  const userDb=createClient(url,pub,{global:{headers:{Authorization:authorization}}});
  const {data:{user},error:userError}=await userDb.auth.getUser();
  if(userError||!user||user.is_anonymous)return out(401,{error:"login_required"});
  const body=await req.json();
  if(!body||typeof body.release_id!=="string"||!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(body.release_id))return out(400,{error:"invalid_release"});
  const db=createClient(url,service);
  const {data:release,error:releaseError}=await db.from("music_releases").select("id,title,price_cents,currency,status,creator_id").eq("id",body.release_id).maybeSingle();
  if(releaseError||!release||release.status!=="published")return out(404,{error:"release_unavailable"});
  // AMS WEST-only phase 1; never extend automatically to other creator IDs.
  if(release.creator_id!=="2ef701f6-37e0-474d-b17a-1ff973b29f3a")return out(403,{error:"seller_not_enabled"});
  if(release.currency!=="usd"||!Number.isInteger(release.price_cents)||release.price_cents<99)return out(400,{error:"invalid_price"});
  const {data:licensed}=await db.from("music_licenses").select("id").eq("buyer_id",user.id).eq("release_id",release.id).eq("status","active").limit(1);
  if(licensed?.length)return out(409,{error:"already_owned"});
  const {data:order,error:orderError}=await db.from("music_orders").insert({buyer_id:user.id,release_id:release.id,amount_cents:release.price_cents,currency:"usd",status:"pending"}).select("id").single();
  if(orderError||!order)return out(500,{error:"order_unavailable"});
  const form=new URLSearchParams();
  form.set("mode","payment");
  form.set("success_url",ORIGIN+"/music-library.html?session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url",ORIGIN+"/music-store.html");
  form.set("client_reference_id",order.id);
  form.set("metadata[order_id]",order.id);
  form.set("metadata[store]","hyphsworld_music_live");
  form.set("line_items[0][quantity]","1");
  form.set("line_items[0][price_data][currency]","usd");
  form.set("line_items[0][price_data][unit_amount]",String(release.price_cents));
  form.set("line_items[0][price_data][product_data][name]",release.title);
  const stripeResponse=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"authorization":"Bearer "+stripe,"content-type":"application/x-www-form-urlencoded","Idempotency-Key":order.id},body:form});
  const session=await stripeResponse.json();
  if(!stripeResponse.ok||!session?.id?.startsWith("cs_live_")||typeof session.url!=="string")return out(502,{error:"checkout_unavailable"});
  const {error:syncError}=await db.from("music_orders").update({stripe_session_id:session.id}).eq("id",order.id).eq("status","pending");
  if(syncError)return out(500,{error:"order_sync_failed"});
  return out(200,{url:session.url});
 }catch{return out(500,{error:"checkout_unavailable"});}
});
