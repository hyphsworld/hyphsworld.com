/* Account-wallet adapter for the compiled Chase the Bag application. */
(function () {
  'use strict';

  const KEY = 'hyphsworld-cool-points-state';
  const EVENT = 'hyphsworld:cool-points-sync';
  let lastBalance = 0;
  let syncing = false;
  let queue = Promise.resolve();

  function stateFor(points, previous) {
    return Object.assign({}, previous || {}, { balance: Math.max(0, Number(points) || 0) });
  }

  function publish(points) {
    let previous = {};
    try { previous = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (error) {}
    const next = stateFor(points, previous);
    syncing = true;
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    syncing = false;
    lastBalance = next.balance;
  }

  function route(next) {
    if (syncing || !window.HWPoints) return;
    const balance = Math.max(0, Number(next && next.balance) || 0);
    const delta = balance - lastBalance;
    if (!delta) return;
    const transaction = next.transactions && next.transactions[0];
    // Preserve every explicit bundle transaction, including the access-code
    // and leaderboard-submission rewards whose source is `cashRun`. The bridge
    // separately awards a completed run from its trusted native game-over
    // event; it does not replace these distinct rewards.
    lastBalance = balance;
    queue = queue.then(function () {
      return delta > 0
        ? window.HWPoints.add(delta, 'chase_the_bag_' + (transaction && transaction.source || 'reward'), transaction || {})
        : window.HWPoints.spend(-delta, 'chase_the_bag_' + (transaction && transaction.source || 'spend'), transaction || {});
    }).then(function (result) {
      publish(result.points);
    }).catch(function () {
      publish(window.HWPoints.get());
    });
  }

  window.addEventListener(EVENT, function (event) { route(event.detail || {}); });
  window.addEventListener('hw:points-change', function (event) {
    publish(event.detail && event.detail.points);
  });

  async function boot() {
    if (window.HWAccountWidgetReady) await window.HWAccountWidgetReady;
    if (!window.HWPoints) return;
    const snapshot = await window.HWPoints.refresh();
    publish(snapshot.points);
  }

  boot();
})();
