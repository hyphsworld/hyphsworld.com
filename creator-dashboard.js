(function () {
  'use strict';
  var user, client, creator, creators = [], creations = [], uploadBusy = false;
  var uploadBucket = 'creator-world-uploads';
  var maxUploadBytes = 50 * 1024 * 1024;
  var createKinds = {
    music: { label: 'Music', accept: 'audio/mpeg,audio/wav,audio/x-wav,audio/mp4' },
    video: { label: 'Video', accept: 'video/mp4' },
    artwork: { label: 'Artwork', accept: 'image/jpeg,image/png,image/webp' },
    merch: { label: 'Merch', accept: 'image/jpeg,image/png,image/webp,application/pdf' },
    world: { label: 'Creator World Update', accept: 'image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,video/mp4,application/pdf' }
  };
  function el(id) { return document.getElementById(id); }
  function status(text) { el('dashboardStatus').textContent = text; }
  function setCreateKind(value) {
    var key = createKinds[value] ? value : 'world';
    var kind = createKinds[key];
    el('createKind').value = key;
    el('uploadFile').accept = kind.accept;
    el('createStudioTitle').textContent = 'Create ' + kind.label;
    el('uploadTitle').placeholder = 'Name this ' + kind.label.toLowerCase() + ' creation';
  }
  function initCreateKind() {
    var requested = new URLSearchParams(location.search).get('create') || 'world';
    setCreateKind(requested);
  }
  function cleanList(value) { return value.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).slice(0, 10); }
  function cards(target, rows, describe) { target.replaceChildren(); if (!rows.length) { var empty = document.createElement('span'); empty.textContent = 'Nothing here yet.'; target.appendChild(empty); return; } rows.forEach(function (row) { var card = document.createElement('article'), strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = row.title; small.textContent = describe(row); card.append(strong, small); target.appendChild(card); }); }
  function renderWorldPicker() {
    var picker = el('creatorWorldPicker');
    if (!picker) {
      picker = document.createElement('article'); picker.id = 'creatorWorldPicker'; picker.className = 'panel';
      var label = document.createElement('label'); label.textContent = 'MY CREATOR WORLDS';
      var select = document.createElement('select'); select.id = 'creatorWorldSelect'; select.setAttribute('aria-label', 'Choose a Creator World');
      select.addEventListener('change', function (event) { showCreator(event.target.value).catch(function (error) { status('World switch unavailable: ' + error.message); }); });
      label.appendChild(select); picker.appendChild(label); el('dashboard').prepend(picker);
    }
    var select = el('creatorWorldSelect'); select.replaceChildren();
    creators.forEach(function (row) { var option = document.createElement('option'); option.value = row.id; option.textContent = (row.creator_number ? String(row.creator_number).padStart(3, '0') + ' • ' : '') + row.display_name; select.appendChild(option); });
    select.value = creator.id; picker.hidden = creators.length < 2;
  }
  async function load() { try { user = await window.HWAuth.getCurrentUser(); if (!user || !user.userId) { location.href = 'auth.html?next=creator-dashboard.html'; return; } client = await window.HWAuth.getClient(); var result = await client.from('creators').select('*').eq('owner_user_id', user.userId).order('creator_number', { ascending: true, nullsFirst: false }); if (result.error) throw result.error; creators = result.data || []; creator = creators[0]; if (!creator) { status('Signed in • No creator draft yet'); el('startPanel').hidden = false; return; } renderWorldPicker(); await showCreator(creator.id); } catch (error) { status('Dashboard unavailable: ' + (error.message || error)); } }
  async function showCreator(id) { creator = creators.find(function (row) { return row.id === id; }); if (!creator) return; renderCreator(); renderWorldPicker(); await Promise.all([loadMetrics(), loadVerification(), loadEntitlements(), loadSubmissions(), loadUploads()]); }
  function renderCreator() { el('dashboard').hidden = false; el('startPanel').hidden = true; status((creator.status || 'draft').toUpperCase() + ' • Account owner confirmed'); el('profileTitle').textContent = creator.display_name; el('displayName').value = creator.display_name || ''; el('headline').value = creator.headline || ''; el('location').value = creator.location || ''; el('categories').value = (creator.categories || []).join(', '); el('bio').value = creator.bio || ''; el('imageUrl').value = creator.image_url || ''; el('verificationState').textContent = (creator.verification_level || 'unverified').replace('_', ' '); }
  async function start() { var name = (user.displayName || user.username || 'New Creator').slice(0, 80); var result = await client.from('creators').insert({ owner_user_id: user.userId, display_name: name, headline: '', bio: '', location: '', categories: [], image_url: '', profile_url: '' }).select().single(); if (result.error) return status('Could not create draft: ' + result.error.message); creators.push(result.data); creator = result.data; renderWorldPicker(); renderCreator(); status('Private creator draft created'); }
  async function save(event) { event.preventDefault(); var update = { display_name: el('displayName').value.trim(), headline: el('headline').value.trim(), location: el('location').value.trim(), categories: cleanList(el('categories').value), bio: el('bio').value.trim(), image_url: el('imageUrl').value.trim(), profile_url: creator.profile_url || '' }; var result = await client.from('creators').update(update).eq('id', creator.id).select().single(); if (result.error) return status('Save rejected: ' + result.error.message); creator = result.data; creators = creators.map(function (row) { return row.id === creator.id ? creator : row; }); renderWorldPicker(); renderCreator(); status('Profile saved securely'); }
  async function requestVerification(event) { event.preventDefault(); var result = await client.from('creator_verification_requests').insert({ creator_id: creator.id, requester_id: user.userId, requested_level: el('requestedLevel').value, evidence_summary: el('evidenceSummary').value.trim() }); if (result.error) return status('Request not submitted: ' + result.error.message); el('evidenceSummary').value = ''; status('Verification request submitted for human review'); await loadVerification(); }
  async function loadVerification() { var r = await client.from('creator_verification_requests').select('requested_level,status,created_at').eq('creator_id', creator.id).order('created_at', { ascending: false }); cards(el('verificationHistory'), (r.data || []).map(function(x){ return Object.assign({title:x.requested_level.replace('_',' ').toUpperCase()},x); }), function(x){ return x.status.toUpperCase()+' • '+new Date(x.created_at).toLocaleDateString(); }); }
  async function loadEntitlements() { var r = await client.from('creator_entitlements').select('entitlement_key,status,source,expires_at').eq('creator_id', creator.id); cards(el('entitlementList'), (r.data || []).map(function(x){ return Object.assign({title:x.entitlement_key.replaceAll('_',' ').toUpperCase()},x); }), function(x){ return x.status.toUpperCase()+' • '+x.source.toUpperCase(); }); }
  async function loadSubmissions() { var r = await client.from('creator_submissions').select('id,title,submission_type,status,created_at').eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(30); cards(el('submissionList'), r.data || [], function(x){ return x.submission_type.toUpperCase()+' • '+x.status.toUpperCase()+' • '+new Date(x.created_at).toLocaleDateString(); }); }
  async function loadMetrics() { var r = await client.rpc('get_my_creator_metrics', { p_creator_id: creator.id }); var m = r.data && r.data[0]; if (r.error || !m) return cards(el('metricList'), [], function(){ return ''; }); cards(el('metricList'), [{title:'Profile views',value:m.profile_views},{title:'Shares',value:m.shares},{title:'Link clicks',value:m.link_clicks},{title:'Followers',value:m.followers},{title:'Submissions',value:m.submissions}], function(x){ return String(x.value || 0); }); }

  function safeFileName(name) { return String(name || 'upload').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'upload'; }
  function creationKindFor(row) {
    if (row.creation_kind && createKinds[row.creation_kind]) return row.creation_kind;
    if (row.media_type === 'audio') return 'music';
    if (row.media_type === 'video') return 'video';
    if (row.media_type === 'image') return 'artwork';
    return 'world';
  }
  function creationStatusLabel(value) {
    return ({ private: 'PRIVATE', ready_for_review: 'READY FOR OWNER REVIEW', approved: 'OWNER APPROVED', changes_requested: 'CHANGES REQUESTED' })[value] || 'PRIVATE';
  }
  function renderCreationStats() {
    var ready = creations.filter(function (row) { return row.status === 'ready_for_review'; }).length;
    var approved = creations.filter(function (row) { return row.status === 'approved'; }).length;
    el('creationStats').textContent = creations.length + (creations.length === 1 ? ' creation' : ' creations') + ' • ' + ready + ' ready • ' + approved + ' approved';
  }
  function uploadCards(rows) {
    var target = el('uploadList'), filter = el('creationFilter').value;
    target.replaceChildren();
    var visible = rows.filter(function (row) { return filter === 'all' || creationKindFor(row) === filter; });
    renderCreationStats();
    if (!visible.length) { var empty = document.createElement('span'); empty.textContent = filter === 'all' ? 'Nothing created here yet.' : 'No ' + createKinds[filter].label.toLowerCase() + ' creations yet.'; target.appendChild(empty); return; }
    visible.forEach(function (row) {
      var card = document.createElement('article'), title = document.createElement('strong'), meta = document.createElement('small'), actions = document.createElement('div'), preview = document.createElement('button'), rename = document.createElement('button'), review = document.createElement('button'), remove = document.createElement('button'), kind = creationKindFor(row), rowStatus = row.status || 'private';
      card.className = 'creation-card'; card.dataset.status = rowStatus; title.textContent = row.title;
      meta.className = 'creation-meta'; meta.textContent = createKinds[kind].label.toUpperCase() + ' • ' + row.media_type.toUpperCase() + ' • ' + Math.max(1, Math.round(row.file_size / 1024)) + ' KB • ' + creationStatusLabel(rowStatus);
      actions.className = 'upload-actions';
      preview.type = 'button'; preview.textContent = 'Preview'; preview.addEventListener('click', function () { previewUpload(row.storage_path); }); actions.appendChild(preview);
      if (rowStatus !== 'approved') {
        rename.type = 'button'; rename.className = 'secondary'; rename.textContent = 'Rename'; rename.addEventListener('click', function () { renameCreation(row); }); actions.appendChild(rename);
        review.type = 'button'; review.className = 'review'; review.textContent = rowStatus === 'ready_for_review' ? 'Return to Private' : 'Ready for Owner'; review.addEventListener('click', function () { setCreationReviewState(row, rowStatus === 'ready_for_review' ? 'private' : 'ready_for_review'); }); actions.appendChild(review);
        remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Delete'; remove.addEventListener('click', function () { deleteUpload(row); }); actions.appendChild(remove);
      }
      card.append(title, meta);
      if (row.review_note) { var note = document.createElement('p'); note.className = 'creation-note'; note.textContent = 'Owner note: ' + row.review_note; card.appendChild(note); }
      card.appendChild(actions); target.appendChild(card);
    });
  }
  async function loadUploads() {
    var columns = 'id,title,creation_kind,media_type,mime_type,file_size,storage_path,status,review_note,created_at,updated_at';
    var result = await client.from('creator_media_uploads').select(columns).eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(50);
    if (result.error && /creation_kind|review_note|updated_at/i.test(result.error.message || '')) {
      result = await client.from('creator_media_uploads').select('id,title,media_type,mime_type,file_size,storage_path,status,created_at').eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(50);
    }
    if (result.error) throw result.error;
    creations = (result.data || []).map(function (row) { row.creation_kind = creationKindFor(row); row.status = row.status || 'private'; return row; });
    uploadCards(creations);
  }
  async function renameCreation(row) {
    var title = window.prompt('Rename this creation:', row.title);
    if (title === null) return;
    title = title.trim().slice(0, 120);
    if (!title) return status('A creation name is required.');
    var result = await client.from('creator_media_uploads').update({ title: title, updated_at: new Date().toISOString() }).eq('id', row.id).eq('creator_id', creator.id).select('id').single();
    if (result.error) return status('Rename unavailable until the Creation Library migration is active: ' + result.error.message);
    status('Creation renamed securely.'); await loadUploads();
  }
  async function setCreationReviewState(row, nextStatus) {
    if (nextStatus === 'ready_for_review' && !window.confirm('Send this creation to the HYPHSWORLD owner review queue? It will stay private.')) return;
    var result = await client.from('creator_media_uploads').update({ status: nextStatus, creation_kind: creationKindFor(row), updated_at: new Date().toISOString() }).eq('id', row.id).eq('creator_id', creator.id).select('id').single();
    if (result.error) return status('Owner review activates after the Creation Library migration: ' + result.error.message);
    status(nextStatus === 'ready_for_review' ? 'Creation is ready for owner review.' : 'Creation returned to your private workspace.');
    await loadUploads();
  }
  async function previewUpload(path) { var result = await client.storage.from(uploadBucket).createSignedUrl(path, 600); if (result.error) return status('Private preview unavailable: ' + result.error.message); window.open(result.data.signedUrl, '_blank', 'noopener'); }
  async function deleteUpload(row) { if (!window.confirm('Delete this private creation?')) return; var removed = await client.storage.from(uploadBucket).remove([row.storage_path]); if (removed.error) return status('File delete failed: ' + removed.error.message); var meta = await client.from('creator_media_uploads').delete().eq('id', row.id).eq('creator_id', creator.id); if (meta.error) return status('Creation record delete failed: ' + meta.error.message); status('Private creation deleted'); await loadUploads(); }
  async function uploadMedia(event) { event.preventDefault(); if (uploadBusy || !creator) return; var file = el('uploadFile').files[0], title = el('uploadTitle').value.trim(); if (!file || !title) return status('Choose your media and give it a title.'); if (file.size > maxUploadBytes) return status('Creation rejected: 50 MB maximum.'); uploadBusy = true; el('uploadButton').disabled = true; el('uploadButton').textContent = 'Creating…'; var path = creator.id + '/' + user.userId + '/' + crypto.randomUUID() + '-' + safeFileName(file.name); try { var stored = await client.storage.from(uploadBucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type }); if (stored.error) throw stored.error; var kind = el('createKind').value, payload = { creator_id: creator.id, owner_user_id: user.userId, title: title, creation_kind: kind, media_type: file.type.split('/')[0] === 'application' ? 'document' : file.type.split('/')[0], mime_type: file.type, file_size: file.size, storage_path: path }; var metadata = await client.from('creator_media_uploads').insert(payload).select('id').single(); if (metadata.error && /creation_kind/i.test(metadata.error.message || '')) { delete payload.creation_kind; metadata = await client.from('creator_media_uploads').insert(payload).select('id').single(); } if (metadata.error) { await client.storage.from(uploadBucket).remove([path]); throw metadata.error; } event.target.reset(); setCreateKind(kind); status('Created privately inside ' + creator.display_name); await loadUploads(); } catch (error) { status('CREATE failed: ' + (error.message || error)); } finally { uploadBusy = false; el('uploadButton').disabled = false; el('uploadButton').textContent = 'CREATE'; } }

  el('startCreator').addEventListener('click', start); el('creatorForm').addEventListener('submit', save); el('verificationForm').addEventListener('submit', requestVerification); el('creatorUploadForm').addEventListener('submit', uploadMedia); el('createKind').addEventListener('change', function (event) { setCreateKind(event.target.value); }); el('creationFilter').addEventListener('change', function () { uploadCards(creations); }); window.addEventListener('load', function () { initCreateKind(); load(); });
})();
