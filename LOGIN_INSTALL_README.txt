HYPHSWORLD LOGIN PHASE - INSTALL NOTES
Generated: 2026-04-30 07:07

FILES INCLUDED
1. login.html
   - New Vault Access Terminal page.
   - Includes Duck Sauce + BuckTheBodyguard guide copy.
   - Runs body scan and transport effect.
   - Redirects to vault.html after access is granted.

2. login.css
   - Full styling for login.html.
   - Green + black base, red accents, rainbow/fun brand button energy.

3. login.js
   - Access code check.
   - The real code is NOT written as plain text.
   - The file stores only the SHA-256 hash.
   - Current master code hash included for the private code you already named.

4. vault-guard.js
   - Optional guard for vault.html / level pages.
   - Redirects people back to login.html if they have not unlocked access this session.

5. logout.html
   - Clears the Vault access session.

UPLOAD STEPS
1. Upload all 5 files to the ROOT of the GitHub Pages repo:
   - login.html
   - login.css
   - login.js
   - vault-guard.js
   - logout.html

2. Change the Vault button/link on the homepage to:
   login.html

3. To protect Vault pages, add this script line to each protected page before </body>:
   <script src="vault-guard.js" defer></script>

PROTECTED PAGE SUGGESTIONS
- vault.html
- level-1.html
- level-2.html
- any hidden game/casino/cool-points page later

IMPORTANT HONEST SECURITY NOTE
This is the right Phase A login for GitHub Pages:
- It hides the plain code.
- It blocks casual visitors.
- It gives the site the login/body-scan/transport experience.

But GitHub Pages is static hosting, so this is not true server-side security.
Real paid/member/private lock later should use Firebase, Supabase, Cloudflare Access, Netlify, Vercel, Memberstack, or another backend auth layer.

NOTHING IN THIS PACKAGE CHANGES:
- homepage hero
- homepage MP4
- music player
- artist spotlight
- merch page
- current Vault design
- current colors

This package is additive unless you choose to connect the links and guard script.
