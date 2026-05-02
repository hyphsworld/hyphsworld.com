HYPHSWORLD VAULT STYLE FIX

Upload:
- vault-access-fix.css

Then in vault.html, keep styles.css and add this line directly AFTER it:

<link rel="stylesheet" href="vault-access-fix.css?v=gate2fix" />

Your head should look like this:

<link rel="stylesheet" href="styles.css?v=gate2" />
<link rel="stylesheet" href="vault-access-fix.css?v=gate2fix" />

Do NOT remove:
<script src="vault-guard.js" defer></script>

That guard script belongs near the bottom before </body>.

Why:
- Vault is loading after access is granted.
- Your styles.css has some Vault styling.
- The screenshot shows the Gate 2.0 layout is not catching cleanly.
- This adds a vault-only safety style layer without touching homepage, hero video, player, artist spotlight, or merch.

If this still looks raw, vault.html itself needs a clean full rewrite to match the current class names.
