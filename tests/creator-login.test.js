const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'creator-login.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'creator-login.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260919210000_creator_login_owner_assignment.sql'), 'utf8');

describe('Creator Login', () => {
  test('uses the existing HYPHSWORLD identity and protects creator access by owner ID', () => {
    expect(html).toContain('auth-client.js?v=creator-login-1');
    expect(js).toContain(".eq('owner_user_id', userId)");
    expect(js).toContain('client.auth.getUser()');
    expect(js).toContain("shouldCreateUser: false");
  });

  test('does not expose creator tools to an unlinked account', () => {
    expect(html).toContain('no Creator World is linked yet');
    expect(js).toContain('Creator access not connected');
    expect(js).not.toContain('owner_user_id: user.id');
  });

  test('admin owner assignment is server-authorized and does not trust user metadata', () => {
    expect(migration).toContain('if not private.is_creator_admin()');
    expect(migration).toContain('from auth.users');
    expect(migration).toContain('revoke all on function public.creator_admin_assign_owner(uuid, text) from public');
    expect(migration).not.toContain('user_metadata');
  });
});
