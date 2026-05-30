"use client";
import { useEffect, useRef, useState } from "react";

const DURATIONS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

export default function SharePage({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Reset the generated link whenever duration changes so the shown link always matches.
  function pickDuration(d: number) { setDays(d); setUrl(null); setCopied(false); }

  async function createLink() {
    setCreating(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageSlug: slug, days }),
      });
      const data = await res.json() as { token: string };
      setUrl(`${window.location.origin}/wiki/shared/${data.token}`);
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.85rem", border: "1.5px solid var(--border)", borderRadius: 8, background: "white", color: "var(--navy)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", fontWeight: 600 }}
      >
        🔗 Share
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 200, background: "white", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", width: 320, padding: "1rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.25rem" }}>Share this page</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            Anyone with the link can read this page — no sign-in needed. The link expires automatically.
          </p>

          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem" }}>
            {DURATIONS.map(d => (
              <button key={d.days} onClick={() => pickDuration(d.days)}
                style={{ flex: 1, padding: "0.4rem 0", borderRadius: 7, border: `1.5px solid ${days === d.days ? "var(--navy)" : "var(--border)"}`, background: days === d.days ? "var(--navy)" : "white", color: days === d.days ? "var(--gold)" : "var(--text)", fontSize: "0.78rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                {d.label}
              </button>
            ))}
          </div>

          {!url ? (
            <button onClick={createLink} disabled={creating}
              style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "none", background: "var(--navy)", color: "var(--gold)", fontSize: "0.85rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: creating ? "wait" : "pointer" }}>
              {creating ? "Creating…" : "Create link"}
            </button>
          ) : (
            <div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "stretch" }}>
                <input readOnly value={url} onFocus={e => e.currentTarget.select()}
                  style={{ flex: 1, minWidth: 0, padding: "0.45rem 0.6rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.74rem", fontFamily: "'DM Mono', monospace", color: "var(--text)", outline: "none", background: "var(--surface-raised)" }} />
                <button onClick={copy}
                  style={{ padding: "0 0.75rem", borderRadius: 7, border: "none", background: copied ? "var(--water)" : "var(--gold)", color: copied ? "white" : "var(--navy)", fontSize: "0.76rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <button onClick={() => setUrl(null)}
                style={{ marginTop: "0.5rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ↻ Generate a different link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
