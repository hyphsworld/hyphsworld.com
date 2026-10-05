# Creator World: the skate house

The public hub (`creators.html`) is a cartoon Bay Area household: living room discovery, fresh drops, World Seals, and applications. The founder profile remains `creators-world.html`. All ten public profiles use framed creator artwork, a cream identity sheet, square sticker-like actions, section links, and access to the existing creator dashboard. Existing team/country colors remain in creator content and accent borders.

Creators retain the same profile editor, media studio, creation library, publishing review, inbox, and ownership rules. Public profile fields read the published creator row; no private ownership identifiers are fetched and no database writes or migrations are included. Creator-saved text uses textContent, and safe artwork is swapped only after it loads. Creator-saved copy takes precedence over editorial translation attributes. The legacy `Nitti Bo` database name does not reverse the published AW ENTERPRISES rebrand; another saved name will display normally.

The published-creations loader now includes KILI 631 and YKOMUSIC. Public discovery includes fallbacks for both profiles. Accessible hub tabs support arrows, Home and End, with stable panel associations. The global menu uses border-box sizing for child controls and resets inherited header positioning/padding so it fits 320px fixtures and creator pages.

## Validation

- 73 Jest tests, including public profile hydration, text injection prevention, safe image URLs, offline fallback, and Latin creator routing.
- Full site diagnostics and 11 navigation tests.
- Real Chromium checks on the hub and all ten profiles at 320, 390 and 1280px: no horizontal overflow, profile actions, management links, search, tab switching, keyboard tabs and language controls.
- Separate shared-menu checks at phone/desktop sizes: CREATE, Friends/messages, presence, Escape, and member-only game access.
- Read-only production query confirmed ten published creators. No production accounts or messages were changed.

The browser checks use a disconnected public client and synthetic social accounts. They do not establish that every real creator account is correctly assigned; existing authorization stays in the protected dashboard and database policies. Browser screenshots are captured in CI as `creator-skate-house-layouts`. Playwright 1.56.1 is pinned for checks because the newer headless browser artifact was unavailable in the local environment.

## Artwork

Project asset: `assets/creator-world/skate-house.webp` (1672 × 940). Generated with the built-in image generation tool, then encoded to WebP for delivery.

Final prompt:

> Use case: stylized-concept. Asset type: wide landscape website hero artwork for HYPHSWORLD Creators World, a diverse music and skate creator community. Primary request: professional cartoon household skater hangout. Draw an original richly detailed colorful cartoon cutaway of a cozy Bay Area house at golden hour, viewed slightly isometric from the front, with a welcoming living room couch and turntable, a music recording corner with microphone and speakers, a wall of skateboard decks, art and sticker covered furniture, an open garage with skate tools and a backyard wooden mini ramp. No people. Strong hand inked dark outlines, tactile screen print shading, warm cream walls, teal and orange accents, sunset pink sky, mature premium skate magazine aesthetic. Show the house as the central subject, attractive landscape composition with architecture filling the frame. No text, no lettering, no logos, no UI, no watermark. The scene must read as a real cartoon household rather than a generic futuristic gaming city.
