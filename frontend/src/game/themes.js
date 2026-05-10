// Per-level visual themes. After level 5, cycles back (endless mode) but with
// difficulty scaling baked into engine.

export const THEMES = [
    {
        // Level 1 — Skid Row / Slum
        name: "Skid Row",
        sub: "where it all begins",
        bg:        "#1a120a",
        floor:     "#221709",
        floorAlt:  "#2a1d0d",
        wall:      "#5a3a1c",
        wallEdge:  "#7a4f24",
        pellet:    "#7ee895",
        power:     "#d4af37",
        ink:       "#f5e9d2",
        accent:    "#c2410c",
        decor:     "graffiti", // cosmetic motif
    },
    {
        // Level 2 — Bad Hood
        name: "Bad Hood",
        sub: "concrete jungle",
        bg:        "#13141a",
        floor:     "#1a1c24",
        floorAlt:  "#22242e",
        wall:      "#3d4252",
        wallEdge:  "#5a6175",
        pellet:    "#7ee895",
        power:     "#ffd84a",
        ink:       "#e8e4d8",
        accent:    "#ffd84a",
        decor:     "streetlamp",
    },
    {
        // Level 3 — Mid Suburb
        name: "Mid Suburb",
        sub: "things are looking up",
        bg:        "#0e1614",
        floor:     "#142420",
        floorAlt:  "#1a2c27",
        wall:      "#2f5a4a",
        wallEdge:  "#4a8a73",
        pellet:    "#a8f59b",
        power:     "#ffd84a",
        ink:       "#e6f1e1",
        accent:    "#5cc46f",
        decor:     "hedge",
    },
    {
        // Level 4 — Downtown
        name: "Downtown",
        sub: "neon nights",
        bg:        "#070a1a",
        floor:     "#0d1530",
        floorAlt:  "#121d40",
        wall:      "#1f3380",
        wallEdge:  "#4a6cff",
        pellet:    "#6cf2ff",
        power:     "#d36cff",
        ink:       "#e6f6ff",
        accent:    "#d36cff",
        decor:     "neon",
    },
    {
        // Level 5 — Luxury District
        name: "Luxury District",
        sub: "made it",
        bg:        "#0a0805",
        floor:     "#1a140c",
        floorAlt:  "#221c12",
        wall:      "#7a5d20",
        wallEdge:  "#d4af37",
        pellet:    "#ffe89a",
        power:     "#ffffff",
        ink:       "#fff4d6",
        accent:    "#d4af37",
        decor:     "marble",
    },
];

export function getTheme(level) {
    // 1-indexed level. After 5, cycle.
    const idx = ((level - 1) % THEMES.length + THEMES.length) % THEMES.length;
    return THEMES[idx];
}

// Difficulty scaling — speeds in tiles per second.
export function getDifficulty(level) {
    // Base + small ramp per level.
    const playerSpeed = 6.2 + Math.min(level - 1, 6) * 0.15;
    const enemySpeed  = 4.6 + (level - 1) * 0.18;
    const enemyCount  = Math.min(2 + Math.floor((level - 1) / 1), 6); // 2,3,4,5,6,6,6
    const frightTime  = Math.max(7.5 - (level - 1) * 0.25, 3.5);
    return { playerSpeed, enemySpeed, enemyCount, frightTime };
}

// Power-up types (rotated)
export const POWERUP_TYPES = ["speed", "shield", "double"];
