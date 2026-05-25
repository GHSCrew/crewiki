"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileUsername, setProfileUsername] = useState(user?.username ?? "");
  const [profileStatus, setProfileStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus(null);
    const name = profileName.trim();
    const username = profileUsername.trim();
    if (!name) { setProfileStatus({ ok: false, msg: "Display name cannot be empty." }); return; }
    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      setProfileStatus({ ok: false, msg: "Username must be 3–30 lowercase letters, numbers, or underscores." }); return;
    }
    setProfileLoading(true);
    const res = await fetch(`/api/users/${user!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username: username || null }),
    });
    setProfileLoading(false);
    const data = await res.json() as { name?: string; username?: string; error?: string };
    if (res.ok) {
      updateUser({ name: data.name, username: data.username });
      setProfileName(data.name ?? profileName);
      setProfileUsername(data.username ?? "");
      setProfileStatus({ ok: true, msg: "Profile updated successfully." });
    } else {
      setProfileStatus({ ok: false, msg: data.error || "Failed to update profile." });
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (next !== confirm) { setPwStatus({ ok: false, msg: "New passwords do not match." }); return; }
    if (next.length < 6) { setPwStatus({ ok: false, msg: "Password must be at least 6 characters." }); return; }
    setPwLoading(true);
    const res = await fetch(`/api/users/${user!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwStatus({ ok: true, msg: "Password updated successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      const data = await res.json() as { error: string };
      setPwStatus({ ok: false, msg: data.error || "Failed to update password." });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)",
    borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif",
    outline: "none", transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--navy)",
    marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em",
  };

  function focusBorder(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = "var(--water)"; }
  function blurBorder(e: React.FocusEvent<HTMLInputElement>) { e.target.style.borderColor = "var(--border)"; }

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
            <span style={{ color: "var(--navy)" }}>{user?.username ?? "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Role</span>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Change profile */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem" }}>Change Profile</div>
        <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required style={inputStyle}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} style={inputStyle}
              placeholder="lowercase, numbers, underscores"
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          {profileStatus && (
            <p style={{ fontSize: "0.875rem", padding: "0.55rem 0.9rem", borderRadius: 6, margin: 0,
              color: profileStatus.ok ? "#166534" : "#c0392b",
              background: profileStatus.ok ? "#dcfce7" : "#fde8e8" }}>
              {profileStatus.msg}
            </p>
          )}

          <button type="submit" disabled={profileLoading}
            style={{ padding: "0.65rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: profileLoading ? "wait" : "pointer" }}>
            {profileLoading ? "Saving…" : "Update Profile"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem" }}>Change Password</div>
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required style={inputStyle}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} required style={inputStyle}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          {pwStatus && (
            <p style={{ fontSize: "0.875rem", padding: "0.55rem 0.9rem", borderRadius: 6, margin: 0,
              color: pwStatus.ok ? "#166534" : "#c0392b",
              background: pwStatus.ok ? "#dcfce7" : "#fde8e8" }}>
              {pwStatus.msg}
            </p>
          )}

          <button type="submit" disabled={pwLoading}
            style={{ padding: "0.65rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.95rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: pwLoading ? "wait" : "pointer" }}>
            {pwLoading ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
