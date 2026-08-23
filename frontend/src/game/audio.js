// Cash Run audio — Web Audio API procedural SFX + per-level music.
// No external assets. AudioContext is created lazily after first user gesture.

class CashRunAudio {
    constructor() {
        this.muted = localStorage.getItem("cr-muted") === "1";
        this._ctx = null;
        this._musicMaster = null;
        this._musicTimer = null;
        this._musicLevel = -1;
        this._chompFlip = false;
    }

    setMuted(m) {
        this.muted = !!m;
        try { localStorage.setItem("cr-muted", this.muted ? "1" : "0"); } catch (err) {
            console.debug("[cash-run] audio pref persist failed", err);
        }
        if (this.muted) this.stopMusic();
    }
    isMuted() { return this.muted; }
    toggleMuted() { this.setMuted(!this.muted); return this.muted; }

    _ensureCtx() {
        if (!this._ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this._ctx = new AC();
        }
        return this._ctx;
    }

    // Call once on a user gesture (e.g. PLAY button click) to unlock audio
    unlock() {
        const ctx = this._ensureCtx();
        if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    }

    _tone({ freq, type = "square", dur = 0.08, vol = 0.12, freqEnd = null }) {
        if (this.muted) return;
        const ctx = this._ensureCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        const t0 = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd != null) {
            osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    _seq(notes, baseVol = 0.12) {
        if (this.muted) return;
        const ctx = this._ensureCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        let t = ctx.currentTime;
        for (const n of notes) {
            const osc = ctx.createOscillator();
            osc.type = n.type || "square";
            osc.frequency.setValueAtTime(n.freq, t);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(n.vol ?? baseVol, t + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + n.dur + 0.02);
            t += n.dur * 0.9;
        }
    }

    // -------- SFX --------
    collect() {
        // Two-tone Pac-Man-like chomp — alternating
        this._chompFlip = !this._chompFlip;
        this._tone({ freq: this._chompFlip ? 880 : 660, type: "square", dur: 0.05, vol: 0.06 });
    }

    bigCash() {
        this._seq([
            { freq: 440, dur: 0.07 },
            { freq: 660, dur: 0.07 },
            { freq: 880, dur: 0.10, type: "triangle" },
        ], 0.12);
    }

    eatEnemy() {
        this._seq([
            { freq: 220, dur: 0.05, type: "sawtooth" },
            { freq: 330, dur: 0.05, type: "sawtooth" },
            { freq: 494, dur: 0.05, type: "sawtooth" },
            { freq: 660, dur: 0.08, type: "sawtooth" },
            { freq: 880, dur: 0.10, type: "triangle" },
        ], 0.14);
    }

    powerUp() {
        this._tone({ freq: 440, freqEnd: 1320, type: "triangle", dur: 0.18, vol: 0.14 });
    }

    shieldHit() {
        this._tone({ freq: 1400, freqEnd: 220, type: "square", dur: 0.18, vol: 0.16 });
    }

    death() {
        this._seq([
            { freq: 660, dur: 0.10, type: "sawtooth" },
            { freq: 523, dur: 0.10, type: "sawtooth" },
            { freq: 392, dur: 0.12, type: "sawtooth" },
            { freq: 294, dur: 0.16, type: "sawtooth" },
            { freq: 196, dur: 0.20, type: "sawtooth" },
            { freq: 110, dur: 0.30, type: "sawtooth" },
        ], 0.16);
    }

    levelUp() {
        this._seq([
            { freq: 523, dur: 0.09 },
            { freq: 659, dur: 0.09 },
            { freq: 784, dur: 0.09 },
            { freq: 1047, dur: 0.20, type: "triangle" },
        ], 0.16);
    }

    ready() {
        this._tone({ freq: 880, type: "triangle", dur: 0.12, vol: 0.10 });
    }

    // -------- Music --------
    startMusic(level) {
        if (this.muted) return;
        if (this._musicLevel === level && this._musicTimer) return; // already playing
        this.stopMusic();
        const ctx = this._ensureCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();

        this._musicLevel = level;

        const themes = [
            // L1 Skid Row — minor pentatonic, slow, mournful
            { root: 110, scale: [0, 3, 5, 7, 10],  tempo: 96,  type: "triangle", bass: "sine"     },
            // L2 Bad Hood — minor, slightly more drive
            { root: 130, scale: [0, 3, 5, 7, 10],  tempo: 110, type: "sawtooth", bass: "triangle" },
            // L3 Suburb — major pentatonic, hopeful
            { root: 147, scale: [0, 2, 4, 7, 9],   tempo: 120, type: "triangle", bass: "sine"     },
            // L4 Downtown — bright square
            { root: 165, scale: [0, 2, 4, 7, 9],   tempo: 132, type: "square",   bass: "triangle" },
            // L5 Luxury — sparkling sine
            { root: 196, scale: [0, 2, 4, 7, 9],   tempo: 124, type: "sine",     bass: "triangle" },
        ];
        const m = themes[((level - 1) % themes.length + themes.length) % themes.length];
        const beatLen = 60 / m.tempo / 2; // 8th notes

        const master = ctx.createGain();
        master.gain.value = 0.07;
        master.connect(ctx.destination);
        this._musicMaster = master;

        let beat = 0;
        const arp = [0, 2, 4, 2, 1, 3, 4, 3]; // index into scale
        const bassPat = [0, 0, 4, 0, 3, 3, 4, 4]; // chord roots

        const tick = () => {
            if (this.muted || !this._musicMaster) return;
            const t = ctx.currentTime + 0.04;

            // Lead arpeggio note
            const ni = arp[beat % arp.length];
            const semi = m.scale[ni % m.scale.length];
            const oct = Math.floor(ni / m.scale.length);
            const freq = m.root * Math.pow(2, semi / 12 + oct);

            const osc = ctx.createOscillator();
            osc.type = m.type;
            osc.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.35, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, t + beatLen * 0.9);
            osc.connect(g);
            g.connect(master);
            osc.start(t);
            osc.stop(t + beatLen);

            // Bass on each beat
            if (beat % 2 === 0) {
                const bsemi = m.scale[bassPat[(beat / 2) % bassPat.length] % m.scale.length];
                const bfreq = (m.root / 2) * Math.pow(2, bsemi / 12);
                const bosc = ctx.createOscillator();
                bosc.type = m.bass;
                bosc.frequency.value = bfreq;
                const bg = ctx.createGain();
                bg.gain.setValueAtTime(0, t);
                bg.gain.linearRampToValueAtTime(0.55, t + 0.01);
                bg.gain.exponentialRampToValueAtTime(0.001, t + beatLen * 1.8);
                bosc.connect(bg);
                bg.connect(master);
                bosc.start(t);
                bosc.stop(t + beatLen * 2);
            }

            beat++;
        };

        // Prime once and start a stable interval
        tick();
        this._musicTimer = setInterval(tick, beatLen * 1000);
    }

    stopMusic() {
        if (this._musicTimer) {
            clearInterval(this._musicTimer);
            this._musicTimer = null;
        }
        if (this._musicMaster && this._ctx) {
            try {
                const t = this._ctx.currentTime;
                this._musicMaster.gain.cancelScheduledValues(t);
                this._musicMaster.gain.setValueAtTime(this._musicMaster.gain.value, t);
                this._musicMaster.gain.linearRampToValueAtTime(0, t + 0.2);
                const m = this._musicMaster;
                setTimeout(() => {
                    try { m.disconnect(); } catch (err) {
                        console.debug("[cash-run] music disconnect failed", err);
                    }
                }, 300);
            } catch (err) {
                console.debug("[cash-run] music stop failed", err);
            }
            this._musicMaster = null;
        }
        this._musicLevel = -1;
    }
}

export const audio = new CashRunAudio();
