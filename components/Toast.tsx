"use client";
import { useState, useEffect, useCallback } from "react";
import { setToastListener } from "@/lib/toast";

type ToastItem = { id: number; message: string; type: "success" | "error" | "info" };

const ICONS = { success: "✓", error: "✕", info: "ℹ" };
const COLORS = { success: "var(--gold)", error: "#e05252", info: "var(--water)" };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { setToastListener(add); }, [add]);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.6rem", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} className="toast-slide-in" style={{ pointerEvents: "all", display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--navy)", border: "1px solid rgba(255,255,255,0.1)", borderLeft: `3px solid ${COLORS[t.type]}`, borderRadius: 10, padding: "0.8rem 1rem", minWidth: 280, maxWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)" }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: `${COLORS[t.type]}22`, border: `1.5px solid ${COLORS[t.type]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: COLORS[t.type], flexShrink: 0 }}>
            {ICONS[t.type]}
          </span>
          <span style={{ flex: 1, fontSize: "0.875rem", color: "rgba(255,255,255,0.92)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45 }}>
            {t.message}
          </span>
          <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 2px", flexShrink: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
