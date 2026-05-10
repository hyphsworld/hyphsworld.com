import React from "react";

export default function CharacterSelect({ value, onChange }) {
    return (
        <div className="flex items-center gap-6 justify-center" data-testid="character-select">
            {[
                { id: "boy",  label: "Marco",  sub: "Streetwise", color: "#4a8de8" },
                { id: "girl", label: "Lena",   sub: "Quick feet", color: "#d36cff" },
            ].map((c) => (
                <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange(c.id)}
                    className={`cr-char-card ${value === c.id ? "selected" : ""}`}
                    data-testid={`character-option-${c.id}`}
                >
                    <CharacterAvatar variant={c.id} size={80} />
                    <div className="text-center">
                        <div className="font-arcade text-2xl" style={{ color: c.color }}>{c.label}</div>
                        <div className="font-mono text-xs" style={{ color: "var(--cr-ink-dim)" }}>{c.sub}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

export function CharacterAvatar({ variant = "boy", size = 60 }) {
    const isGirl = variant === "girl";
    const skin = "#ffd1a8";
    const shirt = isGirl ? "#d36cff" : "#3a72d8";
    const shirtDark = isGirl ? "#9c47c0" : "#1f4ea0";
    const pant = isGirl ? "#1a1a2a" : "#2a1a0a";
    const hair = isGirl ? "#3a1f10" : "#1a0e06";
    const cap  = isGirl ? "#ff6cb4" : "#1a1a2a";
    return (
        <svg width={size} height={size} viewBox="0 0 100 130" data-testid={`avatar-${variant}`}>
            {/* Hair / cap */}
            {isGirl ? (
                <>
                    <path d="M 28 35 a 22 22 0 0 1 44 0 v 22 h -44 z" fill={hair} />
                    <rect x="38" y="14" width="24" height="9" fill={cap} rx="1" />
                    <rect x="48" y="14" width="4" height="9" fill="#ffb0d4" />
                    <rect x="22" y="35" width="6" height="20" fill={hair} />
                </>
            ) : (
                <>
                    <rect x="30" y="20" width="40" height="11" fill={hair} />
                    <rect x="28" y="22" width="44" height="13" fill={cap} rx="2" />
                    <rect x="20" y="30" width="9" height="5" fill={cap} />
                    <rect x="46" y="26" width="8" height="6" fill="#ffd84a" />
                </>
            )}
            {/* Head */}
            <circle cx="50" cy="42" r="14" fill={skin} />
            <rect x="56" y="40" width="3" height="3" fill="#0a0a0c" />
            {/* Torso */}
            <rect x="34" y="56" width="32" height="28" fill={shirt} rx="2" />
            <rect x="34" y="78" width="32" height="6" fill={shirtDark} />
            {/* Arms */}
            <rect x="26" y="58" width="8" height="22" fill={shirt} />
            <rect x="66" y="58" width="8" height="22" fill={shirt} />
            {/* Cash bundle in front hand */}
            <rect x="68" y="80" width="18" height="10" fill="#3a8a4f" />
            <rect x="68" y="80" width="18" height="3" fill="#5cc46f" />
            <rect x="74" y="80" width="6" height="10" fill="#d4af37" />
            {/* Legs */}
            <rect x="38" y="84" width="10" height="22" fill={pant} />
            <rect x="52" y="84" width="10" height="22" fill={pant} />
            {/* Shoes */}
            <rect x="36" y="104" width="14" height="6" fill="#0a0a0c" />
            <rect x="50" y="104" width="14" height="6" fill="#0a0a0c" />
            <rect x="36" y="108" width="14" height="2" fill="#fff" />
            <rect x="50" y="108" width="14" height="2" fill="#fff" />
        </svg>
    );
}
