import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":"https://hyphsworld.com","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json(200,{ok:true});
 if(req.method!=="POST")return json(405,{error:"method_not_allowed"});
 try {
  const auth=req.headers.get("authorization");
  if(!auth?.startsWith("Bearer "))return json(401,{error:"login_required"});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,stripe=Deno.env.get("STRIPE_SECRET_KEY");
  if(!stripe||!service)return json(503,{error:"checkout_not_configured"});
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:authError}=await userClient.auth.getUser();
  if(authError||!user||user.is_anonymous)return json(401,{error:"login_required"});
  const {release_id}=await req.json();
  if(typeof release_id!=="string"||!/^[0-9a-f-]{36}$/i.test(release_id))return json(400,{error:"invalid_release"});
  const db=createClient(url,service);
  const {data:release,error}=await db.from("music_releases").select("id,title,price_cents,currency,status").eq("id",release_id).single();
  if(error||!release||release.status!=="published")return json(404,{error:"release_unavailable"});
  const {data:existing}=await db.from("music_licenses").select("id").eq("buyer_id",user.id).eq("release_id",release_id).eq("status","active").limit(1);
  if(existing?.length)return json(409,{error:"already_owned"});
  const {data:order,error:orderError}=await db.from("music_orders").insert({buyer_id:user.id,release_id:release.id,amount_cents:release.price_cents,currency:release.currency,status:"pending"}).select("id").single();
  if(orderError||!order)return json(500,{error:"order_failed"});
  const params=new URLSearchParams();
  params.set("mode","payment");params.set("payment_method_types[0]","card");
  params.set("success_url","https://hyphsworld.com/music-library.html?session_id={CHECKOUT_SESSION_ID}");
  params.set("cancel_url","https://hyphsworld.com/music-store.html");
  params.set("client_reference_id",order.id);params.set("metadata[order_id]",order.id);
  params.set("line_items[0][quantity]","1");params.set("line_items[0][price_data][currency]",release.currency);
  params.set("line_items[0][price_data][unit_amount]",String(release.price_cents));
  params.set("line_items[0][price_data][product_data][name]",release.title);
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+stripe,"content-type":"application/x-www-form-urlencoded","Idempotency-Key":order.id},body:params});
  const session=await response.json();
  if(!response.ok||!session.id||!session.url)return json(502,{error:"checkout_unavailable"});
  const {error:updateError}=await db.from("music_orders").update({stripe_session_id:session.id}).eq("id",order.id).eq("status","pending");
  if(updateError)return json(500,{error:"order_sync_failed"});
  return json(200,{url:session.url});
 }catch{return json(500,{error:"checkout_failed"});}
});
