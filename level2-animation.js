(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarsePointer = window.matchMedia("(pointer: coarse)");

  function addStyles() {
    if (document.getElementById("level2MotionStyles")) return;

    var style = document.createElement("style");
    style.id = "level2MotionStyles";
    style.textContent = `
      .vault-shell.hyphsworld5 {
        --l2-mouse-x: 50%;
        --l2-mouse-y: 30%;
      }

      .vault-shell.hyphsworld5 .l2-motion-layer {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;
      }

      .vault-shell.hyphsworld5 .l2-glow {
        position: absolute;
        left: var(--l2-mouse-x);
        top: var(--l2-mouse-y);
        width: min(70vw, 720px);
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(57,255,20,.16), rgba(0,229,255,.08) 32%, rgba(255,43,214,.04) 54%, transparent 70%);
        transform: translate(-50%, -50%);
        filter: blur(12px);
        transition: left .5s ease-out, top .5s ease-out;
      }

      .vault-shell.hyphsworld5 .l2-spray {
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--spray-color, #39ff14);
        box-shadow: 0 0 16px var(--spray-color, #39ff14);
        animation: l2Spray 900ms cubic-bezier(.15,.8,.25,1) forwards;
      }

      .vault-shell.hyphsworld5 .l2-reveal {
        opacity: 0;
        transform: translateY(42px) rotate(var(--reveal-tilt, 0deg)) scale(.97);
        filter: blur(8px);
        transition: opacity .8s ease, transform .9s cubic-bezier(.2,.8,.2,1), filter .8s ease;
        transition-delay: var(--reveal-delay, 0ms);
      }

      .vault-shell.hyphsworld5 .l2-reveal.is-live {
        opacity: 1;
        transform: translateY(0) rotate(0) scale(1);
        filter: blur(0);
      }

      .vault-shell.hyphsworld5 .floor-title h1 {
        animation: l2TitlePulse 3.8s ease-in-out infinite;
      }

      .vault-shell.hyphsworld5 .floor-title h2,
      .vault-shell.hyphsworld5 .floor-title::before,
      .vault-shell.hyphsworld5 .track-panel::after {
        animation: l2StickerFloat 4.5s ease-in-out infinite;
      }

      .vault-shell.hyphsworld5 .floor-hero::before {
        animation: l2Orbit 13s linear infinite;
      }

      .vault-shell.hyphsworld5 .floor-hero::after {
        transform-origin: 130px 120px;
        animation: l2SkateOrbit 6s cubic-bezier(.55,.05,.45,.95) infinite;
      }

      .vault-shell.hyphsworld5 .tag {
        animation: l2TagBounce 4s ease-in-out infinite;
        animation-delay: calc(var(--tag-index, 0) * -480ms);
      }

      .vault-shell.hyphsworld5 .track-card.is-playing {
        color: #050507;
        border-color: #39ff14;
        background: linear-gradient(100deg, #39ff14, #00e5ff);
        animation: l2Playing 1.1s ease-in-out infinite alternate;
      }

      .vault-shell.hyphsworld5 .track-card.is-playing .track-meta span { color: #06381f; }
      .vault-shell.hyphsworld5 .track-card.is-playing .track-play { color: #ff1744; }

      @keyframes l2Spray {
        0% { opacity: .95; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(calc(-50% + var(--spray-x)), calc(-50% + var(--spray-y))) scale(.15); }
      }
      @keyframes l2TitlePulse {
        0%, 100% { filter: drop-shadow(0 0 0 rgba(57,255,20,0)); }
        50% { filter: drop-shadow(0 0 18px rgba(57,255,20,.52)); }
      }
      @keyframes l2StickerFloat {
        0%, 100% { translate: 0 0; }
        50% { translate: 0 -7px; }
      }
      @keyframes l2Orbit { to { rotate: 360deg; } }
      @keyframes l2SkateOrbit {
        0%, 100% { translate: 0 0; rotate: -18deg; }
        45% { translate: -105px 72px; rotate: 14deg; }
        55% { translate: -112px 58px; rotate: 190deg; }
      }
      @keyframes l2TagBounce {
        0%, 80%, 100% { translate: 0 0; }
        88% { translate: 0 -6px; }
        94% { translate: 0 2px; }
      }
      @keyframes l2Playing {
        from { box-shadow: 0 12px 25px rgba(57,255,20,.22); }
        to { box-shadow: 0 15px 38px rgba(0,229,255,.48); }
      }

      @media (prefers-reduced-motion: reduce) {
        .vault-shell.hyphsworld5 *,
        .vault-shell.hyphsworld5 *::before,
        .vault-shell.hyphsworld5 *::after {
          animation-duration: .001ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: .001ms !important;
        }
        .vault-shell.hyphsworld5 .l2-reveal { opacity: 1; transform: none; filter: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    var shell = document.querySelector(".vault-shell.hyphsworld5");
    if (!shell || shell.dataset.motionReady === "true") return false;
    shell.dataset.motionReady = "true";
    addStyles();

    var layer = document.createElement("div");
    layer.className = "l2-motion-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = '<span class="l2-glow"></span>';
    shell.prepend(layer);

    var revealItems = shell.querySelectorAll(".topbar, .floor-hero, .track-panel, .alive-banner, .track-card");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-live");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealItems.forEach(function (item, index) {
      item.classList.add("l2-reveal");
      item.style.setProperty("--reveal-delay", Math.min(index * 70, 420) + "ms");
      item.style.setProperty("--reveal-tilt", (index % 2 ? 1 : -1) + "deg");
      observer.observe(item);
    });

    shell.querySelectorAll(".tag").forEach(function (tag, index) {
      tag.style.setProperty("--tag-index", index);
    });

    shell.querySelectorAll(".track-card").forEach(function (card) {
      card.addEventListener("click", function () {
        shell.querySelectorAll(".track-card").forEach(function (other) {
          other.classList.remove("is-playing");
        });
        card.classList.add("is-playing");
      });
    });

    if (!reduceMotion.matches && !coarsePointer.matches) {
      shell.addEventListener("pointermove", function (event) {
        shell.style.setProperty("--l2-mouse-x", event.clientX + "px");
        shell.style.setProperty("--l2-mouse-y", event.clientY + "px");
      }, { passive: true });

      shell.addEventListener("pointerdown", function (event) {
        if (event.target.closest("button, a, audio")) spray(event.clientX, event.clientY, layer);
      });
    }

    return true;
  }

  function spray(x, y, layer) {
    var colors = ["#39ff14", "#ff2bd6", "#00e5ff", "#ffe600", "#ff1744"];
    for (var i = 0; i < 12; i += 1) {
      var dot = document.createElement("i");
      var angle = (Math.PI * 2 * i / 12) + Math.random() * .4;
      var distance = 28 + Math.random() * 72;
      dot.className = "l2-spray";
      dot.style.left = x + "px";
      dot.style.top = y + "px";
      dot.style.setProperty("--spray-color", colors[i % colors.length]);
      dot.style.setProperty("--spray-x", Math.cos(angle) * distance + "px");
      dot.style.setProperty("--spray-y", Math.sin(angle) * distance + "px");
      layer.appendChild(dot);
      dot.addEventListener("animationend", function () { this.remove(); });
    }
  }

  if (!install()) {
    var mount = document.querySelector("[data-floor='floor2']");
    if (!mount) return;
    var mutationObserver = new MutationObserver(function () {
      if (install()) mutationObserver.disconnect();
    });
    mutationObserver.observe(mount, { childList: true, subtree: true });
  }
})();
