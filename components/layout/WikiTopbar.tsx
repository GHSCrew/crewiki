"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import type { ViewMode } from "@/types";

const MODE_LABELS: Record<ViewMode, string> = {
  read: "Read",
  comments: "Comments",
  blame: "Blame",
  history: "History",
  graph: "Graph",
  edit: "Edit",
  suggest: "Edit",
  manage: "Manage",
};

export default function WikiTopbar() {
  const { canEdit } = useAuth();
  const viewMode = useWikiStore(s => s.viewMode);
  const setViewMode = useWikiStore(s => s.setViewMode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const modes: ViewMode[] = ["read", "comments", "blame", "history", "graph", canEdit ? "edit" : "suggest", "manage"];

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className="wiki-topbar" style={{
      height: 44,
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 1.5rem",
      background: "white",
      flexShrink: 0,
    }}>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.35rem 0.85rem",
            border: "1.5px solid var(--border)",
            borderRadius: 6,
            background: "white",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--navy)",
          }}
        >
          {MODE_LABELS[viewMode]}
          <span style={{ fontSize: "0.6rem", opacity: 0.55, lineHeight: 1 }}>▼</span>
        </button>

        {open && (
          <div style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            minWidth: 150,
            zIndex: 200,
            overflow: "hidden",
          }}>
            {modes.map(m => (
              <button
                key={m}
                onClick={() => { setViewMode(m); setOpen(false); }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.6rem 1rem",
                  textAlign: "left",
                  border: "none",
                  background: viewMode === m ? "rgba(10,22,40,0.06)" : "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: viewMode === m ? 600 : 400,
                  color: viewMode === m ? "var(--navy)" : "var(--text)",
                  transition: "background 0.1s",
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
