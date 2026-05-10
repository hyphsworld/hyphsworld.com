// Tile codes:
// 1 = wall
// 0 = pellet (cash)
// 2 = empty (no pellet, walkable)
// 3 = power pellet (BIG cash)
//
// Maze: 21 cols x 19 rows. Symmetric horizontally.
// Rows 7 and 11 are tunnel rows — full edge-to-edge corridors that wrap
// horizontally (exit left → enter right, and vice versa).

export const MAZE_TEMPLATE = [
    "111111111111111111111",  // 0
    "100000000000000000001",  // 1
    "101111101010111110101",  // 2
    "130000000000000000031",  // 3
    "101011111010111110101",  // 4
    "100010000000000010001",  // 5
    "111010111111111010111",  // 6
    "200000000000000000002",  // 7  <- tunnel row (open edge-to-edge)
    "111010111010111010111",  // 8
    "100000010000010000001",  // 9
    "111010111010111010111",  // 10
    "200000000000000000002",  // 11 <- tunnel row (open edge-to-edge)
    "111010111111111010111",  // 12
    "100010000000000010001",  // 13
    "101011111010111110101",  // 14
    "130000000000000000031",  // 15
    "101111101010111110101",  // 16
    "100000000000000000001",  // 17
    "111111111111111111111",  // 18
];

export const COLS = 21;
export const ROWS = 19;

export const T = {
    WALL: 1,
    PELLET: 0,
    EMPTY: 2,
    POWER: 3,
};

// Build the working grid from template (returns numeric 2D array).
export function buildGrid() {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const ch = MAZE_TEMPLATE[r][c];
            const v = parseInt(ch, 10);
            row.push(v);
        }
        grid.push(row);
    }
    return grid;
}

// Player spawn — center bottom area. Row 13 col 10 (= 0 pellet => fine, eaten on spawn).
export const PLAYER_SPAWN = { col: 10, row: 13 };

// Enemy spawn cells — all open path cells in central horizontal corridor (row 9).
export const ENEMY_SPAWNS = [
    { col: 10, row: 9 },
    { col: 8,  row: 9 },
    { col: 12, row: 9 },
    { col: 10, row: 7 },
    { col: 6,  row: 9 },
    { col: 14, row: 9 },
];

// Power-up drop locations (rotate types each level).
// All cells MUST be open path tiles (verified against MAZE_TEMPLATE).
export const POWERUP_SPOTS = [
    { col: 5,  row: 5 },
    { col: 15, row: 5 },
    { col: 5,  row: 13 },
    { col: 15, row: 13 },
];

export function isWall(grid, col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return grid[row][col] === T.WALL;
}

// Side tunnels — wrap horizontally on tunnel rows.
export function wrap(col, row) {
    let nc = col;
    if (col < 0) nc = COLS - 1;
    else if (col >= COLS) nc = 0;
    return { col: nc, row };
}

export function countPellets(grid) {
    let n = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const v = grid[r][c];
            if (v === T.PELLET || v === T.POWER) n++;
        }
    }
    return n;
}
