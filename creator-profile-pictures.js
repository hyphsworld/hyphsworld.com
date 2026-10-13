/* Picture selection stays local until the existing Profile form is saved. */
(function () {
  'use strict';
  var bucketName = 'creator-profile-pictures';
  var maxBytes = 5 * 1024 * 1024;
  var extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  var selected = null, previewUrl = '', generation = 0, checking = false;
  var currentUrl = '', currentName = '', message, input, preview, cancel;
  function el(id) { return document.getElementById(id); }
  function announce(text) { if (message) message.textContent = text; }
  function pictureUrl(value) {
    if (!value) return '';
    try {
      var url = new URL(value, location.href);
      if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:')) return url.href;
    } catch (error) {}
    throw new Error('Use a secure HTTPS picture link or an existing HYPHSWORLD image path.');
  }
  function releasePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  function showPicture(url, name) {
    if (!preview) return;
    preview.src = url || 'assets/creator-world/urban-culture.webp';
    preview.alt = name ? name + ' profile picture preview' : 'Profile picture preview';
  }
  function reset(creator) {
    generation += 1;
    checking = false; selected = null; releasePreview();
    currentName = creator.display_name || '';
    try { currentUrl = pictureUrl(creator.image_url || ''); } catch (error) { currentUrl = ''; }
    if (input) input.value = '';
    if (cancel) cancel.hidden = true;
    showPicture(currentUrl, currentName);
    announce('Choose a picture to preview it. Save Profile applies your changes.');
  }
  function choose() {
    var file = input.files && input.files[0];
    var token = ++generation;
    checking = false; selected = null; releasePreview();
    showPicture(currentUrl, currentName);
    cancel.hidden = true;
    if (!file) return;
    if (!extensions[file.type]) { input.value = ''; announce('Choose a JPG, PNG, or WEBP picture. Export HEIC photos as JPG first.'); return; }
    if (!file.size || file.size > maxBytes) { input.value = ''; announce('Choose a picture no larger than 5 MB.'); return; }
    checking = true;
    announce('Checking your picture…');
    var url = URL.createObjectURL(file), image = new Image();
    image.onload = function () {
      if (token !== generation) { URL.revokeObjectURL(url); return; }
      checking = false;
      if (!image.naturalWidth || !image.naturalHeight) { URL.revokeObjectURL(url); input.value = ''; announce('That picture could not be opened. Choose another image.'); return; }
      selected = file; previewUrl = url; showPicture(url, currentName); cancel.hidden = false;
      announce('New picture selected. Save Profile to apply it.');
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      if (token !== generation) return;
      checking = false; input.value = ''; announce('That picture could not be opened. Choose another image.');
    };
    image.src = url;
  }
  async function upload(client, creatorId, userId) {
    if (checking) throw new Error('Wait for the picture preview before saving.');
    var file = selected;
    if (!file) return null;
    var path = creatorId + '/' + userId + '/' + crypto.randomUUID() + '.' + extensions[file.type];
    var bucket = client.storage.from(bucketName);
    var stored = await bucket.upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (stored.error) throw new Error('Picture upload failed: ' + stored.error.message);
    var publicData = bucket.getPublicUrl(path);
    try {
      var url = pictureUrl(publicData && publicData.data && publicData.data.publicUrl);
      if (!url) throw new Error('The picture link was not returned.');
      return { url: url, path: path };
    } catch (error) {
      await discard(client, { path: path });
      throw error;
    }
  }
  async function discard(client, uploaded) {
    if (!uploaded) return;
    try {
      var result = await client.storage.from(bucketName).remove([uploaded.path]);
      if (result.error) console.warn('Unsaved profile picture cleanup could not finish.');
    } catch (error) { console.warn('Unsaved profile picture cleanup could not finish.'); }
  }
  function bind() {
    input = el('profilePictureFile'); preview = el('profilePicturePreview');
    message = el('profilePictureStatus'); cancel = el('profilePictureCancel');
    if (!input || !preview || !cancel) return;
    input.addEventListener('change', choose);
    cancel.addEventListener('click', function () { reset({ image_url: currentUrl, display_name: currentName }); announce('Keeping your current picture.'); });
    preview.addEventListener('error', function () {
      if (!preview.src.endsWith('/assets/creator-world/urban-culture.webp')) showPicture('', currentName);
    });
  }
  window.HWCreatorProfilePictures = { reset: reset, upload: upload, discard: discard, pictureUrl: pictureUrl, hasSelection: function () { return !!selected; }, isChecking: function () { return checking; }, announce: announce };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
