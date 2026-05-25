"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [suName, setSuName] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) router.push("/wiki");
    else setError(result.error || "Login failed.");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (suPassword !== suConfirm) { setError("Passwords do not match."); return; }
    if (suPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suName, username: suUsername, password: suPassword }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess("Request submitted! A coach or captain will activate your account.");
      setSuName(""); setSuUsername(""); setSuPassword(""); setSuConfirm("");
    } else {
      const { error } = await res.json() as { error: string };
      setError(error || "Sign-up failed.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 1rem", border: "1.5px solid var(--border)",
    borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif",
    outline: "none", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.04, backgroundImage: "repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 50%)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

      <div className="fade-in" style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: "var(--gold)", borderRadius: "50%", marginBottom: "1rem" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 16c3-4 8-6 12-4s8 6 12 4" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M4 20c3-4 8-6 12-4s8 6 12 4" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <circle cx="16" cy="11" r="3" fill="#0a1628"/>
              <path d="M16 8v-4M13 5.5l3-1.5 3 1.5" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "white", marginBottom: "0.25rem" }}>CrewWiki</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Team Knowledge Base</p>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: "2rem", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
            {(["signin", "signup"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "0.6rem", border: "none", background: "none", cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: tab === t ? 700 : 400,
                  color: tab === t ? "var(--navy)" : "var(--text-muted)",
                  borderBottom: tab === t ? "2px solid var(--navy)" : "2px solid transparent", marginBottom: "-2px" }}>
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="your_username" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              {error && <p style={{ color: "#c0392b", fontSize: "0.875rem", marginBottom: "1rem", background: "#fde8e8", padding: "0.6rem 0.9rem", borderRadius: 6 }}>{error}</p>}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "0.8rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                Request an account — a coach or captain will approve it.
              </p>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
                <input type="text" value={suName} onChange={e => setSuName(e.target.value)}
                  placeholder="Alex Chen" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Username</label>
                <input type="text" value={suUsername} onChange={e => setSuUsername(e.target.value)}
                  placeholder="alexchen" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                <input type="password" value={suPassword} onChange={e => setSuPassword(e.target.value)}
                  placeholder="At least 6 characters" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirm Password</label>
                <input type="password" value={suConfirm} onChange={e => setSuConfirm(e.target.value)}
                  placeholder="Repeat password" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--water)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")} />
              </div>
              {error && <p style={{ color: "#c0392b", fontSize: "0.875rem", marginBottom: "1rem", background: "#fde8e8", padding: "0.6rem 0.9rem", borderRadius: 6 }}>{error}</p>}
              {success && <p style={{ color: "#166534", fontSize: "0.875rem", marginBottom: "1rem", background: "#dcfce7", padding: "0.6rem 0.9rem", borderRadius: 6 }}>{success}</p>}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "0.8rem", background: "var(--water)", color: "white", border: "none", borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Submitting…" : "Request Account →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
