"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import type { TeamMember, Role } from "@/types";

export default function TeamPage() {
  const { user, canEdit } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(setMembers);
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "athlete" as Role, email: "" });

  const byRole: Record<string, TeamMember[]> = { coach: [], captain: [], athlete: [] };
  members.forEach(m => { (byRole[m.role] ?? (byRole[m.role] = [])).push(m); });

  const ROLE_ORDER = ["coach", "captain", "athlete"] as const;
  const ROLE_LABELS: Record<string, string> = { coach: "Coaches", captain: "Captains", athlete: "Athletes" };

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const newM: TeamMember = { id: `tm-${Date.now()}`, ...form, registeredAt: new Date().toISOString().split("T")[0] };
    setMembers(prev => [...prev, newM]);
    setShowForm(false);
    setForm({ name: "", role: "athlete", email: "" });
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Team Roster</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{members.length} registered members</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            + Register Member
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleRegister} className="fade-in" style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "1rem" }}>Register Team Member</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Full Name</label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white" }}>
                <option value="athlete">Athlete</option>
                <option value="captain">Captain</option>
                <option value="coach">Coach</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Register</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 1rem", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          </div>
        </form>
      )}

      {ROLE_ORDER.map(role => {
        const ms = byRole[role] ?? [];
        if (ms.length === 0) return null;
        return (
          <div key={role} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {ROLE_LABELS[role]}
              <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{ms.length}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {ms.map(m => (
                <div key={m.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                      {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{m.name}</div>
                      {m.email && <div style={{ fontSize: "0.75rem", color: "var(--water)", marginTop: "0.15rem" }}>{m.email}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
