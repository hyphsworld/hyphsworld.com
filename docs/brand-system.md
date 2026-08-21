# HYPHSWORLD / AMS WEST Brand System

This document defines the visual system for building HYPHSWORLD like a major entertainment platform while keeping the Chase the Bag game and future districts visually connected.

## Brand position

HYPHSWORLD is a digital entertainment city: games, music, animation, streetwear, rewards, and community all connected under one energetic platform.

The visual language should feel:

- Skater
- Graffiti-driven
- Bright and fun
- Futuristic
- Street-polished
- Major-label quality
- Game-ready
- Premium but not corporate

## Core identity

Primary brands:

- HYPHSWORLD
- AMS WEST
- Chase the Bag
- O1 Universe

Core feel:

- A neon street arcade
- A music/video platform
- A game hub
- A cartoon universe
- A member rewards vault

The site should feel like users are entering a world, not browsing a folder of pages.

## Color system

### Foundation colors

```txt
Ink Black        #050806
Deep Black       #000000
Cash Green       #39ff6a
Gate Green       #00c853
AMS Red          #ff253a
Cream Ink        #f5f1e8
Muted Concrete   #8f968f
```

### Accent colors

```txt
Neon Lime        #b6ff00
Signal Yellow    #ffd447
Sky Neon         #27d8ff
Purple Glow      #a855ff
Hot Pink         #ff4fd8
Chrome Gray      #c8d0c8
```

### Usage rules

- Green + black are the foundation.
- Red is an accent, not the whole room.
- Bright colors should appear as tags, highlights, buttons, badges, glows, stickers, and district identifiers.
- Avoid plain corporate green/black layouts.
- Use playful access/gate visuals instead of flat business panels.

## Visual motifs

Use these across the platform:

- Neon gates
- Graffiti stickers
- Arcade HUD panels
- Spray-paint marks
- Chain-link textures
- Concrete cards
- Street signs
- Game badges
- Access passes
- Map districts
- Motion streaks
- Scanlines
- Glowing outlines

Do not overuse effects. Keep the design clean enough to feel expensive.

## Typography direction

Use three type categories:

### Display

For hero text, game titles, district names, and major labels.

Style:
- Bold
- Wide
- Arcade or graffiti-adjacent
- High contrast
- Short phrases

### UI

For navigation, buttons, labels, cards, and forms.

Style:
- Clean
- Legible
- Slightly technical
- All-caps allowed for labels

### Body

For descriptions, docs, and longer copy.

Style:
- Easy to read
- Not too thin
- High contrast against dark backgrounds

## Layout system

The platform should use district-based layout.

Main sections:

```txt
Hero / Front Gate
Feature Rail
District Grid
Game Spotlight
Media Rail
Drop Zone
Vault Teaser
Footer Map
```

Cards should feel like clickable portals, not plain rectangles.

## Component styles

### Buttons

Button types:

- Primary action
- Secondary action
- Danger/admin action
- Arcade action
- Locked/gated action

Primary button feel:

- Cash green fill or glow
- Black text or dark inset text
- Heavy border
- Slight motion on hover

Danger/admin button feel:

- Red accent
- Clear warning state
- No accidental destructive action without confirmation

### Cards

Card types:

- District card
- Game card
- Drop card
- Character card
- Leaderboard card
- News card
- Admin status card

Card rules:

- Strong border or glow
- Dark background
- Sticker/badge label
- Clear CTA
- Mobile-first stacking

### HUD panels

Used for games, diagnostics, admin, and status.

HUD panel rules:

- Monospace labels
- Thin grid lines
- Status dots
- Color-coded states
- Strong contrast

Status colors:

```txt
Online     Cash Green
Warning    Signal Yellow
Error      AMS Red
Locked     Purple Glow
Info       Sky Neon
```

## Homepage rules

The homepage should answer fast:

- What is HYPHSWORLD?
- What can I play/watch/buy/do?
- Where should I click first?
- What is new?

Homepage structure:

