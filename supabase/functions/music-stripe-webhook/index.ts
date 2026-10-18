import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 const secret=Deno.env.get("STRIPE_MUSIC_WEBHOOK_SECRET"),key=Deno.env.get("STRIPE_MUSIC_SECRET_KEY"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!key||!url||!service)return reply(503,{error:"not_configured"});
 const signature=req.headers.get("stripe-signature");
 if(!signature)return reply(400,{error:"missing_signature"});
 const stripe=new Stripe(key,{apiVersion:"2024-12-18.acacia",httpClient:Stripe.createFetchHttpClient()});
 let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret);}catch{return reply(400,{error:"invalid_signature"});}
 const db=createClient(url,service);
 try{
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.payment_status!=="paid")return reply(200,{ignored:"not_paid"});
   const orderId=session.metadata?.order_id;
   if(!orderId||!session.id)return reply(200,{ignored:"not_music_order"});
   const {data:order,error}=await db.from("music_orders").select("id,buyer_id,release_id,amount_cents,currency,status,stripe_session_id").eq("id",orderId).single();
   if(error||!order)return reply(500,{error:"order_not_found"});
   if(order.stripe_session_id!==session.id||order.amount_cents!==session.amount_total||order.currency!==session.currency)return reply(400,{error:"payment_mismatch"});
   if(order.status==="refunded"||order.status==="disputed")return reply(200,{ignored:"revoked"});
   if(order.status==="pending"){
    const {error:paidError}=await db.from("music_orders").update({status:"paid",paid_at:new Date().toISOString(),stripe_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null}).eq("id",order.id).eq("status","pending");
    if(paidError)return reply(500,{error:"order_update_failed"});
   }
   const {error:licenseError}=await db.from("music_licenses").upsert({buyer_id:order.buyer_id,release_id:order.release_id,order_id:order.id,status:"active"},{onConflict:"order_id",ignoreDuplicates:true});
   if(licenseError)return reply(500,{error:"license_failed"});
  }
  if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
   const charge=event.data.object as Stripe.Charge;
   const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   if(!intent)return reply(200,{ignored:"no_intent"});
   const {data:order}=await db.from("music_orders").select("id").eq("stripe_payment_intent_id",intent).maybeSingle();
   if(!order)return reply(200,{ignored:"not_music_order"});
   const status=event.type==="charge.refunded"?"refunded":"disputed";
   const {error:updateError}=await db.from("music_orders").update({status}).eq("id",order.id);
   if(updateError)return reply(500,{error:"refund_update_failed"});
   const {error:revokeError}=await db.from("music_licenses").update({status:"revoked"}).eq("order_id",order.id);
   if(revokeError)return reply(500,{error:"license_revoke_failed"});
  }
  return reply(200,{received:true});
 }catch{return reply(500,{error:"webhook_processing_failed"});}
});
