# Street Empire soundtrack

Seven tracks supplied by the site owner, in this looping order:
STREET EMPIRE, BELL RING, BRICK WALL, Came to Dance, I G.O,
Sample 83 BPM, SPEED TRAP.

Playback copies are 128 kbps AAC in M4A containers. Uploaded originals remain
unchanged. The GitHub connector only writes UTF-8 files, so playback copies are
stored in base64 parts, decoded in memory by `soundtrack.js`. The manifest records
each decoded file's byte count and SHA-256. No external media host is required.

The existing Web Audio context and music gain control the playlist. The original
funk loop is excluded from loading and playback; effects are preserved. The next
song is fetched and decoded while the current song plays, then scheduled on the
audio clock. After track seven the playlist returns to track one. Only current
and next decoded buffers are retained. Mute/stop cancels both scheduled sources
and invalidates pending playback; unmute resumes the same track and position.

After replacing the Expo export, preserve `music/` and `soundtrack.js` and run:

```sh
python3 scripts/install-street-empire-soundtrack.py
```

The installer is idempotent and requires exact known sound-engine hooks. A changed
upstream sound module fails installation instead of silently mixing two music
systems. The staging workflow preserves and installs these files on publication.
