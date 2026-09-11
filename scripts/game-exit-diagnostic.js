const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const domino = read("dominos.js");
const table = read("table-game.js");
const points = read("global-points-engine.js");
const legacyPoints = read("points-core.js");
const dominoPage = read("dominos.html");
const tablePage = read("table-game.html");

assert(domino.includes("requestToken !== roomViewToken"), "Domino refreshes must be invalidated after leaving.");
assert(domino.includes("stopRoomRefresh();"), "Domino leave must stop room polling.");
assert(domino.includes('event?.detail?.event === "SIGNED_OUT"'), "Domino must clear state on sign-out.");
assert(domino.includes('setText("povHudName", "OPEN SEAT")'), "Domino opponent HUD must reset to an open seat.");
assert(domino.includes('if ($("playerHand")) $("playerHand").innerHTML = "";'), "Domino hand must clear on exit.");

assert(table.includes("requestToken !== roomViewToken"), "Shared table refreshes must be invalidated after leaving.");
assert(table.includes("function resetTableHud()"), "Shared table games need one complete HUD reset.");
assert(table.includes("scoreSubmissionId = null;"), "Score submission identity must clear between table views.");
assert(table.includes('event?.detail?.event === "SIGNED_OUT"'), "Shared table games must clear state on sign-out.");
assert(table.includes('setText("tableActiveRoomCode", "None")'), "Shared table room code must clear on exit.");

assert(points.includes("if (!document.body) return null;"), "Points HUD must wait for document.body.");
assert(points.includes("if (!hud) return;"), "Points renderer must tolerate a HUD that is not mountable yet.");
assert(points.includes("requestEpoch !== authEpoch"), "In-flight points refreshes must not restore a signed-out user.");
assert(points.includes("resetForSignedOut()"), "Points HUD must reset immediately on sign-out.");
assert(legacyPoints.includes("if (!document.body) return null;"), "Legacy points HUD must wait for document.body.");
assert(legacyPoints.includes("applyLoggedOut('signed_out')"), "Legacy points state must reset on sign-out.");

assert(dominoPage.includes("dominos.js?v=20260911-exit-cleanup-1"), "Domino page must load the exit-cleanup controller.");
assert(tablePage.includes("table-game.js?v=20260911-exit-cleanup-1"), "Table page must load the exit-cleanup controller.");

console.log("Game exit diagnostic passed: HUD mounting, room races, leave cleanup, and sign-out cleanup are guarded.");
