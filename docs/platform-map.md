# HYPHSWORLD Platform Map

## Stable checkpoint

- Diagnostics green: workflow #350
- Stable commit reference: 983943f
- Cash Run page recovered and live
- Cash Run public backend routes restored and hardened

This document is the build map for turning HYPHSWORLD into a major platform without breaking the live site.

## Platform vision

HYPHSWORLD should function like a digital entertainment city: games, music, animation, drops, community, and admin tools all connected under one brand system.

The site should not feel like a pile of pages. It should feel like a world map.

## Core districts

### 1. Home / Front Gate

Path: `/`

Purpose:
- Introduce HYPHSWORLD / AMS WEST
- Feature Cash Run
- Promote music, videos, drops, and O1 Universe content
- Route users into the platform districts

Key sections:
- Hero
- Featured Game
- Latest Drop
- O1 Universe teaser
- Music / video rail
- Community / Cool Points teaser

Future concept:
- Animated city-map style homepage where each section feels like a district entrance.

### 2. Games District

Path: `/games/`

Purpose:
- Central arcade hub for Cash Run and future games
- Show leaderboards, rewards, and upcoming games

Children:
- `/games/cash-run/`
- `/games/cash-run/leaderboard/`
- `/games/cash-run/powerups/`

Future concept:
- HYPHSWORLD Arcade Passport with badges earned across games.

### 3. Cash Run

Path: `/games/cash-run/`

Purpose:
- Playable game experience
- Public leaderboard
- Power-up guide
- Character/skin expansion later

Current stable state:
- Public gameplay live
- Power-ups live
- Public leaderboard backend available
- Diagnostics passing

Do not break:
- Canvas/game load
- Mobile controls
- Score submission
- Leaderboard loading
- Static asset paths under `/games/cash-run/`

### 4. Music / Media District

Path: `/music/` or `/media/`

Purpose:
- Videos, songs, campaigns, visuals, release drops

Future concept:
- A channel-style layout with featured releases, videos, behind-the-scenes, and artist hubs.

### 5. O1 Universe

Path: `/o1-universe/`

Purpose:
- Home for O1 Show, O1 Boyz, O1 Girlz, characters, episodes, lore, and news-style segments

Future concept:
- Character cards, episode map, animated scene drops, and O1NN LIVE archive.

### 6. Store / Drops

Path: `/store/`

Purpose:
- Merch, digital goods, limited drops, game-related items

Future concept:
- Drop calendar, countdowns, gated products, member pricing.

### 7. Vault / Members

Path: `/vault/`

Purpose:
- User accounts, Cool Points, rewards, unlocks, saved progress

Future concept:
- Cool Points persist across sessions/devices for logged-in users.
- Users earn points from games, drops, codes, and events.

### 8. Admin Control Room

Path: `/admin/`

Purpose:
- Site management and diagnostics
- Leaderboard moderation
- Content/drops management
- Build/deploy status

Future concept:
- Mission-control dashboard showing API health, build status, game status, leaderboard activity, and content queues.

## Suggested folder structure

```txt
hyphsworld.com/
  index.html
  assets/
    brand/
    icons/
    images/
    audio/
  styles/
    tokens.css
    base.css
    components.css
    districts.css
  scripts/
    platform.js
    diagnostics.js
  backend/
    server.py
  games/
    cash-run/
      index.html
      static/
      README.md
  docs/
    platform-map.md
    deployment-checklist.md
    brand-system.md
```

## Shared brand system

Core direction:
- Green + black foundation
- Red accents
- Bright skater/graffiti energy
- Playful gate/access visuals
- Major-label polish

Reusable components:
- Platform nav
- District cards
- CTA buttons
- HUD panels
- Status badges
- Feature rails
- Drop cards
- Leaderboard cards

## API direction

Current public API:
- `GET /api/health`
- `POST /api/leaderboard`
- `GET /api/leaderboard`
- `GET /api/leaderboard/rank`

Future platform API:
- `/api/health`
- `/api/games/cash-run/leaderboard`
- `/api/users`
- `/api/cool-points`
- `/api/admin`
- `/api/content`
- `/api/drops`

## Build rules

1. Protect the green build.
2. Do not remove working files without approval.
3. Add docs/plans before major rewrites.
4. Keep Cash Run static paths stable.
5. Run diagnostics after every platform-level change.
6. Separate public player features from admin-only features.
7. Keep secrets out of GitHub.

## Immediate roadmap

### Phase 1: Blueprint
- Add this platform map.
- Add deployment checklist.
- Add brand system doc.

### Phase 2: Shell
- Add shared header/nav.
- Add shared footer.
- Add homepage district layout.

### Phase 3: Games Hub
- Add `/games/` landing page.
- Add Cash Run feature card.
- Add power-up guide page.

### Phase 4: Backend cleanup
- Preserve current public API.
- Add versioned endpoints later.
- Add admin only after public flows are stable.

### Phase 5: Vault / Cool Points
- Add account model.
- Add persistent Cool Points.
- Add rewards and unlocks.

### Phase 6: Admin Control Room
- Add admin login.
- Add diagnostics monitor.
- Add leaderboard moderation.
- Add content controls.

## Current priority

Next safe files to add:
- `docs/deployment-checklist.md`
- `docs/brand-system.md`

No production UI rewrite should begin until these docs are in place.
