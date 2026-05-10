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

## Backlog
- P1: Sound FX & background music (per level).
- P1: Persistent best-streak tracker (local).
- P2: Different mazes per level (instead of theme-only changes).
- P2: Daily challenge mode (seeded maze).
- P2: Account-based avatar customization.

## Next Tasks
- Add audio (collect, chomp, death, level-up).
- Animation polish: cash splash particles when collected.
