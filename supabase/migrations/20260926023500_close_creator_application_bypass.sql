-- Close the legacy Creator World enrollment bypass left behind by the
-- application-gate rollout. Supabase permissive policies are combined with
-- OR, so this older policy must not coexist with the approval-gated policy.
drop policy if exists "owners create draft creators" on public.creators;

