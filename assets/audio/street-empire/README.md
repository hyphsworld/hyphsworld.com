# Street Empire soundtrack assets

This folder is the persistent HYPHSWORLD home for Street Empire background music.

Expected files:
- 2017shit80bpm.mp3
- bell-ring.mp3
- brick-wall.mp3
- came-to-dance-81-7bpm-master.mp3
- i-g-o.mp3
- sample-83bpm.mp3
- smooth.mp3
- speed-trap.mp3
- street-empire.mp3

Street Empire source PR #60 streams these files from:
https://hyphsworld.com/assets/audio/street-empire/

Keep this folder outside the generated /games/street-empire route so future game publishes do not remove the soundtrack.

The nine tracks are matched to -16 LUFS (±0.3 LU), with decoded MP3 true peaks at or below -1.5 dBTP. The files retain their names, song lengths, stereo channels, and sample rates. `normalization.json` records measured output levels and checksums; `normalization-source.json` records the original inputs. Verify with `python3 scripts/normalize-street-empire-audio.py --check`. Earlier masters remain available in Git history.
