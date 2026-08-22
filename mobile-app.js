(function () {
  'use strict';

  var promptEvent = null;
  var card = document.getElementById('app-install-card');
  var button = document.getElementById('app-install-button');
  var dismiss = document.getElementById('app-install-dismiss');
  var message = document.getElementById('app-install-message');
  var dismissedKey = 'hyphsworld.install.dismissed';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function wasDismissed() {
    try { return window.localStorage.getItem(dismissedKey) === 'yes'; } catch (error) { return false; }
  }

  function showCard() {
    if (card && !isStandalone() && !wasDismissed()) card.classList.add('is-visible');
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    promptEvent = event;
    showCard();
  });

  if (button) button.addEventListener('click', function () {
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then(function () {
        promptEvent = null;
        if (card) card.classList.remove('is-visible');
      });
      return;
    }

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      message.textContent = 'Tap Share, then “Add to Home Screen” to install HYPHSWORLD.';
      button.textContent = 'Got it';
      return;
    }

    message.textContent = 'Open your browser menu and choose “Install app” or “Add to Home screen.”';
    button.textContent = 'Got it';
  });

  if (dismiss) dismiss.addEventListener('click', function () {
    if (card) card.classList.remove('is-visible');
    try { window.localStorage.setItem(dismissedKey, 'yes'); } catch (error) {}
  });

  window.addEventListener('appinstalled', function () {
    if (card) card.classList.remove('is-visible');
  });

  if ('serviceWorker' in window.navigator) {
    window.addEventListener('load', function () {
      window.navigator.serviceWorker.register('service-worker.js').catch(function () {});
    });
  }

  if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) showCard();
})();
