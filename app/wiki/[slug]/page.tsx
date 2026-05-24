"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import type { EditSuggestion } from "@/types";

type Tab = "read" | "edit" | "suggest" | "history" | "blame";

function renderWikiContent(content: string) {
  // Simple markdown → HTML renderer
  let html = content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[\[(.+?)\]\]/g, "<a href='#'>$1</a>")
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' target='_blank'>$1</a>")
    .replace(/^- \[ \] (.+)$/gm, "<li style='list-style:none'>☐ $1</li>")
    .replace(/^- \[x\] (.+)$/gm, "<li style='list-style:none;color:var(--text-muted)'>☑ $1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split("|").slice(1, -1);
      return "<tr>" + cells.map(c => `<td>${c.trim()}</td>`).join("") + "</tr>";
    });
  return html;
}

export default function WikiPageView() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, canEdit } = useAuth();
  const { getPage, getVersions, getPageComments, addComment, resolveComment, updatePage, addSuggestion, suggestions } = useWikiStore();
  const router = useRouter();

  const page = getPage(slug);
  const versions = getVersions(page?.id || "");
  const comments = getPageComments(page?.id || "");
  const pageSuggestions = suggestions.filter(s => s.pageId === page?.id);

  const [tab, setTab] = useState<Tab>("read");
  const [editContent, setEditContent] = useState(page?.content || "");
  const [editMessage, setEditMessage] = useState("");
  const [suggestContent, setSuggestContent] = useState(page?.content || "");
  const [suggestMessage, setSuggestMessage] = useState("");
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [saved, setSaved] = useState(false);

  if (!page) return (
    <div style={{ padding: "3rem", color: "var(--text-muted)" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "var(--navy)" }}>Page not found</h2>
      <p style={{ marginTop: "0.5rem" }}>No article at <code>{slug}</code>.</p>
      <button onClick={() => router.push("/wiki")} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--navy)", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>← Back to Wiki</button>
    </div>
  );

  const lines = page.content.split("\n");
  const lineCommentMap: Record<number, typeof comments> = {};
  comments.forEach(c => {
    if (!lineCommentMap[c.lineNumber]) lineCommentMap[c.lineNumber] = [];
    lineCommentMap[c.lineNumber].push(c);
  });

  function handleSave() {
    if (!editMessage.trim()) return;
    updatePage(page!.id, editContent, user!.id, user!.name, editMessage);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setTab("read");
  }

  function handleSuggest() {
    if (!suggestMessage.trim()) return;
    const s: Omit<EditSuggestion, "id" | "createdAt"> = {
      pageId: page!.id, pageTitle: page!.title, pageSlug: page!.slug,
      authorId: user!.id, authorName: user!.name, authorRole: user!.role,
      originalContent: page!.content, suggestedContent: suggestContent,
      message: suggestMessage, status: "open",
    };
    addSuggestion(s);
    setSuggestMessage("");
    setTab("read");
    alert("Suggestion submitted! A coach or captain will review it.");
  }

  function handleAddComment() {
    if (!commentBody.trim() || commentLine === null) return;
    addComment({
      pageId: page!.id, lineNumber: commentLine,
      lineContent: lines[commentLine - 1] || "",
      authorId: user!.id, authorName: user!.name, authorRole: user!.role,
      body: commentBody, resolved: false,
    });
    setCommentBody("");
    setCommentLine(null);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "read", label: "Read" },
    { id: "blame", label: "Blame" },
    { id: "history", label: `History (${versions.length})` },
    ...(canEdit ? [{ id: "edit" as Tab, label: "Edit" }] : [{ id: "suggest" as Tab, label: "Suggest Edit" }]),
  ];

  return (
    <div style={{ padding: "2rem 3rem", maxWidth: 1000 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        <span style={{ cursor: "pointer", color: "var(--water)" }} onClick={() => router.push("/wiki")}>Wiki</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span>{page.folder}</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--text)" }}>{page.title}</span>
      </div>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)" }}>{page.title}</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, marginTop: "0.4rem" }}>
          {page.tags.map(t => (
            <span key={t} style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "3px 8px", borderRadius: 99, border: "1px solid var(--border)" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Meta bar */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span>By <strong>{page.authorName}</strong></span>
        <span>v{page.version}</span>
        <span>Updated {page.updatedAt}</span>
        <span>{pageSuggestions.filter(s => s.status === "open").length} open suggestion{pageSuggestions.filter(s => s.status === "open").length !== 1 ? "s" : ""}</span>
      </div>

      {/* YouTube links */}
      {page.youtubeLinks && page.youtubeLinks.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.5rem" }}>▶️</span>
          <div>
            <div style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Related Videos</div>
            {page.youtubeLinks.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "white", fontSize: "0.875rem", display: "block" }}>Watch on YouTube →</a>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "2px solid var(--border)", marginBottom: "1.5rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "0.5rem 1rem", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "var(--navy)" : "var(--text-muted)", borderBottom: tab === t.id ? "2px solid var(--navy)" : "2px solid transparent", marginBottom: "-2px", transition: "color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* READ TAB */}
      {tab === "read" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: "2rem" }}>
            {/* Line-annotated content */}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.875rem", lineHeight: "1.7" }}>
                {lines.map((line, idx) => {
                  const lineNum = idx + 1;
                  const lineComments = lineCommentMap[lineNum] || [];
                  const hasComment = lineComments.length > 0;
                  return (
                    <div key={idx}>
                      <div className="line-row">
                        <span className="line-number" onClick={() => setCommentLine(commentLine === lineNum ? null : lineNum)} title="Click to comment">{lineNum}</span>
                        <span className={`line-content ${hasComment ? "has-comment" : ""} ${commentLine === lineNum ? "highlighted" : ""}`} onClick={() => setCommentLine(commentLine === lineNum ? null : lineNum)}>
                          {line || " "}
                        </span>
                        {hasComment && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--gold)", alignSelf: "center" }}>💬 {lineComments.filter(c => !c.resolved).length}</span>
                        )}
                      </div>
                      {/* Inline comment thread */}
                      {hasComment && lineComments.filter(c => !c.resolved).map(c => (
                        <div key={c.id} style={{ display: "flex", gap: "0.75rem", background: "rgba(201,168,76,0.08)", borderLeft: "3px solid var(--gold)", padding: "0.6rem 0.75rem 0.6rem 2.75rem", margin: "0.15rem 0" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--navy)" }}>{c.authorName}</span>
                              <span className={`badge badge-${c.authorRole}`}>{c.authorRole}</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{c.createdAt}</span>
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "'DM Sans', sans-serif" }}>{c.body}</p>
                          </div>
                          {canEdit && (
                            <button onClick={() => resolveComment(c.id)} style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>Resolve</button>
                          )}
                        </div>
                      ))}
                      {/* Comment input box */}
                      {commentLine === lineNum && (
                        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 0.5rem 0.5rem 2.5rem", background: "var(--gold-pale)", borderLeft: "3px solid var(--water)" }}>
                          <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Add a comment on this line…" rows={2}
                            style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none" }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <button onClick={handleAddComment} style={{ padding: "0.4rem 0.75rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Post</button>
                            <button onClick={() => setCommentLine(null)} style={{ padding: "0.4rem 0.75rem", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.75rem", cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right sidebar — page suggestions */}
            {pageSuggestions.length > 0 && (
              <div style={{ width: 240, flexShrink: 0 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem" }}>Suggestions</div>
                {pageSuggestions.map(s => (
                  <div key={s.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{s.authorName}</span>
                      <span className={`badge badge-${s.status}`}>{s.status}</span>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.message}</p>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{s.createdAt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLAME TAB */}
      {tab === "blame" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Git blame shows who last modified each part of this article.</p>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", lineHeight: "1.7" }}>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              // Simulate blame by attributing lines to versions
              const vIdx = Math.floor((idx / lines.length) * Math.max(versions.length, 1));
              const ver = versions[vIdx] || { authorName: page.authorName, authorRole: page.authorId === "u1" ? "coach" : "athlete", createdAt: page.createdAt, version: 1 };
              return (
                <div key={idx} className="line-row" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                  <span style={{ minWidth: "1.8rem", color: "var(--text-muted)", textAlign: "right", padding: "0 0.4rem", fontSize: "0.72rem" }}>{lineNum}</span>
                  <span style={{ minWidth: 140, padding: "0 0.75rem", fontSize: "0.72rem", color: "var(--text-muted)", borderRight: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>{ver.authorName}</span> · v{ver.version} · {ver.createdAt}
                  </span>
                  <span style={{ flex: 1, padding: "0 0.75rem", whiteSpace: "pre-wrap" }}>{line || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="fade-in">
          {versions.length === 0 && <p style={{ color: "var(--text-muted)" }}>No version history yet.</p>}
          {versions.map((v, i) => (
            <div key={v.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.75rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>v{v.version}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{v.authorName}</span>
                  <span className={`badge badge-${v.authorRole}`}>{v.authorRole}</span>
                  {i === 0 && <span style={{ fontSize: "0.7rem", background: "var(--navy)", color: "var(--gold)", padding: "1px 6px", borderRadius: 4 }}>LATEST</span>}
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text)" }}>{v.message}</p>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{v.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT TAB (coaches/captains) */}
      {tab === "edit" && canEdit && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>You have editor access. Changes are saved with a commit message.</p>
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={24}
            style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", padding: "1rem", border: "1.5px solid var(--border)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: "1.6", background: "var(--navy)", color: "#c8d8e8" }}
            onFocus={e => (e.target.style.borderColor = "var(--gold)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
            <input value={editMessage} onChange={e => setEditMessage(e.target.value)} placeholder="Commit message (e.g. 'Updated catch section from practice notes')"
              style={{ flex: 1, padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              onFocus={e => (e.target.style.borderColor = "var(--water)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            <button onClick={handleSave} disabled={!editMessage.trim()}
              style={{ padding: "0.65rem 1.5rem", background: !editMessage.trim() ? "var(--border)" : "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontWeight: 600, cursor: editMessage.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* SUGGEST TAB (athletes) */}
      {tab === "suggest" && !canEdit && (
        <div className="fade-in">
          <div style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem" }}>
            <strong>Suggesting an edit:</strong> Your suggestion will be reviewed by a coach or captain before being merged.
          </div>
          <textarea value={suggestContent} onChange={e => setSuggestContent(e.target.value)} rows={24}
            style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", padding: "1rem", border: "1.5px solid var(--border)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: "1.6", background: "var(--navy)", color: "#c8d8e8" }} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
            <input value={suggestMessage} onChange={e => setSuggestMessage(e.target.value)} placeholder="Describe your change and why you're suggesting it"
              style={{ flex: 1, padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <button onClick={handleSuggest} disabled={!suggestMessage.trim()}
              style={{ padding: "0.65rem 1.5rem", background: !suggestMessage.trim() ? "var(--border)" : "var(--water)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: suggestMessage.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              Submit Suggestion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
