import React from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function TouchControls({ onDirection, onPause }) {
    const press = (dir) => (e) => {
        e.preventDefault();
        onDirection(dir);
    };

    return (
        <div className="flex items-center justify-between w-full max-w-md mt-4 gap-4 select-none" data-testid="touch-controls">
            <div className="cr-dpad" data-testid="touch-dpad">
                <button data-testid="touch-up"    className="up"    onTouchStart={press("up")}    onMouseDown={press("up")}><ChevronUp /></button>
                <button data-testid="touch-down"  className="down"  onTouchStart={press("down")}  onMouseDown={press("down")}><ChevronDown /></button>
                <button data-testid="touch-left"  className="left"  onTouchStart={press("left")}  onMouseDown={press("left")}><ChevronLeft /></button>
                <button data-testid="touch-right" className="right" onTouchStart={press("right")} onMouseDown={press("right")}><ChevronRight /></button>
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
