"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MOCK_ASSIGNMENTS } from "@/lib/data";
import type { Assignment } from "@/types";

const TYPE_ICONS: Record<Assignment["type"], string> = {
  erg: "🚣", reading: "📖", video: "▶️", other: "📌"
};

const TYPE_LABELS: Record<Assignment["type"], string> = {
  erg: "Erg Assignment", reading: "Reading", video: "Video", other: "Other"
};

export default function AssignmentsPage() {
  const { user, canEdit } = useAuth();
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "erg" as Assignment["type"], dueDate: "", googleClassroomLink: "", youtubeLink: "" });

  const visible = assignments.filter(a => !user || a.targetRoles.includes(user.role));

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const newA: Assignment = {
      id: `a-${Date.now()}`, ...form, createdBy: user!.id, createdByName: user!.name,
      targetRoles: ["athlete", "captain", "coach"], createdAt: new Date().toISOString().split("T")[0],
    };
    setAssignments(prev => [newA, ...prev]);
    setShowForm(false);
    setForm({ title: "", description: "", type: "erg", dueDate: "", googleClassroomLink: "", youtubeLink: "" });
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Assignments</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Erg work, videos, readings from Coach.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            + New Assignment
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canEdit && (
        <form onSubmit={handleCreate} className="fade-in" style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "1rem" }}>New Assignment</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Assignment["type"] }))} style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white" }}>
                <option value="erg">Erg</option><option value="video">Video</option><option value="reading">Reading</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Description</label>
              <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>Google Classroom Link</label>
              <input type="url" value={form.googleClassroomLink} onChange={e => setForm(f => ({ ...f, googleClassroomLink: e.target.value }))} placeholder="https://classroom.google.com/…" style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>YouTube Link</label>
              <input type="url" value={form.youtubeLink} onChange={e => setForm(f => ({ ...f, youtubeLink: e.target.value }))} placeholder="https://youtube.com/…" style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid var(--border)", borderRadius: 7, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" style={{ padding: "0.6rem 1.25rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Post Assignment</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 1rem", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Assignment cards */}
      {visible.map(a => (
        <div key={a.id} className="fade-in" style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
            {TYPE_ICONS[a.type]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "var(--navy)" }}>{a.title}</h3>
              {a.dueDate && (
                <span style={{ fontSize: "0.75rem", background: "var(--gold-pale)", color: "var(--navy)", padding: "2px 10px", borderRadius: 99, fontWeight: 600, border: "1px solid var(--gold)", whiteSpace: "nowrap" }}>
                  Due {a.dueDate}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>{TYPE_LABELS[a.type]}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>by {a.createdByName} · {a.createdAt}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text)", marginBottom: "0.75rem" }}>{a.description}</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {a.googleClassroomLink && (
                <a href={a.googleClassroomLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", background: "#4285f4", color: "white", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                  📚 Open in Google Classroom
                </a>
              )}
              {a.youtubeLink && (
                <a href={a.youtubeLink} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", background: "#ff0000", color: "white", borderRadius: 7, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                  ▶ Watch on YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
