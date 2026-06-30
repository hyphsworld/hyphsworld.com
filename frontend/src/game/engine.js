// Cash Run game engine — tile-based, canvas rendered.
import {
    buildGrid,
    isWall,
    wrap,
    countPellets,
    PLAYER_SPAWN,
    ENEMY_SPAWNS,
    POWERUP_SPOTS,
    COLS,
    ROWS,
    T,
} from "./maze";
import { getTheme, getDifficulty, POWERUP_TYPES } from "./themes";
import { audio } from "./audio";

const DIRS = {
    up:    { dc:  0, dr: -1 },
    down:  { dc:  0, dr:  1 },
    left:  { dc: -1, dr:  0 },
    right: { dc:  1, dr:  0 },
};
const OPP = { up: "down", down: "up", left: "right", right: "left" };

const TILE = 26;     // px per tile
const PAD  = 0;
export const CANVAS_W = COLS * TILE + PAD * 2;
export const CANVAS_H = ROWS * TILE + PAD * 2;

const EPS = 0.06;

function manhattan(a, b) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row); }
function dist2(a, b) {
    const dx = a.col - b.col, dy = a.row - b.row;
    return dx * dx + dy * dy;
}

export class CashRunEngine {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        this.character = opts.character || "boy";
        this.mode = opts.mode === "easy" ? "easy" : "normal";
        this.onLifeLost = opts.onLifeLost || (() => {});
        this.onGameOver = opts.onGameOver || (() => {});
        this.onLevelComplete = opts.onLevelComplete || (() => {});
        this.onScoreChange = opts.onScoreChange || (() => {});
        this.onStateChange = opts.onStateChange || (() => {});

        this.score = 0;
        this.lives = this.mode === "easy" ? 5 : 3;
        this.level = 1;
        this.cashCollected = 0;

        this.running = false;
        this.paused = false;
        this._raf = null;
        this._lastTs = 0;
        this._readyTimer = 2.0;     // intro delay before move
        this.activePower = null;     // { type, time }
        this.frightened = 0;          // seconds remaining of fright
        this.frightChain = 0;         // for 200/400/800 ghost combo
        this._powerUpsActive = [];    // [{type,col,row}]
        this._powerUpTimer = 5;       // seconds until next spawn
        this._floatTexts = [];        // floating score popups

