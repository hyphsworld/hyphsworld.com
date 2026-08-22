import React from "react";

export const CHARACTER_ART = {
    boy: {
        id: "boy",
        label: "TONIO",
        sub: "Chase the bag",
        color: "#e0413a",
        image: "https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/lsq3ji5w_IMG_6613.png",
    },
    girl: {
        id: "girl",
        label: "NIKKI",
        sub: "Fast hands",
        color: "#ff3ec8",
        image: "https://customer-assets-cm19k8pv.emergentagent.net/job_cash-runner-game/artifacts/a6esd831_IMG_6641.jpeg",
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
