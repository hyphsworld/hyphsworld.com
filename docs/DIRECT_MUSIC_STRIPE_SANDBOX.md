# HYPHSWORLD Stripe sandbox — verified setup (2026-10-17)

## Sandbox connection
Stripe account: AMS WEST ENTERPRISE LLC sandbox (`acct_1URgK4QmHyWEt8KP`, test mode only).

| Supabase release | Stripe product | Default Stripe price | Amount |
|---|---|---|---|
| Money Counter `78ada5a7-9c36-44d2-8e3e-6f80616a5042` | `prod_VSbkhXScxoqhcb` | `price_1URgX5QmHyWEt8KPFPLG7xvE` | USD 1.99 |
| MULA `634c67a4-da23-422d-85e2-320b0471f831` | `prod_VSbkknFBHNAYq8` | `price_1URgX7QmHyWEt8KPjsSDmrD2` | USD 1.99 |

Both products were created **inactive** pending end-to-end tests. Product metadata stores the corresponding Supabase release ID. Artist-controlled amounts continue to be sourced from Supabase server-side; Stripe prices here are reference sandbox prices only.

## Webhook registered in sandbox
- Event destination ID: `we_1URgXOQmHyWEt8KPUD4O5ANk`
- Target: `https://yuhxtdkhsltaqiagrtys.supabase.co/functions/v1/music-stripe-webhook`
- Enabled snapshot events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`
- Event destination API version: `2026-08-26.dahlia`.
- **Not yet verified**: matching signing secret configured as `STRIPE_MUSIC_WEBHOOK_SECRET` in Supabase; Stripe sandbox API credential in Supabase Edge Functions secrets; the first successful signature-verified webhook delivery.

## Required before launch
1. In the Stripe sandbox Event Destinations dashboard retrieve the webhook signing secret and save it directly to Supabase Edge Function secrets as `STRIPE_MUSIC_WEBHOOK_SECRET`. Do not commit or paste secrets into chat.
2. Configure a sandbox restricted API key (appropriate Checkout Sessions permissions), as `STRIPE_SECRET_KEY` in Supabase secrets. **Never place live keys into the sandbox testing flow.**
3. Review Stripe webhook implementation against snapshot payload version and handle replay, asynchronous payments, and refund edge cases.
4. Do not mark releases as published until a successful sandbox purchase creates a license, My Music Library correctly retrieves each private master, and refund events revoke access.
5. Test rights/producer and featured artist approvals and pricing before publishing. Verify master Storage object existence using the authenticated storage API, not public URLs.
6. Finish actual cover artwork placement and wire Buy buttons behind a feature gate. Leave PR in draft until regression testing passes.

**Existing HYPHSWORLD support checkout remains untouched.**
