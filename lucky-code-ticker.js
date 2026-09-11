/* HYPHSWORLD lucky code ticker + reward hint feed
   Shows kid-safe reward-code hints in homepage/lobby tickers and exposes lines for slots.
*/
(function () {
  'use strict';

  const windows = [
    { startHour: 12, startMinute: 1, durationMinutes: 45, label: 'LUNCH LUCKY WINDOW', code: 'AMSWEST', hint: 'Level 1 door cracked open' },
    { startHour: 19, startMinute: 1, durationMinutes: 45, label: 'PRIME LUCKY WINDOW', code: 'FALCON', hint: 'Level 2 signal passing through' }
  ];

  const rewardLines = [
    'REWARD CODE HINT: DUCKSAUCE50 MAY DROP BONUS POINTS',
    'REWARD CODE HINT: AMSWESTCADET IS FOR FUTURE CADETS',
    'REWARD CODE HINT: BUCKAPPROVED MEANS CLEAN CLEARANCE',
    'REWARD CODE HINT: GREENLIGHT POINTS TO THE GATE',
    'DAILY SPIN CAN DROP POINTS, CLUES, AND BOOSTS',
    'SLOT JACKPOTS CAN REVEAL CODE HINTS',
    'DOMINO CLUE: DUCK LEFT SAUCE BY THE BONEYARD',
    'SPADES CLUE: GREEN LIGHT MEANS CUT THE DECK',
    'BLACKJACK CLUE: THE NEON JACKPOT PAYS 150',
    'CRAPS CLUE: BUCK APPROVES A CLEAN PASS LINE',
    'BOWLING CLUE: SPIN TO WIN BEFORE YOU STRIKE',
    'KIDS CAN BUILD COOL POINTS WITH DAILY CHECK-INS',
    'USE ONE HYPHSWORLD ID SO REWARDS DO NOT RESET'
  ];

  const regularLines = [
    'WELCOME 2 HYPHSWORLD',
    'LOBBY PAD LIVE',
    'DUCK SAUCE TALKING TOO MUCH',
    'BUCKTHEBODYGUARD WATCHING THE DOOR',
    'COOL POINTS SAVE TO YOUR ID',
    'RUN THE SCAN THEN TRANSPORT',
    'LEVEL 1 IS WAITING'
  ];

  function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function activeWindow() {
    const current = nowMinutes();
    return windows.find((item) => {
      const start = item.startHour * 60 + item.startMinute;
      const end = start + item.durationMinutes;
      return current >= start && current < end;
    }) || null;
  }

  function minutesLeft(item) {
    if (!item) return 0;
    const end = item.startHour * 60 + item.startMinute + item.durationMinutes;
    return Math.max(0, end - nowMinutes());
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function currentLines() {
    const lucky = activeWindow();
    const lines = regularLines.slice();
    const rotatingHints = rewardLines.slice(0, 6);

    if (lucky) {
      lines.splice(2, 0, 'LUCKY CODE ACTIVE', lucky.label, lucky.hint + ': ' + lucky.code, minutesLeft(lucky) + ' MIN LEFT');
    } else {
      lines.splice(2, 0, 'REWARD CODE WINDOWS OPEN DAILY', 'CHECK THE TICKER FOR HINTS');
    }

    return lines.concat(rotatingHints);
  }

  function randomHint() {
    const lucky = activeWindow();
    if (lucky) return lucky.hint + ': ' + lucky.code;
    return rewardLines[Math.floor(Math.random() * rewardLines.length)];
  }

  function buildText() {
    const lines = currentLines();
    return lines.concat(lines).map((line) => '<span>' + escapeHtml(line) + '</span><b>✦</b>').join('');
  }

  function render() {
    document.querySelectorAll('[data-lucky-code-ticker]').forEach((track) => {
      track.innerHTML = buildText();
    });

    const hints = currentLines().filter((line) => /CODE|CLUE|JACKPOT|SPIN/i.test(line)).slice(0, 4);
    document.querySelectorAll('.ticker-track:not([data-lucky-code-ticker])').forEach((track) => {
      track.querySelectorAll('[data-hw-reward-hint]').forEach((node) => node.remove());
      hints.concat(hints).forEach((line) => {
        const item = document.createElement('span');
        item.dataset.hwRewardHint = 'true';
        item.textContent = line;
        const star = document.createElement('b');
        star.dataset.hwRewardHint = 'true';
        star.textContent = '✦';
        track.append(item, star);
      });
    });
  }

  window.HWRewardHints = { currentLines, randomHint, activeWindow };

  render();
  setInterval(render, 60000);
})();
