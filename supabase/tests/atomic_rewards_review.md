# Reward redemption candidate: review before deployment

The migration changes future reward-code redemptions and `claim_reward` only.
It does not reconcile historic wallet offsets, alter configured rewards, or
modify music, games, creator administration or existing account records.
The canonical returned wallet is `profiles.cool_points`; both balance columns
receive the same delta so an existing offset remains unchanged. Lifetime points
increase for credits and do not decrease for spending.

Local validation uses a disposable PostgreSQL 17 container with no network and
synthetic rows. Run `python3 scripts/test-atomic-rewards.py` with Docker available.
The runner pins the image digest, creates and removes its own container, applies
the migration twice, and checks contracts, permissions, offset preservation,
failure rollback and eight-session cap/duplicate-claim races. The fixture includes
the affected table columns and all deployed profile guard implementations read
on November 1, 2026. It is a focused model, not a complete Supabase restoration.

The original positive redemption was reproduced locally returning
`invalid_points_reason` with no partial redemption. Original paid claims also
failed on an ambiguous `points` reference in the trusted-write test context.
Repeated-charge ordering is latent; these results establish no customer loss.

The repository widget uses `redeem_reward_code` and own-user reward history,
and does not read the code catalog. No `claim_reward` browser caller was found.
Service-role catalog access remains. Creator admin RPCs are unchanged.

Before production approval:

- Recheck deployed definitions, table/column grants, policies, profile triggers,
  dependent views/RPCs and any external administration clients for drift.
- Capture the current function definitions and grants privately for recovery.
  Do not restore public code discovery as a routine rollback.
- Verify with synthetic users in isolated Supabase staging: login, redeem,
  history, account isolation, reward claiming and balance refresh on two devices.
- Check music checkout/download, games and creator-owner workflows in staging;
  the repository test suite and diagnostics do not replace these device checks.
- Run Supabase advisors and compare against the previous baseline. The remaining
  production advisors have not been remediated or certified by this candidate.
- Obtain explicit approval for production migration application. A draft PR or
  a passing PostgreSQL model does not authorize production deployment.

No active codes, customer rows, production mutations or paid database branches
are used by these tests. Keep preexisting points and payment records untouched.
