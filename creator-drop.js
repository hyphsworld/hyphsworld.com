(function () {
  'use strict';

  var profilePages = {
    'hyph-life': 'creators-world.html',
    'rojasonthebeat': 'creator-rojas.html',
    'francoismusic47': 'creator-francoismusic47.html',
    'young-tez': 'creator-young-tez.html',
    'b3llygang-h3rsch': 'creator-b3llygang-h3rsch.html',
    'nitti-bo': 'creator-nitti-bo.html',
    'lil-g': 'creator-lil-g.html',
    'sixx-figgaz': 'creator-sixx-figgaz.html',
    'ykomusic': 'creator-ykomusic.html',
    'kili-631': 'creator-kili-631.html'
  };
  var currentDrop;
  var currentCreator;

  function el(id) { return document.getElementById(id); }
  function text(value, fallback) { return typeof value === 'string' && value.trim() ? value.trim() : (fallback || ''); }
  function node(tag, className, content) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (content !== undefined) item.textContent = content;
    return item;
  }
  function dropUrl(id) { return 'creator-drop.html?id=' + encodeURIComponent(id); }
  function validId(id) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || ''); }

  function showError(title, copy) {
    el('dropLoading').hidden = true;
    el('dropExperience').hidden = true;
    el('dropErrorTitle').textContent = title;
    el('dropErrorCopy').textContent = copy;
    el('dropError').hidden = false;
  }

  function publicUrl(client, path) {
    var result = client.storage.from('creator-world-public').getPublicUrl(path);
    return result && result.data && result.data.publicUrl;
  }

  async function fileIsLive(url) {
    try {
      var response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  function mediaFailed() {
    showError('This drop is being restored.', 'The public copy is unavailable, but the creator’s protected original is still safe. Check back shortly.');
  }

  function renderMedia(row, url, creator) {
    var frame = el('dropMedia');
    frame.replaceChildren();
    var media;
    if (row.media_type === 'image') {
      media = node('img');
      media.src = url;
      media.alt = row.title;
      media.decoding = 'async';
      media.addEventListener('error', mediaFailed, { once: true });
    } else if (row.media_type === 'video') {
      media = node('video');
      media.src = url;
      media.controls = true;
      media.preload = 'metadata';
      media.playsInline = true;
      media.setAttribute('aria-label', row.title);
      media.addEventListener('error', mediaFailed, { once: true });
    } else if (row.media_type === 'audio') {
      var audioDrop = node('div', 'audio-drop');
      var art = node('div', 'audio-art');
      var image = node('img');
      image.src = text(creator && creator.image_url, 'creator-hyph-life-hero.jpg');
      image.alt = '';
      art.appendChild(image);
      media = node('audio');
      media.src = url;
      media.controls = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', row.title);
      media.addEventListener('error', mediaFailed, { once: true });
      audioDrop.append(art, media);
      frame.appendChild(audioDrop);
      return;
    } else if (row.mime_type === 'application/pdf') {
      media = node('iframe');
      media.src = url + '#view=FitH';
      media.title = row.title;
    } else {
      var documentDrop = node('div', 'document-drop');
      documentDrop.append(node('strong', '', 'DROP'));
      var download = node('a', '', 'DOWNLOAD CREATION');
      download.href = url + '?download';
      documentDrop.appendChild(download);
      frame.appendChild(documentDrop);
      return;
    }
    frame.appendChild(media);
  }

  function creatorProfile(creator, slug) {
    var candidate = text(creator && creator.profile_url);
    if (candidate) {
      try {
        var parsed = new URL(candidate, location.href);
        if (parsed.origin === location.origin) return parsed.pathname + parsed.search + parsed.hash;
      } catch (error) {}
    }
    return profilePages[slug] || 'creators.html';
  }

  async function shareDrop() {
    var payload = {
      title: text(currentDrop && currentDrop.title, 'HYPHSWORLD World Drop'),
      text: 'See this World Drop by ' + text(currentCreator && currentCreator.display_name, 'a HYPHSWORLD creator') + '.',
      url: location.href
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(location.href);
        el('shareDropMain').textContent = 'LINK COPIED';
      }
    } catch (error) {}
  }

  async function loadNext(client, row) {
    var result = await client.from('creator_world_publications')
      .select('id,title')
      .eq('creator_id', row.creator_id)
      .neq('id', row.id)
      .order('published_at', { ascending: false })
      .limit(1);
    var next = result.data && result.data[0];
    if (!next) return;
    el('nextDrop').href = dropUrl(next.id);
    el('nextDropTitle').textContent = next.title;
    el('nextDrop').hidden = false;
  }

  function render(row, creator, url) {
    currentDrop = row;
    currentCreator = creator;
    var kind = text(row.creation_kind, row.media_type || 'world').replaceAll('_', ' ').toUpperCase();
    var creatorName = text(creator && creator.display_name, text(row.creator_slug, 'Creator').replaceAll('-', ' '));
    var profile = creatorProfile(creator, row.creator_slug);
    document.title = row.title + ' by ' + creatorName + ' | HYPHSWORLD';
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = row.title + ', a live ' + kind.toLowerCase() + ' creation by ' + creatorName + ' on HYPHSWORLD.';
    el('dropKind').textContent = kind + ' • LIVE';
    el('dropEyebrow').textContent = 'CREATOR WORLD ORIGINAL • ' + kind;
    el('dropTitle').textContent = row.title;
    el('dropDate').textContent = row.published_at ? new Date(row.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    el('dropDate').dateTime = row.published_at || '';
    el('creatorName').textContent = creatorName;
    el('creatorHeadline').textContent = text(creator && creator.headline, 'Independent Creator');
    el('creatorImage').src = text(creator && creator.image_url, 'creator-hyph-life-hero.jpg');
    el('creatorImage').alt = creatorName;
    el('creatorIdentity').href = profile;
    el('creatorWorldLink').href = profile + '#world-releases';
    renderMedia(row, url, creator);
    el('dropLoading').hidden = true;
    el('dropError').hidden = true;
    el('dropExperience').hidden = false;
    el('shareDrop').hidden = false;
  }

  async function load() {
    el('dropError').hidden = true;
    el('dropExperience').hidden = true;
    el('dropLoading').hidden = false;
    var id = new URLSearchParams(location.search).get('id');
    if (!validId(id)) {
      showError('World Drop not found.', 'Use a creation link from Creators World to open a live drop.');
      return;
    }
    try {
      if (!window.HWAuth) throw new Error('Creator service unavailable');
      var client = await window.HWAuth.getClient();
      if (!client) throw new Error('Creator service unavailable');
      var publication = await client.from('creator_world_publications')
        .select('id,creator_id,creator_slug,title,creation_kind,media_type,mime_type,file_size,public_path,published_at')
        .eq('id', id)
        .maybeSingle();
      if (publication.error) throw publication.error;
      if (!publication.data) {
        showError('World Drop not found.', 'This creation is not public, or it has been removed from Creators World.');
        return;
      }
      var row = publication.data;
      var creatorResult = await client.from('creators')
        .select('display_name,headline,image_url,profile_url,verification_level')
        .eq('id', row.creator_id)
        .maybeSingle();
      var creator = creatorResult.data || null;
      var url = publicUrl(client, row.public_path);
      if (!url || !(await fileIsLive(url))) {
        showError('This drop is being restored.', 'The public copy is unavailable, but the creator’s protected original is still safe. Check back shortly.');
        return;
      }
      render(row, creator, url);
      loadNext(client, row);
    } catch (error) {
      showError('Could not open this World Drop.', 'Check your connection and try again without leaving HYPHSWORLD.');
    }
  }

  el('shareDrop').addEventListener('click', shareDrop);
  el('shareDropMain').addEventListener('click', shareDrop);
  el('retryDrop').addEventListener('click', load);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
