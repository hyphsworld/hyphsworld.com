HYPHSWORLD TRANSPORT + QUARANTINE FINAL V2

DROP THESE FILES INTO YOUR GITHUB REPO ROOT:

index.html
styles.css
homepage-upgrades.css
index-player.js
app-player.html
vault.html
vault-access.js
quarantine-mixtape.html
quarantine-player.js
quarantine-tracks.js

WHAT CHANGED IN THIS VERSION:

1. Vault access no longer grants from a button tap alone.
   - The scan button stays disabled until code text is entered.
   - Empty button pushes do not grant access.
   - Old session access keys are cleared when the Vault page loads.

2. Access flow is now:
   - Enter code
   - Run Body Scan
   - Scan Clean
   - Access Granted
   - Transport Initiated
   - Redirect to Level 1: Quarantine Mixtape

3. Quarantine Mixtape page now requires the transport token.
   - Directly opening quarantine-mixtape.html shows the Scan Required screen.
   - Users must come through the Vault body scan/transport flow first.

4. No public code hints are printed in the page copy.

QUARANTINE MIXTAPE ASSETS TO UPLOAD:

Artwork:
- quarantine-mixtape.jpg
- the-quarantine-mixtape.jpg
- the-quarantine.jpg
- album-art.jpg

MP3s currently wired in quarantine-tracks.js:
- da-vault-freestyle.mp3
- 50-cent-shit.mp3
- bout-that.mp3
- free-hyph.mp3
- gotta-go-remix.mp3

Supported locations:
- repo root
- /audio/
- /music/

To change the track order, edit quarantine-tracks.js only.
