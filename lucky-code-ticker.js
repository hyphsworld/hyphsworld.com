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
    'REWARD CODE HINT: AMSCADET100 IS FOR FUTURE CADETS',
    'REWARD CODE HINT: BUCKAPPROVED MEANS CLEAN CLEARANCE',
    'REWARD CODE HINT: GREENLIGHT POINTS TO THE GATE',
    'DAILY SPIN CAN DROP POINTS, CLUES, AND BOOSTS',
    'SLOT JACKPOTS CAN REVEAL CODE HINTS',
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
    document.querySelectorAll('[data-lucky-code-ticker], .ticker-track').forEach((track) => {
      track.innerHTML = buildText();
    });
  }

  window.HWRewardHints = { currentLines, randomHint, activeWindow };

  render();
  setInterval(render, 60000);
})();