1. Hero front gate
2. Featured Chase the Bag card
3. District map
4. Latest media/drop rail
5. O1 Universe teaser
6. Vault/Cool Points teaser
7. Footer navigation

## Games District rules

Games should feel like a premium arcade.

Required for every game page:

- Game title
- Play button
- Controls/help
- Leaderboard link
- Reward/currency info if available
- Mobile support notes
- Status indicator

Chase the Bag rules:

- Preserve `/games/cash-run/` paths.
- Preserve mobile playability.
- Preserve leaderboard flow.
- Keep power-ups visible and understandable.
- Keep effects clean, not cluttered.

## O1 Universe rules

All O1 Universe characters should remain cartoon-styled unless specifically changed later.

The O1 Universe section should support:

- Character cards
- Episode drops
- O1NN LIVE clips
- Scene stills
- Lore map
- Commercial/parody segments

Visual style:

- Cartoon foregrounds
- Realistic or cinematic backgrounds allowed
- Bold color blocking
- TV broadcast overlays
- HUD/action graphics where appropriate

## Music / Media rules

Music and video pages should feel like a streaming channel mixed with a street campaign board.

Use:

- Feature video cards
- Release tiles
- Campaign banners
- Behind-the-scenes panels
- Artist/story notes

Avoid:

- Plain embedded-video dumps
- Random spacing
- Unlabeled media

## Store / Drops rules

Drops should feel limited, visual, and event-based.

Use:

- Countdown badges
- Product cards
- Drop status
- Sold out / locked / early access labels
- Member pricing space

Future:

- Connect Cool Points
- Gated access
- Drop calendar

## Vault / Cool Points rules

The Vault is the reward system and member layer.

Visual style:

- Access cards
- Digital passes
- Progress bars
- Rank badges
- Unlock panels

Core rule:

Cool Points must persist for logged-in users across sessions, devices, refreshes, and browser cache clearing. Points should not reset unless the user deletes their account.

## Admin Control Room rules

Admin should look powerful but readable.

Use:

- Mission-control dashboard
- API health cards
- Build status cards
- Leaderboard moderation tools
- Content queues
- Clear warning states

Do not make admin actions playful enough to be unclear. Delete/clear actions must be obvious and confirmed.

## Motion rules

Use motion to create energy, not chaos.

Good motion:

- Button lift
- Glow pulse
- Ticker movement
- Card hover
- Small parallax
- Game status blink

Avoid:

- Constant full-page animation
- Heavy blur everywhere
- Overlapping glow storms
- Motion that hurts mobile performance

## Accessibility rules

- Keep text readable.
- Maintain strong contrast.
- Do not rely on color alone for status.
- Buttons must have clear labels.
- Avoid tiny tap targets on mobile.
- Motion should not block interaction.

## Mobile rules

Mobile is not secondary.

Required:

- Large tap targets
- Simple navigation
- Fast loading
- Stable viewport
- No horizontal scroll
- Chase the Bag controls remain playable

## Do not use

Avoid:

- Plain corporate green-black layouts
- Random fonts per page
- Low-contrast gray text
- Overdone glow covering content
- Huge uncompressed assets
- Unclear buttons
- Hidden navigation
- Breaking Chase the Bag static paths
- Uploading secrets

## Future visual concepts

- HYPHSWORLD city map homepage
- Arcade Passport for games
- Vault access card for members
- O1NN LIVE broadcast wall
- Drop radar calendar
- Admin mission-control board
- Neon gate transitions between districts
- Character unlock badges
- Cool Points rank ladder

## Implementation order

1. Keep current stable site green.
2. Build shared CSS tokens.
3. Build reusable cards/buttons/panels.
4. Rebuild homepage shell.
5. Add Games District.
6. Add Vault teaser.
7. Add O1 Universe teaser.
8. Add admin only after public flows are stable.

## Brand sentence

HYPHSWORLD is a futuristic street-entertainment platform where games, music, cartoons, drops, and rewards all connect inside one colorful digital city.
