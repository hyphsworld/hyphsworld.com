# HYPHSWORLD Direct Music — AMS WEST first launch

## Scope and rollout
- **Phase 1:** AMS WEST sells **Money Counter — Hyph Life** and **MULA — Hyph Life ft. KILI 631** directly to fans.
- **Phase 2:** Onboard **approved Creator World artists**, after merchant-of-record, payout and tax/identity procedures are approved.
- Suggested price: **USD $1.99 each**; artists may control their own pricing once seller tooling is approved.
- **Current status:** sandbox end-to-end purchase, license and download completed for both tracks. **NOT LIVE**.

## Verified sandbox assets
| Release | Private bucket | Current licensed download | Status |
|---|---|---|---|
| Money Counter | `music-paid-masters` | `MONEY COUNTER.wav` | Sandbox purchase + WAV download tested |
| MULA | `music-paid-masters` | `MULA_Main_Output_Compatible_16bit.wav` | Sandbox purchase + WAV download tested |

Original MULA file `MULA ft KILI631 2.wav` stays in private Storage as a backup. No master belongs in public GitHub Pages.

## Public launch gates — ALL must pass
- [ ] Confirm each master’s ownership, samples, publishing and mechanical rights; confirm featured artist / producer approvals and royalty agreements.
- [ ] Upload the **original supplied cover artwork** to a public *artwork-only* location, reference it in storefront and check mobile sizing/alt text.
- [ ] Define AMS WEST merchant of record and sales tax setup, chargebacks, customer refund terms, digital license terms, delivery support and receipt content.
- [ ] Provision live Stripe merchant mode, live-only restricted credential, live webhook destination/signing secret. **Never put keys in GitHub**.
- [ ] Separate live checkout/webhook environment from sandbox test bypass. Explicitly reject test keys in live flow, require published+approved release, and verify authentic signed live webhook.
- [ ] Resolve checkout idempotency/race/refund and chargeback edge cases; test duplicates and replayed webhooks; verify entitled user cannot download after refund.
- [ ] Confirm storage permissions: anonymous/unauthenticated requests cannot fetch private paid masters; licensed buyer may request short-lived download links only.
- [ ] Run 2 signed checkout tests for launch environment and both files; confirm full downloaded audio duration and playback.
- [ ] Confirm login persistence, buyer library visibility, Safari/mobile checkout/download, and graceful failure.
- [ ] Review and approve PR #344; ensure no unrelated website or game behavior changes.
- [ ] Publish the storefront entry point intentionally only after all checks; monitor error and webhook delivery logs.

## Phase two — Creator World marketplace
- Artist-controlled suggested price and release approvals
- Seller split/payout policy, tax/identity onboarding, records and reporting
- Music rights declarations and moderation / takedown procedure
- No automatic seller payouts or Stripe Connect onboarding until business model and compliance approved

## Current safety controls
- Store remains closed to the public; both releases stay `draft`.
- Existing HYPHSWORLD support checkout, games, Cool Points and other workflows remain unchanged.
- Owner-only Stripe sandbox test must never be permitted with production/live credentials.
