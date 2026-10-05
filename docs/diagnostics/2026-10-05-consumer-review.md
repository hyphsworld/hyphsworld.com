# Consumer diagnostic — October 4, 2026 Pacific / October 5 UTC

Reviewed public-site main `fb677235367f3733019f968667b7f8801200df1f` and Street Empire source main `e85440bd0880f679d56db983a1c2217d1ee8cc8a`.

## Verified findings and fixes

| Finding | Fix |
| --- | --- |
| Vault gate points to three absent MP3 files | Reuse the deployed click, bell and engine cues; rejected media playback cannot produce an unhandled promise rejection. |
| Homepage presents September 20–21 football fixtures as current | Expire dated announcements after their coverage window. Creator announcements remain visible. |
| Three creator pages lack the shared My ID navigation | Load the existing shared account launcher on Creator Drop, Lil G and Sixx Figgaz. |
| CSS check is a placeholder; JavaScript check merely finds ESLint | Parse external and embedded CSS/JavaScript and fail on malformed syntax. These remain syntax checks, not visual or semantic certification. |
| Full diagnostics stop on old labels, query versions, and implementation fragments | Check the current receipt, published state, media limit, legal moves, measured chain bounds and cleanup contracts. Preserve authorization and privacy assertions. |
| Full diagnostics are not enforced in CI | Run the full diagnostic command, including creator multi-world, private upload and game exit checks. |
| Development dependency audit identifies vulnerable test tooling | Upgrade pinned Jest/JSDOM and lockfile, refresh brace expansion, and pin current PostCSS. Final audit reports zero vulnerabilities. These dependencies are development tooling. |
| Street Empire live browser logs React error 418 | The exported homepage shows “Online play coming soon” while the first browser render shows PLAY ONLINE. Prepare a separate game-source fix: initialize availability consistently, then enable hostname-dependent controls after mount on title and login screens. |

## Validation

- 63 Jest tests passed across 14 suites, including negative fixtures proving broken external/inline CSS and JavaScript fail, and expiry behavior.
- Full site diagnostics passed, including the checks that previously stopped early.
- 11 service-worker/navigation tests passed.
- 1,165 local HTML references checked after adding shared account scripts; no missing destinations.
- 208 external/embedded stylesheets and 233 external/embedded JavaScript scripts parsed successfully (counts may grow with this report's accompanying test changes).
- `npm audit`: zero reported vulnerabilities at the time of review.
- Street Empire regression uses React server rendering and mounted components: exported HTML and browser-first HTML agree; production-host online availability activates after mount; alternate offline hosts remain offline; configured backend remains available.
- Current deployment workflows inspected successfully. Live homepage and Street Empire title/guide/solo setup were exercised in a cloud browser. Homepage Friends sign-in dialog was verified by keyboard. Initial pointer clicks did not expose the dialog in this browser; no product-level mouse defect was established.

## Read-only backend review

All public base tables have RLS enabled. The existing social and presence RPCs deny anonymous execution, allow authenticated execution, use an empty search path, and include `auth.uid()` guards. Advisor notices about privileged authenticated RPCs require individual authorization review; their existence alone does not establish a vulnerability. No production accounts, balances, messages, grants or policies were changed.

## Limits and remaining checks

The fixes are proposed pull requests until merged and deployed. The Street Empire source fix also needs a verified new web export; changing the source does not replace the currently hosted bundle automatically.

This review does not certify physical iPhone/Android behavior, signed-in two-device multiplayer/chat delivery, real purchases, password recovery/email delivery, or prize redemption. The user previously confirmed friend requests and messaging work. Synthetic tests cover state isolation and guarded requests, but they do not replace those production acceptance checks. No “nothing left to do” claim is warranted.

React error reference: https://react.dev/errors/418
Supabase privileged-function review reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_security_definer_functions