        this._initLevel();
        this._bindKeys();
    }

    _initLevel() {
        const theme = getTheme(this.level);
        const diff = getDifficulty(this.level, this.mode);
        this.theme = theme;
        this.diff = diff;

        this.grid = buildGrid();
        this.totalPellets = countPellets(this.grid);
        this.eatenPellets = 0;

        this.player = {
            col: PLAYER_SPAWN.col + 0.0,
            row: PLAYER_SPAWN.row + 0.0,
            dir: "left",
            queued: null,
            speed: diff.playerSpeed,
        };

        this.enemies = [];
        for (let i = 0; i < diff.enemyCount; i++) {
            const spawn = ENEMY_SPAWNS[i % ENEMY_SPAWNS.length];
            // In Easy mode: only thugs until level 3. Otherwise mix from level 2.
            let type = "thug";
            const copsAllowed = this.mode === "easy" ? this.level >= 3 : this.level >= 2;
            if (copsAllowed && i % 2 === 1) type = "cop";
            this.enemies.push({
                col: spawn.col + 0.0,
                row: spawn.row + 0.0,
                dir: ["up", "left", "right"][i % 3],
                speed: diff.enemySpeed,
                type,
                state: "exit",
                home: { col: spawn.col, row: spawn.row },
                releaseAt: i * (this.mode === "easy" ? 1.8 : 1.2),
                exited: false,
            });
        }

        this._powerUpsActive = [];
        this._powerUpTimer = 4 + Math.random() * 3;
        this._readyTimer = 2.0;
        this.frightened = 0;
        this.frightChain = 0;
        this.activePower = null;
        this._floatTexts = [];
        this._screenShake = 0;

        this.onStateChange?.({
            level: this.level, score: this.score, lives: this.lives, theme,
            ready: true, activePower: null, cashCollected: this.cashCollected,
        });
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._lastTs = performance.now();
        audio.unlock();
        audio.startMusic(this.level);
        const tick = (ts) => {
            if (!this.running) return;
            const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
            this._lastTs = ts;
            if (!this.paused) this._update(dt);
            this._render();
            this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
    }

    stop() {
        this.running = false;
        if (this._raf) cancelAnimationFrame(this._raf);
        document.removeEventListener("keydown", this._keyHandler);
        audio.stopMusic();
    }

    pause(p) { this.paused = !!p; }
    togglePause() { this.paused = !this.paused; }

    setDirection(dir) {
        if (!DIRS[dir]) return;
        this.player.queued = dir;
    }

    _bindKeys() {
        this._keyHandler = (e) => {
            const k = e.key.toLowerCase();
            if (k === "arrowup" || k === "w") { this.setDirection("up"); e.preventDefault(); }
            else if (k === "arrowdown" || k === "s") { this.setDirection("down"); e.preventDefault(); }
            else if (k === "arrowleft" || k === "a") { this.setDirection("left"); e.preventDefault(); }
            else if (k === "arrowright" || k === "d") { this.setDirection("right"); e.preventDefault(); }
            else if (k === "p" || k === "escape") { this.togglePause(); }
        };
        document.addEventListener("keydown", this._keyHandler);
    }

    // ---------- Update ----------
    _update(dt) {
        if (this._readyTimer > 0) {
            this._readyTimer -= dt;
            return;
        }

        // Power timers
        if (this.activePower) {
            this.activePower.time -= dt;
            if (this.activePower.time <= 0) this.activePower = null;
        }
        if (this.frightened > 0) {
            this.frightened -= dt;
            if (this.frightened <= 0) this.frightChain = 0;
        }

        // Power-up spawning
        this._powerUpTimer -= dt;
        if (this._powerUpTimer <= 0 && this._powerUpsActive.length < 2) {
            const free = POWERUP_SPOTS.filter(s =>
                !isWall(this.grid, s.col, s.row) &&
                !this._powerUpsActive.some(p => p.col === s.col && p.row === s.row)
            );
            if (free.length) {
                const spot = free[Math.floor(Math.random() * free.length)];
                const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                this._powerUpsActive.push({ ...spot, type, life: 8 });
            }
            this._powerUpTimer = 6 + Math.random() * 4;
        }
        // Decay power-ups on board
        this._powerUpsActive = this._powerUpsActive.filter(p => {
            p.life -= dt;
            return p.life > 0;
        });

        this._movePlayer(dt);
        this._collectPellet();
        this._collectPowerUp();
        this._moveEnemies(dt);
        this._checkCollisions();

        // Update floating texts
        this._floatTexts = this._floatTexts.filter(f => {
            f.life -= dt;
            f.row -= dt * 0.8;
            return f.life > 0;
        });

        // Level complete?
        if (this.eatenPellets >= this.totalPellets) {
            this._nextLevel();
        }
    }

    _movePlayer(dt) {
        const p = this.player;
        const speedMul = this.activePower?.type === "speed" ? 1.45 : 1.0;
        const step = p.speed * speedMul * dt;

        // Try queued direction at integer-aligned axis-perpendicular moments.
        if (p.queued && p.queued !== p.dir) {
            const at = DIRS[p.queued];
            // Check the perpendicular alignment to current direction
            const onTile = (x) => Math.abs(x - Math.round(x)) < EPS;
            if (at.dc !== 0) {
                if (onTile(p.row)) {
                    const tCol = Math.round(p.col);
                    const tRow = Math.round(p.row);
                    const ahead = wrap(tCol + at.dc, tRow);
                    if (!isWall(this.grid, ahead.col, ahead.row)) {
                        p.row = tRow;
                        p.dir = p.queued;
                        p.queued = null;
                    }
                }
            } else {
                if (onTile(p.col)) {
                    const tCol = Math.round(p.col);
                    const tRow = Math.round(p.row);
                    const ahead = wrap(tCol, tRow + at.dr);
                    if (!isWall(this.grid, ahead.col, ahead.row)) {
                        p.col = tCol;
                        p.dir = p.queued;
                        p.queued = null;
                    }
                }
            }
        }

        const d = DIRS[p.dir];
        // Predict next tile when crossing center
        const nextCol = p.col + d.dc * step;
        const nextRow = p.row + d.dr * step;

        // If facing wall and roughly at tile center, stop
        const tCol = Math.round(p.col);
        const tRow = Math.round(p.row);
        const aheadTile = wrap(tCol + d.dc, tRow + d.dr);
        const wallAhead = isWall(this.grid, aheadTile.col, aheadTile.row);

        if (wallAhead) {
            // distance from current to center along dir
            if (d.dc !== 0) {
                if ((d.dc > 0 && nextCol >= tCol) || (d.dc < 0 && nextCol <= tCol)) {
                    p.col = tCol;
                } else {
                    p.col = nextCol;
                }
            } else {
                if ((d.dr > 0 && nextRow >= tRow) || (d.dr < 0 && nextRow <= tRow)) {
                    p.row = tRow;
                } else {
                    p.row = nextRow;
                }
            }
        } else {
            p.col = nextCol;
            p.row = nextRow;
        }

        // Tunnel wrap
        if (p.col < -0.4) p.col = COLS - 0.5;
        else if (p.col > COLS - 0.6) p.col = -0.5;
    }

    _collectPellet() {
        const p = this.player;
        const tc = Math.round(p.col);
        const tr = Math.round(p.row);
        if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return;
        // Must be near center
        if (Math.abs(p.col - tc) > 0.4 || Math.abs(p.row - tr) > 0.4) return;

        const v = this.grid[tr][tc];
        if (v === T.PELLET) {
            this.grid[tr][tc] = T.EMPTY;
            this.eatenPellets++;
            this.cashCollected += 10;
            const mult = this.activePower?.type === "double" ? 2 : 1;
            this._addScore(10 * mult);
            audio.collect();
        } else if (v === T.POWER) {
            this.grid[tr][tc] = T.EMPTY;
            this.eatenPellets++;
            this.cashCollected += 50;
            const mult = this.activePower?.type === "double" ? 2 : 1;
            this._addScore(50 * mult);
            this.frightened = this.diff.frightTime;
            this.frightChain = 0;
            // flip non-eyes enemies to frightened
            for (const e of this.enemies) {
                if (e.state !== "eyes") e.state = "fright";
            }
            audio.bigCash();
        }
    }

    _collectPowerUp() {
        const p = this.player;
        const tc = Math.round(p.col);
        const tr = Math.round(p.row);
        for (let i = 0; i < this._powerUpsActive.length; i++) {
            const pu = this._powerUpsActive[i];
            if (pu.col === tc && pu.row === tr &&
                Math.abs(p.col - tc) < 0.4 && Math.abs(p.row - tr) < 0.4) {
                this._powerUpsActive.splice(i, 1);

                if (pu.type === "bomb") {
                    // Wipe all active enemies (set to eyes/return) and award bonus
                    let wiped = 0;
                    for (const e of this.enemies) {
                        if (e.state !== "eyes") {
                            e.state = "eyes";
                            wiped++;
                        }
                    }
                    const pts = 200 * Math.max(1, wiped);
                    this._addScore(pts);
                    this._popText(`BOOM +${pts}`, tc, tr, "#ff6b3a");
                    this._screenShake = 0.6;
                    audio.eatEnemy();
                    return;
                }
                if (pu.type === "life") {
                    this.lives = Math.min(this.lives + 1, 9);
                    this.onLifeLost?.(this.lives); // re-emit so HUD updates
                    this._addScore(50);
                    this._popText("+1 LIFE", tc, tr, "#ff5577");
                    audio.levelUp();
                    return;
                }

                // Timed buff (speed / shield / double)
                this.activePower = { type: pu.type, time: 6 };
                this._addScore(25);
                this._popText("+25", tc, tr, "#ffd84a");
                audio.powerUp();
                return;
            }
        }
    }

    _moveEnemies(dt) {
        for (const e of this.enemies) {
            // Release timer
            if (!e.exited) {
                e.releaseAt -= dt;
                if (e.releaseAt > 0) {
                    // bobble in pen
                    continue;
                }
                e.exited = true;
                e.state = this.frightened > 0 ? "fright" : "chase";
            }

            const onTile =
                Math.abs(e.col - Math.round(e.col)) < EPS &&
                Math.abs(e.row - Math.round(e.row)) < EPS;

            if (onTile) {
                e.col = Math.round(e.col);
                e.row = Math.round(e.row);

                const tc = e.col, tr = e.row;
                // Determine target
                let target;
                if (e.state === "eyes") {
                    target = e.home;
                    if (tc === e.home.col && tr === e.home.row) {
                        e.state = this.frightened > 0 ? "fright" : "chase";
                    }
                } else if (e.state === "fright") {
                    target = null; // random
                } else {
                    if (e.type === "thug") {
                        target = { col: Math.round(this.player.col), row: Math.round(this.player.row) };
                    } else { // cop
                        const d = DIRS[this.player.dir];
                        target = {
                            col: Math.round(this.player.col) + d.dc * 4,
                            row: Math.round(this.player.row) + d.dr * 4,
                        };
                    }
                }

                // Available directions (no reverse, no walls)
                const opts = [];
                for (const dirName of ["up", "left", "down", "right"]) {
                    if (dirName === OPP[e.dir]) continue;
                    const d = DIRS[dirName];
                    const nx = wrap(tc + d.dc, tr + d.dr);
                    if (!isWall(this.grid, nx.col, nx.row)) opts.push(dirName);
                }
                if (opts.length === 0) {
                    // dead-end: allow reverse
                    e.dir = OPP[e.dir];
                } else if (target == null) {
                    e.dir = opts[Math.floor(Math.random() * opts.length)];
                } else {
                    let best = opts[0];
                    let bestD = Infinity;
                    for (const dirName of opts) {
                        const d = DIRS[dirName];
                        const nx = wrap(tc + d.dc, tr + d.dr);
                        const dd = dist2(nx, target);
                        if (dd < bestD) { bestD = dd; best = dirName; }
                    }
                    e.dir = best;
                }
            }

            const speed = e.state === "fright" ? e.speed * 0.55
                        : e.state === "eyes"   ? e.speed * 1.6
                        :                        e.speed;
            const d = DIRS[e.dir];
            const nc = e.col + d.dc * speed * dt;
            const nr = e.row + d.dr * speed * dt;
            const aheadTile = wrap(Math.round(e.col) + d.dc, Math.round(e.row) + d.dr);
            if (isWall(this.grid, aheadTile.col, aheadTile.row)) {
                e.col = Math.round(e.col);
                e.row = Math.round(e.row);
            } else {
                e.col = nc;
                e.row = nr;
            }
            // Tunnel wrap
            if (e.col < -0.4) e.col = COLS - 0.5;
            else if (e.col > COLS - 0.6) e.col = -0.5;
        }
    }

    _checkCollisions() {
        const p = this.player;
        for (const e of this.enemies) {
            if (e.state === "eyes") continue;
            const dx = p.col - e.col;
            const dy = p.row - e.row;
            if (dx * dx + dy * dy < 0.55 * 0.55) {
                if (e.state === "fright") {
                    // Eat enemy
                    e.state = "eyes";
                    this.frightChain = Math.min(this.frightChain + 1, 4);
                    const pts = 100 * Math.pow(2, this.frightChain);
                    const mult = this.activePower?.type === "double" ? 2 : 1;
                    this._addScore(pts * mult);
                    this._popText(`+${pts * mult}`, e.col, e.row, "#7ee895");
                    audio.eatEnemy();
                } else {
                    if (this.activePower?.type === "shield") {
                        // burn shield instead of dying
                        this.activePower = null;
                        this._popText("SHIELD!", p.col, p.row, "#6cf2ff");
                        // briefly push enemy back
                        e.dir = OPP[e.dir];
                        audio.shieldHit();
                    } else {
                        this._loseLife();
                        return;
                    }
                }
            }
        }
    }

    _loseLife() {
        this.lives -= 1;
        audio.death();
        this.onLifeLost?.(this.lives);
        if (this.lives <= 0) {
            this.running = false;
            audio.stopMusic();
            this.onGameOver?.({ score: this.score, level: this.level });
            return;
        }
        // reset positions
        this.player.col = PLAYER_SPAWN.col;
        this.player.row = PLAYER_SPAWN.row;
        this.player.dir = "left";
        this.player.queued = null;
        for (let i = 0; i < this.enemies.length; i++) {
            const spawn = ENEMY_SPAWNS[i % ENEMY_SPAWNS.length];
            const e = this.enemies[i];
            e.col = spawn.col;
            e.row = spawn.row;
            e.state = "exit";
            e.exited = false;
            e.releaseAt = i * 1.0;
            e.dir = ["up", "left", "right"][i % 3];
        }
        this._readyTimer = 1.5;
        this.frightened = 0;
        this.activePower = null;
    }

    _nextLevel() {
        audio.levelUp();
        this.level += 1;
        this._initLevel();
        audio.startMusic(this.level);
    }

    _addScore(n) {
        this.score += n;
        this.onScoreChange?.(this.score);
    }

    _popText(text, col, row, color) {
        this._floatTexts.push({ text, col, row, color, life: 0.9 });
    }

    // ---------- Render ----------
    _render() {
        const ctx = this.ctx;
        const t = this.theme;

        // Screen shake offset (for bomb impact)
        let sx = 0, sy = 0;
        if (this._screenShake > 0) {
            sx = (Math.random() - 0.5) * 8 * this._screenShake;
            sy = (Math.random() - 0.5) * 8 * this._screenShake;
            this._screenShake -= 0.04;
            if (this._screenShake < 0) this._screenShake = 0;
        }

        // Background floor
        ctx.fillStyle = t.bg;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.save();
        ctx.translate(sx, sy);

        // Cyber grid background on non-wall cells
        ctx.fillStyle = t.floor;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.strokeStyle = t.grid || "rgba(108,242,255,0.06)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * TILE);
            ctx.lineTo(CANVAS_W, r * TILE);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * TILE, 0);
            ctx.lineTo(c * TILE, CANVAS_H);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Alternating floor tiles (subtle)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] === T.WALL) continue;
                if ((r + c) % 2 === 0) continue;
                ctx.fillStyle = t.floorAlt;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
                ctx.globalAlpha = 1;
            }
        }

        // Walls
        this._drawWalls(ctx, t);

        // Pellets (cash bundles) / power (cash stack) — with neon glow
        const tnow = performance.now();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const v = this.grid[r][c];
                const cx = c * TILE + TILE / 2;
                const cy = r * TILE + TILE / 2;
                if (v === T.PELLET) {
                    // Cash bill with subtle glow
                    ctx.save();
                    ctx.shadowColor = "#7ee895";
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = "#3a8a4f";
                    ctx.fillRect(cx - 4, cy - 2, 8, 4);
                    ctx.fillStyle = "#5cc46f";
                    ctx.fillRect(cx - 4, cy - 2, 8, 1);
                    ctx.fillStyle = "#d4af37";
                    ctx.fillRect(cx - 1, cy - 1, 2, 2);
                    ctx.restore();
                } else if (v === T.POWER) {
                    const pulse = 0.6 + Math.sin(tnow / 180) * 0.4;
                    const wob = Math.sin(tnow / 220 + c) * 1.2;
                    ctx.save();
                    ctx.translate(cx, cy + wob);
                    ctx.shadowColor = "#d4af37";
                    ctx.shadowBlur = 18 * pulse;
                    // Cash stack — three stacked bills + gold band
                    ctx.fillStyle = "#3a8a4f";
                    ctx.fillRect(-7, -6, 14, 12);
                    ctx.fillStyle = "#5cc46f";
                    ctx.fillRect(-7, -6, 14, 2);
                    ctx.fillRect(-7, -2, 14, 2);
                    ctx.fillRect(-7,  2, 14, 2);
                    ctx.fillStyle = "#d4af37";
                    ctx.fillRect(-2, -6, 4, 12);  // gold band
                    ctx.fillStyle = "#fff5c8";
                    ctx.fillRect(-1, -2, 2, 1);
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
            }
        }

        // Power-ups on map
        for (const pu of this._powerUpsActive) {
            this._drawPowerUp(ctx, pu);
        }

        // Float texts
        for (const f of this._floatTexts) {
            ctx.fillStyle = f.color;
            ctx.font = "bold 14px 'IBM Plex Mono', monospace";
            ctx.textAlign = "center";
            ctx.globalAlpha = Math.min(1, f.life * 1.2);
            ctx.fillText(f.text, f.col * TILE + TILE / 2, f.row * TILE + TILE / 2);
            ctx.globalAlpha = 1;
        }

        // Enemies
        for (const e of this.enemies) this._drawEnemy(ctx, e);

        // Player
        this._drawPlayer(ctx);

        ctx.restore();

        // CRT scanline overlay — sweeping horizontal line + static lines
        this._drawScanlines(ctx);

        // Ready overlay
        if (this._readyTimer > 0) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.fillStyle = t.power;
            ctx.font = "44px 'VT323', monospace";
            ctx.textAlign = "center";
            ctx.fillText("READY!", CANVAS_W / 2, CANVAS_H / 2 + 8);
            ctx.fillStyle = t.ink;
            ctx.font = "20px 'VT323', monospace";
            ctx.fillText(`LEVEL ${this.level} — ${t.name.toUpperCase()}`, CANVAS_W / 2, CANVAS_H / 2 - 32);
        }

        if (this.paused) {
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.fillStyle = "#f5f1e8";
            ctx.font = "48px 'VT323', monospace";
            ctx.textAlign = "center";
            ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2);
            ctx.font = "18px 'VT323', monospace";
            ctx.fillText("Press P to resume", CANVAS_W / 2, CANVAS_H / 2 + 28);
        }
    }

    _drawWalls(ctx, t) {
        // First pass: solid base
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== T.WALL) continue;
                const x = c * TILE, y = r * TILE;
                ctx.fillStyle = t.wall;
                ctx.fillRect(x, y, TILE, TILE);
            }
        }
        // Second pass: neon edges with shadow glow
        ctx.save();
        ctx.shadowColor = t.wallEdge;
        ctx.shadowBlur = 8;
        ctx.fillStyle = t.wallEdge;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== T.WALL) continue;
                const x = c * TILE, y = r * TILE;
                // Only stroke edges that face an open cell — gives clean neon tubes
                if (r === 0 || this.grid[r - 1][c] !== T.WALL) ctx.fillRect(x, y, TILE, 2);
                if (r === ROWS - 1 || this.grid[r + 1][c] !== T.WALL) ctx.fillRect(x, y + TILE - 2, TILE, 2);
                if (c === 0 || this.grid[r][c - 1] !== T.WALL) ctx.fillRect(x, y, 2, TILE);
                if (c === COLS - 1 || this.grid[r][c + 1] !== T.WALL) ctx.fillRect(x + TILE - 2, y, 2, TILE);
            }
        }
        ctx.restore();
        // Subtle inner darker fill so walls don't look flat
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] !== T.WALL) continue;
                ctx.fillRect(c * TILE + 4, r * TILE + 4, TILE - 8, TILE - 8);
            }
        }
    }

    _drawScanlines(ctx) {
        // Static horizontal scanlines
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = "#000";
        for (let y = 0; y < CANVAS_H; y += 3) {
            ctx.fillRect(0, y, CANVAS_W, 1);
        }
        // Sweeping bright band
        const sweepY = (performance.now() / 22) % (CANVAS_H + 40) - 20;
        const grad = ctx.createLinearGradient(0, sweepY - 20, 0, sweepY + 20);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.05)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.globalAlpha = 1;
        ctx.fillRect(0, sweepY - 20, CANVAS_W, 40);
        // Vignette
        const radial = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_H * 0.7);
        radial.addColorStop(0, "rgba(0,0,0,0)");
        radial.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
    }

    _drawPowerUp(ctx, pu) {
        const cx = pu.col * TILE + TILE / 2;
        const cy = pu.row * TILE + TILE / 2;
        const wob = Math.sin(performance.now() / 200 + pu.col) * 1.5;
        const pulse = 0.6 + Math.sin(performance.now() / 200 + pu.col) * 0.4;
        ctx.save();
        ctx.translate(cx, cy + wob);
        if (pu.type === "speed") {
            ctx.fillStyle = "#ffd84a";
            ctx.shadowColor = "#ffd84a";
            ctx.shadowBlur = 14 * pulse;
            ctx.beginPath();
            ctx.moveTo(-3, -7); ctx.lineTo(3, -2); ctx.lineTo(-1, -1);
            ctx.lineTo(3, 7);   ctx.lineTo(-3, 2); ctx.lineTo(1, 1);
            ctx.closePath();
            ctx.fill();
        } else if (pu.type === "shield") {
            ctx.fillStyle = "#6cf2ff";
            ctx.shadowColor = "#6cf2ff";
            ctx.shadowBlur = 14 * pulse;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(7, -4); ctx.lineTo(7, 3);
            ctx.lineTo(0, 8);
            ctx.lineTo(-7, 3); ctx.lineTo(-7, -4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.beginPath();
            ctx.arc(-2, -2, 2.2, 0, Math.PI * 2); ctx.fill();
        } else if (pu.type === "double") {
            ctx.fillStyle = "#d36cff";
            ctx.shadowColor = "#d36cff";
            ctx.shadowBlur = 14 * pulse;
            ctx.font = "bold 13px 'IBM Plex Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("x2", 0, 0);
        } else if (pu.type === "bomb") {
            // Glowing bomb — circle with fuse
            ctx.shadowColor = "#ff6b3a";
            ctx.shadowBlur = 18 * pulse;
            ctx.fillStyle = "#222";
            ctx.beginPath();
            ctx.arc(0, 1, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ff6b3a";
            ctx.beginPath();
            ctx.arc(0, 1, 6, 0, Math.PI * 2);
            ctx.stroke();
            // Fuse
            ctx.strokeStyle = "#ffd84a";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.quadraticCurveTo(3, -8, 5, -10);
            ctx.stroke();
            // Spark
            ctx.fillStyle = "#fff5c8";
            ctx.beginPath();
            ctx.arc(5, -10, 1.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (pu.type === "life") {
            // Pulsing pink heart
            ctx.shadowColor = "#ff5577";
            ctx.shadowBlur = 18 * pulse;
            ctx.fillStyle = "#ff5577";
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.bezierCurveTo(-9, -1, -6, -9, 0, -4);
            ctx.bezierCurveTo(6, -9, 9, -1, 0, 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.arc(-2.5, -3, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawEnemy(ctx, e) {
        const cx = e.col * TILE + TILE / 2;
        const cy = e.row * TILE + TILE / 2;
        const dir = DIRS[e.dir];

        // Eyes-only (defeated, returning home)
        if (e.state === "eyes") {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(cx - 4, cy - 1, 3, 0, Math.PI * 2);
            ctx.arc(cx + 4, cy - 1, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(cx - 4 + dir.dc * 1.5, cy - 1 + dir.dr * 1.5, 1.4, 0, Math.PI * 2);
            ctx.arc(cx + 4 + dir.dc * 1.5, cy - 1 + dir.dr * 1.5, 1.4, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // Body palette
        let shirt, pant = "#0a0a14", skin = "#d4a373";
        if (e.state === "fright") {
            const blink = this.frightened < 2 && Math.floor(performance.now() / 200) % 2 === 0;
            shirt = blink ? "#f5f1e8" : "#23308a";
            pant  = blink ? "#cccccc" : "#171f5a";
            skin  = blink ? "#f5f1e8" : "#23308a";
        } else if (e.type === "cop") {
            shirt = "#1e3b75";
            pant  = "#0a1438";
        } else {
            shirt = "#5a1010";
            pant  = "#1a0808";
        }

        const phase = (e.col + e.row) * 1.7 + performance.now() / 110;
        const swA = Math.sin(phase) * 3;
        const swB = Math.sin(phase + Math.PI) * 3;

        ctx.save();
        ctx.translate(cx, cy);
        if (dir.dc < 0) ctx.scale(-1, 1);

        // Legs
        ctx.fillStyle = pant;
        ctx.fillRect(-3, 3, 2.4, 6 + swA / 2);
        ctx.fillRect(0.6, 3, 2.4, 6 + swB / 2);
        // Shoes
        ctx.fillStyle = "#000";
        ctx.fillRect(-3.4, 8 + swA / 2, 3.2, 1.5);
        ctx.fillRect(0.2, 8 + swB / 2, 3.2, 1.5);

        // Torso
        ctx.fillStyle = shirt;
        ctx.fillRect(-4, -4, 8, 8);

        // Arms
        ctx.fillStyle = shirt;
        ctx.fillRect(-5.5, -3, 2, 5 + swB / 2);
        ctx.fillRect(3.5, -3, 2, 5 + swA / 2);
        ctx.fillStyle = skin;
        ctx.fillRect(-5.5, 2 + swB / 2, 2, 1.5);
        ctx.fillRect(3.5, 2 + swA / 2, 2, 1.5);

        // Head
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, -7, 3.6, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = "#000";
        ctx.fillRect(0.8, -8, 1.4, 1.4);

        // Headwear / accessories
        if (e.state === "fright") {
            ctx.fillStyle = "#000";
            ctx.fillRect(-1.4, -5.4, 2.6, 0.9);
        } else if (e.type === "cop") {
            ctx.fillStyle = "#0a1438";
            ctx.fillRect(-4, -10.2, 8, 2.6);
            ctx.fillRect(-5.6, -8, 3, 1.2);
            ctx.fillStyle = "#ffd84a";
            ctx.fillRect(-0.8, -9.6, 1.6, 1.4);
            ctx.fillStyle = "#ffd84a";
            ctx.fillRect(-0.8, -1, 1.6, 1.6);
        } else {
            // Thug — hood
            ctx.fillStyle = "#161616";
            ctx.beginPath();
            ctx.arc(0, -7, 4.6, Math.PI * 1.05, Math.PI * 1.95);
            ctx.fill();
            ctx.fillRect(-4.6, -8, 9.2, 2.2);
            // bandana
            ctx.fillStyle = "#3a3a3a";
            ctx.fillRect(-3.6, -5.6, 7.2, 1.4);
        }

        ctx.restore();
    }

    _drawPlayer(ctx) {
        const p = this.player;
        const cx = p.col * TILE + TILE / 2;
        const cy = p.row * TILE + TILE / 2;
        const dir = DIRS[p.dir];

        // Active-power auras (drawn beneath body)
        if (this.activePower?.type === "shield") {
            ctx.strokeStyle = "rgba(108, 242, 255, 0.85)";
            ctx.lineWidth = 2;
            const r = 12 + Math.sin(performance.now() / 100) * 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.activePower?.type === "speed") {
            ctx.strokeStyle = "rgba(255, 216, 74, 0.85)";
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - dir.dc * (8 + i * 4), cy - dir.dr * (8 + i * 4) - 3);
                ctx.lineTo(cx - dir.dc * (12 + i * 4), cy - dir.dr * (12 + i * 4) - 3);
                ctx.stroke();
            }
        }
        if (this.activePower?.type === "double") {
            ctx.fillStyle = "#d36cff";
            ctx.font = "bold 10px 'IBM Plex Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("x2", cx + 9, cy - 9);
        }

        const isGirl = this.character === "girl";
        const skin = "#ffd1a8";
        const shirt = isGirl ? "#d36cff" : "#3a72d8";
        const shirtDark = isGirl ? "#9c47c0" : "#1f4ea0";
        const pant = isGirl ? "#1a1a2a" : "#2a1a0a";
        const shoe = "#0a0a0c";
        const hair = isGirl ? "#3a1f10" : "#1a0e06";
        const cap  = isGirl ? "#ff6cb4" : "#1a1a2a";

        // Running animation phase — based on movement progress
        const phase = (p.col + p.row) * 1.9 + performance.now() / 90;
        const swA = Math.sin(phase) * 3.5;
        const swB = Math.sin(phase + Math.PI) * 3.5;

        ctx.save();
        ctx.translate(cx, cy);
        if (dir.dc < 0) ctx.scale(-1, 1);

        // Legs
        ctx.fillStyle = pant;
        ctx.fillRect(-3, 3, 2.6, 6 + swA / 2);
        ctx.fillRect(0.4, 3, 2.6, 6 + swB / 2);
        // Shoes (sneakers)
        ctx.fillStyle = shoe;
        ctx.fillRect(-3.6, 8 + swA / 2, 3.6, 1.8);
        ctx.fillRect(0, 8 + swB / 2, 3.6, 1.8);
        ctx.fillStyle = "#fff";
        ctx.fillRect(-3.6, 9.4 + swA / 2, 3.6, 0.6);
        ctx.fillRect(0, 9.4 + swB / 2, 3.6, 0.6);

        // Torso (shirt with seam)
        ctx.fillStyle = shirt;
        ctx.fillRect(-4.5, -4, 9, 8);
        ctx.fillStyle = shirtDark;
        ctx.fillRect(-4.5, 2, 9, 2);

        // Arms (swing opposite to legs); back arm partly hidden
        ctx.fillStyle = shirt;
        ctx.fillRect(-6, -3, 2, 5 + swB / 2);     // back arm
        ctx.fillRect(4, -3, 2, 5 + swA / 2);      // front arm

        // Cash bundle in the front (forward) hand
        const handY = 2 + swA / 2;
        ctx.fillStyle = "#3a8a4f";
        ctx.fillRect(4, handY - 1, 6, 4);
        ctx.fillStyle = "#5cc46f";
        ctx.fillRect(4, handY - 1, 6, 1);
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(6.4, handY - 1, 1.4, 4);
        ctx.fillStyle = "#fff5c8";
        ctx.fillRect(5.5, handY + 0.4, 1, 1);

        // Back hand (skin)
        ctx.fillStyle = skin;
        ctx.fillRect(-6, 2 + swB / 2, 2, 1.6);

        // Head
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, -7, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eye (forward facing dot)
        ctx.fillStyle = "#0a0a0c";
        ctx.fillRect(1.4, -8, 1.5, 1.5);
        // Subtle smile
        ctx.fillStyle = "#7a3a2e";
        ctx.fillRect(0.6, -5.6, 2, 0.8);

        // Hair / Cap
        if (isGirl) {
            // Long hair behind
            ctx.fillStyle = hair;
            ctx.beginPath();
            ctx.arc(0, -7.2, 4.4, Math.PI * 1.05, Math.PI * 1.95);
            ctx.fill();
            // Ponytail
            ctx.fillRect(-5, -7, 2, 6);
            // Bow
            ctx.fillStyle = cap;
            ctx.fillRect(-2.4, -11, 4.8, 2.2);
            ctx.fillStyle = "#ffb0d4";
            ctx.fillRect(-0.6, -11, 1.2, 2.2);
        } else {
            // Short hair tuft
            ctx.fillStyle = hair;
            ctx.fillRect(-4, -10.6, 8, 2.4);
            // Backwards baseball cap
            ctx.fillStyle = cap;
            ctx.fillRect(-4.2, -10.6, 8.4, 3);
            ctx.fillRect(-5.6, -8.4, 2, 1.4);     // brim back (visible since flipped)
            ctx.fillStyle = "#ffd84a";
            ctx.fillRect(-0.8, -9.6, 1.6, 1.4);    // logo
        }

        ctx.restore();
    }
}
