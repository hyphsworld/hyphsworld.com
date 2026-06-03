const wallEntries = [
  {
    title: 'HYPHSWORLD 5 Archive',
    tier: 500,
    image: 'player-cover.jpg',
    tag: 'Music Cover',
    description: 'The flagship era that powers the current world build.'
  },
  {
    title: 'Youngin Remix',
    tier: 1000,
    image: 'youngin-remix.jpg',
    tag: 'Single Cover',
    description: 'Remix pressure from the HYPHSWORLD archive vault.'
  },
  {
    title: 'Rojas Awards',
    tier: 2500,
    image: 'rojas-awards.jpg',
    tag: 'Award Wall',
    description: 'Historic moments and plaques from the archive room.'
  },
  {
    title: 'AMS WEST Hoodie Wall',
    tier: 5000,
    image: 'red-ams-west-hoodie.jpg',
    tag: 'Merch Drop',
    description: 'Major-label energy with skater-store colorways.'
  },
  {
    title: 'Legend Room',
    tier: 10000,
    image: 'time-art.jpg',
    tag: 'Legend Access',
    description: 'Highest level archive access for elite Cool Point holders.'
  }
];

const duckLines = [
  'Duck Sauce: Somebody already tried to screenshot the Legend Wall. System cooked they phone.',
  'Duck Sauce: Half these rooms smell like unreleased music and bad decisions.',
  'Duck Sauce: Cool Points open doors. Complaining opens nothing.',
  'Duck Sauce: The merch wing got enough hoodies to start a sports franchise.'
];

const pointsEl = document.getElementById('wof-points');
const statusEl = document.getElementById('wof-status');
const gridEl = document.getElementById('wof-grid');
const template = document.getElementById('wof-card-template');
const duckLine = document.getElementById('wof-duck-line');
const pointKeys = ['hyphsworld.coolPoints.total', 'hyphsworld.coolPoints.guestSession', 'coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS'];

function toNumber(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function storedPoints() {
  let highest = 0;
  pointKeys.forEach((key) => {
    try { highest = Math.max(highest, toNumber(localStorage.getItem(key))); } catch (error) {}
  });
  try { highest = Math.max(highest, toNumber(sessionStorage.getItem('hyphsworld.coolPoints.guestSession'))); } catch (error) {}
  return highest;
}

function currentPoints() {
  try {
    if (window.HWPoints && typeof window.HWPoints.get === 'function') {
      return Math.max(toNumber(window.HWPoints.get()), storedPoints());
    }
    if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
      const state = window.HWPoints.getState();
      return Math.max(toNumber(state && state.points), storedPoints());
    }
  } catch (error) {}
  return storedPoints();
}

function renderWall() {
  const points = currentPoints();
  if (pointsEl) pointsEl.textContent = points.toLocaleString();

  if (statusEl) {
    statusEl.textContent = points >= 500 ? 'Vault clearance approved. Wall systems online.' : 'Need 500 Cool Points to fully unlock the wall.';
  }

  document.querySelectorAll('.wof-unlock-track article').forEach((card) => {
    const tier = Number(card.dataset.tier || 0);
    card.classList.toggle('active', points >= tier);
  });

  if (!gridEl || !template) return;
  gridEl.innerHTML = '';

  wallEntries.forEach((entry) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.wof-card');
    const img = clone.querySelector('img');
    const tag = clone.querySelector('span');
    const title = clone.querySelector('h3');
    const desc = clone.querySelector('p');
    const lock = clone.querySelector('.wof-lock');

    img.src = entry.image;
    img.alt = entry.title;
    tag.textContent = entry.tag;
    title.textContent = entry.title;

    if (points >= entry.tier) {
      card.classList.add('unlocked');
      lock.textContent = 'UNLOCKED';
      desc.textContent = entry.description;
      img.style.filter = '';
    } else {
      card.classList.remove('unlocked');
      lock.textContent = 'LOCKED';
      desc.textContent = `Requires ${entry.tier.toLocaleString()} Cool Points.`;
      img.style.filter = 'grayscale(1) blur(4px)';
    }

    gridEl.appendChild(clone);
  });
}

renderWall();
window.addEventListener('storage', renderWall);
window.addEventListener('hw:points-change', renderWall);
document.addEventListener('hyph:points-updated', renderWall);
document.addEventListener('DOMContentLoaded', renderWall);

if (duckLine) {
  let lineIndex = 0;
  setInterval(() => {
    lineIndex = (lineIndex + 1) % duckLines.length;
    duckLine.textContent = duckLines[lineIndex];
  }, 5000);
}
