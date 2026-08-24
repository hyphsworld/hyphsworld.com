import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CharacterSelect, { CharacterAvatar } from "../components/CharacterSelect";
import { audio } from "../game/audio";
import { Trophy, BookOpenText, Play, Volume2, VolumeX } from "lucide-react";

export default function Menu() {
    const nav = useNavigate();
    const [character, setCharacter] = useState(() => {
        return localStorage.getItem("cr-character") || "boy";
    });
    const [mode, setMode] = useState(() => {
        return localStorage.getItem("cr-mode") || "normal";
    });
    const [muted, setMuted] = useState(audio.isMuted());

    useEffect(() => {
        localStorage.setItem("cr-character", character);
    }, [character]);
    useEffect(() => {
        localStorage.setItem("cr-mode", mode);
    }, [mode]);

    const startGame = () => {
        audio.unlock();
        nav("/play", { state: { character, mode } });
    };

    const toggleMute = () => {
        audio.unlock();
        setMuted(audio.toggleMuted());
    };

    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="menu-page">
            <div className="w-full max-w-3xl flex flex-col items-center pt-8 sm:pt-16">

                {/* Headline + hero */}
                <div className="text-center cr-flicker">
                    <div className="cr-marquee mb-3" data-testid="menu-marquee">// CYBER ARCADE //</div>
                    <h1
                        className="font-arcade text-7xl sm:text-8xl"
                        style={{
                            color: "var(--cr-cash-bright)",
                            textShadow: "0 0 24px rgba(126,232,149,0.55), 0 0 4px rgba(126,232,149,0.9), 0 0 60px rgba(108,242,255,0.25)",
                        }}
                        data-testid="menu-title"
                    >
                        CASH_RUN
                    </h1>
                    <p className="font-arcade text-2xl mt-1" style={{ color: "var(--cr-gold)", textShadow: "0 0 12px rgba(255,216,74,0.5)" }} data-testid="menu-tagline">
                        chomp the cash. duck the heat.
                    </p>
                </div>

                {/* Hero — Tonio & Nikki chasing the bag */}
                <div
                    className="w-full mt-6 mb-2 flex items-center justify-center gap-4 sm:gap-8 flex-wrap"
                    data-testid="menu-hero"
                    aria-hidden="true"
                >
                    <img
                        src="https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/e9737oor_E1AEC6D1-0E86-4193-AECB-D97C322AAE1B.webp"
                        alt=""
                        className="cr-hero"
                        loading="eager"
                    />
                    <img
                        src="https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/pjqpo9f5_4DA031AD-8330-409E-B1E7-75051DE1B615.webp"
                        alt=""
                        className="cr-hero cr-hero-alt"
                        loading="eager"
                    />
                </div>

                {/* Character avatars decorative */}
                <div className="my-10">
                    <div className="font-arcade text-lg text-center mb-4" style={{ color: "var(--cr-ink-dim)" }}>
                        — pick your hustler —
                    </div>
                    <CharacterSelect value={character} onChange={setCharacter} />
                </div>

                {/* Difficulty toggle */}
                <div className="mb-6 flex flex-col items-center gap-3" data-testid="mode-select">
                    <div className="font-arcade text-lg" style={{ color: "var(--cr-ink-dim)" }}>
                        — difficulty —
                    </div>
                    <div className="inline-flex p-1 rounded-full" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(245,241,232,0.12)" }}>
                        {[
                            { id: "easy",   label: "Practice", color: "var(--cr-cash-bright)", desc: "5 lives · slower heat · cops appear later" },
                            { id: "normal", label: "Normal",   color: "var(--cr-gold)",         desc: "real streets — score counts" },
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMode(m.id)}
                                data-testid={`mode-${m.id}`}
                                className="font-arcade text-xl px-5 py-1.5 rounded-full transition-all"
                                style={{
                                    background: mode === m.id ? m.color : "transparent",
                                    color: mode === m.id ? "#0a0a0c" : m.color,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <div className="font-mono text-xs" style={{ color: "var(--cr-ink-dim)" }} data-testid="mode-desc">
                        {mode === "easy"
                            ? "Practice run — 5 lives, slower heat, cops appear later. Score won't be saved."
                            : "Normal mode — score counts toward the global leaderboard."}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                    <button onClick={startGame} className="cr-btn cr-btn-primary" data-testid="menu-play-btn">
                        <Play className="inline mr-2" size={18} />
                        PLAY
                    </button>
                    <button onClick={() => nav("/leaderboard")} className="cr-btn cr-btn-gold" data-testid="menu-leaderboard-btn">
                        <Trophy className="inline mr-2" size={18} />
                        LEADERBOARD
                    </button>
                    <button onClick={() => nav("/how-to-play")} className="cr-btn" data-testid="menu-how-to-play-btn">
                        <BookOpenText className="inline mr-2" size={18} />
                        HOW TO PLAY
                    </button>
                    <button
                        onClick={toggleMute}
                        className="cr-btn"
                        style={{ padding: "0.85rem 1.1rem" }}
                        data-testid="menu-mute-btn"
                        aria-label={muted ? "Unmute" : "Mute"}
                        title={muted ? "Unmute" : "Mute"}
                    >
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>

                {/* Hints */}
                <div className="cr-card max-w-xl text-center cr-float">
                    <div className="font-arcade text-xl mb-3" style={{ color: "var(--cr-gold)" }}>
                        chase the bag with tonio & nikki
                    </div>
                    <p className="font-mono text-sm" style={{ color: "var(--cr-ink-dim)" }}>
                        Boot up in the Neo-Slum. Stack credits. Each level pushes you uptown — from rusted alleys
                        to the Aurum Spire. Red thugs chase you straight, blue cops cut you off.
                        Grab the BIG cash to flip the hunt.
                    </p>
                </div>

                <div className="mt-10 font-arcade text-sm cr-blink" style={{ color: "var(--cr-ink-dim)" }}>
                    [ insert credit to continue ]
                </div>
            </div>
        </div>
    );
}
