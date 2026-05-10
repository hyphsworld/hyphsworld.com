import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard } from "../lib/api";
import { ArrowLeft, Trophy, Loader2, RefreshCcw } from "lucide-react";

const formatTime = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    } catch { return "—"; }
};

export default function Leaderboard() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchLeaderboard(50);
            setRows(data);
        } catch {
            setError("Couldn't load leaderboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="leaderboard-page">
            <div className="w-full max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate("/")} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="leaderboard-back-btn">
                        <ArrowLeft className="inline mr-1" size={14} /> Back
                    </button>
                    <h1 className="font-arcade text-5xl sm:text-6xl cr-glow-gold flex items-center gap-3" data-testid="leaderboard-title">
                        <Trophy size={36} /> HALL OF HUSTLERS
                    </h1>
                    <button onClick={load} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="leaderboard-refresh-btn">
                        <RefreshCcw className="inline mr-1" size={14} /> Refresh
                    </button>
                </div>

                <div className="cr-card">
                    <div className="cr-lb-row header" data-testid="leaderboard-header">
                        <div>#</div>
                        <div>Name</div>
                        <div>Lvl</div>
                        <div>Score</div>
                        <div className="col-time">When</div>
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-10" data-testid="leaderboard-loading">
                            <Loader2 className="animate-spin" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="py-10 text-center cr-glow-blood font-arcade text-xl" data-testid="leaderboard-error">
                            {error}
                        </div>
                    )}

                    {!loading && !error && rows.length === 0 && (
                        <div className="py-10 text-center font-arcade text-xl" style={{ color: "var(--cr-ink-dim)" }} data-testid="leaderboard-empty">
                            No hustlers yet — be the first.
                        </div>
                    )}

                    {!loading && !error && rows.map((r, i) => (
                        <div className="cr-lb-row" key={r.id} data-testid={`leaderboard-row-${i}`}>
                            <div className="rank">
                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-block w-3 h-3 rounded-full"
                                    style={{ background: r.character === "girl" ? "#d36cff" : "#4a8de8" }}
                                />
                                <span style={{ letterSpacing: "0.06em" }}>{r.name}</span>
                            </div>
                            <div style={{ color: "var(--cr-gold)" }}>{r.level}</div>
                            <div className="cr-glow-cash">${String(r.score).padStart(6, "0")}</div>
                            <div className="col-time text-xs" style={{ color: "var(--cr-ink-dim)" }}>{formatTime(r.timestamp)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
