import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CashRunEngine, CANVAS_W, CANVAS_H } from "../game/engine";
import { audio } from "../game/audio";
import HUD from "../components/HUD";
import TouchControls from "../components/TouchControls";
import GameOverModal from "../components/GameOverModal";
import { Pause as PauseIcon, ArrowLeft, Volume2, VolumeX } from "lucide-react";

export default function GamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const character = location.state?.character || localStorage.getItem("cr-character") || "boy";
    const mode      = location.state?.mode      || localStorage.getItem("cr-mode")      || "normal";

    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const [hud, setHud] = useState({
        score: 0, level: 1, lives: mode === "easy" ? 5 : 3, theme: null, activePower: null, cashCollected: 0,
    });
    const [gameOver, setGameOver] = useState(null); // {score, level}
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(audio.isMuted());
    const [, force] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new CashRunEngine(canvas, {
            character,
            mode,
            onStateChange: (s) => setHud((prev) => ({ ...prev, ...s })),
            onScoreChange: (score) => setHud((prev) => ({ ...prev, score })),
            onLifeLost: (lives) => setHud((prev) => ({ ...prev, lives })),
            onGameOver: (info) => setGameOver(info),
        });
        engineRef.current = engine;
        engine.start();

        // Keep HUD power timer & live values updating
        const interval = setInterval(() => {
            setHud((prev) => ({
                ...prev,
                score: engine.score,
                lives: engine.lives,
                level: engine.level,
                theme: engine.theme,
                cashCollected: engine.cashCollected,
                activePower: engine.activePower
                    ? { type: engine.activePower.type, time: engine.activePower.time }
                    : null,
            }));
            force((x) => x + 1);
        }, 120);

        return () => {
            clearInterval(interval);
            engine.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character]);

    const handleDirection = (dir) => engineRef.current?.setDirection(dir);
    const togglePause = () => {
        const eng = engineRef.current;
        if (!eng) return;
        eng.togglePause();
        setPaused(eng.paused);
    };
    const toggleMute = () => {
        const next = audio.toggleMuted();
        setMuted(next);
        if (!next && engineRef.current?.running) {
            audio.startMusic(engineRef.current.level);
        }
    };

    const handleRestart = () => {
        setGameOver(null);
        const canvas = canvasRef.current;
        engineRef.current?.stop();
        const engine = new CashRunEngine(canvas, {
            character,
            mode,
            onStateChange: (s) => setHud((prev) => ({ ...prev, ...s })),
            onScoreChange: (score) => setHud((prev) => ({ ...prev, score })),
            onLifeLost: (lives) => setHud((prev) => ({ ...prev, lives })),
            onGameOver: (info) => setGameOver(info),
        });
        engineRef.current = engine;
        engine.start();
    };

    // Lock body/page scroll while on the game screen
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevOverscroll = document.body.style.overscrollBehavior;
        const prevTouchAction = document.body.style.touchAction;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.body.style.touchAction = "none";

        const preventTouchScroll = (e) => {
            // Allow multi-touch (pinch) to work in dev tools, but block single-touch drag
            if (e.touches && e.touches.length === 1) e.preventDefault();
        };
        document.addEventListener("touchmove", preventTouchScroll, { passive: false });

        return () => {
            document.body.style.overflow = prevOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overscrollBehavior = prevOverscroll;
            document.body.style.touchAction = prevTouchAction;
            document.removeEventListener("touchmove", preventTouchScroll);
        };
    }, []);

    return (
        <div
            className="cr-page cr-bg-noir cr-grain"
            style={{
                background: hud.theme ? `radial-gradient(ellipse at top, ${hud.theme.accent}22, transparent 60%), ${hud.theme.bg}` : undefined,
                position: "fixed",
                inset: 0,
                overflow: "hidden",
                padding: "1rem",
                touchAction: "none",
                overscrollBehavior: "none",
            }}
            data-testid="game-page"
        >
            <div className="w-full max-w-3xl flex items-center justify-between mb-3">
                <button
                    onClick={() => navigate("/")}
                    className="cr-btn"
                    style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }}
                    data-testid="game-back-btn"
                >
                    <ArrowLeft className="inline mr-1" size={14} /> Menu
                </button>
                <div className="font-arcade text-lg cr-glow-gold flex items-center gap-2" data-testid="game-theme-label">
                    {mode === "easy" && (
                        <span
                            data-testid="game-mode-tag"
                            className="cr-tag"
                            style={{ color: "var(--cr-cash-bright)", borderColor: "var(--cr-cash-bright)" }}
                        >
                            PRACTICE
                        </span>
                    )}
                    {hud.theme?.name || ""} — <span style={{ color: "var(--cr-ink-dim)" }}>{hud.theme?.sub}</span>
                </div>
                <button
                    onClick={togglePause}
                    className="cr-btn"
                    style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }}
                    data-testid="game-pause-btn"
                >
                    <PauseIcon className="inline mr-1" size={14} /> {paused ? "Resume" : "Pause"}
                </button>
                <button
                    onClick={toggleMute}
                    className="cr-btn"
                    style={{ fontSize: "0.95rem", padding: "0.45rem 0.7rem" }}
                    data-testid="game-mute-btn"
                    aria-label={muted ? "Unmute" : "Mute"}
                    title={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
            </div>

            <div className="w-full max-w-3xl">
                <HUD
                    score={hud.score}
                    level={hud.level}
                    lives={hud.lives}
                    theme={hud.theme}
                    activePower={hud.activePower}
                    cashCollected={hud.cashCollected}
                />
            </div>

            <div className="cr-canvas-wrap" style={{ borderColor: hud.theme?.accent }}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="pixelated block"
                    style={{
                        maxWidth: "100%",
                        height: "auto",
                        width: "min(100%, 720px)",
                        display: "block",
                    }}
                    data-testid="game-canvas"
                />
            </div>

            <TouchControls onDirection={handleDirection} onPause={togglePause} />

            <p className="mt-4 font-mono text-xs text-center" style={{ color: "var(--cr-ink-dim)" }}>
                Arrow keys / WASD to move · P to pause · Eat the BIG cash to chomp enemies
            </p>

            {gameOver && (
                <GameOverModal
                    score={gameOver.score}
                    level={gameOver.level}
                    character={character}
                    mode={mode}
                    onRestart={handleRestart}
                    onMenu={() => navigate("/")}
                />
            )}
        </div>
    );
}
