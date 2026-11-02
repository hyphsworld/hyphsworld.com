(function () {
  'use strict';
  const root = document.getElementById('community');
  if (!root) return;
  const el = id => document.getElementById(id);
  const bucket = 'creator-member-media';
  const types = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'video/mp4': ['mp4'], 'video/quicktime': ['mov'], 'audio/mpeg': ['mp3'], 'audio/mp4': ['m4a'], 'audio/wav': ['wav'], 'audio/x-wav': ['wav'] };
  let sb, user = null, admin = false, file = null, previewUrl = null;
  let pending = null, upload = null, busy = false, phase = '', epoch = 0, feedEpoch = 0, cursor = null;
  let identityEpoch = 0, identityReady = false;
  const status = text => { el('memberPostStatus').textContent = text; };
  const metric = name => { if (typeof window.gtag === 'function') window.gtag('event', name, { event_category: 'creators_world' }); };
  const rpc = async (name, args) => {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message || 'Could not complete that request. Please try again.');
    return data;
  };
  function setBusy(value) {
    busy = value;
    el('memberFile').disabled = value || Boolean(pending);
    el('memberCaption').disabled = value || Boolean(pending);
    el('memberPost').disabled = value;
    el('memberCancel').hidden = !pending && !value;
    el('memberCancel').disabled = phase === 'publishing' || phase === 'canceling';
    el('memberPost').textContent = value ? (phase === 'publishing' ? 'Publishing…' : 'Uploading…') : (pending ? 'Retry post ↗' : 'Post to Creator’s World ↗');
  }
  function clearPreview() {
    el('memberPreview').querySelectorAll('audio,video').forEach(media => { media.pause(); media.removeAttribute('src'); media.load(); });
    el('memberPreview').replaceChildren();
    el('memberPreview').hidden = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  function reset() {
    clearPreview(); file = null; pending = null; upload = null; phase = '';
    el('memberPostForm').reset(); el('memberProgress').hidden = true; setBusy(false);
  }
  function mediaElement(mime, url, alt) {
    const kind = mime.split('/')[0];
    const media = document.createElement(kind === 'image' ? 'img' : kind);
    media.src = url;
    if (kind === 'image') { media.alt = alt || 'Community photo'; media.loading = 'lazy'; media.decoding = 'async'; }
    else { media.controls = true; media.preload = 'metadata'; media.setAttribute('playsinline', ''); }
    return media;
  }
  function detectMime(chosen) {
    if (types[chosen.type]) return chosen.type;
    // iOS sometimes supplies an empty MIME type, or the audio/x-m4a alias.
    const ext = chosen.name.split('.').pop().toLowerCase();
    if (chosen.type && chosen.type !== 'audio/x-m4a') return null;
    return Object.keys(types).find(key => types[key].includes(ext)) || null;
  }
  async function choose() {
    clearPreview(); file = null; status('');
    const chosen = el('memberFile').files[0];
    if (!chosen) return;
    const mime = detectMime(chosen);
    if (!mime || chosen.size < 1 || chosen.size > 50 * 1024 * 1024) {
      el('memberFile').value = ''; status('Choose a supported photo, video, or song up to 50 MB.'); return;
    }
    file = { blob: chosen, mime };
    previewUrl = URL.createObjectURL(chosen);
    el('memberPreview').appendChild(mediaElement(mime, previewUrl, 'Preview of your photo'));
    el('memberPreview').hidden = false;
    status('Preview your media, add a caption, then tap Post.');
  }
  async function ensureOwner(id, version) {
    const { data, error } = await sb.auth.getUser();
    if (error) throw new Error('Could not verify your sign-in. Reconnect and try again.');
    if (data?.user?.id !== id || version !== epoch) throw new Error('Your account changed. Sign in again before posting.');
  }
  function transfer(record, selected, owner, version) {
    return new Promise((resolve, reject) => {
      const config = window.HW_SUPABASE_CONFIG;
      const storageOrigin = new URL(config.url).origin.replace('.supabase.co', '.storage.supabase.co');
      const task = new window.tus.Upload(selected.blob, {
        endpoint: storageOrigin + '/storage/v1/upload/resumable',
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        // An account- and post-specific fingerprint prevents another account resuming this upload.
        fingerprint: async () => 'hw-member-' + owner + '-' + record.id,
        metadata: { bucketName: bucket, objectName: record.storage_path, contentType: selected.mime, cacheControl: '300' },
        onBeforeRequest: async request => {
          if (version !== epoch || owner !== user?.id || upload !== task) throw new Error('Account changed. Upload stopped.');
          const { data, error } = await sb.auth.getSession();
          if (version !== epoch || owner !== user?.id || upload !== task) throw new Error('Account changed. Upload stopped.');
          if (error || data?.session?.user?.id !== owner) throw new Error('Sign in again to continue uploading.');
          request.setHeader('Authorization', 'Bearer ' + data.session.access_token);
          request.setHeader('apikey', config.anonKey);
        },
        onError: reject,
        onProgress: (sent, total) => {
          if (version !== epoch || upload !== task || phase !== 'uploading') return;
          const percent = Math.min(100, Math.round(sent / total * 100));
          el('memberProgress').value = percent;
          status('Uploading ' + percent + '% — keep this page open.');
        },
        onSuccess: resolve
      });
      // abort() doesn't settle tus callbacks, so cancellation also rejects this promise.
      upload = task;
      task.cancelPost = () => reject(new Error('Upload canceled.'));
      task.findPreviousUploads().then(previous => {
        if (version !== epoch || phase !== 'uploading' || upload !== task) return reject(new Error('Upload canceled.'));
        if (previous.length) task.resumeFromPreviousUpload(previous[0]);
        task.start();
      }).catch(reject);
    });
  }
  async function post(event) {
    event.preventDefault();
    if (busy || !user) return;
    if (!file) { status('Choose a photo, video, or song first.'); return; }
    const owner = user.id, version = epoch, selected = file;
    phase = 'uploading'; setBusy(true); status('Preparing your post…');
    try {
      await ensureOwner(owner, version);
      if (!pending) pending = { id: crypto.randomUUID(), caption: el('memberCaption').value.trim(), mime: selected.mime, size: selected.blob.size };
      const draft = pending;
      const active = () => version === epoch && pending === draft && owner === user?.id;
      const record = await rpc('member_reserve_post', { p_id: draft.id, p_caption: draft.caption, p_mime: draft.mime, p_size: draft.size });
      if (!active() || phase !== 'uploading') return;
      draft.storage_path = record.storage_path;
      if (record.status !== 'published' && !draft.uploaded) {
        el('memberProgress').hidden = false;
        // A prior upload may have succeeded even if its final response was lost.
        const { data: found } = await sb.storage.from(bucket).list(record.storage_path.split('/').slice(0, -1).join('/'), { limit: 2 });
        if (!active() || phase !== 'uploading') return;
        const complete = found?.some(item => item.name === record.storage_path.split('/').pop() && Number(item.metadata?.size) === selected.blob.size);
        if (!complete) await transfer(record, selected, owner, version);
        if (!active() || phase !== 'uploading') return;
        draft.uploaded = true;
      }
      await ensureOwner(owner, version);
      phase = 'publishing'; setBusy(true); status('Upload complete. Publishing your post…');
      await rpc('member_publish_post', { p_id: draft.id });
      if (!active()) return;
      reset(); status('Posted! Your creation is now in the community feed.'); metric('creator_member_post_published');
      await loadFeed(false);
    } catch (error) {
      if (version === epoch) { phase = ''; setBusy(false); status(error.message + (pending ? ' Tap Retry post to continue, or Cancel upload to discard.' : '')); }
    }
  }
  async function cancel() {
    if (phase === 'publishing' || phase === 'canceling') return;
    const record = pending, task = upload, version = ++epoch;
    phase = 'canceling'; setBusy(true);
    try {
      if (task) { task.cancelPost(); await task.abort(); }
      if (version !== epoch) return;
      if (record) {
        let path;
        try { path = await rpc('member_remove_post', { p_id: record.id }); }
        catch (error) {
          // A rejected reservation has no row or uploaded media to discard.
          if (record.storage_path || error.message !== 'Post is unavailable.') throw error;
        }
        if (version !== epoch) return;
        if (path) {
          const { error } = await sb.storage.from(bucket).remove([path]);
          if (error) throw new Error('Post hidden. Media cleanup could not finish; retry Cancel upload.');
        }
      }
      if (version === epoch) { reset(); status('Upload discarded. Nothing was posted.'); }
    } catch (error) { if (version === epoch) { phase = ''; setBusy(false); status(error.message); } }
  }
  async function signed(path) {
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 900);
    if (error || !data?.signedUrl) throw new Error('Media is unavailable. Try again when you reconnect. The post may have been removed.');
    return data.signedUrl;
  }
  function postMedia(card, row, initialUrl) {
    const container = document.createElement('div'), slot = document.createElement('div');
    const hint = document.createElement('p'), retry = document.createElement('button');
    hint.className = 'member-media-error'; hint.setAttribute('role', 'status'); hint.hidden = true;
    retry.type = 'button'; retry.textContent = 'Reload media'; retry.hidden = true;
    container.append(slot, hint, retry); card.appendChild(container);
    let currentMedia = null;
    function failed(message) { hint.textContent = message; hint.hidden = false; retry.hidden = false; }
    function show(url, position = 0) {
      if (currentMedia?.pause) currentMedia.pause();
      const media = mediaElement(row.mime_type, url, row.caption || 'Photo shared by ' + row.author_name);
      currentMedia = media;
      media.addEventListener('play', () => {
        root.querySelectorAll('#memberFeed video,#memberFeed audio').forEach(other => { if (other !== media) other.pause(); });
      });
      media.addEventListener('error', () => {
        if (currentMedia === media) failed('Media couldn’t load. Try Reload media. If it still won’t play, this browser may not support the format.');
      });
      media.addEventListener(row.mime_type.startsWith('image/') ? 'load' : 'loadedmetadata', () => {
        if (currentMedia !== media) return;
        if (position > 0 && Number.isFinite(media.duration)) {
          try { media.currentTime = Math.min(position, Math.max(0, media.duration - 0.1)); } catch (_) {}
        }
        hint.hidden = true; retry.hidden = true;
      }, { once: true });
      slot.replaceChildren(media);
    }
    retry.addEventListener('click', async () => {
      if (retry.disabled) return;
      retry.disabled = true; hint.textContent = 'Getting a fresh media link…';
      const position = currentMedia?.currentTime || 0;
      try {
        const url = await signed(row.storage_path);
        if (!card.isConnected) return;
        show(url, position); hint.textContent = row.mime_type.startsWith('image/') ? 'Loading photo…' : 'Media link refreshed. Press play to continue.';
        metric('creator_member_media_link_refreshed');
      } catch (error) { if (card.isConnected) failed(error.message); }
      finally { retry.disabled = false; }
    });
    if (initialUrl) show(initialUrl);
    else failed('Media unavailable. Try Reload media to reconnect without refreshing your feed.');
  }
  function postCard(row, url) {
    const card = document.createElement('article'); card.dataset.postId = row.id;
    const header = document.createElement('header'), name = document.createElement('h3'), time = document.createElement('time');
    name.textContent = row.author_name; time.dateTime = row.published_at; time.textContent = new Date(row.published_at).toLocaleString();
    header.append(name, time); card.appendChild(header);
    postMedia(card, row, url);
    const caption = document.createElement('p'); caption.className = 'member-caption'; caption.textContent = row.caption; card.appendChild(caption);
    if (row.report_count) { const count = document.createElement('p'); count.textContent = row.report_count + ' member report(s)'; card.appendChild(count); }
    if (user) {
      const menu = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Post options'; menu.appendChild(summary);
      const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
      if (row.owner_id === user.id || admin) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = row.owner_id === user.id ? 'Delete my post' : 'Remove post';
        remove.addEventListener('click', async () => {
          if (!window.confirm('Remove this post from the community feed?')) return;
          remove.disabled = true;
          try {
            const path = await rpc('member_remove_post', { p_id: row.id });
            const { error } = await sb.storage.from(bucket).remove([path]);
            card.querySelectorAll('audio,video').forEach(media => media.pause());
            if (error) { card.replaceChildren(); feedback.textContent = 'Post hidden from the feed. Media cleanup is pending.'; card.appendChild(feedback); }
            else card.remove();
            metric('creator_member_post_removed');
          } catch (error) { feedback.textContent = error.message; remove.disabled = false; }
        });
        menu.appendChild(remove);
      } else {
        const reason = document.createElement('select'); reason.setAttribute('aria-label', 'Report reason');
        [['spam','Spam'],['rights','Copyright / permission'],['unsafe','Unsafe content'],['other','Other concern']].forEach(([value, label]) => { const option = document.createElement('option'); option.value = value; option.textContent = label; reason.appendChild(option); });
        const report = document.createElement('button'); report.type = 'button'; report.textContent = 'Report post';
        report.addEventListener('click', async () => {
          report.disabled = true;
          try { await rpc('member_report_post', { p_id: row.id, p_reason: reason.value }); feedback.textContent = 'Report sent to the HYPHSWORLD moderators.'; }
          catch (error) { feedback.textContent = error.message; report.disabled = false; }
        });
        menu.append(reason, report);
      }
      menu.appendChild(feedback); card.appendChild(menu);
    }
    return card;
  }
  async function loadFeed(more) {
    if (!sb) return;
    const version = ++feedEpoch;
    el('memberMore').disabled = true; el('memberRefresh').disabled = true;
    el('memberFeedStatus').textContent = 'Loading community posts…';
    try {
      const rows = await rpc('member_feed', { p_before: more ? cursor?.published_at : null, p_before_id: more ? cursor?.id : null, p_reported: admin && el('memberReported').checked });
      const cards = await Promise.all(rows.map(async row => { let url; try { url = await signed(row.storage_path); } catch (_) {} return postCard(row, url); }));
      if (version !== feedEpoch) return;
      if (!more) { el('memberFeed').querySelectorAll('audio,video').forEach(media => media.pause()); el('memberFeed').replaceChildren(); }
      const seen = new Set(Array.from(el('memberFeed').children, card => card.dataset.postId));
      cards.forEach(card => { if (!seen.has(card.dataset.postId)) el('memberFeed').appendChild(card); });
      cursor = rows[rows.length - 1] || cursor;
      el('memberMore').hidden = rows.length < 20;
      el('memberFeedStatus').textContent = el('memberFeed').children.length ? 'Fresh from the community. Newest posts first.' : (el('memberReported').checked ? 'No reported posts to review.' : 'Be the first to share something with the community.');
    } catch (error) { if (version === feedEpoch) el('memberFeedStatus').textContent = 'Couldn’t load the feed. Tap Refresh feed to retry.'; }
    finally { if (version === feedEpoch) { el('memberMore').disabled = false; el('memberRefresh').disabled = false; } }
  }
  async function identity() {
    const version = ++identityEpoch;
    const { data, error } = await sb.auth.getUser();
    if (version !== identityEpoch) return;
    if (error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500)) throw error;
    const next = !error && data?.user && !data.user.is_anonymous ? data.user : null;
    const nextAdmin = Boolean(next?.app_metadata?.creator_admin === true || next?.app_metadata?.role === 'admin');
    const changed = user?.id !== next?.id;
    const reload = !identityReady || changed || admin !== nextAdmin;
    if (changed) {
      epoch += 1;
      const task = upload;
      if (task) { task.cancelPost(); task.abort().catch(() => {}); }
      reset(); status('');
    }
    user = next;
    admin = nextAdmin;
    el('memberPostForm').hidden = !user;
    el('memberLogin').hidden = Boolean(user);
    el('memberIdentity').textContent = user ? 'Your world. Your next post. Share it with the community.' : 'Everyone can explore. Sign in to share your own creations.';
    el('memberModeration').hidden = !admin;
    if (!admin) el('memberReported').checked = false;
    identityReady = true;
    if (reload) await loadFeed(false);
  }
  el('memberFile').addEventListener('change', choose);
  el('memberPostForm').addEventListener('submit', post);
  el('memberCancel').addEventListener('click', cancel);
  el('memberRefresh').addEventListener('click', () => loadFeed(false));
  el('memberMore').addEventListener('click', () => loadFeed(true));
  el('memberReported').addEventListener('change', () => loadFeed(false));
  window.addEventListener('beforeunload', event => { if (busy) { event.preventDefault(); event.returnValue = ''; } });
  async function start() {
    try {
      sb = await window.HWAuth?.getClient();
      if (!sb?.auth?.getUser) throw new Error('Connection unavailable');
      if (!window.tus?.Upload) throw new Error('Uploader unavailable');
      await identity();
      sb.auth.onAuthStateChange(() => { setTimeout(() => { identity().catch(() => status('Connection interrupted.' + (file || pending ? ' Your draft is still here.' : '') + ' Try again when you reconnect.')); }, 0); });
    } catch (_) {
      el('memberIdentity').textContent = 'Creator’s World could not connect. Refresh this page to try again.';
      el('memberFeedStatus').textContent = 'The community feed is temporarily unavailable.';
      el('memberLogin').hidden = false;
    }
  }
  start();
})();
