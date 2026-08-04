(function () {
  'use strict';

  const players = Array.from(document.querySelectorAll('.beat-card audio'));
  const nowPlaying = document.getElementById('now-playing-title');

  players.forEach((player) => {
    const card = player.closest('.beat-card');
    const title = card.dataset.beat;

    player.addEventListener('play', () => {
      players.forEach((otherPlayer) => {
        if (otherPlayer !== player) otherPlayer.pause();
      });
      document.querySelectorAll('.beat-card.is-playing').forEach((activeCard) => activeCard.classList.remove('is-playing'));
      card.classList.add('is-playing');
      nowPlaying.textContent = title;
    });

    player.addEventListener('ended', () => {
      card.classList.remove('is-playing');
      nowPlaying.textContent = 'Choose a beat';
    });
  });
})();
