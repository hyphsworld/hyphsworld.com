"""Attach the shared NFL widget to public HTML and regenerated game pages."""

import re
import sys
from pathlib import Path

TICKER = re.compile(r'<script\b[^>]*\bsrc="(?:/)?nfl-live-scores\.js(?:\?[^"]*)?"[^>]*></script>')
HEAD_END = re.compile(r"</head\s*>", re.IGNORECASE)
EXCLUDED = {"+not-found.html", "_sitemap.html"}


def install(path, game=False):
    if path.name in EXCLUDED:
        return
    original = path.read_bytes().decode("utf-8")
    game_attribute = " data-nfl-game" if game else ""
    tag = f'<script src="/nfl-live-scores.js?v=20261122-sitewide" defer{game_attribute}></script>'
    if TICKER.search(original):
        updated = TICKER.sub(tag, original, count=1)
    else:
        updated, count = HEAD_END.subn(lambda match: tag + match.group(), original, count=1)
        if not count:
            raise ValueError(f"{path} has no closing head tag")
    if updated != original:
        path.write_bytes(updated.encode("utf-8"))


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        path = Path(argument)
        if path.is_dir():
            for page in path.rglob("*.html"):
                install(page, game=True)
        else:
            install(path)
