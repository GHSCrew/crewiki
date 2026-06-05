"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { TeamMember, Role } from "@/types";

interface PendingUser { id: string; name: string; username?: string; joinedAt: string; }
interface ConfirmState { id: string; name: string; }

export default function TeamPage() {
  const { user, canEdit } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "athlete" as Role, username: "" });
  const [confirmPending, setConfirmPending] = useState<ConfirmState | null>(null);
  const [confirmReject, setConfirmReject] = useState<ConfirmState | null>(null);

  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(setMembers);
    if (canEdit) fetch("/api/users?pending=true").then(r => r.json()).then(setPending);
  }, [canEdit]);

  const byRole: Record<string, TeamMember[]> = { coach: [], captain: [], athlete: [] };
  members.forEach(m => { (byRole[m.role] ?? (byRole[m.role] = [])).push(m); });
  const ROLE_ORDER = ["coach", "captain", "athlete"] as const;
  const ROLE_LABELS: Record<string, string> = { coach: "Coaches", captain: "Captains", athlete: "Athletes" };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, registeredAt: now }),
    });
    if (res.ok) {
      const newM = await res.json() as TeamMember;
      setMembers(prev => [...prev, newM]);
      setShowForm(false);
      setForm({ name: "", role: "athlete", username: "" });
    }
  }

  function handleDeregister(id: string, name: string) {
    setConfirmPending({ id, name });
  }

  async function confirmDeregister() {
    if (!confirmPending) return;
    await fetch(`/api/team/${confirmPending.id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== confirmPending.id));
    setConfirmPending(null);
  }

  async function handleActivate(pendingUser: PendingUser) {
    await fetch(`/api/users/${pendingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate: true }),
    });
    setPending(prev => prev.filter(p => p.id !== pendingUser.id));
    const updated = await fetch("/api/team").then(r => r.json()) as TeamMember[];
    setMembers(updated);
  }

  function handleReject(p: PendingUser) {
    setConfirmReject({ id: p.id, name: p.name });
  }

  async function confirmRejectUser() {
    if (!confirmReject) return;
    await fetch(`/api/users/${confirmReject.id}`, { method: "DELETE" });
    setPending(prev => prev.filter(p => p.id !== confirmReject.id));
    setConfirmReject(null);
  }

  return (
    <div style={{ padding: "var(--page-pad)", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Team Roster</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{members.length} registered members</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            + Register Member
          </button>
        )}
      </div>

      {/* Pending approvals */}
      {canEdit && pending.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            Pending Approval
            <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{pending.length}</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {pending.map(p => (
              <div key={p.id} style={{ background: "white", border: "1px solid #fcd34d", borderRadius: 10, padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fef3c7", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                    {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{p.name}</div>
                    {p.username && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{p.username}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button onClick={() => handleActivate(p)}
                    style={{ padding: "0.3rem 0.7rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 5, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                    Activate
                  </button>
                  <button onClick={() => handleReject(p)}
                    style={{ padding: "0.3rem 0.7rem", background: "none", color: "#b03030", border: "1px solid rgba(153,26,26,0.25)", borderRadius: 5, fontSize: "0.75rem", cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register form */}
      {showForm && canEdit && (
        <form onSubmit={handleRegister} className="fade-in" style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "1rem" }}>Register Team Member</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Full Name *</label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Username *</label>
              <input required type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
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

      {confirmPending && (
        <ConfirmDialog
          title="Remove from Roster?"
          message={<>Remove <strong style={{ color: "var(--navy)" }}>{confirmPending.name}</strong> from the roster? This cannot be undone.</>}
          confirmLabel="Remove"
          onConfirm={confirmDeregister}
          onCancel={() => setConfirmPending(null)}
        />
      )}
      {confirmReject && (
        <ConfirmDialog
          title="Reject Signup?"
          message={<>Reject <strong style={{ color: "var(--navy)" }}>{confirmReject.name}</strong>&apos;s signup request and delete their account?</>}
          confirmLabel="Reject"
          onConfirm={confirmRejectUser}
          onCancel={() => setConfirmReject(null)}
        />
      )}

      {/* Roster by role */}
      {ROLE_ORDER.map(role => {
        const ms = byRole[role] ?? [];
        if (ms.length === 0) return null;
        return (
          <div key={role} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {ROLE_LABELS[role]}
              <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{ms.length}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
              {ms.map(m => (
                <div key={m.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem", transition: "box-shadow 0.15s", position: "relative" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                      {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{m.name}</div>
                      {m.username && <div style={{ fontSize: "0.75rem", color: "var(--water)", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.username}</div>}
                    </div>
                    {canEdit && m.id !== user?.id && (
                      <button onClick={() => handleDeregister(m.id, m.name)}
                        title="Deregister"
                        style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "none", border: "1px solid rgba(153,26,26,0.2)", color: "#b03030", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        ×
                      </button>
                    )}
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
