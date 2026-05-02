HYPHSWORLD CLEAN VAULT REWRITE

FILES INCLUDED
- vault.html
- vault-floor.css
- vault-floor.js

WHAT THIS FIXES
Your login/access is working, but vault.html is showing like raw text because the current vault markup is not matching the CSS classes cleanly.

This is a full clean vault.html replacement with:
- proper site header
- proper .vault-main wrapper
- Duck Sauce card
- BuckTheBodyguard card
- Access Pad Active
- Vault Gate
- animated body scan
- scan-bar door opening
- transport overlay
- Level 1 entry

UPLOAD STEPS
1. Upload/replace vault.html in the repo root.
2. Upload vault-floor.css in the repo root.
3. Upload vault-floor.js in the repo root.
4. Keep these already uploaded files:
   - styles.css
   - vault-guard.js
   - login.html
   - login.css
   - login.js

IMPORTANT
Do not remove this from the bottom of vault.html:
<script src="vault-guard.js" defer></script>

LEVEL 1 REDIRECT
The scan button tries these page names in order:
1. quarantine.html
2. level-1.html
3. level1.html
4. vault-level-1.html

If your Level 1 page has a different filename, change the list inside vault-floor.js.
