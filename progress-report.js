(function () {
  'use strict';

  var POINT_KEYS = ['hyphsworld.coolPoints.total', 'coolPoints'];
  var RANKS = [
    { name: 'Lobby Rookie', min: 0, next: 50, unlock: 'First Reward Badge' },
    { name: 'Lobby Runner', min: 50, next: 150, unlock: 'Vault Bonus Clue' },
    { name: 'Vault Scout', min: 150, next: 300, unlock: 'Level 1 Reward' },
    { name: 'Hidden Room Watcher', min: 300, next: 500, unlock: 'Casino Invite Signal' },
    { name: 'HYPHSWORLD VIP', min: 500, next: 800, unlock: 'VIP Duck Signal' },
    { name: 'Underground Legend', min: 800, next: 1000, unlock: 'Rare World Event' }
  ];

  function read(key) {
    try { return localStorage.getItem(key) || sessionStorage.getItem(key); }
    catch (error) { return null; }
  }

  function getPoints() {
    return POINT_KEYS.reduce(function (max, key) {
      var value = parseInt(read(key) || '0', 10) || 0;
      return Math.max(max, value);
    }, 0);
  }

  function getRank(total) {
    var current = RANKS[0];
    RANKS.forEach(function (rank) {
      if (total >= rank.min) current = rank;
    });
    return current;
  }

  function getPercent(total, rank) {
    var end = rank.next || rank.min + 250;
    var span = Math.max(1, end - rank.min);
    return Math.max(0, Math.min(100, Math.round(((total - rank.min) / span) * 100)));
  }

  function duckLine(total) {
    if (total < 50) return 'You just getting started. Play a few games and grab your first 50 Cool Points.';
    if (total < 150) return 'Now you moving. Run the Vault scan and keep stacking points.';
    if (total < 300) return 'Level 1 reward pressure is warming up. Keep earning and checking the board.';
    if (total < 500) return 'Casino signal is close. No direct URL. Earn that door.';
    if (total < 800) return 'VIP route loading. Duck Sauce is watching your progress now.';
    return 'Legend status. Future world events can open from here.';
  }

  function stepClass(total, threshold) {
    if (total >= threshold) return 'done';
    var previous = threshold === 50 ? 0 : threshold === 150 ? 50 : threshold === 300 ? 150 : threshold === 500 ? 300 : 500;
    return total >= previous ? 'current' : '';
  }

  function render(root) {
    var total = getPoints();
    var rank = getRank(total);
    var needed = Math.max(0, (rank.next || rank.min + 250) - total);
    var percent = getPercent(total, rank);

    root.innerHTML = '' +
      '<div class="hw-progress-inner">' +
        '<div class="hw-progress-top">' +
          '<div>' +
            '<span class="hw-progress-kicker">HYPHSWORLD Progress Report</span>' +
            '<h2>Progress Report</h2>' +
            '<p>Play, earn, raise rank, unlock access, reveal rewards.</p>' +
          '</div>' +
          '<div class="hw-progress-rank"><span>Current Rank</span><strong>' + rank.name + '</strong></div>' +
        '</div>' +
        '<div class="hw-progress-main">' +
          '<div>' +
            '<div class="hw-progress-bar-shell"><div class="hw-progress-bar" style="width:' + percent + '%"></div></div>' +
            '<div class="hw-progress-stats">' +
              '<div class="hw-progress-stat"><span>Cool Points</span><strong>' + total + '</strong></div>' +
              '<div class="hw-progress-stat"><span>Next Unlock</span><strong>' + rank.unlock + '</strong></div>' +
              '<div class="hw-progress-stat"><span>Needed</span><strong>' + needed + ' pts</strong></div>' +
            '</div>' +
            '<div class="hw-progress-duck">Duck Sauce: “' + duckLine(total) + '”</div>' +
            '<div class="hw-progress-actions"><a href="vault.html">Run Vault Scan</a><a class="secondary" href="leaderboard.html">View Board</a></div>' +
          '</div>' +
          '<div class="hw-progress-steps">' +
            '<div class="hw-progress-step ' + stepClass(total, 50) + '"><b>1</b><span>Play Games</span></div>' +
            '<div class="hw-progress-step ' + stepClass(total, 150) + '"><b>2</b><span>Earn Cool Points</span></div>' +
            '<div class="hw-progress-step ' + stepClass(total, 300) + '"><b>3</b><span>Unlock Vault Rewards</span></div>' +
            '<div class="hw-progress-step ' + stepClass(total, 500) + '"><b>4</b><span>Earn Casino Signal</span></div>' +
            '<div class="hw-progress-step ' + stepClass(total, 800) + '"><b>5</b><span>Reveal VIP Rewards</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function init() {
    var reports = Array.prototype.slice.call(document.querySelectorAll('[data-hw-progress-report]'));
    reports.forEach(render);
    window.setInterval(function () { reports.forEach(render); }, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
