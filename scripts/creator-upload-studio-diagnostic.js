const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'creator-dashboard.html'),'utf8');
const js=fs.readFileSync(path.join(root,'creator-dashboard.js'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260924203000_creator_private_upload_studio.sql'),'utf8');
function ok(v,m){if(!v)throw new Error(m);console.log('PASS:',m)}
ok(html.includes('id="creatorUploadForm"'),'dashboard has Create Studio');
ok(html.includes('Create Studio') && html.includes('Maximum 50 MB'),'CREATE UI states media limit');
ok(js.includes("uploadBucket = 'creator-world-uploads'"),'client uses private bucket');
ok(js.includes("p_creator_id: creator.id")&&js.includes(".eq('creator_id', creator.id)"),'selected world scopes dashboard data');
ok(js.includes('createSignedUrl(path, 600)'),'previews use expiring signed URLs');
ok(!js.includes('getPublicUrl'),'private files never use public URLs');
ok(sql.includes("values ('creator-world-uploads','creator-world-uploads',false"),'bucket is private');
ok(sql.includes("status text not null default 'private' check (status = 'private')"),'uploads cannot self-publish');
ok((sql.match(/c\.owner_user_id=\(select auth\.uid\(\)\)/g)||[]).length===3,'storage policies verify creator ownership');
ok(!/to anon/.test(sql),'anonymous role receives no upload policy');
console.log('Creator private upload diagnostic passed.');
