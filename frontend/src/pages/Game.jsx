import React, { useCallback, useEffect, useRef, useState } from "react";
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

    const createEngine = useCallback((canvas) => new CashRunEngine(canvas, {
        character,
        mode,
        onStateChange: (s) => setHud((prev) => ({ ...prev, ...s })),
        onScoreChange: (score) => setHud((prev) => ({ ...prev, score })),
        onLifeLost: (lives) => setHud((prev) => ({ ...prev, lives })),
        onGameOver: (info) => setGameOver(info),
    }), [character, mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = createEngine(canvas);
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
    }, [createEngine]);

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
        const engine = createEngine(canvas);
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
                padding: "0.5rem",
                touchAction: "none",
                overscrollBehavior: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
            data-testid="game-page"
        >
            <div className="w-full max-w-3xl flex items-center justify-between mb-2 gap-2 flex-shrink-0">
                <button
                    onClick={() => navigate("/")}
                    className="cr-btn"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                    data-testid="game-back-btn"
                >
                    <ArrowLeft className="inline mr-1" size={12} /> Menu
                </button>
                <div className="font-arcade text-sm sm:text-base cr-glow-gold flex items-center gap-2 truncate" data-testid="game-theme-label">
                    {mode === "easy" && (
                        <span
                            data-testid="game-mode-tag"
                            className="cr-tag"
                            style={{ color: "var(--cr-cash-bright)", borderColor: "var(--cr-cash-bright)", fontSize: "0.7rem" }}
                        >
                            PRACTICE
                        </span>
                    )}
                    <span className="truncate">{hud.theme?.name || ""}</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <button
                        onClick={togglePause}
                        className="cr-btn"
                        style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
                        data-testid="game-pause-btn"
                    >
                        <PauseIcon size={12} />
                    </button>
                    <button
                        onClick={toggleMute}
                        className="cr-btn"
                        style={{ fontSize: "0.85rem", padding: "0.35rem 0.6rem" }}
                        data-testid="game-mute-btn"
                        aria-label={muted ? "Unmute" : "Mute"}
                    >
                        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-3xl flex-shrink-0">
                <HUD
                    score={hud.score}
                    level={hud.level}
                    lives={hud.lives}
                    theme={hud.theme}
                    activePower={hud.activePower}
                    cashCollected={hud.cashCollected}
                />
            </div>

            <div
                className="cr-canvas-wrap"
                style={{
                    borderColor: hud.theme?.accent,
                    flex: "1 1 auto",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    maxWidth: "100%",
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="pixelated block"
                    style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        display: "block",
                    }}
                    data-testid="game-canvas"
                />
            </div>

            <div className="flex-shrink-0 w-full">
                <TouchControls onDirection={handleDirection} onPause={togglePause} />
            </div>

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
