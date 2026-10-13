/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const windows = [];
const owner = '00000000-0000-4000-8000-000000000001';
const first = { id: '00000000-0000-4000-8000-000000000002', owner_user_id: owner, display_name: 'Artist One', headline: 'Artist', bio: 'My story', location: 'Richmond', categories: ['artist'], image_url: 'old-picture.jpg', profile_url: 'creators-world.html', status: 'published' };
const second = { ...first, id: '00000000-0000-4000-8000-000000000003', display_name: 'Artist Two', profile_url: 'creator-rojas.html' };
async function dashboard({ saveError = null, uploadError = null, delaySave = false } = {}) {
  const dom = new JSDOM(read('creator-dashboard.html'), { url: 'https://hyphsworld.com/creator-dashboard.html#profile', runScripts: 'outside-only' });
  const w = dom.window; windows.push(w);
  const rows = [{ ...first }, { ...second }];
  const upload = jest.fn(async () => ({ error: uploadError }));
  const remove = jest.fn(async () => ({ error: null }));
  const publicUrl = jest.fn(storagePath => ({ data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/creator-profile-pictures/' + storagePath } }));
  const buckets = jest.fn(() => ({ upload, remove, getPublicUrl: publicUrl }));
  const updates = []; let resolveSave;
  const client = {
    storage: { from: buckets }, rpc: async () => ({ data: [] }),
    from(table) {
      let payload = null; const filters = [];
      const q = { select() { return q; }, eq(key,value) { filters.push([key,value]); return q; }, order() { return q; }, limit() { return q; },
        update(value) { payload = value; return q; },
        async single() {
          if (payload) {
            updates.push({ payload, filters });
            if (delaySave) await new Promise(resolve => { resolveSave = resolve; });
            if (saveError) return { error: { message: saveError }, data: null };
            const id = filters.find(([key]) => key === 'id')[1];
            const old = rows.find(row => row.id === id);
            Object.assign(old, payload); return { data: { ...old } };
          }
          return { data: null };
        },
        then(resolve, reject) { return Promise.resolve({ data: table === 'creators' ? rows.map(row => ({ ...row })) : [], error: null }).then(resolve, reject); }
      }; return q;
    }
  };
  w.HWAuth = { getCurrentUser: async () => ({ userId: owner }), getClient: async () => client };
  w.URL.createObjectURL = jest.fn(() => 'blob:https://hyphsworld.com/selected-picture');
  w.URL.revokeObjectURL = jest.fn();
  w.Image = class { constructor() { this.naturalWidth = 400; this.naturalHeight = 400; } set src(value) { Promise.resolve().then(() => { if (this.onload) this.onload(); }); } };
  w.eval(read('creator-profile-pictures.js')); w.eval(read('creator-dashboard.js'));
  await settle(); await settle();
  return { w, rows, updates, upload, remove, publicUrl, buckets, finishSave() { resolveSave(); } };
}
function file(w, type = 'image/jpeg', size = 20) { return new w.File([new Uint8Array(size)], 'picture.jpg', { type }); }
async function choose(w, selected) {
  const input = w.document.getElementById('profilePictureFile');
  Object.defineProperty(input, 'files', { configurable: true, value: [selected] });
  input.dispatchEvent(new w.Event('change')); await settle();
}
async function save(w) { w.document.getElementById('creatorForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await settle(); await settle(); }
afterEach(() => windows.splice(0).forEach(w => w.close()));

test('previewing and cancelling a picture never writes to storage or the profile', async () => {
  const fixture = await dashboard(); const { w, upload, updates } = fixture;
  await choose(w, file(w));
  expect(w.document.getElementById('profilePicturePreview').src).toContain('blob:');
  expect(upload).not.toHaveBeenCalled(); expect(updates).toHaveLength(0);
  w.document.getElementById('profilePictureCancel').click();
  expect(w.document.getElementById('profilePicturePreview').src).toBe('https://hyphsworld.com/old-picture.jpg');
  expect(w.HWCreatorProfilePictures.hasSelection()).toBe(false);
  expect(w.URL.revokeObjectURL).toHaveBeenCalled();
});

test('Save Profile uploads once, scopes the update to the owner and updates the saved preview', async () => {
  const fixture = await dashboard(); const { w, upload, updates, remove } = fixture;
  await choose(w, file(w)); w.document.getElementById('bio').value = 'Updated bio'; await save(w);
  expect(upload).toHaveBeenCalledTimes(1);
  const [storagePath, , options] = upload.mock.calls[0];
  expect(storagePath).toMatch(new RegExp('^' + first.id + '/' + owner + '/[0-9a-f-]+\\.jpg$'));
  expect(options).toEqual({ cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
  expect(updates[0].filters).toEqual([['id', first.id], ['owner_user_id', owner]]);
  expect(updates[0].payload.bio).toBe('Updated bio');
  expect(updates[0].payload).not.toHaveProperty('owner_user_id');
  expect(updates[0].payload).not.toHaveProperty('status');
  expect(w.document.getElementById('profilePicturePreview').src).toBe(updates[0].payload.image_url);
  expect(remove).not.toHaveBeenCalled();
  expect(w.document.getElementById('profileSaveStatus').textContent).toContain('Profile saved.');
});

test('text-only editing keeps the original picture and does not upload', async () => {
  const { w, updates, upload } = await dashboard();
  w.document.getElementById('displayName').value = 'New Artist Name'; await save(w);
  expect(updates[0].payload.image_url).toBe('old-picture.jpg');
  expect(upload).not.toHaveBeenCalled();
});

test('upload failure never changes the profile or disables future attempts', async () => {
  const { w, updates, remove } = await dashboard({ uploadError: { message: 'Upload unavailable' } });
  await choose(w, file(w)); await save(w);
  expect(updates).toHaveLength(0); expect(remove).not.toHaveBeenCalled();
  expect(w.document.getElementById('profileSaveStatus').textContent).toContain('Profile not saved.');
  expect(w.document.getElementById('profileSaveButton').disabled).toBe(false);
});

test('a failed profile save only discards its new unsaved upload', async () => {
  const { w, upload, remove, rows } = await dashboard({ saveError: 'Permission denied' });
  await choose(w, file(w)); await save(w);
  expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  expect(rows[0].image_url).toBe('old-picture.jpg');
  expect(w.document.getElementById('profileSaveStatus').textContent).toContain('Save could not be confirmed.');
});

test.each([['image/svg+xml', 20], ['image/heic', 20], ['image/jpeg', 5 * 1024 * 1024 + 1]])('rejects unsupported/oversized files: %s %i', async (type, size) => {
  const { w, upload } = await dashboard(); await choose(w, file(w, type, size));
  expect(w.HWCreatorProfilePictures.hasSelection()).toBe(false);
  expect(w.URL.createObjectURL).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
});

test('a World switch clears pending pictures and the preview matches that World', async () => {
  const { w, upload } = await dashboard(); await choose(w, file(w));
  const picker = w.document.getElementById('creatorWorldSelect'); picker.value = second.id; picker.dispatchEvent(new w.Event('change')); await settle();
  expect(w.HWCreatorProfilePictures.hasSelection()).toBe(false);
  expect(w.document.getElementById('profileTitle').textContent).toBe('Artist Two');
  await save(w); expect(upload).not.toHaveBeenCalled();
});

test('duplicate saves and normal World switching are blocked while a save is pending', async () => {
  const fixture = await dashboard({ delaySave: true }); const { w, upload, updates } = fixture;
  await choose(w, file(w)); await save(w);
  expect(w.document.getElementById('creatorWorldSelect').disabled).toBe(true);
  await save(w); expect(upload).toHaveBeenCalledTimes(1); expect(updates).toHaveLength(1);
  fixture.finishSave(); await settle(); await settle();
  expect(w.document.getElementById('creatorWorldSelect').disabled).toBe(false);
});

test('existing links accept only safe URLs and selected pictures override that field', async () => {
  const { w, updates } = await dashboard(); w.document.getElementById('imageUrl').value = 'javascript:alert(1)'; await save(w);
  expect(updates).toHaveLength(0);
  await choose(w, file(w)); await save(w); expect(updates).toHaveLength(1);
  expect(updates[0].payload.image_url).toContain('/creator-profile-pictures/');
});

test('storage migration limits uploads and never broadens creator profile privileges', () => {
  const name = fs.readdirSync(path.join(root, 'supabase/migrations')).find(file => file.endsWith('_creator_profile_pictures.sql'));
  const sql = read('supabase/migrations/' + name);
  expect(sql).toContain('5242880'); expect(sql).toContain("array['image/jpeg','image/png','image/webp']");
  expect(sql.match(/to authenticated/g)).toHaveLength(3);
  expect(sql.match(/owner_id = \(select auth.uid\(\)\)::text/g)).toHaveLength(3);
  expect(sql.match(/c.owner_user_id = \(select auth.uid\(\)\)/g)).toHaveLength(3);
  expect(sql).toContain('right(c.image_url'); expect(sql).not.toMatch(/for update/i); expect(sql).not.toContain('security definer');
});


test('a broken image cannot be uploaded even when its MIME type is allowed', async () => {
  const { w, upload } = await dashboard();
  w.Image = class { set src(value) { Promise.resolve().then(() => this.onerror()); } };
  await choose(w, file(w));
  expect(w.HWCreatorProfilePictures.hasSelection()).toBe(false);
  expect(w.document.getElementById('profilePictureStatus').textContent).toContain('could not be opened');
  expect(upload).not.toHaveBeenCalled();
});

test('late image decoding cannot attach a picture to a different World', async () => {
  const { w, upload } = await dashboard(); const pending = [];
  w.Image = class { constructor() { this.naturalWidth=400; this.naturalHeight=400; } set src(value) { pending.push(this); } };
  await choose(w, file(w)); await save(w); expect(upload).not.toHaveBeenCalled();
  const picker=w.document.getElementById('creatorWorldSelect'); picker.value=second.id; picker.dispatchEvent(new w.Event('change')); await settle();
  pending[0].onload();
  expect(w.HWCreatorProfilePictures.hasSelection()).toBe(false);
  expect(w.document.getElementById('profilePicturePreview').src).toBe('https://hyphsworld.com/old-picture.jpg');
});

test('the overview shortcut opens the profile controls and focuses the name field', async () => {
  const { w } = await dashboard();
  w.document.getElementById('profileEditShortcut').click();
  expect(w.document.getElementById('dashboard').dataset.activeView).toBe('profile');
  expect(w.document.activeElement.id).toBe('displayName');
});
