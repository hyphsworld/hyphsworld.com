/* HYPHSWORLD lucky code ticker
   Shows code hints only during short daily windows.
   Window schedule uses the visitor browser clock.
*/
(function () {
  'use strict';

  const windows = [
    { startHour: 12, startMinute: 1, durationMinutes: 45, label: 'LUNCH LUCKY WINDOW', code: 'AMSWEST', hint: 'Level 1 door cracked open' },
    { startHour: 19, startMinute: 1, durationMinutes: 45, label: 'PRIME LUCKY WINDOW', code: 'Falcon', hint: 'Level 2 signal passing through' }
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

  function buildText() {
    const lucky = activeWindow();
    const lines = regularLines.slice();
    if (lucky) {
      lines.splice(2, 0, 'LUCKY CODE ACTIVE', lucky.label, lucky.hint + ': ' + lucky.code, minutesLeft(lucky) + ' MIN LEFT');
    } else {
      lines.splice(2, 0, 'NO CODE WINDOW RIGHT NOW', 'CHECK BACK WHEN DUCK GETS LOUD');
    }
    return lines.concat(lines).map((line) => '<span>' + line + '</span><b>✦</b>').join('');
  }

  function render() {
    document.querySelectorAll('[data-lucky-code-ticker]').forEach((track) => {
      track.innerHTML = buildText();
    });
  }

  render();
  setInterval(render, 60000);
})();
