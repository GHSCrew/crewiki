"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import Link from "next/link";

export default function SuggestionsPage() {
  const { user, canEdit } = useAuth();
  const { suggestions, updateSuggestionStatus, updatePage } = useWikiStore();
  const [filter, setFilter] = useState<"all" | "open" | "approved" | "rejected" | "merged">("open");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const filtered = filter === "all" ? suggestions : suggestions.filter(s => s.status === filter);

  async function handleAction(id: string, action: "approved" | "rejected" | "merged") {
    const s = suggestions.find(sg => sg.id === id)!;
    await updateSuggestionStatus(id, action, user!.name, reviewNote[id] || "");
    if (action === "merged") {
      await updatePage(s.pageSlug, s.suggestedContent, user!.id, user!.name, user!.role, `Merged suggestion: ${s.message}`);
    }
    setReviewNote(prev => ({ ...prev, [id]: "" }));
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 900 }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.3rem" }}>Edit Suggestions</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {canEdit ? "Review and merge team suggestions." : "Your submitted suggestions and their status."}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border)" }}>
        {(["open", "approved", "merged", "rejected", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "0.45rem 0.9rem", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", fontWeight: filter === f ? 600 : 400, color: filter === f ? "var(--navy)" : "var(--text-muted)", borderBottom: filter === f ? "2px solid var(--navy)" : "2px solid transparent", marginBottom: "-2px", textTransform: "capitalize" }}>
            {f} ({f === "all" ? suggestions.length : suggestions.filter(s => s.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p style={{ color: "var(--text-muted)" }}>No suggestions in this category.</p>}

      {filtered.map(s => (
        <div key={s.id} className="fade-in" style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem", borderLeft: `4px solid ${s.status === "open" ? "var(--water)" : s.status === "approved" || s.status === "merged" ? "var(--gold)" : "#e74c3c"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <Link href={`/wiki/${s.pageSlug}`} style={{ textDecoration: "none" }}>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "var(--navy)" }}>{s.pageTitle}</span>
              </Link>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{s.authorName}</span>
                <span className={`badge badge-${s.authorRole}`}>{s.authorRole}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.createdAt}</span>
              </div>
            </div>
            <span className={`badge badge-${s.status}`}>{s.status}</span>
          </div>

          <div style={{ background: "var(--surface-raised)", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "0.75rem", fontSize: "0.82rem", color: "var(--text)" }}>
            <strong>Message:</strong> {s.message}
          </div>

          {/* Diff view */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#c0392b", fontWeight: 600, marginBottom: "0.4rem" }}>Original</div>
              <pre style={{ background: "#fde8e8", padding: "0.6rem 0.75rem", borderRadius: 6, fontSize: "0.72rem", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto" }}>{s.originalContent.slice(0, 400)}{s.originalContent.length > 400 ? "…" : ""}</pre>
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#1a6641", fontWeight: 600, marginBottom: "0.4rem" }}>Suggested</div>
              <pre style={{ background: "#dff0e8", padding: "0.6rem 0.75rem", borderRadius: 6, fontSize: "0.72rem", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", maxHeight: 180, overflow: "auto" }}>{s.suggestedContent.slice(0, 400)}{s.suggestedContent.length > 400 ? "…" : ""}</pre>
            </div>
          </div>

          {/* Review section */}
          {s.status !== "open" && s.reviewedBy && (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.5rem 0.75rem", background: "var(--surface-raised)", borderRadius: 6 }}>
              Reviewed by <strong>{s.reviewedBy}</strong> on {s.reviewedAt}
              {s.reviewNote && <> · &ldquo;{s.reviewNote}&rdquo;</>}
            </div>
          )}

          {/* Coach/captain actions */}
          {canEdit && (s.status === "open" || s.status === "approved") && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <input value={reviewNote[s.id] || ""} onChange={e => setReviewNote(prev => ({ ...prev, [s.id]: e.target.value }))}
                placeholder="Review note (optional)"
                style={{ flex: 1, minWidth: 200, padding: "0.45rem 0.75rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
              {s.status === "open" && <button onClick={() => handleAction(s.id, "approved")} style={{ padding: "0.45rem 0.9rem", background: "#dff0e8", color: "#1a6641", border: "1px solid #b3d9c4", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Approve</button>}
              <button onClick={() => handleAction(s.id, "merged")} style={{ padding: "0.45rem 0.9rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Merge</button>
              <button onClick={() => handleAction(s.id, "rejected")} style={{ padding: "0.45rem 0.9rem", background: "#fde8e8", color: "#991a1a", border: "1px solid #f5b8b8", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
