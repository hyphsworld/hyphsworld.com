import React, { useEffect, useRef, useState } from "react";

const BASE_DESKTOP = 150;
const BASE_MOBILE = 120;
const KNOB = 54;
const DEADZONE = 12;

export default function TouchControls({ onDirection, onPause }) {
    const [BASE, setBASE] = useState(() =>
        typeof window !== "undefined" && window.innerWidth < 640 ? BASE_MOBILE : BASE_DESKTOP
    );
    const RADIUS = (BASE - KNOB) / 2;

    useEffect(() => {
        const onResize = () => {
            setBASE(window.innerWidth < 640 ? BASE_MOBILE : BASE_DESKTOP);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const baseRef = useRef(null);
    const dragRef = useRef({ active: false, pointerId: null, lastDir: null });
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    const computeDir = (dx, dy) => {
        const mag = Math.hypot(dx, dy);
        if (mag < DEADZONE) return null;
        // Snap to dominant axis
        if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
        return dy > 0 ? "down" : "up";
    };

    const handlePointerDown = (e) => {
        const base = baseRef.current;
        if (!base) return;
        e.preventDefault();
        try { base.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        dragRef.current = { active: true, pointerId: e.pointerId, lastDir: null };
        setActive(true);
        movePointer(e);
    };

    const movePointer = (e) => {
        if (!dragRef.current.active) return;
        const base = baseRef.current;
        if (!base) return;
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = e.clientX - cx;
        let dy = e.clientY - cy;
        const mag = Math.hypot(dx, dy);
        if (mag > RADIUS) {
            dx = (dx / mag) * RADIUS;
            dy = (dy / mag) * RADIUS;
        }
        setKnob({ x: dx, y: dy });

        const dir = computeDir(dx, dy);
        if (dir && dir !== dragRef.current.lastDir) {
            dragRef.current.lastDir = dir;
            onDirection(dir);
        }
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current.active) return;
        if (e.pointerId !== dragRef.current.pointerId) return;
        e.preventDefault();
        movePointer(e);
    };

    const handlePointerUp = (e) => {
        if (!dragRef.current.active) return;
        if (e.pointerId !== dragRef.current.pointerId) return;
        dragRef.current = { active: false, pointerId: null, lastDir: null };
        setActive(false);
        setKnob({ x: 0, y: 0 });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { dragRef.current.active = false; };
    }, []);

    return (
        <div className="flex items-center justify-between w-full max-w-md mt-2 gap-4 select-none px-2" data-testid="touch-controls">
            <div
                ref={baseRef}
                className="cr-joystick-base"
                role="button"
                aria-label="Movement joystick"
                data-testid="touch-joystick"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                    width: BASE,
                    height: BASE,
                    borderRadius: "50%",
                    position: "relative",
                    background: active
                        ? "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.10), rgba(0,0,0,0.55))"
                        : "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.06), rgba(0,0,0,0.55))",
                    border: "2px solid rgba(245,241,232,0.22)",
                    boxShadow: active
                        ? "inset 0 0 30px rgba(126,232,149,0.18), 0 0 22px rgba(126,232,149,0.18)"
                        : "inset 0 0 18px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    touchAction: "none",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s ease",
                }}
            >
                {/* Cardinal direction hints */}
                <DirHint pos="up" />
                <DirHint pos="down" />
                <DirHint pos="left" />
                <DirHint pos="right" />

                {/* Knob */}
                <div
                    data-testid="touch-joystick-knob"
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: KNOB,
                        height: KNOB,
                        marginLeft: -KNOB / 2,
                        marginTop: -KNOB / 2,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #f5f1e8, #6a6258 70%, #2a2620)",
                        border: "2px solid rgba(245,241,232,0.45)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.55), inset 0 -3px 6px rgba(0,0,0,0.4)",
                        transform: `translate(${knob.x}px, ${knob.y}px)`,
                        transition: dragRef.current.active ? "none" : "transform 0.18s cubic-bezier(0.2,1.2,0.4,1)",
                        pointerEvents: "none",
                    }}
                />
            </div>

            <button
                data-testid="touch-pause"
                onClick={onPause}
                className="cr-btn"
                style={{ fontSize: "1rem", padding: "0.6rem 1rem" }}
            >
                Pause
            </button>
        </div>
    );
}

function DirHint({ pos }) {
    const map = {
        up:    { top: 6,        left: "50%", transform: "translateX(-50%)", char: "▲" },
        down:  { bottom: 6,     left: "50%", transform: "translateX(-50%)", char: "▼" },
        left:  { left: 8,       top:  "50%", transform: "translateY(-50%)", char: "◀" },
        right: { right: 8,      top:  "50%", transform: "translateY(-50%)", char: "▶" },
    };
    const s = map[pos];
    return (
        <span
            aria-hidden
            style={{
                position: "absolute",
                top: s.top,
                left: s.left,
                right: s.right,
                bottom: s.bottom,
                transform: s.transform,
                color: "rgba(245,241,232,0.35)",
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                pointerEvents: "none",
            }}
        >
            {s.char}
        </span>
    );
}
