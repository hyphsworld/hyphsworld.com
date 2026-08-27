# Cash Run — PRD

## Original Problem Statement
Build a Pac-Man-style game where a guy (or girl) runs through bad streets
collecting cash bundles. As levels increase, the streets look better.
Top-of-screen HUD with score/level/lives/cash. Boy/girl character select.

## Architecture
- **Backend**: FastAPI + MongoDB. Single resource — `leaderboard` collection.
- **Frontend**: React (CRA + Tailwind + shadcn) with HTML5 Canvas game engine.
- **Routes**: `/` (Menu), `/play` (Game), `/leaderboard`, `/how-to-play`.
- **Game engine**: tile-based 21×19 maze, requestAnimationFrame loop.

## User Personas
- Casual web visitor — quick arcade fix.
- Returning player chasing leaderboard rank.
- Mobile player (touch joystick).

## Core Requirements (Static)
- Pac-Man-style maze movement, cash collection, lives, levels.
- 5 themed levels with theme upgrades; endless mode after L5 (cycles palette, scales difficulty).
- Two enemy types: thugs (red, chase) and cops (blue, ambush 4-tiles ahead).
- Power pickups: Big-Cash (frighten enemies), Speed, Shield, Double-Points.
- Boy/Girl character select (Marco / Lena).
- HUD on top: Score, Level (+ theme name), Cash Stacked, Lives, active power timer.
- Keyboard (arrows / WASD / P) + on-screen analog joystick.
- Global leaderboard via MongoDB-backed API.

## What's Implemented (2026-02)
- Backend leaderboard CRUD + rank endpoint (9 pytest tests passing).
- Frontend Menu with character select & marquee.
- Canvas game engine: movement, queued direction turns, tunnel wrap,
  enemy AI (thug chase + cop ambush + frightened + eyes-return),
  power pellets, power-ups, multipliers, READY overlay, pause.
- Humanoid sprite drawing (running animation, cash bundle in hand) for player and enemies.
- 5 distinct level palettes (Skid Row, Bad Hood, Mid Suburb, Downtown, Luxury District).
- Game Over modal with name entry + global rank.
- Leaderboard page (top 50, MongoDB-sorted).
- How-to-Play page.
- Analog joystick with direction snapping + deadzone.

## What's Implemented (2026-02, continued)
- **2026-02-27** Tonio & Nikki transparent WebP hero art (menu + sprites).
- **2026-02-27** JWT admin auth with bcrypt seed; admin edit/delete/clear-all leaderboard ops.
- **2026-02-27** Time-based leaderboard filters (Today / Weekly Hustlers / Monthly / All Time).
- **2026-02-27** Procedural Web Audio SFX + per-level music, mute toggle.
- **2026-02-27** Holographic glitch level transitions; CRT scanline overlay.
- **2026-02-27** Practice mode (5 lives, later cops, score not saved).
- **2026-02-27** Code Quality pass: React hook deps corrected across auth/Game/Leaderboard/GameOverModal/use-toast; api.js catch blocks now log debug; engine.js `_moveEnemies` split into `_updateEnemyRelease/_isOnTile/_enemyTarget/_pickEnemyDirection/_enemySpeed/_advanceEnemy`; engine.js `_render` split into `_computeShakeOffset/_drawFloor/_drawPellets/_drawFloatTexts/_drawReadyOverlay/_drawPauseOverlay`; backend `assert body["deleted"]` cleanup; `test_get_leaderboard_sorted_no_id` split into 3 focused tests. 28/28 backend tests + frontend E2E pass (iteration_4.json).

## Backlog
- P1: **Share Card** — composite Tonio/Nikki + final score for social share on Game Over.
- P2: **Character perks** — Nikki slightly faster; Tonio longer shield window.
- P2: 3-frame intro comic drop of both characters before the title.
- P2: Homepage hero as subtle side-scrolling loop animation.
- P3: Daily-streak counter for leaderboard retention.
- P3: Different mazes per level (structural, not just theme).

## Next Tasks
- Ship the Share Card feature (P1).
- Character perks (P2).
