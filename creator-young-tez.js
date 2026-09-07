(function () {
  'use strict';

  var follow = document.getElementById('followCreator');
  var share = document.getElementById('shareCreator');
  var toast = document.getElementById('worldToast');
  var audio = document.getElementById('creatorAudio');
  var play = document.getElementById('playTrack');
  var progress = document.getElementById('trackProgress');
  var shell = document.getElementById('trackProgressShell');
  var time = document.getElementById('trackTime');
  var title = document.getElementById('activeTitle');
  var meta = document.getElementById('activeMeta');
  var cover = document.getElementById('activeCover');
  var followKey = 'hyphsworld.creator.young-tez.following';
  var legacyRewardKey = 'hyphsworld.creator.young-tez.reward.follow';
  var rewardPending = false;
  var timer;

  if (!follow || !share || !toast || !audio || !play || !progress || !shell || !time || !title || !meta || !cover) return;

  function show(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (error) {}
  }

  function following() {
    return storageGet(followKey) === 'true';
  }

  function currentUser() {
    var state = window.HWPoints && typeof window.HWPoints.getState === 'function' ? window.HWPoints.getState() : null;
    return state && state.user ? state.user : null;
  }

  function accountRewardKey(user) {
    var id = user && (user.userId || user.id);
    return id ? legacyRewardKey + '.' + id : '';
  }

  function alreadyRewarded(user) {
    var key = accountRewardKey(user);
    if (!key) return false;
    if (storageGet(key) === 'true') return true;
    if (storageGet(legacyRewardKey) === 'true') {
      storageSet(key, 'true');
      storageRemove(legacyRewardKey);
      return true;
    }
    return false;
  }

  function renderFollow() {
    var active = following();
    follow.classList.toggle('is-following', active);
    follow.setAttribute('aria-pressed', String(active));
    follow.textContent = active ? '✓ Following Young Tez' : '＋ Follow Young Tez';
  }

  async function reward() {
    var user = currentUser();
    if (!user) {
      show('Log in to save Cool Points');
      return;
    }
    if (rewardPending || alreadyRewarded(user)) return;
    rewardPending = true;
    try {
      var state = await window.HWPoints.add(10, 'creator_follow_young_tez', { creator_id: 'young-tez', reward_id: 'follow' });
      if (state && state.user) {
        storageSet(accountRewardKey(user), 'true');
        show('+10 Cool Points saved');
      }
    } catch (error) {
      show('Could not save Cool Points yet');
    } finally {
      rewardPending = false;
    }
  }

  function format(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  function renderAudio() {
    var percent = audio.duration ? Math.max(0, Math.min(100, audio.currentTime / audio.duration * 100)) : 0;
    play.textContent = audio.paused ? '▶' : '❚❚';
    play.setAttribute('aria-label', (audio.paused ? 'Play ' : 'Pause ') + title.textContent);
    progress.style.width = percent + '%';
    shell.setAttribute('aria-valuenow', String(Math.round(percent)));
    time.textContent = format(audio.currentTime);
  }

  function seek(percent) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(1, percent)) * audio.duration;
    renderAudio();
  }

  follow.addEventListener('click', function () {
    var next = !following();
    storageSet(followKey, String(next));
    renderFollow();
    show(next ? 'You’re following Creator #004' : 'Creator unfollowed');
    if (next) reward();
  });

  share.addEventListener('click', async function () {
    var data = { title: 'Young Tez — Verified Artist', text: 'Enter Young Tez’s Chicago Creators World on HYPHSWORLD.', url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(location.href);
        show('Profile link copied');
      } else show('Copy the profile address from your browser');
    } catch (error) {
      if (error && error.name !== 'AbortError') show('Copy the profile address from your browser');
    }
  });

  play.addEventListener('click', function () {
    if (audio.paused) audio.play().catch(function () { show('Tap play again to start audio'); });
    else audio.pause();
  });
  audio.addEventListener('timeupdate', renderAudio);
  audio.addEventListener('loadedmetadata', renderAudio);
  audio.addEventListener('play', renderAudio);
  audio.addEventListener('pause', renderAudio);
  audio.addEventListener('error', function () { show('This track is temporarily unavailable'); });
  shell.addEventListener('click', function (event) {
    var rect = shell.getBoundingClientRect();
    if (rect.width) seek((event.clientX - rect.left) / rect.width);
  });
  shell.addEventListener('keydown', function (event) {
    if (!audio.duration) return;
    var percent = audio.currentTime / audio.duration;
    if (event.key === 'ArrowLeft') percent -= 0.05;
    else if (event.key === 'ArrowRight') percent += 0.05;
    else if (event.key === 'Home') percent = 0;
    else if (event.key === 'End') percent = 1;
    else return;
    event.preventDefault();
    seek(percent);
  });

  document.querySelectorAll('.track').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.track').forEach(function (item) { item.classList.remove('is-active'); });
      button.classList.add('is-active');
      audio.pause();
      audio.src = button.dataset.src;
      cover.src = button.dataset.cover;
      cover.alt = button.dataset.title + ' cover artwork';
      title.textContent = button.dataset.title;
      meta.textContent = button.dataset.meta;
      audio.load();
      renderAudio();
      audio.play().catch(function () { show('Tap play to listen'); });
    });
  });

  window.addEventListener('hw:points-ready', function () {
    if (following()) reward();
  }, { once: true });
  document.getElementById('year').textContent = new Date().getFullYear();
  renderFollow();
  renderAudio();
})();
