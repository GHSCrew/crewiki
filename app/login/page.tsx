"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { MOCK_USERS } from "@/lib/data";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/wiki");
    } else {
      setError(result.error || "Login failed.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      {/* Background pattern */}
      <div style={{ position: "fixed", inset: 0, opacity: 0.04, backgroundImage: "repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 50%)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

      <div className="fade-in" style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo / Brand */}
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

        {/* Card */}
        <div style={{ background: "white", borderRadius: 16, padding: "2rem", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", marginBottom: "0.25rem", color: "var(--navy)" }}>Sign in</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Use your team email address.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@crew.edu" required
                style={{ width: "100%", padding: "0.7rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => (e.target.style.borderColor = "var(--water)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Any password (demo)" required
                style={{ width: "100%", padding: "0.7rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => (e.target.style.borderColor = "var(--water)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            {error && <p style={{ color: "#c0392b", fontSize: "0.875rem", marginBottom: "1rem", background: "#fde8e8", padding: "0.6rem 0.9rem", borderRadius: 6 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "0.8rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: loading ? "wait" : "pointer", letterSpacing: "0.02em", transition: "background 0.2s" }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Demo accounts</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {MOCK_USERS.map(u => (
                <button key={u.id} onClick={() => { setEmail(u.email); setPassword("demo"); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: "0.82rem", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-pale)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--cream)")}
                >
                  <span style={{ color: "var(--text)" }}>{u.name}</span>
                  <span className={`badge badge-${u.role}`}>{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
