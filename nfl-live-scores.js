/* HYPHSWORLD NFL live scoreboard; gracefully retains the existing records ticker. */
(() => {
  const section = document.getElementById('nfl-records');
  const track = document.getElementById('nfl-ticker-track');
  const button = document.getElementById('nfl-ticker-toggle');
  if (!section || !track || !button) return;
  const scoreboard = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  const endpoint = 'https://yuhxtdkhsltaqiagrtys.supabase.co/functions/v1/nfl-scores';
  const original = track.innerHTML;
  const header = section.querySelector('strong');
  const checked = section.querySelector('time');
  const readable = document.getElementById('nfl-records-readable');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => value == null || value === '' ? '–' : safe(value);
  async function fetchFeed(url) {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('Score feed unavailable');
    return response.json();
  }

  function normalizeEvent(event) {
    const competition = event.competitions?.[0];
    const teams = competition?.competitors || [];
    const team = side => {
      const competitor = teams.find(entry => entry.homeAway === side);
      return { abbr: competitor?.team?.abbreviation, score: competitor?.score };
    };
    const status = event.status?.type || competition?.status?.type;
    return {
      status: status?.state,
      detail: status?.shortDetail || status?.detail,
      home: team('home'),
      away: team('away'),
    };
  }

  function usableGames(games) {
    return (Array.isArray(games) ? games : []).filter(game =>
      game?.home?.abbr && game?.away?.abbr && ['in', 'pre', 'post'].includes(game.status));
  }

  async function loadScores() {
    try {
      const data = await fetchFeed(scoreboard);
      const games = usableGames(data.events?.map(normalizeEvent));
      if (games.length) return { games, fetched_at: new Date().toISOString() };
    } catch {
      // The existing proxy is a second route to the scoreboard.
    }
    const payload = await fetchFeed(endpoint);
    const games = usableGames(payload.games);
    if (!games.length) throw Error('No games in feed');
    return { ...payload, games };
  }

  const recordsTime = checked?.textContent;
  const recordsDateTime = checked?.getAttribute('datetime');
  const recordsLabel = section.getAttribute('aria-label');
  const summary = section.querySelector('summary');
  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const payload = await loadScores();
      const { games } = payload;
      const live = games.filter(g => g.status === 'in');
      const upcoming = games.filter(g => g.status === 'pre');
      const finished = games.filter(g => g.status === 'post');
      const selected = [...live, ...upcoming, ...finished].slice(0, 20);
      const entries = selected.map(g => {
        const state = g.status === 'in' ? 'LIVE' : g.status === 'post' ? 'FINAL' : 'UPCOMING';
        const score = g.status === 'pre' ? 'vs' : fmt(g.away.score) + '–' + fmt(g.home.score);
        return '<li>' + safe(g.away.abbr) + ' ' + score + ' ' + safe(g.home.abbr) + ' <strong>' + state + '</strong> ' + safe(g.detail || '') + '</li>';
      }).join('');
      track.innerHTML = '<ul class="nfl-team-records">' + entries + '</ul><ul class="nfl-team-records" aria-hidden="true">' + entries + '</ul>';
      if (header) header.textContent = 'NFL SCORES · LIVE / FINAL / UPCOMING';
      if (checked) { checked.dateTime = payload.fetched_at || ''; checked.textContent = 'Updated ' + new Date(payload.fetched_at || Date.now()).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
      if (readable) readable.innerHTML = '<ul>' + entries + '</ul>';
      if (summary) summary.textContent = 'View NFL game scores';
      section.setAttribute('aria-label', 'NFL game scores');
      button.textContent = section.classList.contains('is-paused') ? 'Resume scores' : 'Pause scores';
    } catch (err) {
      // Keep verified record fallback on initial failure; never label stale scores as live.
      if (header && header.textContent.includes('SCORES')) {
        track.innerHTML = original;
        header.textContent = 'NFL 2026 · REGULAR SEASON · W–L–T';
        if (readable) { const list = track.querySelector('ul'); readable.innerHTML = list ? list.outerHTML : ''; }
        if (summary) summary.textContent = 'View all 32 team records';
        if (checked) {
          checked.textContent = recordsTime;
          if (recordsDateTime === null) checked.removeAttribute('datetime');
          else checked.dateTime = recordsDateTime;
        }
        if (recordsLabel === null) section.removeAttribute('aria-label');
        else section.setAttribute('aria-label', recordsLabel);
        button.textContent = section.classList.contains('is-paused') ? 'Resume records' : 'Pause records';
      }
    } finally {
      refreshing = false;
    }
  }
  button.addEventListener('click', () => {
    setTimeout(() => { button.textContent = (section.classList.contains('is-paused') ? 'Resume' : 'Pause') + (header?.textContent.includes('SCORES') ? ' scores' : ' records'); }, 0);
  });
  refresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
