import React, { useEffect, useState } from "react";
import { submitScore, fetchRank } from "../lib/api";
import { Loader2 } from "lucide-react";

export default function GameOverModal({ score, level, character, mode, onRestart, onMenu }) {
    const isPractice = mode === "easy";
    const [name, setName] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rank, setRank] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isPractice) return;
        fetchRank(score)
            .then(({ rank }) => setRank(rank))
            .catch(() => setRank(null));
    }, [score, isPractice]);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        const trimmed = name.trim().toUpperCase();
        if (!trimmed) {
            setError("Enter a name first, hustler.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            await submitScore({ name: trimmed, score, level, character });
            setSubmitted(true);
        } catch {
            setError("Couldn't save score. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.78)" }}
            data-testid="game-over-modal"
        >
            <div className="cr-card max-w-md w-full text-center cr-float">
                <div className="cr-marquee mb-4">GAME OVER</div>
                <h2 className="font-arcade text-5xl cr-glow-blood mb-2" data-testid="game-over-title">
                    BUSTED.
                </h2>
                <p style={{ color: "var(--cr-ink-dim)" }} className="mb-6">
                    They got you. But you got the cash.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <div className="font-arcade text-sm" style={{ color: "var(--cr-ink-dim)" }}>FINAL SCORE</div>
                        <div className="font-mono text-3xl cr-glow-cash" data-testid="game-over-score">
                            {String(score).padStart(6, "0")}
                        </div>
                    </div>
                    <div>
                        <div className="font-arcade text-sm" style={{ color: "var(--cr-ink-dim)" }}>REACHED LEVEL</div>
                        <div className="font-mono text-3xl cr-glow-gold" data-testid="game-over-level">
                            {String(level).padStart(2, "0")}
                        </div>
                    </div>
                </div>

                {rank != null && !isPractice && (
                    <p className="font-arcade text-xl mb-4" style={{ color: "var(--cr-gold)" }} data-testid="game-over-rank">
                        Global Rank: #{rank}
                    </p>
                )}

                {isPractice ? (
                    <div
                        className="font-arcade text-xl mb-4 cr-tag inline-block"
                        style={{ color: "var(--cr-cash-bright)", borderColor: "var(--cr-cash-bright)" }}
                        data-testid="game-over-practice-note"
                    >
                        PRACTICE RUN — score not saved
                    </div>
                ) : !submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="block font-arcade text-lg" style={{ color: "var(--cr-ink-dim)" }}>
                            ENTER NAME (3–12 chars)
                        </label>
                        <input
                            data-testid="game-over-name-input"
                            value={name}
                            onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 12))}
                            placeholder="HUSTLER"
                            autoFocus
                            className="w-full text-center font-mono text-2xl py-2 px-3 rounded uppercase"
                            style={{
                                background: "rgba(0,0,0,0.4)",
                                border: "1px solid rgba(245,241,232,0.3)",
                                color: "var(--cr-ink)",
                                letterSpacing: "0.1em",
                            }}
                        />
                        {error && <div className="text-sm cr-glow-blood" data-testid="game-over-error">{error}</div>}
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="cr-btn cr-btn-primary"
                                data-testid="game-over-submit-btn"
                            >
                                {submitting ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                                Submit Score
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="font-arcade text-2xl cr-glow-cash mb-4" data-testid="game-over-submitted">
                        Score submitted!
                    </div>
                )}

                <div className="flex gap-3 justify-center pt-6">
                    <button onClick={onRestart} className="cr-btn" data-testid="game-over-restart-btn">
                        Play Again
                    </button>
                    <button onClick={onMenu} className="cr-btn" data-testid="game-over-menu-btn">
                        Menu
                    </button>
                </div>
            </div>
        </div>
    );
}
