#!/usr/bin/env python3
"""Disposable PostgreSQL tests. Docker only; never connects to Supabase."""
import concurrent.futures
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
NAME = 'atomic-rewards-test-' + uuid.uuid4().hex[:10]
IMAGE = 'postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b'

def docker(*args, **kwargs):
    result = subprocess.run(['docker', '--host=unix:///var/run/docker.sock', *args],
                            text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result

def sql(source):
    return docker('exec', '-i', NAME, 'psql', '-h', '127.0.0.1', '-XAt', '-U', 'postgres',
                  '-v', 'ON_ERROR_STOP=1', input=source).stdout.strip()

def uid(i):
    return '00000000-0000-4000-8000-' + str(i).zfill(12)

def call(i, expression, hold=False):
    return sql("begin; set local role authenticated; select set_config('request.jwt.claim.sub','" + uid(i)
               + "',true); select " + expression + ";"
               + (' select pg_sleep(0.15);' if hold else '') + ' commit;')

try:
    docker('run', '--name', NAME, '--network', 'none', '-e',
           'POSTGRES_HOST_AUTH_METHOD=trust', '-d', IMAGE)
    for attempt in range(60):
        try:
            sql('select 1;')
            break
        except RuntimeError:
            if attempt == 59:
                raise
            time.sleep(0.2)
    sql((ROOT / 'supabase/tests/fixtures/atomic_rewards_schema.sql').read_text())
    migration = ROOT / 'supabase/migrations/20261101185519_atomic_reward_redemption_security.sql'
    sql(migration.read_text())
    # Replay-safe migration, including grants and policy removal.
    sql(migration.read_text())
    print(sql((ROOT / 'supabase/tests/atomic_rewards_security.sql').read_text()))
    for i in range(1, 9):
        sql("insert into auth.users values('" + uid(i) + "'); insert into public.profiles(id,points,cool_points) values('"
            + uid(i) + "',100,100);")
    sql("insert into public.reward_codes(code,title,points,max_global_redemptions) values('RACECAP','Fixture',25,1);"
        "insert into public.reward_definitions(reward_key,title,point_cost) values('racepaid','Fixture',10);")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda i: call(i, "public.redeem_reward_code('RACECAP')", True), range(1, 9)))
    assert sum('"ok": true' in r for r in results) == 1, results
    assert sql('select count(*) from public.reward_code_redemptions;') == '1'
    assert sql('select sum(amount) from public.cool_points_ledger;') == '25'
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: call(1, "points from public.claim_reward('racepaid')", True), range(8)))
    assert sql('select count(*) from public.user_rewards;') == '1'
    assert sql('select count(*) from public.cool_points_ledger where amount=-10;') == '1'
    assert sql('select sum(cool_points) from public.profiles;') == '815'
    print('PASS: eight-session global cap and duplicate claim races; one credit/debit; conserved wallets')
finally:
    docker('rm', '-f', NAME)
