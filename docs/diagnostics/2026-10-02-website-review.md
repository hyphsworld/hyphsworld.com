# Website diagnostics — October 2, 2026 UTC

Reviewed `hyphsworld/hyphsworld.com` main at
`bf3c55293a291e823943ce018e562ff6c061c466`.

## Results

| Check | Result |
| --- | --- |
| Jest suite | 49 tests passed across 11 suites |
| Repository diagnostic scripts | 24 of 32 returned success; eight failed |
| HTML validation | All 91 HTML files passed doctype and duplicate-ID checks |
| JavaScript syntax | Consumer diagnostic passed its repository-wide parse check |
| Local HTML references | 1,166 checked; three missing files on `gate.html` |
| Dependency audit | One high-severity development dependency: `brace-expansion` |
| Supabase security advisors | 15 INFO, seven anonymous-RPC WARN, 63 authenticated-RPC WARN |
| Live HTTP/HTTPS | Requests from this environment returned 502; deployment and Cloudflare TLS status remain unverified |
| Browser visual check | Unavailable: browser executable missing and browser download failed |

The CSS diagnostic is a placeholder. The JS lint script only checks whether
ESLint is installed; its success is not a lint result. Neither is proof of a
clean stylesheet or application. The consumer diagnostic provides the actual
JavaScript syntax check. These checks do not certify production security or
exercise signed-in purchases, email delivery, reward claims, or multiplayer.

## Failed diagnostic checks reviewed

| Script | Finding |
| --- | --- |
| `creator-multi-world-diagnostic.js` | Reads its migration from the repository root; the file exists under `supabase/migrations/`. Incorrect diagnostic path. |
| `creator-profile-diagnostic.js` | Requires navigation to `library` after CREATE. Current code keeps the CREATE view and renders a success receipt. Different implementation, not demonstrated upload failure. |
| `creator-publish-to-world-diagnostic.js` | Requires literal `LIVE IN WORLD`; current status formatter displays `Live` for published creations. Stale label assertion. |
| `creator-upload-studio-diagnostic.js` | Requires literal `Maximum 50 MB`; page says `50 MB max`, and controller enforces the limit. Stale wording assertion. |
| `creator-world-rollout-diagnostic.js` | Requires `Apply now`; the page has an `Apply` link to `creator-apply.html`. Stale wording assertion. |
| `domino-pov-diagnostic.js` | Requires `canPlay(tile, boardTiles)`; current hand uses `legalSides(tile, activeState)` to determine playable bones. Stale implementation assertion. |
| `game-exit-diagnostic.js` | Requires the older Domino script query version. Page loads `20260926-domino-completion-1`; earlier cleanup assertions passed. Stale cache-version assertion. |
| `login-diagnostic.js` | Misses the existing wrapper around the sign-in refresh handler. Also flags six creator pages lacking the legacy points bootstrap. Two deliberately hide the floating points HUD and load global My ID. The remaining pages require an intentional shared account-navigation review; missing legacy widgets alone do not establish broken login. |

The failed scripts stop at their first failure, so later assertions in those
scripts were not completed. Update them to test behavior rather than exact
labels, version strings, and old code fragments before relying on their counts.

## Follow-up priorities

1. Review the remaining executable privileged Supabase functions individually.
   Advisor warnings are not automatically exploitable defects. Previous checks
   found the 15 no-policy tables have no browser DML grants; do not open their
   access to silence notices. The seven anonymous leaderboard functions were
   intentionally public. This run refreshed advisor counts, not every function
   body or grant.
2. Update the development-only `brace-expansion` dependency and rerun the suite.
   It is used by test tooling, not shipped as a browser production dependency.
3. Restore or intentionally remove `gate.html` references to `scan.mp3`,
   `granted.mp3`, and `transport.mp3`.
4. Replace stale diagnostic assertions and the CSS/JS lint placeholders with
   meaningful checks. Review account navigation on the flagged creator pages.
5. Verify Cloudflare activation, certificates, redirects and security headers
   through a working live connection; then run real phone and two-device game
   checks. A 502 from this environment does not establish a visitor-wide outage.

## Homepage button change

Street Empire's existing destination and accessible link label are preserved.
The button adds a gold gradient, a circular arrow, a 56px minimum tap target,
mobile full width, a clear focus ring, and reduced-motion handling. No new
JavaScript or media dependency is introduced. Game, account, wallet and scoring
code is unchanged. The previously prepared soundtrack is still unpublished and
is separate from this change.
