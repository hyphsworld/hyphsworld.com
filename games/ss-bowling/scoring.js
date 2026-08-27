(function (root, factory) {
  "use strict";

  const calculateScore = factory();
  root.SSBowlingScoring = { calculateScore: calculateScore };
  if (typeof module === "object" && module.exports) module.exports = calculateScore;
}(typeof globalThis === "object" ? globalThis : window, function () {
  "use strict";

  return function calculateScore(rolls) {
    let total = 0;
    let rollIndex = 0;

    for (let frame = 1; frame <= 10 && rollIndex < rolls.length; frame += 1) {
      const firstRoll = rolls[rollIndex];
      if (frame === 10) {
        return total + rolls.slice(rollIndex, rollIndex + 3).reduce(function (sum, pinsDown) {
          return sum + pinsDown;
        }, 0);
      }

      if (firstRoll === 10) {
        total += 10 + (rolls[rollIndex + 1] || 0) + (rolls[rollIndex + 2] || 0);
        rollIndex += 1;
      } else if (rollIndex + 1 < rolls.length) {
        const secondRoll = rolls[rollIndex + 1];
        total += firstRoll + secondRoll;
        if (firstRoll + secondRoll === 10) total += rolls[rollIndex + 2] || 0;
        rollIndex += 2;
      } else {
        total += firstRoll;
        rollIndex += 1;
      }
    }

    return total;
  };
}));
