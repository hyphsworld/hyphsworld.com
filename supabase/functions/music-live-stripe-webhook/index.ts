// HYPHSWORLD LIVE Stripe webhook. STAGED ONLY: do not deploy until reviewed.
// Separate live signing secret; webhook receives Stripe's raw request body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const reply=(status:number,payload:unknown)=>new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 if(Deno.env.get("HYPHSWORLD_LIVE_MUSIC_ENABLED")!=="true")return reply(503,{error:"sales_not_open"});
 const secret=Deno.env.get("STRIPE_MUSIC_LIVE_WEBHOOK_SECRET")||"";
 const key=Deno.env.get("STRIPE_MUSIC_LIVE_SECRET_KEY")||"";
 const url=Deno.env.get("SUPABASE_URL")||"";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!secret.startsWith("whsec_")||!key.startsWith("rk_live_")&&!key.startsWith("sk_live_")||!url||!service)return reply(503,{error:"not_configured"});
 const signature=req.headers.get("stripe-signature")||"";
 if(!signature)return reply(400,{error:"invalid_signature"});
 const stripe=new Stripe(key,{apiVersion:"2026-08-26.dahlia",httpClient:Stripe.createFetchHttpClient()});
 let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret);}catch{return reply(400,{error:"invalid_signature"});}
 if(!event.livemode)return reply(400,{error:"sandbox_event_rejected"});
 const db=createClient(url,service);
 try{
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const session=event.data.object as Stripe.Checkout.Session;
   if(!session.livemode||session.payment_status!=="paid")return reply(200,{ignored:true});
   const id=session.metadata?.order_id;
   if(!id||session.metadata?.store!=="hyphsworld_music_live"||!session.id.startsWith("cs_live_"))return reply(200,{ignored:true});
   const {data:order,error:lookupError}=await db.from("music_orders").select("id,buyer_id,release_id,stripe_session_id,amount_cents,currency,status").eq("id",id).maybeSingle();
   if(lookupError||!order)return reply(500,{error:"order_lookup_failed"});
   if(order.stripe_session_id!==session.id||order.amount_cents!==session.amount_total||order.currency!==session.currency)return reply(400,{error:"order_mismatch"});
   if(order.status!=="pending"&&order.status!=="paid")return reply(200,{ignored:true});
   if(order.status==="pending"){
    const {error:updateError}=await db.from("music_orders").update({status:"paid",stripe_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null,paid_at:new Date().toISOString()}).eq("id",order.id).eq("status","pending");
    if(updateError)return reply(500,{error:"order_update_failed"});
   }
   // Webhooks can arrive out of order or concurrently. Recheck committed order state
   // before issuing a license; refunded/disputed orders must never be reactivated.
   const {data:confirmed,error:confirmError}=await db.from("music_orders").select("status,stripe_session_id").eq("id",order.id).single();
   if(confirmError||!confirmed)return reply(500,{error:"order_confirmation_failed"});
   if(confirmed.status!=="paid"||confirmed.stripe_session_id!==session.id)return reply(200,{ignored:true});
   const {error:licenseError}=await db.from("music_licenses").upsert({order_id:order.id,buyer_id:order.buyer_id,release_id:order.release_id,status:"active"},{onConflict:"order_id",ignoreDuplicates:true});
   if(licenseError)return reply(500,{error:"license_creation_failed"});
  } else if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
   const charge=event.data.object as Stripe.Charge;
   if(!charge.livemode)return reply(400,{error:"sandbox_charge_rejected"});
   const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   if(!intent)return reply(200,{ignored:true});
   const {data:order,error:orderError}=await db.from("music_orders").select("id,stripe_session_id").eq("stripe_payment_intent_id",intent).maybeSingle();
   if(orderError)return reply(500,{error:"order_lookup_failed"});
   if(!order||!order.stripe_session_id?.startsWith("cs_live_"))return reply(200,{ignored:true});
   const status=event.type==="charge.refunded"?"refunded":"disputed";
   const {error:statusError}=await db.from("music_orders").update({status}).eq("id",order.id);
   if(statusError)return reply(500,{error:"status_update_failed"});
   const {error:revokeError}=await db.from("music_licenses").update({status:"revoked"}).eq("order_id",order.id);
   if(revokeError)return reply(500,{error:"license_revoke_failed"});
  }
  return reply(200,{received:true});
 }catch{return reply(500,{error:"webhook_processing_failed"});}
});
