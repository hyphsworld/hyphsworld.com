"""Replace the shipped engine's procedural music with the artist soundtrack.

The original game is distributed here as a compiled bundle, without its build
project. Keep this bounded transformation reviewable and reject unknown input.
SFX, movement, rendering, scoring, auth and wallet code are left byte-for-byte.
Run once against main.adf32adb.js; the output gets a new content hash.
"""
import hashlib
import json
from pathlib import Path

root = Path('games/cash-run')
original = root / 'static/js/main.adf32adb.js'
bundle = original.read_text()
start = bundle.index('startMusic(e){')
end = bundle.index('},Vt=', start)
assert bundle[start:end].endswith('stopMusic(){this._wantedMusicLevel=null,this._stopActiveMusic(!0)}')
assert bundle[start:end].count('_theme(e)') == 3
replacement = '''startMusic(e){this._lastMusicLevel=Number(e)||1,this._wantedMusicLevel=this._lastMusicLevel,this.muted||window.HWCashRunSoundtrack.start()}_resumeDesiredMusic(){this.muted||null==this._wantedMusicLevel||this.startMusic(this._wantedMusicLevel)}_stopActiveMusic(){window.HWCashRunSoundtrack.stop(),this._musicLevel=-1}stopMusic(){this._wantedMusicLevel=null,this._stopActiveMusic()}'''
bundle = bundle[:start] + replacement + bundle[end:]
changes = {
    'pause(e){this.paused=!!e}togglePause(){this.paused=!this.paused}':
    'pause(e){this.paused=!!e,window.HWCashRunSoundtrack.setPaused(this.paused)}togglePause(){this.pause(!this.paused)}',
    'this.running=!0,this._lastTs=performance.now(),Wt.unlock(),Wt.startMusic(this.level)':
    'this.running=!0,this._lastTs=performance.now(),window.HWCashRunSoundtrack.setPaused(!1),Wt.unlock(),Wt.startMusic(this.level)',
}
for before, after in changes.items():
    assert bundle.count(before) == 1, before
    bundle = bundle.replace(before, after)
assert '_startWebMusic' not in bundle and '_startFallbackMusic' not in bundle
# A new artifact must not advertise the original, now inaccurate source map.
bundle = '\n'.join(line for line in bundle.split('\n') if not line.startswith('//# sourceMappingURL='))
license_name = 'cash-run-game.LICENSE.txt'
bundle = bundle.replace('main.adf32adb.js.LICENSE.txt', license_name)
name = 'main.' + hashlib.sha256(bundle.encode()).hexdigest()[:8] + '.js'
(original.parent / name).write_text(bundle)
(original.parent / license_name).write_bytes((original.parent / 'main.adf32adb.js.LICENSE.txt').read_bytes())
html = root / 'index.html'
html.write_text(html.read_text().replace(original.name, name).replace(
    '  <script defer src="/games/cash-run/static/js/',
    '  <script defer src="/games/cash-run/soundtrack.js?v=artist-five-1"></script>\n  <script defer src="/games/cash-run/static/js/'))
manifest_path = root / 'asset-manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['files']['main.js'] = '/games/cash-run/static/js/' + name
manifest['files'].pop('main.adf32adb.js.map', None)
manifest['entrypoints'] = [x.replace(original.name, name) for x in manifest['entrypoints']]
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
for path in [original, original.with_suffix('.js.map'), original.parent / 'main.adf32adb.js.LICENSE.txt']:
    path.unlink()
print('Replaced procedural music:', name)
