"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { Role } from "@/types";

interface ActivityItem {
  id: string;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  folder: string;
  authorName: string;
  authorRole: Role;
  message: string;
  version: number;
  createdAt: string;
  kind: "created" | "edited";
}

function prettyDate(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE, MMMM d, yyyy");
  } catch {
    return iso;
  }
}

function prettyTime(iso: string): string {
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return iso;
  }
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then(r => r.json())
      .then((data: ActivityItem[]) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  // Group consecutive (already-sorted) items by calendar day; entries within a
  // day stay ordered to the minute by the API.
  const groups: { date: string; items: ActivityItem[] }[] = [];
  for (const it of items) {
    const day = it.createdAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === day) last.items.push(it);
    else groups.push({ date: day, items: [it] });
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 820 }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Activity</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Every integrated edit across the wiki, newest first. Click any entry to jump to the page.
        </p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading activity…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "white", border: "1px solid var(--border)", borderRadius: 12 }}>
          No activity yet. Edits will show up here once pages are created and updated.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {groups.map(group => (
            <div key={group.date}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.85rem" }}>
                {prettyDate(group.date)}
              </div>
              <div style={{ position: "relative", paddingLeft: "1.25rem", borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {group.items.map(it => (
                  <Link key={it.id} href={`/wiki/content/${it.pageSlug}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ position: "relative", background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "0.85rem 1.1rem", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* Timeline dot */}
                      <span style={{ position: "absolute", left: "-1.7rem", top: "1.1rem", width: 10, height: 10, borderRadius: "50%", background: it.kind === "created" ? "var(--water)" : "var(--gold)", border: "2px solid var(--cream)" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{it.authorName}</span>
                        <span className={`badge badge-${it.authorRole}`}>{it.authorRole}</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {it.kind === "created" ? "created" : "edited"}
                        </span>
                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "0.95rem", color: "var(--water)" }}>{it.pageTitle}</span>
                        <span style={{ fontSize: "0.68rem", background: "var(--navy)", color: "var(--gold-light)", padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>v{it.version}</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>{it.message}</p>
                      <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {it.folder && <span>📁 {it.folder}</span>}
                        <span>🕑 {prettyTime(it.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
