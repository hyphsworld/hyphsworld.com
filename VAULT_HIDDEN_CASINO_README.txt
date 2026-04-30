HYPHSWORLD VAULT + HIDDEN CASINO FULL REWRITE

FILES IN THIS ZIP
- vault.html
- vault-floor.css
- vault-floor.js
- hidden-casino.html
- hidden-casino.css
- hidden-casino.js
- duck-sauce.png
- buck-the-bodyguard.png

WHAT THIS DOES
- Full rewrite of the Vault floor
- Keeps the Vault as a real floor after login
- Adds real Duck Sauce and BuckTheBodyguard images
- Adds animated gate scan + scan-bar door + Level 1 transport
- Adds a slot machine on the Vault floor
- Adds a Hidden Casino page with blackjack + bonus slot spin
- Uses localStorage for Cool Points

IMPORTANT
Keep these existing files in your repo:
- login.html
- login.css
- login.js
- logout.html
- vault-guard.js

UPLOAD
Upload all files in this zip to the repo root.

LINK FLOW
- login.html -> vault.html
- vault.html -> quarantine.html for Level 1
- vault.html -> hidden-casino.html for casino
- hidden-casino.html is protected by vault-guard.js too

COOL POINTS
The slot machine and blackjack page save points in browser localStorage:
hyphsworld_cool_points

LEVEL 1
The main Level 1 button in vault.html points to:
quarantine.html

If your Level 1 file has a different name, change that one link in vault.html and the fallback list in vault-floor.js.
