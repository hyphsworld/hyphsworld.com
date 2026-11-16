/* HYPHSWORLD NFL live scoreboard; gracefully retains the existing records ticker. */
(() => {
  const section = document.getElementById('nfl-records');
  const track = document.getElementById('nfl-ticker-track');
  const button = document.getElementById('nfl-ticker-toggle');
  if (!section || !track || !button) return;
  const endpoint = 'https://yuhxtdkhsltaqiagrtys.supabase.co/functions/v1/nfl-scores';
  const original = track.innerHTML;
  const header = section.querySelector('strong');
  const checked = section.querySelector('time');
  const readable = document.getElementById('nfl-records-readable');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => value == null || value === '' ? '–' : safe(value);
  async function refresh() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw Error('Score feed unavailable');
      const payload = await response.json();
      const games = (Array.isArray(payload.games) ? payload.games : []).filter(g => g.home?.abbr && g.away?.abbr);
      if (!games.length) throw Error('No games in feed');
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
      const summary = section.querySelector('summary');
      if (summary) summary.textContent = 'View NFL game scores';
      section.setAttribute('aria-label', 'NFL game scores');
      button.textContent = section.classList.contains('is-paused') ? 'Resume scores' : 'Pause scores';
    } catch (err) {
      // Keep verified record fallback on initial failure; never label stale scores as live.
      if (header && header.textContent.includes('SCORES')) {
        track.innerHTML = original;
        header.textContent = 'NFL 2026 · REGULAR SEASON · W–L–T';
        if (readable) { const list = track.querySelector('ul'); readable.innerHTML = list ? list.outerHTML : ''; }
        const summary = section.querySelector('summary');
        if (summary) summary.textContent = 'View all 32 team records';
      }
    }
  }
  button.addEventListener('click', () => {
    setTimeout(() => { button.textContent = (section.classList.contains('is-paused') ? 'Resume' : 'Pause') + (header?.textContent.includes('SCORES') ? ' scores' : ' records'); }, 0);
  });
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
})();
