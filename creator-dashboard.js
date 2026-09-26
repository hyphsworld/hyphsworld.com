(function () {
  'use strict';
  var user, client, creator, creators = [], creations = [], uploadBusy = false, latestCreatedId = '';
  var dashboardTabs = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
  var currentDashboardView = 'overview';
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
  function activateDashboardView(view, updateHash) {
    var allowed = ['overview', 'profile', 'create', 'library', 'trust', 'inbox'];
    currentDashboardView = allowed.indexOf(view) > -1 ? view : 'overview';
    Array.from(document.querySelectorAll('[data-dashboard-view]')).forEach(function (panel) {
      panel.hidden = panel.dataset.dashboardView.split(' ').indexOf(currentDashboardView) === -1;
    });
    dashboardTabs.forEach(function (button) {
      var active = button.dataset.dashboardTab === currentDashboardView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (el('dashboard')) el('dashboard').dataset.activeView = currentDashboardView;
    if (updateHash && history.replaceState) history.replaceState(null, '', '#' + currentDashboardView);
  }
  function initDashboardTabs() {
    var requestedCreate = new URLSearchParams(location.search).has('create');
    var hashView = location.hash.replace('#', '');
    currentDashboardView = requestedCreate ? 'create' : (hashView || 'overview');
    dashboardTabs.forEach(function (button) {
      button.addEventListener('click', function () { activateDashboardView(button.dataset.dashboardTab, true); });
    });
    activateDashboardView(currentDashboardView, false);
  }
  function cleanList(value) { return value.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).slice(0, 10); }
  async function latestApplication() {
    var result = await client.from('creator_applications').select('status,review_notes,created_at').eq('applicant_id', user.userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }
  async function showCreatorAccessState() {
    var application = await latestApplication();
    var startPanel = el('startPanel'), startButton = el('startCreator'), applyLink = el('creatorApplyLink');
    startPanel.hidden = false; startButton.hidden = true; applyLink.hidden = true;
    if (el('dashboardTabs')) el('dashboardTabs').hidden = true;
    if (!application) {
      el('startTitle').textContent = 'Apply to build your World.';
      el('startCopy').textContent = 'Creator World isn’t open enrollment. Apply to build your World.';
      applyLink.hidden = false;
      status('SIGNED IN • CREATOR APPLICATION REQUIRED');
      return;
    }
    var state = String(application.status || 'pending');
    if (state === 'approved') {
      el('startTitle').textContent = 'You’re approved.';
      el('startCopy').textContent = 'Start building your private Creator World.';
      startButton.hidden = false;
      status('APPLICATION APPROVED • CREATOR WORLD UNLOCKED');
      return;
    }
    if (state === 'needs_info') {
      el('startTitle').textContent = 'Update your application.';
      el('startCopy').textContent = application.review_notes || 'Add the missing information and send it back.';
      applyLink.textContent = 'Update Application →'; applyLink.hidden = false;
      status('APPLICATION NEEDS INFO');
      return;
    }
    if (state === 'rejected') {
      el('startTitle').textContent = 'Not approved yet.';
      el('startCopy').textContent = application.review_notes || 'Keep building and apply again later.';
      applyLink.textContent = 'Apply Again →'; applyLink.hidden = false;
      status('APPLICATION NOT APPROVED');
      return;
    }
    el('startTitle').textContent = state === 'in_review' ? 'We’re reviewing your application.' : 'Application sent.';
    el('startCopy').textContent = application.review_notes || 'We’ll unlock Creator tools after approval.';
    status('APPLICATION ' + state.replace('_', ' ').toUpperCase());
  }
  function cards(target, rows, describe) { target.replaceChildren(); if (!rows.length) { var empty = document.createElement('span'); empty.textContent = 'Nothing yet.'; target.appendChild(empty); return; } rows.forEach(function (row) { var card = document.createElement('article'), strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = row.title; small.textContent = describe(row); card.append(strong, small); target.appendChild(card); }); }
  function renderWorldPicker() {
    var picker = el('creatorWorldPicker');
    if (!picker) {
      picker = document.createElement('article'); picker.id = 'creatorWorldPicker'; picker.className = 'panel world-picker-panel';
      var label = document.createElement('label'); label.textContent = 'MY CREATOR WORLDS';
      var select = document.createElement('select'); select.id = 'creatorWorldSelect'; select.setAttribute('aria-label', 'Choose a Creator World');
      select.addEventListener('change', function (event) { showCreator(event.target.value).catch(function (error) { status('World switch unavailable: ' + error.message); }); });
      label.appendChild(select); picker.appendChild(label); el('dashboard').prepend(picker);
    }
    var select = el('creatorWorldSelect'); select.replaceChildren();
    creators.forEach(function (row) { var option = document.createElement('option'); option.value = row.id; option.textContent = (row.creator_number ? String(row.creator_number).padStart(3, '0') + ' • ' : '') + row.display_name; select.appendChild(option); });
    select.value = creator.id; picker.hidden = creators.length < 2;
  }
  async function load() { try { user = await window.HWAuth.getCurrentUser(); if (!user || !user.userId) { location.href = 'auth.html?next=creator-dashboard.html'; return; } client = await window.HWAuth.getClient(); var result = await client.from('creators').select('*').eq('owner_user_id', user.userId).order('creator_number', { ascending: true, nullsFirst: false }); if (result.error) throw result.error; creators = result.data || []; creator = creators[0]; if (!creator) { await showCreatorAccessState(); return; } renderWorldPicker(); await showCreator(creator.id); } catch (error) { status('Dashboard unavailable: ' + (error.message || error)); } }
  async function showCreator(id) { creator = creators.find(function (row) { return row.id === id; }); if (!creator) return; renderCreator(); renderWorldPicker(); await Promise.all([loadMetrics(), loadVerification(), loadEntitlements(), loadSubmissions(), loadUploads()]); }
  function renderCreator() {
    el('dashboard').hidden = false;
    el('dashboardTabs').hidden = false;
    el('startPanel').hidden = true;
    activateDashboardView(currentDashboardView, false);
    status((creator.status || 'draft').toUpperCase() + ' • OWNER CONFIRMED');
    el('profileTitle').textContent = creator.display_name;
    el('displayName').value = creator.display_name || '';
    el('headline').value = creator.headline || '';
    el('location').value = creator.location || '';
    el('categories').value = (creator.categories || []).join(', ');
    el('bio').value = creator.bio || '';
    el('imageUrl').value = creator.image_url || '';
    el('verificationState').textContent = (creator.verification_level || 'unverified').replace('_', ' ');
  }
  async function start() {
    var application;
    try { application = await latestApplication(); } catch (error) { return status('Could not confirm Creator World approval: ' + (error.message || error)); }
    if (!application || application.status !== 'approved') { await showCreatorAccessState(); return; }
    el('startCreator').disabled = true;
    var name = (user.displayName || user.username || 'New Creator').slice(0, 80);
    var result = await client.from('creators').insert({ owner_user_id: user.userId, display_name: name, headline: '', bio: '', location: '', categories: [], image_url: '', profile_url: '' }).select().single();
    el('startCreator').disabled = false;
    if (result.error) return status('Could not build your Creator World: ' + result.error.message);
    creators.push(result.data); creator = result.data; renderWorldPicker(); renderCreator(); status('CREATOR WORLD BUILT • Private draft ready');
  }
  async function save(event) { event.preventDefault(); var update = { display_name: el('displayName').value.trim(), headline: el('headline').value.trim(), location: el('location').value.trim(), categories: cleanList(el('categories').value), bio: el('bio').value.trim(), image_url: el('imageUrl').value.trim(), profile_url: creator.profile_url || '' }; var result = await client.from('creators').update(update).eq('id', creator.id).select().single(); if (result.error) return status('Save rejected: ' + result.error.message); creator = result.data; creators = creators.map(function (row) { return row.id === creator.id ? creator : row; }); renderWorldPicker(); renderCreator(); status('Profile saved'); }
  async function requestVerification(event) { event.preventDefault(); var result = await client.from('creator_verification_requests').insert({ creator_id: creator.id, requester_id: user.userId, requested_level: el('requestedLevel').value, evidence_summary: el('evidenceSummary').value.trim() }); if (result.error) return status('Request not submitted: ' + result.error.message); el('evidenceSummary').value = ''; status('Review request sent'); await loadVerification(); }
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
    return ({ private: 'Private', ready_for_review: 'In review', approved: 'Approved', changes_requested: 'Changes needed', published: 'Live' })[value] || 'Private';
  }
  function formatFileSize(bytes) {
    var size = Math.max(0, Number(bytes) || 0);
    if (size < 1024) return Math.max(1, Math.round(size)) + ' B';
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    return (size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1) + ' MB';
  }
  function formatCreationDate(value) {
    if (!value) return 'Recently added';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently added';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function creationIcon(kind, mediaType) {
    if (mediaType === 'audio' || kind === 'music') return '♫';
    if (mediaType === 'video' || kind === 'video') return '▶';
    if (mediaType === 'image' || kind === 'artwork') return '◫';
    if (kind === 'merch') return '✦';
    return 'HW';
  }
  function renderCreationStats() {
    var stats = [
      { label: 'Creations', value: creations.length },
      { label: 'In review', value: creations.filter(function (row) { return row.status === 'ready_for_review'; }).length },
      { label: 'Approved', value: creations.filter(function (row) { return row.status === 'approved'; }).length },
      { label: 'Live', value: creations.filter(function (row) { return row.status === 'published'; }).length }
    ];
    var target = el('creationStats');
    target.replaceChildren();
    stats.forEach(function (stat) {
      var item = document.createElement('span'), value = document.createElement('strong'), label = document.createElement('small');
      item.className = 'library-stat'; value.textContent = String(stat.value); label.textContent = stat.label;
      item.append(value, label); target.appendChild(item);
    });
    target.setAttribute('aria-label', stats.map(function (stat) { return stat.value + ' ' + stat.label; }).join(', '));
  }
  function renderCreationPreview(row, target) {
    var kind = creationKindFor(row), mediaType = String(row.media_type || ''), url = row.preview_url || '';
    target.dataset.mediaType = mediaType || kind;
    target.setAttribute('aria-label', 'Preview ' + row.title);
    if (mediaType === 'image' && url) {
      var image = document.createElement('img');
      image.src = url; image.alt = ''; image.loading = 'lazy';
      image.addEventListener('error', function () { target.classList.add('preview-unavailable'); });
      target.appendChild(image);
    } else if (mediaType === 'video' && url) {
      var video = document.createElement('video');
      video.src = url + '#t=0.1'; video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true');
      video.addEventListener('error', function () { target.classList.add('preview-unavailable'); });
      target.appendChild(video);
    } else if (mediaType === 'audio' || kind === 'music') {
      var audioVisual = document.createElement('span'), wave = document.createElement('span'), icon = document.createElement('b');
      audioVisual.className = 'audio-visual'; wave.className = 'audio-wave'; icon.textContent = '♫';
      for (var barIndex = 0; barIndex < 22; barIndex += 1) {
        var bar = document.createElement('i');
        bar.style.height = (24 + ((barIndex * 37) % 68)) + '%';
        bar.style.animationDelay = '-' + ((barIndex % 8) * 0.09) + 's';
        wave.appendChild(bar);
      }
      audioVisual.append(icon, wave); target.appendChild(audioVisual);
    } else {
      var fallback = document.createElement('span');
      fallback.className = 'preview-fallback'; fallback.textContent = creationIcon(kind, mediaType);
      target.appendChild(fallback);
    }
    var kindBadge = document.createElement('span'), statusBadge = document.createElement('span');
    kindBadge.className = 'creation-kind-badge'; kindBadge.textContent = createKinds[kind].label;
    statusBadge.className = 'creation-status-badge status-' + String(row.status || 'private').replace(/[^a-z_]/g, '');
    statusBadge.textContent = creationStatusLabel(row.status || 'private');
    target.append(kindBadge, statusBadge);
  }
  async function loadCreationPreviewUrls(rows) {
    var paths = rows.map(function (row) { return row.storage_path; }).filter(Boolean);
    var urls = {};
    if (!paths.length) return urls;
    try {
      var bucket = client.storage.from(uploadBucket);
      if (typeof bucket.createSignedUrls === 'function') {
        var batch = await bucket.createSignedUrls(paths, 3600);
        if (batch.error) throw batch.error;
        (batch.data || []).forEach(function (item) { if (item && item.path && item.signedUrl) urls[item.path] = item.signedUrl; });
      } else {
        await Promise.all(paths.map(async function (path) {
          var single = await bucket.createSignedUrl(path, 3600);
          if (!single.error && single.data && single.data.signedUrl) urls[path] = single.data.signedUrl;
        }));
      }
    } catch (error) {
      console.warn('Creation previews will use safe fallbacks.', error);
    }
    return urls;
  }
  function uploadCards(rows) {
    var target = el('uploadList'), filter = el('creationFilter').value;
    target.replaceChildren();
    var visible = rows.filter(function (row) { return filter === 'all' || creationKindFor(row) === filter; });
    renderCreationStats();
    if (!visible.length) {
      var empty = document.createElement('span');
      empty.className = 'creation-empty';
      empty.textContent = filter === 'all' ? 'No creations here yet.' : 'No ' + createKinds[filter].label.toLowerCase() + ' creations yet.';
      target.appendChild(empty); return;
    }
    visible.forEach(function (row) {
      var card = document.createElement('article'), previewShell = document.createElement('button'), body = document.createElement('div'), title = document.createElement('h4'), meta = document.createElement('p'), actions = document.createElement('div'), preview = document.createElement('button'), rename = document.createElement('button'), review = document.createElement('button'), kind = creationKindFor(row), rowStatus = row.status || 'private';
      card.className = 'creation-card'; card.dataset.status = rowStatus;
      previewShell.className = 'creation-preview'; previewShell.type = 'button';
      previewShell.addEventListener('click', function () { previewUpload(row.storage_path, row.preview_url); });
      renderCreationPreview(row, previewShell);
      body.className = 'creation-card-body'; title.textContent = row.title;
      meta.className = 'creation-meta'; meta.textContent = String(row.media_type || createKinds[kind].label) + ' · ' + formatFileSize(row.file_size) + ' · ' + formatCreationDate(row.created_at);
      actions.className = 'upload-actions';
      preview.type = 'button'; preview.className = 'preview-action'; preview.textContent = 'Open Preview'; preview.addEventListener('click', function () { previewUpload(row.storage_path, row.preview_url); }); actions.appendChild(preview);
      if (rowStatus !== 'approved' && rowStatus !== 'published') {
        rename.type = 'button'; rename.className = 'secondary'; rename.textContent = 'Rename'; rename.addEventListener('click', function () { renameCreation(row); }); actions.appendChild(rename);
        review.type = 'button'; review.className = 'review'; review.textContent = rowStatus === 'ready_for_review' ? 'Make Private' : 'Send for Review'; review.addEventListener('click', function () { setCreationReviewState(row, rowStatus === 'ready_for_review' ? 'private' : 'ready_for_review'); }); actions.appendChild(review);
      }
      body.append(title, meta);
      if (row.review_note) { var note = document.createElement('p'); note.className = 'creation-note'; note.textContent = 'Owner note: ' + row.review_note; body.appendChild(note); }
      body.appendChild(actions); card.append(previewShell, body); target.appendChild(card);
    });
  }
  function renderCreateReceipt(row) {
    var section = el('createFlowSuccess'), target = el('createRecentCard');
    if (!section || !target || !row) return;
    target.replaceChildren();
    var head = document.createElement('div'), title = document.createElement('strong'), meta = document.createElement('small'), actions = document.createElement('div');
    var preview = document.createElement('button'), rename = document.createElement('button'), review = document.createElement('button');
    var rowStatus = row.status || 'private', kind = creationKindFor(row);
    head.className = 'create-recent-summary'; title.textContent = row.title;
    meta.textContent = createKinds[kind].label + ' · ' + formatFileSize(row.file_size) + ' · ' + creationStatusLabel(rowStatus);
    head.append(title, meta); actions.className = 'create-recent-actions';
    preview.type = 'button'; preview.textContent = 'Preview'; preview.addEventListener('click', function () { previewUpload(row.storage_path, row.preview_url); });
    actions.appendChild(preview);
    if (rowStatus !== 'approved' && rowStatus !== 'published') {
      rename.type = 'button'; rename.className = 'secondary-button'; rename.textContent = 'Rename';
      rename.addEventListener('click', function () { renameCreation(row); });
      review.type = 'button'; review.className = 'review-button';
      review.textContent = rowStatus === 'ready_for_review' ? 'Make Private' : 'Send for Review';
      review.addEventListener('click', function () { setCreationReviewState(row, rowStatus === 'ready_for_review' ? 'private' : 'ready_for_review'); });
      actions.append(rename, review);
    }
    target.append(head, actions);
    el('createSuccessTitle').textContent = '“' + row.title + '” is saved.';
    section.hidden = false;
  }
  function refreshCreateReceipt() {
    if (!latestCreatedId) return;
    var row = creations.find(function (item) { return item.id === latestCreatedId; });
    if (row) renderCreateReceipt(row);
  }

  async function loadUploads() {
    var columns = 'id,title,creation_kind,media_type,mime_type,file_size,storage_path,status,review_note,public_path,published_at,created_at,updated_at';
    var result = await client.from('creator_media_uploads').select(columns).eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(50);
    if (result.error && /creation_kind|review_note|updated_at/i.test(result.error.message || '')) {
      result = await client.from('creator_media_uploads').select('id,title,media_type,mime_type,file_size,storage_path,status,created_at').eq('creator_id', creator.id).order('created_at', { ascending: false }).limit(50);
    }
    if (result.error) throw result.error;
    creations = (result.data || []).map(function (row) { row.creation_kind = creationKindFor(row); row.status = row.status || 'private'; return row; });
    var previewUrls = await loadCreationPreviewUrls(creations);
    creations.forEach(function (row) { row.preview_url = previewUrls[row.storage_path] || ''; });
    uploadCards(creations);
    refreshCreateReceipt();
  }
  async function renameCreation(row) {
    var title = window.prompt('Rename this creation:', row.title);
    if (title === null) return;
    title = title.trim().slice(0, 120);
    if (!title) return status('A creation name is required.');
    var result = await client.from('creator_media_uploads').update({ title: title, updated_at: new Date().toISOString() }).eq('id', row.id).eq('creator_id', creator.id).select('id').single();
    if (result.error) return status('Rename unavailable until the MY CREATIONS update is active: ' + result.error.message);
    status('Creation renamed securely.'); await loadUploads();
  }
  async function setCreationReviewState(row, nextStatus) {
    if (nextStatus === 'ready_for_review' && !window.confirm('Send this creation for review? It will stay private.')) return;
    var result = await client.from('creator_media_uploads').update({ status: nextStatus, creation_kind: creationKindFor(row), updated_at: new Date().toISOString() }).eq('id', row.id).eq('creator_id', creator.id).select('id').single();
    if (result.error) return status('Owner review activates after the MY CREATIONS update is active: ' + result.error.message);
    status(nextStatus === 'ready_for_review' ? 'Creation sent for review.' : 'Creation moved back to private.');
    await loadUploads();
  }
  async function previewUpload(path, cachedUrl) { if (cachedUrl) { window.open(cachedUrl, '_blank', 'noopener'); return; } var result = await client.storage.from(uploadBucket).createSignedUrl(path, 600); if (result.error) return status('Private preview unavailable: ' + result.error.message); window.open(result.data.signedUrl, '_blank', 'noopener'); }
  function validCreationFile(file, kind) {
    var allowed = createKinds[kind] || createKinds.world;
    if (file.type && allowed.accept.split(',').includes(file.type)) return true;
    var extension = String(file.name || '').split('.').pop().toLowerCase();
    var extensions = { music: ['mp3','wav','m4a'], video: ['mp4'], artwork: ['jpg','jpeg','png','webp'], merch: ['jpg','jpeg','png','webp','pdf'], world: ['jpg','jpeg','png','webp','mp3','wav','m4a','mp4','pdf'] };
    return extensions[kind].includes(extension);
  }
  async function uploadMedia(event) {
    event.preventDefault();
    if (uploadBusy || !creator) return;
    var file = el('uploadFile').files[0], title = el('uploadTitle').value.trim(), kind = el('createKind').value;
    if (!file || !title) return status('Choose your media and give it a title.');
    if (!validCreationFile(file, kind)) return status('That file does not match the selected creation type.');
    if (file.size > maxUploadBytes) return status('Creation rejected: 50 MB maximum.');
    uploadBusy = true; el('uploadButton').disabled = true; el('uploadButton').textContent = 'Creating…';
    var path = creator.id + '/' + user.userId + '/' + crypto.randomUUID() + '-' + safeFileName(file.name);
    try {
      var stored = await client.storage.from(uploadBucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (stored.error) throw stored.error;
      var mediaType = file.type ? file.type.split('/')[0] : (kind === 'music' ? 'audio' : kind === 'artwork' || kind === 'merch' ? 'image' : kind);
      if (mediaType === 'application') mediaType = 'document';
      var payload = { creator_id: creator.id, owner_user_id: user.userId, title: title, creation_kind: kind, media_type: mediaType, mime_type: file.type, file_size: file.size, storage_path: path };
      var metadata = await client.from('creator_media_uploads').insert(payload).select('id').single();
      if (metadata.error && /creation_kind/i.test(metadata.error.message || '')) { delete payload.creation_kind; metadata = await client.from('creator_media_uploads').insert(payload).select('id').single(); }
      if (metadata.error) { await client.storage.from(uploadBucket).remove([path]); throw metadata.error; }
      latestCreatedId = metadata.data.id;
      event.target.reset(); setCreateKind(kind); await loadUploads();
      status('CREATED • Saved privately inside your World');
      activateDashboardView('create', true);
      renderCreateReceipt(creations.find(function (row) { return row.id === latestCreatedId; }));
      el('createFlowSuccess').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) { status('CREATE failed: ' + (error.message || error)); }
    finally { uploadBusy = false; el('uploadButton').disabled = false; el('uploadButton').textContent = 'CREATE'; }
  }

  el('startCreator').addEventListener('click', start); el('creatorForm').addEventListener('submit', save); el('verificationForm').addEventListener('submit', requestVerification); el('creatorUploadForm').addEventListener('submit', uploadMedia); el('createKind').addEventListener('change', function (event) { setCreateKind(event.target.value); }); el('creationFilter').addEventListener('change', function () { uploadCards(creations); }); el('createAgain').addEventListener('click', function () { el('createFlowSuccess').hidden = true; latestCreatedId = ''; el('uploadTitle').focus(); }); window.addEventListener('load', function () { initCreateKind(); initDashboardTabs(); load(); });
})();
