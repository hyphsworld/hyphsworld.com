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
  var creatorSlug = 'young-tez';
  var creatorLabel = 'Young Tez';
  var rewardBase = 'hyphsworld.creator.young-tez.reward.follow.';
  var client = null;
  var user = null;
  var creator = null;
  var isFollowing = false;
  var followBusy = false;
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

  function ensureFollowerStat() {
    var stats = document.querySelector('.creator-stats');
    if (!stats) return null;
    var node = stats.querySelector('[data-creator-followers]');
    if (node) return node;
    var box = document.createElement('div');
    node = document.createElement('strong');
    var label = document.createElement('span');
    node.setAttribute('data-creator-followers', '');
    node.textContent = '—';
    label.textContent = 'Followers';
    box.append(node, label);
    stats.append(box);
    return node;
  }

  function renderFollowerCount() {
    var node = ensureFollowerStat();
    if (node && creator) node.textContent = Math.max(0, Number(creator.follower_count) || 0).toLocaleString();
  }

  function renderFollow() {
    follow.disabled = followBusy;
    follow.classList.toggle('is-following', isFollowing);
    follow.setAttribute('aria-pressed', String(isFollowing));
    follow.textContent = followBusy ? 'Please wait…' : (isFollowing ? '✓ Following ' + creatorLabel : '＋ Follow ' + creatorLabel);
  }

  async function reward() {
    if (!user || !window.HWPoints || typeof window.HWPoints.add !== 'function') return;
    var key = rewardBase + user.id;
    if (rewardPending || storageGet(key) === 'true') return;
    rewardPending = true;
    try {
      var state = await window.HWPoints.add(10, 'creator_follow_young_tez', { creator_id: creatorSlug, reward_id: 'follow' });
      if (state && state.user) {
        storageSet(key, 'true');
        show('+10 Cool Points saved');
      }
    } catch (error) {
      show('Follow saved • Cool Points will retry later');
    } finally {
      rewardPending = false;
    }
  }

  async function refreshCreator() {
    var response = await client.from('creators').select('id,slug,follower_count').eq('slug', creatorSlug).maybeSingle();
    if (response.error || !response.data) throw response.error || new Error('Creator unavailable');
    creator = response.data;
    renderFollowerCount();
  }

  async function refreshFollowing() {
    isFollowing = false;
    if (!user) { renderFollow(); return; }
    var response = await client.from('creator_follows').select('creator_id').eq('creator_id', creator.id).eq('user_id', user.id).maybeSingle();
    if (response.error) throw response.error;
    isFollowing = Boolean(response.data);
    renderFollow();
  }

  async function initFollow() {
    ensureFollowerStat();
    renderFollow();
    if (!window.HWAuth) return;
    try {
      client = await window.HWAuth.getClient();
      if (!client) return;
      await refreshCreator();
      var session = await client.auth.getSession();
      user = session.data && session.data.session ? session.data.session.user : null;
      await refreshFollowing();
    } catch (error) {
      console.warn('Young Tez follow state unavailable.', error);
    }
  }

  follow.addEventListener('click', async function () {
    if (followBusy) return;
    if (!client || !creator) { show('Creator connection is still loading'); return; }
    if (!user) { show('Log in to follow creators'); return; }
    followBusy = true;
    renderFollow();
    try {
      if (isFollowing) {
        var remove = await client.from('creator_follows').delete().eq('creator_id', creator.id).eq('user_id', user.id);
        if (remove.error) throw remove.error;
        isFollowing = false;
        show('Creator unfollowed');
      } else {
        var add = await client.from('creator_follows').insert({ creator_id: creator.id, user_id: user.id });
        if (add.error && add.error.code !== '23505') throw add.error;
        isFollowing = true;
        show('You’re following Creator #004');
        reward();
      }
      await refreshCreator();
    } catch (error) {
      show('Could not update follow yet');
      console.warn('Young Tez follow update failed.', error);
    } finally {
      followBusy = false;
      renderFollow();
    }
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

  document.getElementById('year').textContent = new Date().getFullYear();
  renderAudio();
  initFollow();
})();
