HYPHSWORLD MATCHING LOGIN FULL REWRITE

FILES INCLUDED
- login.html
- login.css
- login.js
- logout.html
- duck-sauce.png
- buck-the-bodyguard.png

WHAT THIS DOES
- Matches the new Vault Floor / Hidden Casino visual system
- Uses real Duck Sauce and BuckTheBodyguard images
- Keeps the same session key that vault-guard.js checks:
  hyphsworld_vault_access
- Keeps the access code hidden as a SHA-256 hash in login.js
- Redirects to vault.html after scan/transport
- Supports safe redirect from vault-guard.js using:
  login.html?from=hidden-casino.html

UPLOAD
Upload all files in this zip to the repo root.

KEEP THESE EXISTING FILES
- vault.html
- vault-floor.css
- vault-floor.js
- hidden-casino.html
- hidden-casino.css
- hidden-casino.js
- vault-guard.js

DO NOT REMOVE FROM PROTECTED PAGES
<script src="vault-guard.js" defer></script>

IMPORTANT SECURITY NOTE
This is a strong front-end access experience for GitHub Pages.
True private paid/member locking still needs backend/server auth later.
