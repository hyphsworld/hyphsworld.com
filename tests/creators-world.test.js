const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'creators-world.js'), 'utf8');
const followKey = 'hyphsworld.creator.hyph-life.following';
const rewardKey = 'hyphsworld.creator.hyph-life.reward.follow';

function mountProfile() {
  document.body.innerHTML = `
    <button id="followCreator"></button>
    <button id="shareCreator"></button>
    <div id="worldToast"></div>
    <audio id="creatorAudio"></audio>
    <button id="playTrack"></button>
    <div id="trackProgress"></div>
    <div id="progressShell"></div>
    <span id="trackTime"></span>
    <h3 id="activeTitle">HAM</h3>
    <span id="activeMeta">Hyph Life</span>
    <img id="activeCover" />
    <button class="track" data-src="song.mp3" data-cover="cover.jpg" data-title="Song" data-meta="Artist"></button>
    <section id="creatorOwnerControls" hidden></section>
    <span id="year"></span>`;
  const audio = document.getElementById('creatorAudio');
  Object.defineProperties(audio, {
    paused: { configurable: true, get: () => true },
    duration: { configurable: true, get: () => 0 },
    currentTime: { configurable: true, writable: true, value: 0 }
  });
  audio.play = jest.fn().mockResolvedValue(undefined);
  audio.pause = jest.fn();
  window.eval(source);
  return { audio };
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('Hyph Life creator profile', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    delete window.HWPoints;
    delete window.HWAuth;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
  });

  test('renders a persisted follow state on first load', () => {
    localStorage.setItem(followKey, 'true');
    mountProfile();

    const button = document.getElementById('followCreator');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Following');
  });

  test('does not award Cool Points when no authenticated user exists', () => {
    window.HWPoints = { getState: () => ({ user: null }), add: jest.fn() };
    mountProfile();
    document.getElementById('followCreator').click();

    expect(window.HWPoints.add).not.toHaveBeenCalled();
    expect(document.getElementById('worldToast').textContent).toBe('Log in to save Cool Points');
  });

  test('awards a follow once and blocks duplicate rewards', async () => {
    window.HWPoints = {
      getState: () => ({ user: { id: 'user-1' } }),
      add: jest.fn().mockResolvedValue({ user: { id: 'user-1' } })
    };
    mountProfile();
    const follow = document.getElementById('followCreator');
    follow.click();
    await flush();
    follow.click();
    follow.click();
    await flush();

    expect(window.HWPoints.add).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(rewardKey)).toBe('true');
  });

  test('falls back to clipboard sharing when native share is unavailable', async () => {
    mountProfile();
    document.getElementById('shareCreator').click();
    await flush();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
    expect(document.getElementById('worldToast').textContent).toBe('Profile link copied');
  });

  test('keeps owner controls hidden for a non-owner non-admin', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    window.HWAuth = {
      getClient: jest.fn().mockResolvedValue({
        auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'outsider', app_metadata: {} } } } }) },
        from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle }) }) }) }) })
      })
    };
    mountProfile();
    await flush();

    expect(document.getElementById('creatorOwnerControls').hidden).toBe(true);
  });

  test('reveals owner controls for an administrator without trusting user metadata', async () => {
    window.HWAuth = {
      getClient: jest.fn().mockResolvedValue({
        auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: {
          id: 'admin', user_metadata: { creator_admin: true }, app_metadata: { creator_admin: true }
        } } } }) },
        from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }) }) })
      })
    };
    mountProfile();
    await flush();

    expect(document.getElementById('creatorOwnerControls').hidden).toBe(false);
  });

  test('audio completion failure is handled without marking the reward claimed', async () => {
    window.HWPoints = {
      getState: () => ({ user: { id: 'user-1' } }),
      add: jest.fn().mockRejectedValue(new Error('network'))
    };
    const { audio } = mountProfile();
    audio.dispatchEvent(new Event('ended'));
    await flush();

    expect(document.getElementById('worldToast').textContent).toBe('Could not save Cool Points yet');
    expect(localStorage.getItem('hyphsworld.creator.hyph-life.reward.track-ham')).toBeNull();
  });
});
