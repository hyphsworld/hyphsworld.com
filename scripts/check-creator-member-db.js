'use strict';
// Run the actual migration against an isolated PostgreSQL engine. No live user data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const migration = path.join(__dirname, '../supabase/migrations/20261102192922_creator_member_feed.sql');
const ids = { a: '10000000-0000-4000-8000-000000000001', b: '10000000-0000-4000-8000-000000000002', suspended: '10000000-0000-4000-8000-000000000003', unconfirmed: '10000000-0000-4000-8000-000000000004' };
const post = '20000000-0000-4000-8000-000000000001';
async function run() {
 const db = new PGlite();
 try {
  await db.exec(`
   create role anon; create role authenticated;
   create schema auth; create schema storage; create schema private;
   grant usage on schema public,auth,storage to anon,authenticated;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
   create table public.profiles(id uuid primary key,account_status text,deleted_at timestamptz,display_name text,username text,email text);
   alter table public.profiles enable row level security;
   create function private.is_creator_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and coalesce((auth.jwt()->'app_metadata'->>'creator_admin')::boolean,false)$$;
   grant execute on function private.is_creator_admin() to authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key,bucket_id text,name text,owner_id text,metadata jsonb);
   alter table storage.objects enable row level security;
   grant select,insert,delete on storage.objects to authenticated; grant select on storage.objects to anon;
  `);
  await db.exec(fs.readFileSync(migration, 'utf8'));
  for (const [key, id] of Object.entries(ids)) {
   await db.query('insert into auth.users(id,email_confirmed_at) values($1,$2)', [id, key === 'unconfirmed' ? null : '2026-01-01T00:00:00Z']);
   await db.query('insert into profiles values($1,$2,null,$3,$4,$5)', [id, key === 'suspended' ? 'suspended' : 'active', key === 'a' ? '<img src=x onerror=alert(1)>' : 'Member B', key, 'private@example.invalid']);
  }
  async function as(key, admin = false, anonymous = false) {
   await db.exec('reset role');
   await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(key ? { sub: ids[key], is_anonymous: anonymous, app_metadata: { creator_admin: admin } } : {})]);
   await db.exec('set role ' + (key ? 'authenticated' : 'anon'));
  }
  async function denied(sql, params = []) { await assert.rejects(() => db.query(sql, params)); }
  const reserve = "select public.member_reserve_post($1,'caption','image/png',12) result";
  await as(null); await denied(reserve, [post]);
  assert.deepEqual((await db.query('select public.member_feed() result')).rows[0].result, []);
  await as('suspended'); await denied(reserve, [post]);
  await as('unconfirmed'); await denied(reserve, [post]);
  await as('a', false, true); await denied(reserve, [post]);
  await as('a');
  await denied("select public.member_reserve_post($1,'x','text/html',12)", [post]);
  await denied("select public.member_reserve_post($1,'x','image/png',52428801)", [post]);
  await denied("select public.member_reserve_post($1,repeat('x',1501),'image/png',12)", [post]);
  const record = (await db.query(reserve, [post])).rows[0].result;
  assert.equal(record.storage_path, ids.a + '/' + post + '/media.png');
  assert.equal((await db.query(reserve, [post])).rows[0].result.id, post, 'Reservation retries are idempotent');
  await denied("select public.member_reserve_post($1,'changed','image/png',12)", [post]);
  await denied('select public.member_publish_post($1)', [post]);
  await denied("insert into public.creator_member_posts(id,owner_id,storage_path,mime_type,file_size) values($1,$2,'bad','image/png',12)", ['20000000-0000-4000-8000-000000000099', ids.a]);
  await denied("update public.creator_member_posts set status='published' where id=$1", [post]);
  await as('b');
  await denied(reserve, [post]); await denied('select public.member_publish_post($1)', [post]); await denied('select public.member_remove_post($1)', [post]);
  assert.equal((await db.query('select * from public.creator_member_posts')).rows.length, 0, 'Other member cannot inspect pending posts');
  const obj = '30000000-0000-4000-8000-000000000001';
  const put = 'insert into storage.objects values($1,\'creator-member-media\',$2,$3,$4)';
  await denied(put, [obj,record.storage_path,ids.b,{size:12,mimetype:'image/png'}]);
  await as('a');
  await denied(put, [obj,ids.a+'/unreserved/media.png',ids.a,{size:12,mimetype:'image/png'}]);
  await db.query(put, [obj,record.storage_path,ids.a,{size:11,mimetype:'image/png'}]);
  await denied('select public.member_publish_post($1)', [post]);
  await db.exec('reset role');
  await db.query("update storage.objects set metadata=$1 where id=$2", [{size:12,mimetype:'text/html'},obj]);
  await as('a'); await denied('select public.member_publish_post($1)', [post]);
  await db.exec('reset role'); await db.query('update storage.objects set metadata=$1 where id=$2', [{size:12,mimetype:'image/png'},obj]);
  await as(null);
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0, 'Draft media stays private');
  await as('a'); await db.query('select public.member_publish_post($1)', [post]);
  const published = (await db.query('select public.member_feed() result')).rows[0].result;
  assert.equal(published.length, 1); assert.equal(published[0].author_name, '<img src=x onerror=alert(1)>');
  assert(!JSON.stringify(published).includes('private@example.invalid'), 'Public feed never includes email');
  await db.query('select public.member_publish_post($1)', [post]);
  assert.equal((await db.query('select public.member_feed() result')).rows[0].result.length, 1, 'Publish retry never duplicates a post');
  await denied("update storage.objects set metadata='{}' where id=$1", [obj]);
  assert.equal((await db.query('delete from storage.objects where id=$1 returning id', [obj])).rows.length, 0, 'Published media cannot be deleted while post is visible');
  await as(null);
  assert.equal((await db.query('select public.member_feed() result')).rows[0].result.length, 1);
  assert.equal((await db.query('select * from storage.objects')).rows.length, 1, 'Published media can be signed for public playback');
  await denied('select * from public.creator_member_posts');
  await as('b'); await db.query("select public.member_report_post($1,'spam')", [post]);
  await db.query("select public.member_report_post($1,'spam')", [post]);
  assert.equal((await db.query('select * from public.creator_member_reports')).rows.length, 1, 'Duplicate reports do not inflate counts');
  await denied('select public.member_feed(null,null,true)');
  await as('b', true);
  assert.equal((await db.query('select public.member_feed(null,null,true) result')).rows[0].result[0].report_count, 1);
  await db.query('select public.member_remove_post($1)', [post]);
  await as(null);
  assert.deepEqual((await db.query('select public.member_feed() result')).rows[0].result, []);
  assert.equal((await db.query('select * from storage.objects')).rows.length, 0, 'Removed media cannot receive new signed URLs');
  await as('b'); assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 0);
  await as('a'); assert.equal((await db.query('delete from storage.objects returning id')).rows.length, 1, 'Owner can clean up removed media');
  await denied('select public.member_publish_post($1)', [post]);
  // Daily reservations count even canceled posts, preventing quota bypass by deletion.
  for (let i=2;i<=20;i++) await db.query(reserve, ['20000000-0000-4000-8000-'+String(i).padStart(12,'0')]);
  await denied(reserve, ['20000000-0000-4000-8000-000000000021']);
  console.log('Creator member PostgreSQL checks passed: roles, RLS, private drafts, upload verification, retries, moderation, deletion and daily quota.');
 } finally { await db.close(); }
}
run().catch(error => { console.error(error); process.exitCode=1; });
