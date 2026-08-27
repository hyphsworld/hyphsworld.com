#!/usr/bin/env node
"use strict";

const assert = require("assert");
const calculateScore = require("../games/ss-bowling/scoring.js");

assert.strictEqual(calculateScore(Array(20).fill(0)), 0, "gutter game");
assert.strictEqual(calculateScore(Array(20).fill(1)), 20, "open frames");
assert.strictEqual(calculateScore([10, 3, 4].concat(Array(16).fill(0))), 24, "strike uses the next two rolls");
assert.strictEqual(calculateScore([6, 4, 3].concat(Array(17).fill(0))), 16, "spare uses the next roll");
assert.strictEqual(calculateScore(Array(12).fill(10)), 300, "perfect game");
assert.strictEqual(calculateScore(Array(21).fill(5)), 150, "all spares");
assert.strictEqual(calculateScore([10, 10, 10, 0, 0].concat(Array(14).fill(0))), 60, "consecutive strikes");

console.log("SS Bowling score diagnostics passed.");
