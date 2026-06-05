"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ConfirmDialog from "@/components/ConfirmDialog";
import { downloadWiki } from "@/lib/download";
import type { User, WikiPage, Role } from "@/types";

const ROLE_ORDER: Role[] = ["coach", "captain", "athlete"];

interface ShareInfo {
  token: string;
  pageSlug: string;
  pageTitle: string;
  folder: string;
  createdAt: string;
  expiresAt: string;
}

function timeLeft(expiresAt: string, now: number): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function AdminPage() {
  const { user, canEdit, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [now, setNow] = useState(0);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "pages" | "shared" | "reset">("users");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showContentResetConfirm, setShowContentResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [contentResetting, setContentResetting] = useState(false);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(setUsers);
    fetch("/api/pages").then(r => r.json()).then(setPages);
    fetch("/api/share").then(r => r.json()).then(setShares).catch(() => {});
  }, []);

  // Tick "now" so time-left counts down without calling Date.now() during render.
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  async function removeShare(token: string) {
    setShares(prev => prev.filter(s => s.token !== token));
    await fetch(`/api/share/${token}`, { method: "DELETE" });
  }

  async function copyShare(token: string) {
    try { await navigator.clipboard?.writeText(`${window.location.origin}/wiki/shared/${token}`); } catch {}
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(c => (c === token ? null : c)), 1800);
  }

  if (!canEdit) {
    return (
      <div style={{ padding: "3rem" }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", color: "var(--navy)" }}>Access Denied</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>You need coach access to view this page.</p>
        <button onClick={() => router.push("/wiki")} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--navy)", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  async function handleReset() {
    setResetting(true);
    await fetch("/api/admin/reset", { method: "POST" });
    logout();
    router.push("/login");
  }

  async function handleContentReset() {
    setContentResetting(true);
    setShowContentResetConfirm(false);
    await fetch("/api/admin/reset/content", { method: "POST" });
    setPages([]);
    setContentResetting(false);
  }

  async function changeRole(userId: string, newRole: Role) {
    setUsers(prev => prev.map(u => u.id !== userId ? u : { ...u, role: newRole }));
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  return (
    <div style={{ padding: "var(--page-pad)", maxWidth: 1000 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Admin Panel</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Manage team members and wiki pages.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
        {(["users", "pages", "shared", ...(user?.role === "coach" ? ["reset"] : [])] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t as typeof activeTab)}
            style={{ padding: "0.5rem 1rem", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: activeTab === t ? 600 : 400, color: t === "reset" ? (activeTab === t ? "#b03030" : "rgba(176,48,48,0.6)") : activeTab === t ? "var(--navy)" : "var(--text-muted)", borderBottom: activeTab === t ? `2px solid ${t === "reset" ? "#b03030" : "var(--navy)"}` : "2px solid transparent", marginBottom: "-2px", textTransform: "capitalize" }}>
            {t === "users" ? "Users & Roles" : t === "pages" ? "Pages" : t === "shared" ? "Shared" : "Factory Reset"}
          </button>
        ))}
      </div>

      {/* Users & Roles */}
      {activeTab === "users" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Role permissions: <strong>Coach</strong> → edit pages, manage roles · <strong>Captain</strong> → edit pages, approve suggestions · <strong>Athlete</strong> → read + suggest edits
          </p>
          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--navy)" }}>
                  {["Member", "Username", "Role", "Joined", "Actions"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-light)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700 }}>
                          {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.name}</span>
                        {u.id === user?.id && <span style={{ fontSize: "0.68rem", background: "var(--gold-pale)", color: "var(--navy)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>You</span>}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.username ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.joinedAt}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {u.id !== user?.id && user?.role === "coach" && (
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value as Role)}
                          style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--border)", borderRadius: 5, fontSize: "0.78rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white", cursor: "pointer" }}>
                          {ROLE_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pages */}
      {activeTab === "pages" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>All wiki pages and their current version.</p>
          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--navy)" }}>
                  {["Title", "Folder", "Version", "Author", "Updated", ""].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-light)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>{p.title}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.72rem", background: "var(--navy)", color: "var(--gold-light)", padding: "2px 7px", borderRadius: 4 }}>{p.folder}</span></td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>v{p.version}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem" }}>{p.authorName}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.updatedAt}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <a href={`/wiki/content/${p.slug}`} style={{ fontSize: "0.78rem", color: "var(--water)", textDecoration: "none" }}>View →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shared links */}
      {activeTab === "shared" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Temporary public links that let anyone read a page without signing in. Links expire automatically and disappear from this list once they do.
          </p>
          {shares.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "white", border: "1px solid var(--border)", borderRadius: 12 }}>
              No active shared links.
            </div>
          ) : (
            <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--navy)" }}>
                    {["Page", "Folder", "Time left", "Shared", "Actions"].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gold-light)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s, i) => {
                    const left = timeLeft(s.expiresAt, now);
                    const soon = new Date(s.expiresAt).getTime() - now < 86400000;
                    return (
                      <tr key={s.token} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>{s.pageTitle}</td>
                        <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.72rem", background: "var(--navy)", color: "var(--gold-light)", padding: "2px 7px", borderRadius: 4 }}>{s.folder || "Root"}</span></td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: soon ? "#b03030" : "var(--text-muted)", fontWeight: soon ? 600 : 400 }}>{left}</td>
                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.createdAt.slice(0, 10)}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <button
                              onClick={() => copyShare(s.token)}
                              style={{ fontSize: "0.78rem", color: copiedToken === s.token ? "var(--water)" : "var(--navy)", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: 0 }}
                            >{copiedToken === s.token ? "Copied ✓" : "Copy"}</button>
                            <a href={`/wiki/shared/${s.token}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "var(--water)", textDecoration: "none", fontWeight: 600 }}>Visit ↗</a>
                            <button
                              onClick={() => removeShare(s.token)}
                              style={{ fontSize: "0.78rem", color: "#b03030", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: 0 }}
                            >Remove</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Factory Reset */}
      {activeTab === "reset" && (
        <div className="fade-in" style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Backup / Download */}
          <div style={{ background: "white", border: "1.5px solid rgba(45,90,130,0.3)", borderRadius: 12, padding: "1.75rem 2rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "0.6rem" }}>Back Up First</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Before resetting anything, download a complete backup of the wiki. Every page is exported as a markdown file inside a zip archive, with its folder structure preserved.
            </p>
            <button
              onClick={() => downloadWiki(pages)}
              disabled={pages.length === 0}
              style={{ padding: "0.65rem 1.5rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", fontWeight: 700, cursor: pages.length === 0 ? "not-allowed" : "pointer", opacity: pages.length === 0 ? 0.6 : 1 }}
            >
              ↓ Download Entire Wiki
            </button>
          </div>

          {/* Content Reset */}
          <div style={{ background: "white", border: "1.5px solid rgba(176,120,48,0.35)", borderRadius: 12, padding: "1.75rem 2rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#a05a1a", marginBottom: "0.6rem" }}>Content Reset</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Delete all wiki content — pages, edit suggestions, file requests, comments, and page history — while keeping all user accounts and the roster intact.
            </p>
            <button
              onClick={() => setShowContentResetConfirm(true)}
              disabled={contentResetting}
              style={{ padding: "0.65rem 1.5rem", background: "#a05a1a", color: "white", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", fontWeight: 700, cursor: contentResetting ? "wait" : "pointer" }}
            >
              {contentResetting ? "Resetting…" : "Reset Content"}
            </button>
          </div>

          <div style={{ background: "white", border: "1.5px solid rgba(176,48,48,0.3)", borderRadius: 12, padding: "1.75rem 2rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#b03030", marginBottom: "0.6rem" }}>Factory Reset</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
              This will permanently delete <strong style={{ color: "var(--navy)" }}>everything</strong> — all wiki pages, edit suggestions, file requests, comments, roster members, and user accounts.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              A single coach account will be recreated with username <strong style={{ color: "var(--navy)" }}>coach</strong> and password <strong style={{ color: "var(--navy)" }}>coach</strong>. You will be logged out immediately.
            </p>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              style={{ padding: "0.65rem 1.5rem", background: "#b03030", color: "white", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", fontWeight: 700, cursor: resetting ? "wait" : "pointer" }}
            >
              {resetting ? "Resetting…" : "Factory Reset"}
            </button>
          </div>
        </div>
      )}

      {showContentResetConfirm && (
        <ConfirmDialog
          title="Reset Content?"
          message="This will permanently delete all wiki pages, suggestions, file requests, comments, and page history. User accounts and the roster will not be affected."
          confirmLabel="Reset Content"
          onConfirm={handleContentReset}
          onCancel={() => setShowContentResetConfirm(false)}
        />
      )}
      {showResetConfirm && (
        <ConfirmDialog
          title="Factory Reset?"
          message={
            <>
              This will <strong style={{ color: "#b03030" }}>permanently delete all data</strong> — pages, suggestions, requests, comments, and all accounts. The only remaining account will be <strong style={{ color: "var(--navy)" }}>coach / coach</strong>. This cannot be undone.
            </>
          }
          confirmLabel="Reset Everything"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

    </div>
  );
}
