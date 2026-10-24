# HYPHSWORLD music sales — final isolated launch rehearsal

This checklist is intentionally **non-production**. Public checkout must remain disabled and real customer purchases, Money Counter refunds and the paid MULA order must not be modified.

## Baseline (verified 2026-10-22)
- GitHub `music-store.js`: `PUBLIC_CHECKOUT_APPROVED = false`.
- Stripe live checkout and refund webhooks have delivered successfully to Supabase.
- Stripe manual replay of Money Counter refund produced HTTP 200 / `already_revoked`; initial receipt produced HTTP 200 / `revoked`. **This proves duplicate event idempotency, not automatic retry after a failure.**
- Supabase: refunded/pending purchases have zero active licenses; `music_apply_live_payment_event` is executable by `service_role`, not `anon` or `authenticated`.
- Supabase `music-download` code requires authenticated non-anonymous user, active license, live paid order for published releases, and creates a 60-second signed URL. **Runtime negative tests still required.**

## Gate A — Stripe automatic failure/retry (isolated)
Prerequisite: separately authorized Stripe **sandbox** and isolated Supabase branch or equivalent disposable environment, with no production secrets, purchasers or database.

1. Deploy a test-only webhook endpoint with correct sandbox signing secret. Preserve production endpoint unchanged.
2. Generate a sandbox `checkout.session.completed` event with an isolated test order; ensure signature verification succeeds.
3. Deliberately return HTTP 500 on the first *valid* delivery **before changing any order/license**. Record event ID, attempt ID, timestamp, HTTP status.
4. Allow Stripe to retry automatically; confirm Workbench delivery attempts show an **automatic** second delivery with HTTP 200. A manual resend does not satisfy this gate.
5. Assert exactly one paid order and one active license, even if the exact event is resent again.
6. Exercise fulfillment RPC failure returning non-2xx and verify successful retry; repeat with refund/dispute out-of-order sequence. Ensure reversal wins, no renewed access.
7. Record evidence: sandbox IDs, event IDs, delivery timestamps, HTTP statuses, database before/after, test logs. Remove test resources when done.

**Pass only when actual Stripe automatic retry delivery is observed.**

## Gate B — Download authorization (isolated)
Use separate test accounts A (buyer) and B (non-buyer); dummy masters only:
- A with paid order + active entitlement: POST `music-download` returns 200 and a signed URL; file download succeeds.
- No login, anonymous user, malformed track ID: rejected.
- B requesting A's track without own entitlement: 403; no signed URL.
- Pending/unpaid order: 403; no URL (including when any inconsistent active license exists).
- Refunded or disputed order / revoked license: 403; no fresh URL.
- Published release with `cs_test_` only: denied; requires paid `cs_live_` order.
- Signed URL used after 60 seconds: storage rejects it (allow for clock skew in measured test).
- Test whether an already-issued 60-second URL remains usable shortly after a refund. Document this inherent short-lived URL exposure; revocation prevents **new** URLs but does not necessarily invalidate an existing signed URL immediately.
- Verify bucket is private and user cannot directly read masters via Storage REST.

**Pass only on actual runtime HTTP/storage evidence, not source-code review alone.**

## Gate C — Final production read-only approval review
- Verify GitHub CI, no unintended file changes, SSL/deployment links, buyer-facing policies and store navigation.
- Confirm Stripe webhook enabled with required event types and no outstanding deliveries; account charges/payouts enabled.
- Confirm Supabase RLS, service-only privileged RPC, signature verification, no leaked secrets; inspect music-specific security advisories.
- Reconcile all live paid/refunded/disputed orders to active/revoked licenses.
- Confirm **public checkout disabled**, releases remain draft, no unapproved public charges.
- Report remaining risks and request separate, explicit owner go-live approval. Do not merge a launch-toggle change without that approval.

## Current verdict
Verified: real refund-to-revocation and duplicate manual resend; payment RPC privilege isolation and production public checkout lock.
Unverified: automatic Stripe retry following injected HTTP failure; negative download runtime cases; isolated sandbox.
