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
   const {data:applied,error:applyError}=await db.rpc("music_apply_live_payment_event",{
    p_action:"paid",p_order_id:id,p_stripe_session_id:session.id,
    p_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null,
    p_amount_cents:session.amount_total,p_currency:session.currency
   });
   if(applyError)return reply(500,{error:"payment_fulfillment_failed"});
   return reply(200,{result:applied});
  } else if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
   const charge=event.data.object as Stripe.Charge;
   if(!charge.livemode)return reply(400,{error:"sandbox_charge_rejected"});
   const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   if(!intent)return reply(200,{ignored:true});
   const {data:applied,error:applyError}=await db.rpc("music_apply_live_payment_event",{
    p_action:event.type==="charge.refunded"?"refunded":"disputed",
    p_order_id:null,p_stripe_session_id:null,p_payment_intent_id:intent,
    p_amount_cents:null,p_currency:null
   });
   if(applyError)return reply(500,{error:"refund_fulfillment_failed"});
   return reply(200,{result:applied});
  }
  return reply(200,{received:true});
 }catch{return reply(500,{error:"webhook_processing_failed"});}
});
