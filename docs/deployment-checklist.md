# HYPHSWORLD Deployment Checklist

Use this checklist before and after every platform-level change. The goal is to protect the live green build while the site grows into a major platform.

## Current stable checkpoint

- Stable diagnostics run: #350
- Stable commit reference: 983943f
- Chase the Bag page: live
- Chase the Bag diagnostics: green
- Public backend: hardened and online-ready

## Golden rule

Do not remove or overwrite working production files unless the change is planned, reviewed, and intentionally approved.

## 1. Before making changes

Confirm the current state:

- GitHub Actions diagnostics are green.
- The target branch is `main` unless working in a planned feature branch.
- The file list is known before editing.
- The change has a clear purpose.
- The change does not include secrets, passwords, API keys, private tokens, or local `.env` files.

Record:

```txt
Change name:
Reason:
Files expected to change:
Rollback point / previous commit:
```

## 2. Protected files and areas

Treat these as high-risk production zones:

- `index.html`
- `games/cash-run/index.html`
- `games/cash-run/static/`
- `backend/server.py`
- `.github/workflows/`
- Any deployed game bundle
- Any file containing runtime keys or environment references

Extra care for Chase the Bag:

- Keep `/games/cash-run/` paths stable.
- Do not change static JS/CSS asset references unless uploading the matching assets.
- Do not break mobile viewport behavior.
- Do not break score submission, leaderboard load, or game start.

## 3. Secret safety

Never commit:

- `.env`
- API private keys
- Database credentials
- JWT secrets
- Admin passwords
- Personal access tokens
- Service role keys

Allowed in public frontend only when intended:

- Supabase anon/public key variables
- Public analytics keys
- Non-secret runtime config

If uncertain, do not commit it.

## 4. Pre-deploy frontend checks

For homepage/platform changes:

- Home page loads.
- Navigation links work.
- Mobile layout works.
- Primary CTA buttons work.
- No duplicate element IDs.
- HTML files include `<!DOCTYPE html>`.

For Chase the Bag changes:

- Game page loads.
- Canvas appears.
- Mobile controls appear.
- Mute button works.
- Game can start.
- Player can lose/end game.
- Score submission works.
- Leaderboard loads.
- Power-ups still appear and behave correctly.

## 5. Pre-deploy backend checks

Confirm backend source includes:

- `GET /api/health`
- Public leaderboard submit endpoint
- Public leaderboard list endpoint
- Public rank endpoint
- Database missing fallback behavior
- CORS allowlist parsing
- Security headers middleware
- Leaderboard submit rate limiting

Required environment variables for production:

```env
MONGO_URL=
DB_NAME=
CORS_ORIGINS=
```

Future admin environment variables:

```env
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Do not hardcode production secrets.

## 6. Deploy sequence

Recommended order:

1. Commit docs or low-risk files first.
2. Run diagnostics.
3. Commit frontend shell changes.
4. Run diagnostics.
5. Commit backend changes.
6. Run diagnostics.
7. Confirm live site.

For game bundle updates:

1. Build locally or in trusted build environment.
2. Upload `index.html` and matching static assets together.
3. Confirm asset hashes match the HTML references.
4. Run diagnostics.
5. Test live game.

## 7. GitHub Actions checks

After every push, confirm:

- Diagnostics workflow runs.
- Diagnostics workflow turns green.
- No new red workflows appear.
- Dependency graph updates do not block deployment.

If diagnostics fails:

1. Open the failed step.
2. Identify the first real error.
3. Fix only that error.
4. Push a small targeted commit.
5. Re-run diagnostics.

## 8. Live verification

After deploy, verify:

- `https://hyphsworld.com/` loads.
- `https://hyphsworld.com/games/cash-run/` loads.
- Chase the Bag starts.
- Leaderboard page loads.
- Backend health endpoint responds.
- No 404s for static JS/CSS assets.
- No visible browser console crash on load.

## 9. Rollback plan

If the live site breaks:

1. Stop making new feature changes.
2. Identify the last green commit.
3. Revert the smallest bad commit.
4. Confirm diagnostics green.
5. Confirm live site returns.

Stable checkpoint format:

```txt
Stable Build:
Commit:
Diagnostics Run:
What changed:
Verified pages:
Known issues:
```

## 10. Major-platform build phases

Phase order:

1. Documentation and architecture
2. Brand system
3. Platform shell
4. Homepage districts
5. Games hub
6. Chase the Bag cleanup
7. Vault / Cool Points
8. Admin Control Room
9. Store / drops
10. O1 Universe content hub

Do not jump to later phases if the earlier phase is unstable.

## 11. Post-deploy notes

After a successful deploy, record:

```txt
Date:
Commit:
Diagnostics status:
Pages checked:
Backend checked:
Next planned change:
```

This keeps HYPHSWORLD moving like a platform, not a pile of emergency patches.
