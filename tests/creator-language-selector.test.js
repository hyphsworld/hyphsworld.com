/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const runtime = read('creator-language.js');
const pages = fs.readdirSync(root).filter(file => file.endsWith('.html') && read(file).includes('id="creatorLanguage"'));
const languages = { en: 'English', es: 'Español', fr: 'Français', pt: 'Português', tl: 'Tagalog', ko: '한국어', ja: '日本語', zh: '中文' };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const openWindows = [];
async function open(file = 'creator-dashboard.html', { shared = 'en', legacy, blocked = false } = {}) {
  const dom = new JSDOM(read(file), { url: 'https://hyphsworld.com/' + file, runScripts: 'outside-only' });
  const w = dom.window;
  openWindows.push(w);
  if (shared) w.localStorage.setItem('hyphsworld.language', shared);
  if (legacy) w.localStorage.setItem('hyphsworld.creator.language', legacy);
  if (blocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  w.eval(runtime);
  await settle();
  return w;
}
function select(w, language) {
  const picker = w.document.getElementById('creatorLanguage');
  picker.value = language;
  picker.dispatchEvent(new w.Event('change'));
}
function contracts(d) {
  return [...d.querySelectorAll('a,input,textarea,form,audio,video,iframe,button')].map(n => [
    n.tagName, n.id, n.getAttribute('href'), n.getAttribute('src'), n.getAttribute('type'), n.getAttribute('accept'), n.getAttribute('required')
  ]);
}
afterEach(() => { openWindows.splice(0).forEach(w => w.close()); });

describe('Shared Creator World language selector', () => {
  test.each(pages)('%s preserves controls and routes across all eight languages', async file => {
    const w = await open(file);
    const d = w.document;
    const before = contracts(d);
    const picker = d.getElementById('creatorLanguage');
    expect(d.querySelectorAll('#creatorLanguage')).toHaveLength(1);
    expect([...picker.options].map(o => [o.value, o.textContent])).toEqual(Object.entries(languages));
    const input = d.querySelector('input:not([type=file]),textarea');
    if (input) input.value = 'My unchanged work';
    const button = d.querySelector('button');
    const clicked = jest.fn();
    if (button) button.addEventListener('click', clicked);
    for (const language of Object.keys(languages)) {
      select(w, language);
      expect(d.documentElement.lang).toBe(language);
      expect(w.localStorage.getItem('hyphsworld.language')).toBe(language);
      expect(contracts(d)).toEqual(before);
      if (input) expect(input.value).toBe('My unchanged work');
    }
    if (button) { button.dispatchEvent(new w.Event('click')); expect(clicked).toHaveBeenCalledTimes(1); }
  });

  test('never translates authored titles, names, notes, bios or media accessibility names', async () => {
    const w = await open();
    const d = w.document;
    d.getElementById('profileTitle').textContent = 'Music';
    d.getElementById('startCopy').textContent = 'Story';
    d.getElementById('submissionList').innerHTML = '<article><strong>Video</strong><small>Partner</small></article>';
    d.getElementById('uploadList').innerHTML = '<article class="creation-card"><h4>Music</h4><p class="creation-note">Story</p><audio aria-label="Music"></audio><button>Send for Review</button></article>';
    const extra = d.createElement('section');
    extra.innerHTML = '<h1 id="dropTitle">Music</h1><strong id="creatorName">Video</strong><p class="hero-story">Story</p><label>Creator<select id="ownerCreator"><option>Music</option></select></label><div class="stack"><article><strong>Story</strong></article></div>';
    d.body.appendChild(extra);
    const authored = ['#profileTitle', '#startCopy', '#submissionList strong', '#submissionList small', '.creation-card h4', '.creation-note', '#dropTitle', '#creatorName', '.hero-story', '#ownerCreator option', '.stack article strong'];
    const expected = authored.map(s => d.querySelector(s).textContent);
    for (const language of ['es', 'fr', 'en']) {
      select(w, language);
      await settle();
      expect(authored.map(s => d.querySelector(s).textContent)).toEqual(expected);
      expect(d.querySelector('audio').getAttribute('aria-label')).toBe('Music');
    }
  });

  test('translates late buttons and lowercase badges without scanning the whole page', async () => {
    const w = await open('creator-dashboard.html', { shared: 'es' });
    const d = w.document;
    const walks = jest.spyOn(d, 'createTreeWalker');
    const card = d.createElement('article');
    card.innerHTML = '<h4>Music</h4><button>Send for Review</button>';
    d.getElementById('uploadList').appendChild(card);
    d.getElementById('verificationState').textContent = 'professional';
    await settle();
    expect(card.querySelector('button').textContent).toBe('Enviar a revisión');
    expect(d.getElementById('verificationState').textContent).toBe('Profesional');
    expect(walks.mock.calls.every(([scope]) => scope !== d.body)).toBe(true);
    card.querySelector('button').textContent = 'Make Private';
    await settle();
    expect(card.querySelector('button').textContent).toBe('Volver a privado');
    select(w, 'en');
    expect(card.querySelector('button').textContent).toBe('Make Private');
    expect(d.getElementById('verificationState').textContent).toBe('professional');
  });

  test('ignores high-frequency media timer mutations', async () => {
    const w = await open('creators-world.html', { shared: 'es' });
    const d = w.document;
    const timer = d.getElementById('trackTime');
    expect(timer).not.toBeNull();
    const walks = jest.spyOn(d, 'createTreeWalker');
    for (let i = 0; i < 12; i += 1) { timer.textContent = '0:' + String(i).padStart(2, '0'); await settle(); }
    expect(walks).not.toHaveBeenCalled();
    expect(timer.textContent).toBe('0:11');
  });

  test('promotes a legacy choice so the homepage can read it', async () => {
    const w = await open('creator-ykomusic.html', { shared: null, legacy: 'es' });
    expect(w.document.documentElement.lang).toBe('es');
    expect(w.localStorage.getItem('hyphsworld.language')).toBe('es');
  });

  test('shared preference overrides legacy storage and Latin defaults', async () => {
    const w = await open('creator-ykomusic.html', { shared: 'pt', legacy: 'es' });
    expect(w.document.documentElement.lang).toBe('pt');
    expect(w.localStorage.getItem('hyphsworld.language')).toBe('pt');
    select(w, 'en');
    expect(w.document.querySelector('header nav a').textContent).toBe('Home');
    select(w, 'es');
    expect(w.document.querySelector('header nav a').textContent).toBe('Inicio');
  });

  test('language selection works when localStorage is blocked', async () => {
    const w = await open('creators.html', { shared: null, blocked: true });
    expect(() => select(w, 'ko')).not.toThrow();
    expect(w.document.documentElement.lang).toBe('ko');
  });

  test('linked admin and public drop routes keep the shared selector', () => {
    for (const file of ['creator-admin.html', 'creator-drop.html']) {
      expect(read(file)).toContain('id="creatorLanguage"');
      expect(read(file)).toContain('creator-language.js?v=world-language-2');
      expect(read(file)).toContain('creator-world-language.css');
    }
  });
});


test('discarded World-picker options do not break the language observer', async () => {
  const w = await open('creator-dashboard.html', { shared: 'es' });
  const d = w.document;
  const errors = [];
  w.addEventListener('error', event => errors.push(event.message));
  const label = d.createElement('label');
  const picker = d.createElement('select'); picker.id = 'creatorWorldSelect'; label.appendChild(picker); d.body.appendChild(label);
  picker.appendChild(new w.Option('Music', 'first'));
  picker.replaceChildren(new w.Option('Story', 'second'));
  await settle();
  expect(errors).toEqual([]);
  expect(picker.options[0].textContent).toBe('Story');
});
