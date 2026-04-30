HYPHSWORLD BODY SCAN VISUAL FIX

Replace these files together:
1. vault.html
2. vault.css
3. vault.js

What this fixes:
- Buttons already worked, but scan visual did not show.
- Overlay now uses forced top-layer z-index.
- JS injects fallback overlay CSS in case another stylesheet hides it.
- Redirect waits until scan + transport animation finishes.
- Code is hash-checked, not written as plain text in the JS.

Upload order:
1. Upload vault.html
2. Upload vault.css
3. Upload vault.js
4. Hard refresh the Vault page

Hard refresh on iPhone:
- Open Safari
- Tap AA / page settings if available and reload, or close the tab and reopen
- If GitHub Pages still shows old files, wait a minute and reload again

Quick check:
- Open vault.html
- Enter the code
- Tap Run Body Scan
- You should see a full-screen green/black scanner before transport.
