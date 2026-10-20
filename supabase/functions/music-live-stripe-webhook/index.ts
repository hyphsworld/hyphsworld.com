// HYPHSWORLD LIVE Stripe webhook. STAGED ONLY: do not deploy until reviewed.
// Separate live signing secret; webhook receives Stripe's raw request body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const reply=(status:number,payload:unknown)=>new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 const publicSalesOn=Deno.env.get("HYPHSWORLD_LIVE_MUSIC_ENABLED")==="true";
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
   if(!id||!session.id.startsWith("cs_live_"))return reply(200,{ignored:true});
   const ownerTest=session.metadata?.store==="hyphsworld_owner_live_test"||session.metadata?.store==="hyphsworld_owner_live_test_mula";
   const expectedOwnerRelease=session.metadata?.store==="hyphsworld_owner_live_test_mula"?"634c67a4-da23-422d-85e2-320b0471f831":"78ada5a7-9c36-44d2-8e3e-6f80616a5042";
   if(ownerTest){
     const {data:o,error:e}=await db.from("music_orders").select("buyer_id,release_id,amount_cents,currency,stripe_session_id").eq("id",id).maybeSingle();
     if(e)return reply(500,{error:"order_lookup_failed"});
     if(!o||o.buyer_id!=="7f269ba1-8b39-4551-8afd-ab7190860b6a"||o.release_id!==expectedOwnerRelease||o.amount_cents!==199||o.currency!=="usd"||o.stripe_session_id!==session.id||session.amount_total!==199||session.currency!=="usd")return reply(200,{ignored:true});
   }else if(!publicSalesOn||session.metadata?.store!=="hyphsworld_music_live")return reply(200,{ignored:true});
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
   if(!publicSalesOn){
     const {data:o,error:e}=await db.from("music_orders").select("buyer_id,release_id,amount_cents,currency").eq("stripe_payment_intent_id",intent).like("stripe_session_id","cs_live_%").maybeSingle();
     if(e)return reply(500,{error:"order_lookup_failed"});
     if(!o||o.buyer_id!=="7f269ba1-8b39-4551-8afd-ab7190860b6a"||!["78ada5a7-9c36-44d2-8e3e-6f80616a5042","634c67a4-da23-422d-85e2-320b0471f831"].includes(o.release_id)||o.amount_cents!==199||o.currency!=="usd")return reply(200,{ignored:true});
   }
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
