import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const Section = ({ title, children, color }) => (
    <div className="cr-card mb-4" data-testid={`htp-section-${title.replace(/\s+/g, "-").toLowerCase()}`}>
        <div className="font-arcade text-2xl mb-2" style={{ color }}>{title}</div>
        <div className="font-mono text-sm" style={{ color: "var(--cr-ink)" }}>{children}</div>
    </div>
);

export default function HowToPlay() {
    const navigate = useNavigate();
    return (
        <div className="cr-page cr-bg-noir cr-grain" data-testid="how-to-play-page">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate("/")} className="cr-btn" style={{ fontSize: "0.95rem", padding: "0.45rem 0.9rem" }} data-testid="htp-back-btn">
                        <ArrowLeft className="inline mr-1" size={14} /> Back
                    </button>
                    <h1 className="font-arcade text-5xl cr-glow-cash" data-testid="htp-title">HOW TO PLAY</h1>
                    <div style={{ width: 90 }} />
                </div>

                <Section title="The Hustle" color="var(--cr-gold)">
                    Run the streets and chomp every <span className="cr-glow-cash">cash pellet</span>. Clear the level
                    to move uptown — from the slum to the luxury district. The streets get richer the further you go.
                </Section>

                <Section title="Controls" color="var(--cr-cash-bright)">
                    <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <kbd className="cr-tag"><ChevronUp size={14} /></kbd>
                            <kbd className="cr-tag"><ChevronDown size={14} /></kbd>
                            <kbd className="cr-tag"><ChevronLeft size={14} /></kbd>
                            <kbd className="cr-tag"><ChevronRight size={14} /></kbd>
                            <span>or WASD</span>
                        </div>
                        <div>
                            <kbd className="cr-tag">P</kbd> / <kbd className="cr-tag">Esc</kbd> pause
                        </div>
                        <div>On phone: drag the on-screen joystick.</div>
                    </div>
                </Section>

                <Section title="The Heat" color="#e0413a">
                    <div className="space-y-2">
                        <div><span style={{ color: "#e0413a" }}>● Thugs</span> — chase you straight up.</div>
                        <div><span style={{ color: "#4a8de8" }}>● Cops</span> — try to cut you off (level 2+).</div>
                        <div>Get touched and you lose a life. You start with 3.</div>
                    </div>
                </Section>

                <Section title="Power Pickups" color="#d36cff">
                    <div className="space-y-2">
                        <div><span className="cr-glow-gold">BIG cash</span> — turns the heat blue. Chomp enemies for bonus points.</div>
                        <div><span style={{ color: "#ffd84a" }}>⚡ Speed</span> — short burst of speed.</div>
                        <div><span style={{ color: "#6cf2ff" }}>🛡 Shield</span> — soaks one hit.</div>
                        <div><span style={{ color: "#d36cff" }}>x2 Double</span> — doubles all points for a bit.</div>
                    </div>
                </Section>

                <Section title="Scoring" color="var(--cr-cash-bright)">
                    <ul className="space-y-1 list-disc list-inside">
                        <li>Cash pellet — 10 pts</li>
                        <li>BIG cash — 50 pts + chomp mode</li>
                        <li>Power pickup — 25 pts</li>
                        <li>Chomp enemy — 200 / 400 / 800 / 1600 (combo)</li>
                    </ul>
                </Section>

                <p className="text-center font-arcade text-2xl mt-8 cr-blink" style={{ color: "var(--cr-gold)" }}>
                    now go get that paper.
                </p>
            </div>
        </div>
    );
}
