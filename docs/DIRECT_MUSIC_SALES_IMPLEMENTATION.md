# Direct Music Sales — isolated implementation (NOT LIVE)
This branch is additive and does not modify existing Vault, Creator World, game, support payment, or Shopify checkout flows.

## Critical review gate
The SQL migration is a **proposal only**. Do not apply as written until the `music_tracks.private_storage_path` exposure is fixed: its public SELECT policy would expose private object names. Recommended: split private paths into a service-role-only table, and make `music_tracks` contain preview metadata only. Ensure artist ownership, approval, rights attestation, price-change permissions, private Storage RLS, refunds, and webhook idempotency are reviewed.

## Existing Stripe integration
Production Supabase already has Edge Function slug `smart-task`, named `create-checkout-session`, serving **support contributions**. DO NOT overwrite or repurpose it. Music sales require new, separately named Edge Functions.

## Payment architecture
1. Authenticated user chooses a published release.
2. Dedicated `music-create-checkout` Edge Function looks up price in DB, inserts pending order using service role, and creates Stripe Checkout session with order ID in metadata.
3. Stripe sends signed events to `music-stripe-webhook`. Verify signature against raw request bytes and STRIPE_MUSIC_WEBHOOK_SECRET. Verify paid amount, currency, and session metadata against pending order, update status idempotently and create license.
4. Download function verifies user owns an active license, fetches the private master path server-side, returns short-lived signed URL.
5. Refund/chargeback revokes license according to policy.

## Before launch
- Confirm Stripe account and test/live credentials, endpoint secret, domain.
- Confirm AMS WEST merchant-of-record and creator contracts/revenue share.
- Configure `STRIPE_SECRET_KEY`, `STRIPE_MUSIC_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` only in Supabase secrets.
- Use private bucket for masters, never GitHub Pages or public storage.
- Test webhook replay, wrong amount, unauthorized access, refunds, and Safari.
- Launch with one approved AMS WEST release before opening Creator World.
