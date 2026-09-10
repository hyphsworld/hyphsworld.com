const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const client = read('daily-wheel.js');
const migration = read('supabase/migrations/20260910041353_reconnect_daily_spin_rpc.sql');

assert(client.includes("client.rpc('claim_daily_spin')"), 'Wheel button must call the Daily Spin RPC');
assert(client.includes('points_awarded') && client.includes('already_spun'), 'Wheel must handle payout and once-daily responses');
assert(migration.includes('security definer'), 'Daily Spin payout must be server-owned');
assert(migration.includes("v_user_id uuid := (select auth.uid())"), 'Daily Spin must bind rewards to the signed-in user');
assert(migration.includes("set_config('app.server_write', 'on', true)"), 'Daily Spin must use the protected profile write path');
assert(migration.includes('for update'), 'Daily Spin must serialize concurrent claims');
assert(migration.includes('v_last_spin is not null and v_last_spin::date = now()::date'), 'Daily Spin must enforce one claim per day');
assert(migration.includes('insert into public.daily_spin_logs'), 'Daily Spin must create an audit log');
assert(migration.includes('insert into public.cool_points_ledger'), 'Daily Spin must record the Cool Points payout');
assert(migration.includes('revoke all on function public.claim_daily_spin() from public, anon'), 'Anonymous execution must be revoked');
assert(migration.includes('grant execute on function public.claim_daily_spin() to authenticated'), 'Only signed-in users may spin');

console.log('Daily Spin diagnostic passed: authenticated, atomic, logged server payout is connected.');
