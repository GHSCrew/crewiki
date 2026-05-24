"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { MOCK_USERS, MOCK_PAGES } from "@/lib/data";
import type { User, Role } from "@/types";

const ROLE_ORDER: Role[] = ["admin", "coach", "captain", "athlete"];

const GDOC_PERMISSIONS = [
  { id: "gd1", title: "Season Training Plan", url: "https://docs.google.com/document/d/example1", access: "editor" as const },
  { id: "gd2", title: "Race Strategy Notes", url: "https://docs.google.com/document/d/example2", access: "viewer" as const },
  { id: "gd3", title: "Erg Score Tracker", url: "https://docs.google.com/spreadsheets/d/example3", access: "editor" as const },
];

export default function AdminPage() {
  const { user, canEdit } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [activeTab, setActiveTab] = useState<"users" | "pages" | "gdocs">("users");

  if (!canEdit) {
    return (
      <div style={{ padding: "3rem" }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", color: "var(--navy)" }}>Access Denied</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>You need coach or admin access to view this page.</p>
        <button onClick={() => router.push("/wiki")} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--navy)", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  function changeRole(userId: string, newRole: Role) {
    setUsers(prev => prev.map(u => u.id !== userId ? u : { ...u, role: newRole }));
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 1000 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Admin Panel</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Manage team members, page access, and linked documents.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
        {(["users", "pages", "gdocs"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: "0.5rem 1rem", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: activeTab === t ? 600 : 400, color: activeTab === t ? "var(--navy)" : "var(--text-muted)", borderBottom: activeTab === t ? "2px solid var(--navy)" : "2px solid transparent", marginBottom: "-2px", textTransform: "capitalize" }}>
            {t === "users" ? "Users & Roles" : t === "pages" ? "Pages" : "Google Docs"}
          </button>
        ))}
      </div>

      {/* Users & Roles */}
      {activeTab === "users" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Role permissions: <strong>Admin</strong> → full control · <strong>Coach/Captain</strong> → edit pages, approve suggestions · <strong>Athlete</strong> → read + suggest edits
          </p>
          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--navy)" }}>
                  {["Member", "Email", "Role", "Joined", "Actions"].map(h => (
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
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{u.joinedAt}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {u.id !== user?.id && (
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
                {MOCK_PAGES.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "white" : "var(--cream)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem" }}>{p.title}</td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.72rem", background: "var(--navy)", color: "var(--gold-light)", padding: "2px 7px", borderRadius: 4 }}>{p.folder}</span></td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>v{p.version}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem" }}>{p.authorName}</td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.updatedAt}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <a href={`/wiki/${p.slug}`} style={{ fontSize: "0.78rem", color: "var(--water)", textDecoration: "none" }}>View →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google Docs */}
      {activeTab === "gdocs" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Linked Google Docs with permission levels. Coaches and captains have editor access; athletes receive viewer links.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {GDOC_PERMISSIONS.map(doc => (
              <div key={doc.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--navy)", marginBottom: "0.25rem" }}>{doc.title}</div>
                  <span style={{ fontSize: "0.72rem", background: doc.access === "editor" ? "var(--gold-pale)" : "var(--surface-raised)", color: doc.access === "editor" ? "var(--navy)" : "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{doc.access}</span>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "0.45rem 0.9rem", background: "#4285f4", color: "white", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                  Open in Drive
                </a>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--surface-raised)", borderRadius: 8, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            💡 To grant edit access to specific team members, open the document in Google Drive and share with their crew.edu email address directly. Coach and Captain roles get editor access; Athlete role gets viewer access by default.
          </div>
        </div>
      )}
    </div>
  );
}
