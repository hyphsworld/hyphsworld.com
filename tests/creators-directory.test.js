const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'creators-directory.js'), 'utf8');
const repositoryRoot = path.join(__dirname, '..');

function staticCard(name, tags) {
  return `<article class="creator-card" data-name="${name}" data-tags="${tags}"><a></a></article>`;
}

function mountDirectory(cards = [
  staticCard('hyph life', 'artist producer richmond'),
  staticCard('rojasonthebeat', 'producer songwriter florida'),
  staticCard('francoismusic47', 'radio dj sacramento')
]) {
  document.body.innerHTML = `
    <input id="creatorSearch" />
    <button data-filter="all" class="active">All</button>
    <button data-filter="artist">Artists</button>
    <button data-filter="producer">Producers</button>
    <button data-filter="radio">Radio</button>
    <p id="creatorResults"></p>
    <div class="creator-grid">${cards.join('')}</div>
    <div id="emptyState" hidden></div>
    <span id="year"></span>`;
  window.HWAuth = undefined;
  window.eval(source);
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('Creators World directory', () => {
  beforeEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
    delete window.HWAuth;
  });

  test('search is case-insensitive and reports singular results', () => {
    mountDirectory();
    const input = document.getElementById('creatorSearch');
    input.value = 'HYPH LIFE';
    input.dispatchEvent(new Event('input'));

    const cards = [...document.querySelectorAll('.creator-card')];
    expect(cards.map(card => card.hidden)).toEqual([false, true, true]);
    expect(document.getElementById('creatorResults').textContent).toBe('1 creator • Alphabetical');
    expect(document.getElementById('emptyState').hidden).toBe(true);
  });

  test('combined category and search filters reveal the empty state', () => {
    mountDirectory();
    document.getElementById('creatorSearch').value = 'rojas';
    document.querySelector('[data-filter="radio"]').click();

    expect([...document.querySelectorAll('.creator-card')].every(card => card.hidden)).toBe(true);
    expect(document.getElementById('creatorResults').textContent).toBe('0 creators • Alphabetical');
    expect(document.getElementById('emptyState').hidden).toBe(false);
  });

  test('empty or failed API data preserves the static directory fallback', async () => {
    mountDirectory();
    const original = document.querySelector('.creator-grid').innerHTML;
    const order = jest.fn().mockResolvedValue({ data: [], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    window.HWAuth = { getClient: jest.fn().mockResolvedValue({ from: () => ({ select }) }) };

    window.dispatchEvent(new Event('load'));
    await flush();

    expect(document.querySelector('.creator-grid').innerHTML).toBe(original);
  });

  test('remote creator data rejects unsafe URLs and tolerates malformed fields', async () => {
    mountDirectory();
    const rows = [{
      creator_number: '7',
      display_name: '  Safe Creator  ',
      headline: '',
      location: null,
      categories: 'not-an-array',
      image_url: 'javascript:alert(1)',
      profile_url: 'data:text/html,bad',
      verification_level: 'professional'
    }];
    const order = jest.fn().mockResolvedValue({ data: rows, error: null });
    window.HWAuth = {
      getClient: jest.fn().mockResolvedValue({
        from: jest.fn(() => ({ select: () => ({ eq: () => ({ order }) }) }))
      })
    };

    window.dispatchEvent(new Event('load'));
    await flush();

    const card = document.querySelector('.creator-card');
    expect(card.querySelector('h3').textContent).toContain('Safe Creator');
    expect(card.querySelector('p').textContent).toBe('Independent Creator');
    expect(card.querySelector('img').getAttribute('src')).toBe('creator-hyph-life-hero.jpg');
    expect(card.querySelector('a').getAttribute('href')).toBe('creators.html');
    expect(card.querySelector('small').textContent).toBe('#007 • PROFESSIONAL');
    expect(card.querySelector('.world-seal')).not.toBeNull();
    expect(card.querySelector('.world-verified-label').textContent).toBe('VERIFIED');
    expect(card.querySelector('.world-verification-badge').getAttribute('aria-label')).toBe('HYPHSWORLD Verified Creator');
    expect(card.querySelector('h3 > .world-verification-badge')).not.toBeNull();
  });

  test('static verified cards move their World Seal beside the creator name', () => {
    mountDirectory([
      '<article class="creator-card is-verified" data-name="hyph life" data-tags="artist"><div class="world-verification-badge directory-verification-badge"><i class="world-seal directory-world-seal"></i><span class="world-verified-label">VERIFIED</span></div><div><h3>Hyph Life</h3><a></a></div></article>'
    ]);

    expect(document.querySelector('h3 > .directory-verification-badge')).not.toBeNull();
    expect(document.querySelector('h3').classList.contains('creator-name-row')).toBe(true);
  });

  test('missing auth client does not erase static cards', async () => {
    mountDirectory();
    const initialCount = document.querySelectorAll('.creator-card').length;
    window.HWAuth = { getClient: jest.fn().mockResolvedValue(null) };

    window.dispatchEvent(new Event('load'));
    await flush();

    expect(document.querySelectorAll('.creator-card')).toHaveLength(initialCount);
  });

  test.each(['creators-world.html', 'creator-rojas.html', 'creator-young-tez.html'])(
    '%s pairs every World Seal with a visible VERIFIED label',
    file => {
      const page = fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
      const parsed = new DOMParser().parseFromString(page, 'text/html');
      const badge = parsed.querySelector('.profile-verification-badge');

      expect(badge).not.toBeNull();
      expect(badge.querySelector('.world-seal')).not.toBeNull();
      expect(badge.querySelector('.world-verified-label').textContent.trim()).toBe('VERIFIED');
      expect(badge.getAttribute('aria-label')).toMatch(/^HYPHSWORLD Verified /);
      expect(badge.parentElement.id).toBe('creator-name');
      expect(badge.parentElement.classList.contains('verified-creator-name')).toBe(true);
      expect(badge.previousElementSibling.classList.contains('creator-name-text')).toBe(true);
    }
  );
});
