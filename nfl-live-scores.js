/* HYPHSWORLD NFL live scoreboard; gracefully retains the existing records ticker. */
(() => {
  let section = document.getElementById('nfl-records');
  if (section?.dataset.nflReady) return;

  if (!section) {
    const gamePage = document.currentScript?.hasAttribute('data-nfl-game');
    const host = document.createElement(gamePage ? 'dialog' : 'div');
    host.className = 'hw-nfl-host';
    host.innerHTML = `<section id="nfl-records" aria-label="NFL scores and standings">
      <div class="hw-nfl-header"><strong>NFL SCORES</strong><span><time></time></span>
        <a href="https://www.nfl.com/standings/" target="_blank" rel="noopener">NFL standings</a>
        <button type="button" id="nfl-ticker-toggle" aria-controls="nfl-ticker-track" aria-pressed="false">Pause scores</button>
      </div>
      <div class="nfl-ticker-window" tabindex="0" aria-label="Scrolling NFL scores; focus to pause">
        <div id="nfl-ticker-track"><ul class="nfl-team-records"><li>Loading NFL scores…</li></ul></div>
      </div>
      <details><summary>View NFL game scores</summary><div id="nfl-records-readable"></div></details>
    </section>`;
    if (gamePage) {
      host.setAttribute('aria-label', 'NFL scores and standings');
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'hw-nfl-launcher';
      open.textContent = 'NFL Scores';
      open.setAttribute('aria-haspopup', 'dialog');
      open.addEventListener('click', () => host.showModal());
      const close = document.createElement('form');
      close.method = 'dialog';
      close.className = 'hw-nfl-close';
      close.innerHTML = '<button type="submit">Close NFL scores</button>';
      host.prepend(close);
      document.body.append(open, host);
    } else {
      const footer = document.querySelector('body > footer');
      if (footer) footer.before(host);
      else document.body.append(host);
    }
    section = host.querySelector('section');
  }
  section.dataset.nflReady = 'true';

  const style = document.createElement('style');
  style.textContent = `
    .hw-nfl-host{box-sizing:border-box;max-width:100%;min-width:0;color:#fff;background:#050505;border-block:1px solid #285c39;font:14px/1.45 system-ui,sans-serif}
    .hw-nfl-host #nfl-records{padding:10px 0}
    .hw-nfl-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:0 16px;font-size:.85rem}
    .hw-nfl-host a{color:#83ff70}
    .hw-nfl-host button,.hw-nfl-launcher{font:inherit;color:#fff;background:#15251b;border:1px solid #548864;border-radius:8px;padding:6px 10px;cursor:pointer}
    .hw-nfl-host details{padding:6px 16px}
    .hw-nfl-host .nfl-ticker-window{overflow:hidden}
    .hw-nfl-host #nfl-ticker-track{display:flex;width:max-content}
    .hw-nfl-host #nfl-ticker-track:has([aria-hidden="true"]){animation:hwNflScroll 180s linear infinite}
    .hw-nfl-host .nfl-team-records{display:flex;flex-shrink:0;gap:24px;list-style:none;margin:0;padding:6px 24px 6px 16px;white-space:nowrap}
    .hw-nfl-host .nfl-team-records strong{color:#ffe45c}
    .hw-nfl-host #nfl-records.is-paused #nfl-ticker-track,.hw-nfl-host .nfl-ticker-window:hover #nfl-ticker-track,.hw-nfl-host .nfl-ticker-window:focus-within #nfl-ticker-track{animation-play-state:paused}
    .hw-nfl-host #nfl-records-readable ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:8px;list-style:none;padding:8px 0}
    #nfl-team-stats{padding:6px 16px}
    #nfl-team-stats summary,.hw-nfl-host summary{cursor:pointer}
    #nfl-team-stats p{margin:6px 0;font-size:.85em}
    .hw-nfl-stat-table{overflow-x:auto;margin:6px 0 10px}
    .hw-nfl-stat-table table{width:100%;border-collapse:collapse;font-size:.85em;text-align:right}
    .hw-nfl-stat-table caption,.hw-nfl-stat-table th:first-child{text-align:left}
    .hw-nfl-stat-table caption{font-weight:bold}
    .hw-nfl-stat-table th,.hw-nfl-stat-table td{padding:6px 8px;border-bottom:1px solid #285c39;white-space:nowrap}
    .hw-nfl-launcher{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:9000;font:700 12px/1.35 system-ui,sans-serif}
    dialog.hw-nfl-host{position:fixed;inset:0;width:min(760px,calc(100% - 24px));max-height:85dvh;padding:12px;border:1px solid #548864;border-radius:12px;overflow:auto}
    dialog.hw-nfl-host::backdrop{background:#000b}
    .hw-nfl-close{text-align:right;margin:0 0 8px}
    @keyframes hwNflScroll{to{transform:translateX(-50%)}}
    @media(prefers-reduced-motion:reduce){.hw-nfl-host #nfl-ticker-track{animation:none!important}.hw-nfl-host .nfl-ticker-window{overflow-x:auto}.hw-nfl-host #nfl-ticker-toggle{display:none}}
  `;
  document.head.append(style);
  const track = document.getElementById('nfl-ticker-track');
  const button = document.getElementById('nfl-ticker-toggle');
  if (!section || !track || !button) return;
  const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
  const scoreboard = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  const endpoint = 'https://yuhxtdkhsltaqiagrtys.supabase.co/functions/v1/nfl-scores';
  const original = track.innerHTML;
  const homeFallback = !section.closest('.hw-nfl-host');
  const originalHeading = section.querySelector('strong')?.textContent;
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
  const tickerWindow = track.parentElement;
  const stats = document.createElement('details');
  stats.id = 'nfl-team-stats';
  stats.innerHTML = '<summary>NFL team stats and standings</summary><p role="status">Open to load all 32 teams.</p><div></div>';
  section.append(stats);
  const statsStatus = stats.querySelector('p');
  const statsContent = stats.lastElementChild;
  let statsPending = false;
  let statsChecked = 0;

  async function refreshStats() {
    if (!stats.open || statsPending || Date.now() - statsChecked < 300000) return;
    statsPending = true;
    try {
      const payload = await fetchFeed(standingsUrl);
      const groups = payload.children.map(group => ({
        name: group.name,
        entries: group.standings.entries.map(({team, stats: values}) => {
          const fields = Object.fromEntries(values.map(stat => [stat.name, stat.displayValue ?? stat.value]));
          return { id: team.id, name: team.displayName, fields };
        }),
      }));
      const teams = groups.flatMap(group => group.entries);
      if (new Set(teams.map(team => team.id)).size !== 32 ||
          teams.some(team => !team.id || !team.name || ['wins', 'losses', 'ties', 'winPercent', 'pointsFor', 'pointsAgainst', 'streak'].some(key => team.fields[key] == null))) {
        throw Error('Incomplete standings');
      }
      statsContent.innerHTML = groups.map(group => `<div class="hw-nfl-stat-table"><table>
        <caption>${safe(group.name)}</caption><thead><tr><th scope="col">Team</th><th scope="col">W–L–T</th><th scope="col">Win %</th><th scope="col">PF</th><th scope="col">PA</th><th scope="col">Streak</th></tr></thead>
        <tbody>${group.entries.map(({name, fields}) => `<tr><th scope="row">${safe(name)}</th><td>${safe(fields.wins)}–${safe(fields.losses)}–${safe(fields.ties)}</td><td>${safe(fields.winPercent)}</td><td>${safe(fields.pointsFor)}</td><td>${safe(fields.pointsAgainst)}</td><td>${safe(fields.streak)}</td></tr>`).join('')}</tbody>
      </table></div>`).join('');
      statsChecked = Date.now();
      statsStatus.textContent = [payload.season?.year, 'W–L–T · Win % · PF = points for · PA = points against', 'Checked ' + new Date(statsChecked).toLocaleString()].filter(Boolean).join(' · ');
    } catch {
      statsStatus.textContent = statsChecked
        ? 'Standings feed unavailable. Showing the last standings checked ' + new Date(statsChecked).toLocaleString() + '.'
        : 'Standings are temporarily unavailable. Use the NFL standings link above.';
    } finally {
      statsPending = false;
    }
  }
  stats.addEventListener('toggle', refreshStats);
  let scoreMode = !homeFallback;

  function updatePauseLabel() {
    button.textContent = (section.classList.contains('is-paused') ? 'Resume' : 'Pause') + (scoreMode ? ' scores' : ' records');
  }

  let refreshing = false;
  async function refresh() {
    if (refreshing || section.closest('dialog:not([open])')) return;
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
      scoreMode = true;
      tickerWindow.setAttribute('aria-label', 'Scrolling NFL scores; focus to pause');
      if (header) header.textContent = 'NFL SCORES · LIVE / FINAL / UPCOMING';
      if (checked) { checked.dateTime = payload.fetched_at || ''; checked.textContent = 'Updated ' + new Date(payload.fetched_at || Date.now()).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
      if (readable) readable.innerHTML = '<ul>' + entries + '</ul>';
      if (summary) summary.textContent = 'View NFL game scores';
      section.setAttribute('aria-label', 'NFL game scores');
      updatePauseLabel();
    } catch (err) {
      // Keep verified record fallback on initial failure; never label stale scores as live.
      if (!homeFallback) {
        track.innerHTML = '<ul class="nfl-team-records"><li>NFL scores are temporarily unavailable.</li></ul>';
        if (checked) { checked.removeAttribute('datetime'); checked.textContent = ''; }
        if (readable) readable.textContent = 'Scores are temporarily unavailable.';
      } else if (scoreMode) {
        scoreMode = false;
        tickerWindow.setAttribute('aria-label', 'Scrolling NFL records; focus to pause');
        track.innerHTML = original;
        if (header) header.textContent = originalHeading;
        if (readable) { const list = track.querySelector('ul'); readable.innerHTML = list ? list.outerHTML : ''; }
        if (summary) summary.textContent = 'View all 32 team records';
        if (checked) {
          checked.textContent = recordsTime;
          if (recordsDateTime === null) checked.removeAttribute('datetime');
          else checked.dateTime = recordsDateTime;
        }
        if (recordsLabel === null) section.removeAttribute('aria-label');
        else section.setAttribute('aria-label', recordsLabel);
        updatePauseLabel();
      }
    } finally {
      refreshing = false;
    }
  }
  button.addEventListener('click', () => {
    if (!homeFallback) {
      const paused = section.classList.toggle('is-paused');
      button.setAttribute('aria-pressed', String(paused));
    }
    updatePauseLabel();
  });
  const dialog = section.closest('dialog');
  if (dialog) {
    const launcher = dialog.previousElementSibling;
    launcher.addEventListener('click', () => { refresh(); refreshStats(); });
  }
  function refreshVisible() {
    if (document.hidden || (dialog && !dialog.open)) return;
    refresh();
    refreshStats();
  }
  refreshVisible();
  document.addEventListener('visibilitychange', refreshVisible);
  setInterval(refreshVisible, 60000);
})();
