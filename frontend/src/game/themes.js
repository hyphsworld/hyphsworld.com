// Per-level visual themes — cyberpunk / neo-arcade aesthetic.
// Rags-to-riches arc preserved, all levels feel future-tech.

export const THEMES = [
    {
        // Level 1 — Neo-Slum (rusted cyber district)
        name: "Neo-Slum",
        sub: "where bandwidth dies",
        bg:        "#0a0e14",
        floor:     "#11161e",
        floorAlt:  "#161c25",
        wall:      "#1f2a36",
        wallEdge:  "#3da89c",
        pellet:    "#7ee895",
        power:     "#ffb04a",
        ink:       "#cfe9e3",
        accent:    "#3da89c",
        grid:      "#1a2a30",
        decor:     "static",
    },
    {
        // Level 2 — Glitch Block
        name: "Glitch Block",
        sub: "data hood",
        bg:        "#080612",
        floor:     "#0e0d1f",
        floorAlt:  "#13122a",
        wall:      "#1f1a3a",
        wallEdge:  "#7d4aff",
        pellet:    "#9affb7",
        power:     "#ffd84a",
        ink:       "#e8ddff",
        accent:    "#7d4aff",
        grid:      "#1a1535",
        decor:     "ghost-circuit",
    },
    {
        // Level 3 — Midline
        name: "Midline Grid",
        sub: "civic mesh",
        bg:        "#04101a",
        floor:     "#06192a",
        floorAlt:  "#082135",
        wall:      "#0d3a55",
        wallEdge:  "#26d9c5",
        pellet:    "#a8f59b",
        power:     "#26d9c5",
        ink:       "#d6f4ff",
        accent:    "#26d9c5",
        grid:      "#0a2840",
        decor:     "clean",
    },
    {
        // Level 4 — Downtown
        name: "Downtown.exe",
        sub: "neon overload",
        bg:        "#06031a",
        floor:     "#0c0830",
        floorAlt:  "#120d40",
        wall:      "#22156a",
        wallEdge:  "#ff3ec8",
        pellet:    "#6cf2ff",
        power:     "#ff3ec8",
        ink:       "#e6f6ff",
        accent:    "#ff3ec8",
        grid:      "#190c4a",
        decor:     "neon-strip",
    },
    {
        // Level 5 — Aurum Spire
        name: "Aurum Spire",
        sub: "the penthouse",
        bg:        "#0a0805",
        floor:     "#1a140c",
        floorAlt:  "#221c12",
        wall:      "#5a4318",
        wallEdge:  "#ffd84a",
        pellet:    "#ffe89a",
        power:     "#ffffff",
        ink:       "#fff4d6",
        accent:    "#ffd84a",
        grid:      "#241c0e",
        decor:     "gold-leaf",
    },
];

export function getTheme(level) {
    const idx = ((level - 1) % THEMES.length + THEMES.length) % THEMES.length;
    return THEMES[idx];
}

// Difficulty scaling — speeds in tiles per second.
export function getDifficulty(level, mode = "normal") {
    const easy = mode === "easy";
    const playerSpeed = (easy ? 6.6 : 6.2) + Math.min(level - 1, 6) * 0.15;
    const enemySpeed  = (easy ? 3.4 : 4.6) + (level - 1) * (easy ? 0.10 : 0.18);
    const enemyCount  = easy
        ? Math.min(1 + Math.floor((level - 1) / 2), 3)
        : Math.min(2 + Math.floor((level - 1) / 1), 6);
    const frightTime  = easy
        ? Math.max(10 - (level - 1) * 0.2, 6)
        : Math.max(7.5 - (level - 1) * 0.25, 3.5);
    return { playerSpeed, enemySpeed, enemyCount, frightTime, easy };
}

export const POWERUP_TYPES = ["speed", "shield", "double", "bomb", "life"];
