"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { WIKI_FOLDERS } from "@/lib/data";

export default function WikiHome() {
  const { user } = useAuth();
  const { pages } = useWikiStore();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? pages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.content.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some(t => t.includes(query.toLowerCase()))
      )
    : [];

  const folderMap: Record<string, typeof pages> = {};
  pages.forEach(p => {
    if (!folderMap[p.folder]) folderMap[p.folder] = [];
    folderMap[p.folder].push(p);
  });

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.5rem", color: "var(--navy)", marginBottom: "0.35rem" }}>
          Welcome back, {user?.name.split(" ")[0]}.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          Your team&apos;s interactive knowledge base — technique, equipment, training, and more.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "2.5rem", position: "relative" }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search articles, techniques, drills…"
          style={{ width: "100%", maxWidth: 560, padding: "0.8rem 1.25rem 0.8rem 3rem", border: "2px solid var(--border)", borderRadius: 40, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white", transition: "border-color 0.2s" }}
          onFocus={e => (e.target.style.borderColor = "var(--water)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
      </div>

      {/* Search results */}
      {query && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </h2>
          {filtered.map(p => (
            <Link key={p.id} href={`/wiki/${p.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "1rem 1.25rem", background: "white", border: "1px solid var(--border)", borderRadius: 10, marginBottom: "0.5rem", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.7rem", background: "var(--navy)", color: "var(--gold-light)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{p.folder}</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.05rem", color: "var(--navy)" }}>{p.title}</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{p.content.replace(/[#*\[\]`]/g, "").slice(0, 120)}…</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No articles matched your search.</p>}
        </div>
      )}

      {/* Quick stats */}
      {!query && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Articles", value: pages.length, icon: "📄" },
            { label: "Folders", value: Object.keys(folderMap).length, icon: "📁" },
            { label: "Your Role", value: user?.role, icon: "🎖️" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "var(--navy)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Folder grid */}
      {!query && (
        <>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "1.25rem" }}>Browse by Category</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {WIKI_FOLDERS.map(folder => {
              const fps = folderMap[folder] || [];
              if (fps.length === 0) return null;
              return (
                <div key={folder} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem", transition: "box-shadow 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                    <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "var(--navy)" }}>{folder}</h3>
                    <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{fps.length}</span>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {fps.map(p => (
                      <li key={p.slug}>
                        <Link href={`/wiki/${p.slug}`} style={{ textDecoration: "none", color: "var(--water)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>↗</span>{p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
