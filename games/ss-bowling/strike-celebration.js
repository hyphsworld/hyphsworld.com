(function () {
  'use strict';

  var CLASS_NAME = 'hw-strike-celebration';
  var STYLE_ID = 'hw-strike-celebration-styles';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '@keyframes hwStrikePop{0%{opacity:0;transform:scale(.35) rotate(-8deg)}45%{opacity:1;transform:scale(1.28) rotate(3deg)}70%{transform:scale(.94) rotate(-1deg)}100%{opacity:1;transform:scale(1) rotate(0)}}',
      '@keyframes hwStrikeGlow{0%,100%{filter:drop-shadow(0 0 7px #fff) drop-shadow(0 0 15px #22e1ff)}50%{filter:drop-shadow(0 0 12px #fff) drop-shadow(0 0 28px #ff2d55) drop-shadow(0 0 42px #ffe600)}}',
      '.' + CLASS_NAME + '{color:#ffe600!important;background:linear-gradient(90deg,#39ff14 0%,#22e1ff 25%,#ffe600 50%,#ff8a00 72%,#ff2dff 100%)!important;background-clip:text!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;font-weight:1000!important;text-shadow:none!important;animation:hwStrikePop .62s cubic-bezier(.16,.84,.24,1.18),hwStrikeGlow .7s ease-in-out 3!important;transform-origin:center!important;will-change:transform,filter,opacity}',
      '@media(prefers-reduced-motion:reduce){.' + CLASS_NAME + '{animation:none!important;filter:drop-shadow(0 0 12px #22e1ff)!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function isStrikeText(element) {
    return element && element.children.length === 0 && element.textContent.trim().toUpperCase() === 'STRIKE!';
  }

  function celebrate(root) {
    var elements = [];
    if (root && root.nodeType === 1 && isStrikeText(root)) elements.push(root);
    if (root && root.querySelectorAll) {
      root.querySelectorAll('div,span,p').forEach(function (element) {
        if (isStrikeText(element)) elements.push(element);
      });
    }
    elements.forEach(function (element) {
      element.classList.remove(CLASS_NAME);
      void element.offsetWidth;
      element.classList.add(CLASS_NAME);
    });
  }

  installStyles();
  celebrate(document.body);
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'characterData') celebrate(mutation.target.parentElement);
      mutation.addedNodes.forEach(celebrate);
    });
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();
