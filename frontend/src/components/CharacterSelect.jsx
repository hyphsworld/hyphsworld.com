import React from "react";

export const CHARACTER_ART = {
    boy: {
        id: "boy",
        label: "TONIO",
        sub: "Chase the bag",
        color: "#e0413a",
        image: "https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/e9737oor_E1AEC6D1-0E86-4193-AECB-D97C322AAE1B.webp",
    },
    girl: {
        id: "girl",
        label: "NIKKI",
        sub: "Fast hands",
        color: "#ff3ec8",
        image: "https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/pjqpo9f5_4DA031AD-8330-409E-B1E7-75051DE1B615.webp",
    },
};

export default function CharacterSelect({ value, onChange }) {
    return (
        <div className="flex items-center gap-6 justify-center" data-testid="character-select">
            {Object.values(CHARACTER_ART).map((c) => (
                <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange(c.id)}
                    className={`cr-char-card ${value === c.id ? "selected" : ""}`}
                    data-testid={`character-option-${c.id}`}
                >
                    <CharacterAvatar variant={c.id} size={110} />
                    <div className="text-center">
                        <div className="font-arcade text-2xl" style={{ color: c.color, textShadow: `0 0 12px ${c.color}66` }}>{c.label}</div>
                        <div className="font-mono text-xs" style={{ color: "var(--cr-ink-dim)" }}>{c.sub}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

export function CharacterAvatar({ variant = "boy", size = 110 }) {
    const c = CHARACTER_ART[variant] || CHARACTER_ART.boy;
    return (
        <div
            data-testid={`avatar-${variant}`}
            style={{
                width: size,
                height: size,
                background: `#0a0a0c url(${c.image}) center/contain no-repeat`,
                borderRadius: 8,
                border: `1px solid ${c.color}55`,
                boxShadow: `0 0 20px ${c.color}33`,
            }}
        />
    );
}
