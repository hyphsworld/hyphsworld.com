import React from "react";
import { Heart } from "lucide-react";

const POWER_LABEL = {
    speed:  "SPEED",
    shield: "SHIELD",
    double: "DOUBLE",
};
const POWER_COLOR = {
    speed:  "#ffd84a",
    shield: "#6cf2ff",
    double: "#d36cff",
};

export default function HUD({ score, level, lives, theme, activePower, cashCollected }) {
    return (
        <div className="cr-hud" data-testid="game-hud">
            <div data-testid="hud-score">
                <div className="label">Score</div>
                <div className="value cr-glow-cash" data-testid="hud-score-value">
                    {String(score).padStart(6, "0")}
                </div>
            </div>
            <div data-testid="hud-level">
                <div className="label">Level — {theme?.name || ""}</div>
                <div className="value" style={{ color: theme?.accent || "#f5f1e8" }} data-testid="hud-level-value">
                    {String(level).padStart(2, "0")}
                </div>
            </div>
            <div data-testid="hud-cash">
                <div className="label">Cash Stacked</div>
                <div className="value cr-glow-gold" data-testid="hud-cash-value">
                    ${cashCollected}
                </div>
            </div>
            <div data-testid="hud-lives">
                <div className="label">Lives</div>
                <div className="value flex items-center gap-1.5 mt-1" data-testid="hud-lives-value">
                    {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                        <Heart key={i} size={18} fill="#e0413a" stroke="#e0413a" />
                    ))}
                    {lives === 0 && <span className="text-sm cr-glow-blood">GAME OVER</span>}
                </div>
            </div>
            {activePower && (
                <div className="col-span-4 flex items-center gap-2" data-testid="hud-power-active">
                    <span className="cr-tag" style={{ color: POWER_COLOR[activePower.type] }}>
                        {POWER_LABEL[activePower.type]}
                    </span>
                    <span className="text-xs" style={{ color: "var(--cr-ink-dim)" }}>
                        {activePower.time.toFixed(1)}s
                    </span>
                </div>
            )}
        </div>
    );
}
