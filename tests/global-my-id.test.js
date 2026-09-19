const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'global-my-id.js'), 'utf8');

function flush() { return new Promise(resolve => setTimeout(resolve, 0)); }

describe('Global MY ID shortcut', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    localStorage.clear();
    delete window.HWAuth;
  });

  test('sends guests to login', () => {
    window.eval(source);
    const link = document.getElementById('hw-global-my-id');
    expect(link).not.toBeNull();
    expect(link.href).toContain('auth.html');
    expect(link.textContent).toContain('MY ID');
  });

  test('sends remembered users to their account', () => {
    localStorage.setItem('hw_auth_session_v1', JSON.stringify({ userId: 'user-1', email: 'player@example.com' }));
    window.eval(source);
    const link = document.getElementById('hw-global-my-id');
    expect(link.href).toContain('account.html');
    expect(link.classList.contains('is-signed-in')).toBe(true);
  });

  test('uses the live auth result when available', async () => {
    window.HWAuth = { getSession: jest.fn().mockResolvedValue({ userId: 'user-2', email: 'live@example.com' }) };
    window.eval(source);
    await flush();
    expect(document.getElementById('hw-global-my-id').href).toContain('account.html');
  });
});
