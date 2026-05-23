import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

export default function AdminLogin() {
    const navigate = useNavigate();
    const { admin, login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const formatErr = (detail) => {
        if (!detail) return "Login failed";
        if (typeof detail === "string") return detail;
        if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join("; ");
        return String(detail);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError("");
        try {
            await login(email.trim(), password);
            navigate("/leaderboard");
        } catch (err) {
            setError(formatErr(err.response?.data?.detail) || err.message || "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (admin) {
        return (
            <div className="cr-page cr-bg-noir cr-grain" data-testid="admin-already">
                <div className="w-full max-w-md cr-card text-center mt-12">
                    <h1 className="font-arcade text-3xl cr-glow-cash mb-3">Already signed in</h1>
                    <p className="font-mono text-sm mb-6" style={{ color: "var(--cr-ink-dim)" }}>
                        Logged in as <span className="cr-glow-gold">{admin.email}</span>
                    </p>
                    <button onClick={() => navigate("/leaderboard")} className="cr-btn cr-btn-primary" data-testid="admin-goto-leaderboard">
                        Open Leaderboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="admin-login-page">
            <div className="w-full max-w-md mt-12">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate("/")} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="admin-back-btn">
                        <ArrowLeft className="inline mr-1" size={14} /> Back
                    </button>
                </div>

                <div className="cr-card">
                    <div className="text-center mb-6">
                        <div className="cr-marquee inline-block mb-3">CONTROL ROOM</div>
                        <h1 className="font-arcade text-4xl cr-glow-cash flex items-center justify-center gap-3" data-testid="admin-login-title">
                            <Lock size={26} /> ADMIN
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" data-testid="admin-login-form">
                        <div>
                            <label className="block font-arcade text-sm mb-1" style={{ color: "var(--cr-ink-dim)" }}>Email</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@cashrun.local"
                                autoFocus
                                required
                                data-testid="admin-email-input"
                                className="w-full font-mono px-3 py-2 rounded"
                                style={{
                                    background: "rgba(0,0,0,0.4)",
                                    border: "1px solid rgba(245,241,232,0.25)",
                                    color: "var(--cr-ink)",
                                }}
                            />
                        </div>
                        <div>
                            <label className="block font-arcade text-sm mb-1" style={{ color: "var(--cr-ink-dim)" }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                data-testid="admin-password-input"
                                className="w-full font-mono px-3 py-2 rounded"
                                style={{
                                    background: "rgba(0,0,0,0.4)",
                                    border: "1px solid rgba(245,241,232,0.25)",
                                    color: "var(--cr-ink)",
                                }}
                            />
                        </div>
                        {error && (
                            <div className="font-mono text-sm cr-glow-blood" data-testid="admin-login-error">
                                {error}
                            </div>
                        )}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="cr-btn cr-btn-primary w-full"
                                data-testid="admin-login-submit"
                            >
                                {submitting ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
