"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (next !== confirm) { setStatus({ ok: false, msg: "New passwords do not match." }); return; }
    if (next.length < 6) { setStatus({ ok: false, msg: "Password must be at least 6 characters." }); return; }
    setLoading(true);
    const res = await fetch(`/api/users/${user!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus({ ok: true, msg: "Password updated successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      const data = await res.json() as { error: string };
      setStatus({ ok: false, msg: data.error || "Failed to update password." });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)",
    borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif",
    outline: "none", transition: "border-color 0.2s",
  };

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 520 }}>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Settings</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>Manage your account.</p>

      {/* Account info */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.75rem" }}>Account</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Display name</span>
            <span style={{ fontWeight: 600, color: "var(--navy)" }}>{user?.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Username</span>
            <span style={{ color: "var(--navy)" }}>{(user as { username?: string } | null)?.username ?? "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Role</span>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem" }}>Change Password</div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--water)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>New Password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--water)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Confirm New Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--water)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
          </div>

          {status && (
            <p style={{ fontSize: "0.875rem", padding: "0.55rem 0.9rem", borderRadius: 6, margin: 0,
              color: status.ok ? "#166534" : "#c0392b",
              background: status.ok ? "#dcfce7" : "#fde8e8" }}>
              {status.msg}
            </p>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: "0.65rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
