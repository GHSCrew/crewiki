"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarBody } from "./Sidebar";

/**
 * Mobile navigation. Renders a small fixed "trinket" in the top-left corner.
 * Tapping it opens a full-screen takeover that mirrors the desktop sidebar.
 * Both pieces are hidden on desktop (≥ 900px) via the `.mobile-nav-*` CSS
 * classes in globals.css — desktop keeps the real <Sidebar>.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the takeover whenever the route changes (covers links inside the
  // body that don't fire onNavigate, plus browser back/forward).
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock background scroll while the takeover is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* The trinket */}
      <button
        className="mobile-nav-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        title="Menu"
      >
        <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>⛵</span>
      </button>

      {/* Full-screen takeover */}
      {open && (
        <div className="mobile-nav-screen fade-in" role="dialog" aria-modal="true">
          {/* Brand + close */}
          <div style={{ padding: "1rem 1rem 0.85rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/wiki" onClick={() => setOpen(false)} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "1.15rem" }}>⛵</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "white" }}>CrewWiki</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.05rem" }}>Team Knowledge Base</div>
              </div>
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >×</button>
          </div>

          <SidebarBody onNavigate={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
