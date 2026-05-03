(() => {
  'use strict';

  const tips = [
    'Duck Sauce: “$35 gets you in the lane. $75 makes Buck look up from the clipboard.”',
    'Duck Sauce: “Need a custom size, bundle, or weird idea? Hit the AMS email before Buck starts sighing.”',
    'Duck Sauce: “Cash App is for quick support. PayPal lanes keep the store looking official.”',
    'Duck Sauce: “The full product grid is coming. Right now we keeping the counter clean.”',
    'Duck Sauce: “If you want Vault-linked merch, say that in the email so Buck files it under pressure.”'
  ];

  const helper = document.createElement('section');
  helper.className = 'shop-duck-helper';
  helper.setAttribute('aria-label', 'Duck Sauce store helper');
  helper.innerHTML = `
    <button class="duck-helper-toggle" type="button" aria-expanded="false" aria-controls="duckHelperPanel">
      <span>🦆</span>
      <strong>Duck Help</strong>
    </button>
    <article id="duckHelperPanel" class="duck-helper-panel" hidden>
      <div class="duck-helper-head">
        <img src="duck-sauce.jpg" alt="Duck Sauce" onerror="this.onerror=null;this.src='duck-sauce.png';" />
        <div>
          <strong>Duck Sauce</strong>
          <span>Store assistant, not licensed, somehow employed.</span>
        </div>
      </div>
      <p id="duckHelperLine">Duck Sauce: “Need help picking a lane? I got bad advice with good intentions.”</p>
      <div class="duck-helper-actions">
        <a href="https://py.pl/" target="_blank" rel="noreferrer">$35</a>
        <a href="https://py.pl/BSZvtzUGEJyGWsN22iWSwQ" target="_blank" rel="noreferrer">$75</a>
        <a href="mailto:tone@amsenterprisecorp.com?subject=HYPHSWORLD Merch Help">Ask AMS</a>
        <button type="button" id="duckNextTip">Talk</button>
      </div>
    </article>
  `;

  document.body.appendChild(helper);

  const toggle = helper.querySelector('.duck-helper-toggle');
  const panel = helper.querySelector('.duck-helper-panel');
  const line = helper.querySelector('#duckHelperLine');
  const next = helper.querySelector('#duckNextTip');

  function pickTip() {
    return tips[Math.floor(Math.random() * tips.length)];
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    helper.classList.toggle('is-open', open);
    if (open) line.textContent = pickTip();
  }

  toggle.addEventListener('click', () => {
    setOpen(panel.hidden);
  });

  next.addEventListener('click', () => {
    line.textContent = pickTip();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
