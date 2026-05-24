"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MOCK_TEAM } from "@/lib/data";
import type { TeamMember, Role } from "@/types";

const SIDES = ["port", "starboard", "cox"] as const;
const BOATS = ["8+", "4+", "4x", "2x", "1x", "4-"];

export default function TeamPage() {
  const { user, canEdit } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>(MOCK_TEAM);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "athlete" as Role, boatClass: "8+", seat: "", side: "port" as TeamMember["side"], email: "" });

  const byBoat: Record<string, TeamMember[]> = {};
  members.forEach(m => {
    const key = m.boatClass || "Unassigned";
    if (!byBoat[key]) byBoat[key] = [];
    byBoat[key].push(m);
  });

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const newM: TeamMember = { id: `tm-${Date.now()}`, ...form, registeredAt: new Date().toISOString().split("T")[0] };
    setMembers(prev => [...prev, newM]);
    setShowForm(false);
    setForm({ name: "", role: "athlete", boatClass: "8+", seat: "", side: "port", email: "" });
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

      {/* Registration form */}
      {showForm && canEdit && (
        <form onSubmit={handleRegister} className="fade-in" style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--navy)", marginBottom: "1rem" }}>Register Team Member</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            {[
              { label: "Full Name", key: "name", type: "text", required: true },
              { label: "Email", key: "email", type: "email" },
              { label: "Seat", key: "seat", type: "text", placeholder: "e.g. Stroke, 7, Cox" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>{f.label}</label>
                <input required={f.required} type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white" }}>
                <option value="athlete">Athlete</option><option value="captain">Captain</option><option value="coach">Coach</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Boat</label>
              <select value={form.boatClass} onChange={e => setForm(f => ({ ...f, boatClass: e.target.value }))} style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white" }}>
                {BOATS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Side</label>
              <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value as TeamMember["side"] }))} style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white" }}>
                {SIDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Register</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 1rem", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Boats */}
      {Object.entries(byBoat).map(([boat, ms]) => (
        <div key={boat} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {boat}
            <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{ms.length} members</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {ms.map(m => (
              <div key={m.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>
                    {m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{m.name}</div>
                    <span className={`badge badge-${m.role}`}>{m.role}</span>
                  </div>
                </div>
                {m.seat && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Seat: <strong>{m.seat}</strong></div>}
                {m.side && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Side: <strong style={{ textTransform: "capitalize" }}>{m.side}</strong></div>}
                {m.email && <div style={{ fontSize: "0.75rem", color: "var(--water)", marginTop: "0.25rem" }}>{m.email}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
