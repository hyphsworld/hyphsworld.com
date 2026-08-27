import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchLeaderboard,
    adminDeleteEntry,
    adminUpdateEntry,
    adminClearAll,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { ArrowLeft, Trophy, Loader2, RefreshCcw, Trash2, Pencil, Eraser, LogIn, LogOut, Check, X } from "lucide-react";

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
    const { admin, logout } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [busy, setBusy] = useState(false);
    const [period, setPeriod] = useState("all");

    const load = useCallback(async (p = period) => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchLeaderboard(50, p);
            setRows(data);
        } catch {
            setError("Couldn't load leaderboard.");
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { load(period); }, [period, load]);

    const changePeriod = (p) => {
        if (p === period) return;
        setPeriod(p);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        setBusy(true);
        try {
            await adminDeleteEntry(id);
            setRows((prev) => prev.filter((r) => r.id !== id));
        } catch (e) {
            alert("Delete failed: " + (e.response?.data?.detail || e.message));
        } finally { setBusy(false); }
    };

    const startEdit = (row) => { setEditingId(row.id); setEditName(row.name); };
    const cancelEdit = () => { setEditingId(null); setEditName(""); };

    const saveEdit = async () => {
        if (!editingId) return;
        const trimmed = editName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 12);
        if (!trimmed) { alert("Name cannot be empty"); return; }
        setBusy(true);
        try {
            const updated = await adminUpdateEntry(editingId, { name: trimmed });
            setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, name: updated.name } : r)));
            cancelEdit();
        } catch (e) {
            alert("Update failed: " + (e.response?.data?.detail || e.message));
        } finally { setBusy(false); }
    };

    const handleClearAll = async () => {
        const phrase = window.prompt('Type "WIPE" to clear ALL entries from the leaderboard:');
        if (phrase !== "WIPE") return;
        setBusy(true);
        try {
            await adminClearAll();
            setRows([]);
        } catch (e) {
            alert("Clear failed: " + (e.response?.data?.detail || e.message));
        } finally { setBusy(false); }
    };

    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="leaderboard-page">
            <div className="w-full max-w-3xl">
                <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
                    <button onClick={() => navigate("/")} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="leaderboard-back-btn">
                        <ArrowLeft className="inline mr-1" size={14} /> Back
                    </button>
                    <h1 className="font-arcade text-4xl sm:text-5xl cr-glow-gold flex items-center gap-3" data-testid="leaderboard-title">
                        <Trophy size={32} /> HALL OF HUSTLERS
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={() => load(period)} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="leaderboard-refresh-btn">
                            <RefreshCcw className="inline mr-1" size={14} /> Refresh
                        </button>
                        {admin ? (
                            <button onClick={logout} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="leaderboard-logout-btn">
                                <LogOut className="inline mr-1" size={14} /> Logout
                            </button>
                        ) : (
                            <button onClick={() => navigate("/admin")} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem", opacity: 0.6 }} data-testid="leaderboard-admin-btn">
                                <LogIn className="inline mr-1" size={14} /> Admin
                            </button>
                        )}
                    </div>
                </div>

                {/* Period filter tabs */}
                <div className="mb-3 flex justify-center" data-testid="leaderboard-period-tabs">
                    <div className="inline-flex p-1 rounded-full" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(108,242,255,0.2)" }}>
                        {[
                            { id: "day",   label: "Today",        color: "#7ee895" },
                            { id: "week",  label: "Weekly Hustlers", color: "#6cf2ff" },
                            { id: "month", label: "Monthly",      color: "#d36cff" },
                            { id: "all",   label: "All Time",     color: "#ffd84a" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => changePeriod(tab.id)}
                                data-testid={`leaderboard-period-${tab.id}`}
                                className="font-arcade px-4 py-1.5 rounded-full transition-all text-base sm:text-lg"
                                style={{
                                    background: period === tab.id ? tab.color : "transparent",
                                    color: period === tab.id ? "#0a0a0c" : tab.color,
                                    letterSpacing: "0.04em",
                                    boxShadow: period === tab.id ? `0 0 14px ${tab.color}55` : "none",
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {admin && (
                    <div className="cr-card mb-3 flex items-center justify-between flex-wrap gap-3" data-testid="admin-bar">
                        <div className="font-mono text-sm">
                            <span className="cr-tag" style={{ color: "var(--cr-cash-bright)", borderColor: "var(--cr-cash-bright)" }}>ADMIN</span>
                            <span className="ml-2" style={{ color: "var(--cr-ink-dim)" }}>{admin.email}</span>
                        </div>
                        <button onClick={handleClearAll} disabled={busy} className="cr-btn" style={{ fontSize: "0.9rem", padding: "0.4rem 0.8rem", color: "var(--cr-blood)", borderColor: "var(--cr-blood)" }} data-testid="admin-clear-all-btn">
                            <Eraser className="inline mr-1" size={14} /> Clear All
                        </button>
                    </div>
                )}

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
                            {period === "all"
                                ? "No hustlers yet — be the first."
                                : `No hustlers in this ${period === "day" ? "day" : period}. Get out there.`}
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
                                {editingId === r.id ? (
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value.toUpperCase())}
                                        maxLength={12}
                                        data-testid={`admin-edit-input-${r.id}`}
                                        className="font-mono px-2 py-1 rounded uppercase"
                                        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(245,241,232,0.3)", color: "var(--cr-ink)", width: 110 }}
                                        autoFocus
                                    />
                                ) : (
                                    <span style={{ letterSpacing: "0.06em" }}>{r.name}</span>
                                )}
                                {admin && editingId !== r.id && (
                                    <button
                                        onClick={() => startEdit(r)}
                                        disabled={busy}
                                        className="ml-1 opacity-60 hover:opacity-100"
                                        title="Edit name"
                                        data-testid={`admin-edit-btn-${r.id}`}
                                    >
                                        <Pencil size={12} />
                                    </button>
                                )}
                                {admin && editingId === r.id && (
                                    <>
                                        <button onClick={saveEdit} disabled={busy} className="ml-1" data-testid={`admin-save-btn-${r.id}`}>
                                            <Check size={14} className="cr-glow-cash" />
                                        </button>
                                        <button onClick={cancelEdit} disabled={busy} data-testid={`admin-cancel-btn-${r.id}`}>
                                            <X size={14} className="cr-glow-blood" />
                                        </button>
                                    </>
                                )}
                            </div>
                            <div style={{ color: "var(--cr-gold)" }}>{r.level}</div>
                            <div className="cr-glow-cash flex items-center gap-2">
                                <span>${String(r.score).padStart(6, "0")}</span>
                            </div>
                            <div className="col-time text-xs flex items-center gap-2" style={{ color: "var(--cr-ink-dim)" }}>
                                <span>{formatTime(r.timestamp)}</span>
                                {admin && (
                                    <button
                                        onClick={() => handleDelete(r.id)}
                                        disabled={busy}
                                        className="opacity-60 hover:opacity-100"
                                        title="Delete entry"
                                        data-testid={`admin-delete-btn-${r.id}`}
                                    >
                                        <Trash2 size={12} className="cr-glow-blood" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
