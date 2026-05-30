"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { DiscussionType, DiscussionPost, User } from "@/types";

const TYPE_META: Record<DiscussionType, { label: string; desc: string; color: string; bg: string }> = {
  stub:       { label: "Stub",       desc: "Too little info — needs more detail", color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  error:      { label: "Error",      desc: "Contains incorrect information",      color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
  redundancy: { label: "Redundancy", desc: "Too much / unnecessary information",  color: "#ea580c", bg: "rgba(234,88,12,0.12)" },
  reference:  { label: "Reference",  desc: "Simply referencing this item",        color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
};
const TYPE_ORDER: DiscussionType[] = ["stub", "error", "redundancy", "reference"];

interface TagDraft { kind: "page" | "folder"; ref: string; label: string }

function prettyTime(iso: string): string {
  try { return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a"); } catch { return iso; }
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function IssuesPage() {
  const { user, canEdit } = useAuth();
  const { pages, discussions, fetchDiscussions, createDiscussion, setDiscussionResolved, setDiscussionAssignees, deleteDiscussion } = useWikiStore();

  const [members, setMembers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DiscussionType>("stub");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<TagDraft[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);
  useEffect(() => { fetch("/api/users").then(r => r.json()).then(setMembers).catch(() => {}); }, []);

  // All taggable folders: every existing folder path plus its ancestors.
  const allFolders = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) {
      const parts = p.folder.split("/").filter(Boolean);
      let acc = "";
      for (const part of parts) { acc = acc ? `${acc}/${part}` : part; set.add(acc); }
    }
    return [...set].sort();
  }, [pages]);

  const tagSuggestions = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    const taken = new Set(tags.map(t => `${t.kind}:${t.ref}`));
    const pageHits: TagDraft[] = pages
      .filter(p => !taken.has(`page:${p.slug}`) && (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q)))
      .slice(0, 6)
      .map(p => ({ kind: "page", ref: p.slug, label: p.title }));
    const folderHits: TagDraft[] = allFolders
      .filter(f => !taken.has(`folder:${f}`) && (!q || f.toLowerCase().includes(q)))
      .slice(0, 4)
      .map(f => ({ kind: "folder", ref: f, label: f }));
    return [...folderHits, ...pageHits].slice(0, 8);
  }, [tagQuery, tags, pages, allFolders]);

  const visible = discussions.filter(d => showResolved ? true : !d.resolved);
  const resolvedCount = discussions.filter(d => d.resolved).length;

  function addTag(t: TagDraft) { setTags(prev => [...prev, t]); setTagQuery(""); }
  function removeTag(t: TagDraft) { setTags(prev => prev.filter(x => !(x.kind === t.kind && x.ref === t.ref))); }

  function resetForm() { setShowForm(false); setType("stub"); setTitle(""); setBody(""); setTags([]); setTagQuery(""); }

  async function submit() {
    if (!title.trim() || !user) return;
    setSubmitting(true);
    await createDiscussion({
      type, title: title.trim(), body: body.trim(),
      authorId: user.id, authorName: user.name, authorRole: user.role,
      tags,
    });
    setSubmitting(false);
    resetForm();
    toast("Post published", "success");
  }

  function tagHref(t: { kind: string; ref: string }) {
    return t.kind === "page" ? `/wiki/content/${t.ref}` : `/wiki/folder/${encodeURIComponent(t.ref)}`;
  }

  function isAssigned(post: DiscussionPost, userId: string) {
    return post.assignees.some(a => a.userId === userId);
  }

  async function toggleAssignee(post: DiscussionPost, u: { id: string; name: string; role: User["role"] }) {
    const next = isAssigned(post, u.id)
      ? post.assignees.filter(a => a.userId !== u.id)
      : [...post.assignees, { id: "", postId: post.id, userId: u.id, userName: u.name, userRole: u.role }];
    await setDiscussionAssignees(post.id, next.map(a => ({ userId: a.userId, userName: a.userName, userRole: a.userRole })));
  }

  const inputStyle: React.CSSProperties = { padding: "0.55rem 0.85rem", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%" };

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Issues</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Requests for improvement, references, and team chat. Tag pages and folders to call attention to them.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: "0.5rem 1.1rem", background: "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.875rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
          {showForm ? "Cancel" : "+ New post"}
        </button>
      </div>

      {/* New post form */}
      {showForm && (
        <div style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.75rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {/* Type */}
          <div>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>Request type</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {TYPE_ORDER.map(t => {
                const meta = TYPE_META[t];
                const active = type === t;
                return (
                  <button key={t} onClick={() => setType(t)} title={meta.desc}
                    style={{ padding: "0.4rem 0.85rem", borderRadius: 999, border: `1.5px solid ${meta.color}`, background: active ? meta.color : meta.bg, color: active ? "white" : meta.color, fontSize: "0.8rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{TYPE_META[type].desc}</p>
          </div>

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title…" autoFocus style={inputStyle} />

          {/* Body */}
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Body (optional)…" rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />

          {/* Tag picker */}
          <div>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>Tag pages / folders</div>
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {tags.map(t => (
                  <span key={`${t.kind}:${t.ref}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.2rem 0.5rem", borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--navy)" }}>
                    <span>{t.kind === "folder" ? "📁" : "📄"}</span>{t.label}
                    <button onClick={() => removeTag(t)} style={{ border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ position: "relative" }}>
              <input value={tagQuery} onChange={e => setTagQuery(e.target.value)} placeholder="Search a page or folder to tag…" style={inputStyle} />
              {tagQuery.trim() && tagSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 0.25rem)", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}>
                  {tagSuggestions.map(s => (
                    <button key={`${s.kind}:${s.ref}`} onClick={() => addTag(s)}
                      style={{ width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", background: "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>{s.kind === "folder" ? "📁" : "📄"}</span>
                      <span style={{ flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{s.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
            <button onClick={resetForm} style={{ padding: "0.5rem 1rem", background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>Cancel</button>
            <button onClick={submit} disabled={!title.trim() || submitting}
              style={{ padding: "0.5rem 1.25rem", background: title.trim() ? "var(--navy)" : "var(--border)", color: "var(--gold)", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: title.trim() && !submitting ? "pointer" : "not-allowed" }}>
              {submitting ? "Publishing…" : "Publish post"}
            </button>
          </div>
        </div>
      )}

      {/* Resolved toggle (minimal) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.85rem" }}>
        <button onClick={() => setShowResolved(v => !v)}
          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          {showResolved ? "Hide" : "Show"} resolved{resolvedCount > 0 ? ` (${resolvedCount})` : ""}
        </button>
      </div>

      {/* Posts */}
      {visible.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "white", border: "1px solid var(--border)", borderRadius: 12 }}>
          {discussions.length === 0 ? "No posts yet. Start the conversation!" : "No open posts. 🎉"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {visible.map(post => {
            const meta = TYPE_META[post.type];
            const mineAssigned = user ? isAssigned(post, user.id) : false;
            return (
              <div key={post.id} style={{ background: "white", border: "1px solid var(--border)", borderLeft: `4px solid ${meta.color}`, borderRadius: 10, padding: "1rem 1.25rem", opacity: post.resolved ? 0.7 : 1 }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                  <span style={{ padding: "0.15rem 0.6rem", borderRadius: 999, background: meta.bg, color: meta.color, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{meta.label}</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--navy)" }}>{post.title}</span>
                  {post.resolved && <span style={{ fontSize: "0.68rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "1px 7px", borderRadius: 4, fontWeight: 600 }}>✓ Resolved</span>}
                </div>

                {/* Body */}
                {post.body && <p style={{ fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.55, marginBottom: "0.6rem", whiteSpace: "pre-wrap" }}>{post.body}</p>}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
                    {post.tags.map(t => (
                      <Link key={t.id} href={tagHref(t)} style={{ textDecoration: "none" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", fontSize: "0.76rem", color: "var(--water)", fontWeight: 600 }}>
                          <span>{t.kind === "folder" ? "📁" : "📄"}</span>{t.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Footer: meta + assignees + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", paddingTop: "0.6rem", borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    By <strong style={{ color: "var(--navy)" }}>{post.authorName}</strong> · {prettyTime(post.createdAt)}
                  </span>

                  {/* Assignees */}
                  {post.assignees.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Assigned:</span>
                      {post.assignees.map(a => (
                        <span key={a.userId} title={`${a.userName} (${a.userRole})`}
                          style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700 }}>
                          {initials(a.userName)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Assign self */}
                  {user && (
                    <button onClick={() => toggleAssignee(post, { id: user.id, name: user.name, role: user.role })}
                      style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem", borderRadius: 6, border: "1px solid var(--border)", background: mineAssigned ? "var(--surface-raised)" : "none", color: "var(--navy)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                      {mineAssigned ? "Unassign me" : "Assign me"}
                    </button>
                  )}

                  {/* Assign others (editors) */}
                  {canEdit && (
                    <div style={{ position: "relative" }}>
                      <button onClick={() => setAssignOpen(assignOpen === post.id ? null : post.id)}
                        style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem", borderRadius: 6, border: "1px solid var(--border)", background: "none", color: "var(--navy)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                        Assign…
                      </button>
                      {assignOpen === post.id && (
                        <div style={{ position: "absolute", bottom: "calc(100% + 0.3rem)", right: 0, zIndex: 20, background: "white", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.14)", minWidth: 200, maxHeight: 240, overflowY: "auto" }}>
                          {members.map(m => {
                            const on = isAssigned(post, m.id);
                            return (
                              <button key={m.id} onClick={() => toggleAssignee(post, { id: m.id, name: m.name, role: m.role })}
                                style={{ width: "100%", textAlign: "left", padding: "0.45rem 0.7rem", background: on ? "var(--surface-raised)" : "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ width: 16 }}>{on ? "✓" : ""}</span>
                                <span style={{ flex: 1 }}>{m.name}</span>
                                <span className={`badge badge-${m.role}`}>{m.role}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolve (editors) */}
                  {canEdit && user && (
                    <button onClick={() => setDiscussionResolved(post.id, !post.resolved, user.name)}
                      style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem", borderRadius: 6, border: "none", background: post.resolved ? "var(--border)" : "var(--navy)", color: post.resolved ? "var(--text)" : "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                      {post.resolved ? "Reopen" : "Resolve"}
                    </button>
                  )}

                  {/* Delete own post (or editors) */}
                  {user && (canEdit || post.authorId === user.id) && (
                    <button onClick={() => deleteDiscussion(post.id)}
                      style={{ fontSize: "0.74rem", padding: "0.25rem 0.5rem", borderRadius: 6, border: "1px solid rgba(153,26,26,0.2)", background: "none", color: "#b03030", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                      Delete
                    </button>
                  )}
                </div>

                {post.resolved && post.resolvedBy && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                    Resolved by {post.resolvedBy}{post.resolvedAt ? ` · ${prettyTime(post.resolvedAt)}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
