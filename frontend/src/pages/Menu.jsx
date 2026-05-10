import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CharacterSelect, { CharacterAvatar } from "../components/CharacterSelect";
import { Trophy, BookOpenText, Play } from "lucide-react";

export default function Menu() {
    const nav = useNavigate();
    const [character, setCharacter] = useState(() => {
        return localStorage.getItem("cr-character") || "boy";
    });
    const [mode, setMode] = useState(() => {
        return localStorage.getItem("cr-mode") || "normal";
    });

    useEffect(() => {
        localStorage.setItem("cr-character", character);
    }, [character]);
    useEffect(() => {
        localStorage.setItem("cr-mode", mode);
    }, [mode]);

    const startGame = () => {
        nav("/play", { state: { character, mode } });
    };

    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="menu-page">
            <div className="w-full max-w-3xl flex flex-col items-center pt-8 sm:pt-16">

                {/* Headline */}
                <div className="text-center cr-flicker">
                    <div className="cr-marquee mb-3" data-testid="menu-marquee">A STREETS GAME</div>
                    <h1
                        className="font-arcade text-7xl sm:text-8xl"
                        style={{ color: "var(--cr-cash-bright)", textShadow: "0 0 24px rgba(126,232,149,0.45), 0 0 4px rgba(126,232,149,0.9)" }}
                        data-testid="menu-title"
                    >
                        CASH RUN
                    </h1>
                    <p className="font-arcade text-2xl mt-1" style={{ color: "var(--cr-gold)" }} data-testid="menu-tagline">
                        chomp the cash. duck the heat.
                    </p>
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
                </div>

                {/* Hints */}
                <div className="cr-card max-w-xl text-center cr-float">
                    <div className="font-arcade text-xl mb-3" style={{ color: "var(--cr-gold)" }}>
                        the streets level up with you
                    </div>
                    <p className="font-mono text-sm" style={{ color: "var(--cr-ink-dim)" }}>
                        Start in the slums. Stack cash. Each level pulls you uptown — from skid row to luxury district.
                        Watch out for thugs (red) and cops (blue) — and grab the BIG cash to turn the tables on them.
                    </p>
                </div>

                <div className="mt-10 font-arcade text-sm cr-blink" style={{ color: "var(--cr-ink-dim)" }}>
                    insert quarter to begin
                </div>
            </div>
        </div>
    );
}
