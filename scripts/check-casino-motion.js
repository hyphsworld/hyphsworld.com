"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const css = fs.readFileSync("casino-motion.css", "utf8");
for (const page of ["table-game.html","casino.html","casino-arcade.html","dominos.html"]) {
  const html = fs.readFileSync(page, "utf8");
  assert.match(html, /href="casino-motion\.css\?v=20261103-motion-1"/, page+" loads the motion layer");
  assert.equal((html.match(/casino-motion\.css/g) || []).length, 1, page+" loads it once");
}
for (const piece of ["#tableStage .hw-card", "#tableStage .craps-dice>span", "#slotReels .slot-reel.consumer-pop", "#dealerCards .card.deal-pop", ".hw-bone-board .hw-bone"]) {
  assert.ok(css.includes(piece), "Missing animation target: "+piece);
}
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(css, /pointer-events\s*:\s*none|position\s*:\s*fixed/i);
assert.doesNotMatch(css, /setInterval|fetch\(|\.rpc\(|localStorage|Math\.random/);
console.log("PASS: casino animations are presentation-only; game pages include the shared style and reduced-motion fallback.");
