"use client";
import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { diffLines } from "diff";
import { toast } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import type { EditSuggestion, PageVersion } from "@/types";

// ─── Blame ────────────────────────────────────────────────────────────────────

type BlameInfo = { authorName: string; version: number; createdAt: string };

function computeBlame(sortedVersions: PageVersion[], currentLines: string[], pageAuthor: string, pageDate: string): BlameInfo[] {
  const noHistoryFallback: BlameInfo = { authorName: pageAuthor, version: 1, createdAt: pageDate };
  if (sortedVersions.length === 0) return currentLines.map(() => noHistoryFallback);

  const fallback: BlameInfo = { authorName: sortedVersions[0].authorName, version: sortedVersions[0].version, createdAt: sortedVersions[0].createdAt };
  const blame: BlameInfo[] = currentLines.map(() => fallback);
  const currentContent = currentLines.join("\n");

  for (let vi = 0; vi < sortedVersions.length; vi++) {
    const prevContent = vi > 0 ? sortedVersions[vi - 1].content : "";
    const currContent = sortedVersions[vi].content;
    const vInfo: BlameInfo = { authorName: sortedVersions[vi].authorName, version: sortedVersions[vi].version, createdAt: sortedVersions[vi].createdAt };

    // Step 1: find which positions in currContent were newly added in this version
    const addedInCurr = new Set<number>();
    let pos = 0;
    for (const change of diffLines(prevContent, currContent)) {
      const count = change.count ?? 0;
      if (change.added) {
        for (let i = 0; i < count; i++) addedInCurr.add(pos + i);
        pos += count;
      } else if (!change.removed) {
        pos += count;
      }
    }

    // Step 2: map those positions in currContent to positions in currentContent
    // using a positional diff (not content matching) so duplicate lines work correctly
    const currToFinal = new Map<number, number>();
    let cPos = 0, fPos = 0;
    for (const change of diffLines(currContent, currentContent)) {
      const count = change.count ?? 0;
      if (!change.added && !change.removed) {
        for (let i = 0; i < count; i++) currToFinal.set(cPos + i, fPos + i);
        cPos += count; fPos += count;
      } else if (change.removed) {
        cPos += count;
      } else {
        fPos += count;
      }
    }

    // Step 3: credit surviving added lines to this version
    for (const addedPos of addedInCurr) {
      const finalPos = currToFinal.get(addedPos);
      if (finalPos !== undefined && finalPos < blame.length) {
        blame[finalPos] = vInfo;
      }
    }
  }

  return blame;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function renderInline(raw: string): string {
  let s = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  s = s.replace(/\[\[(.+?)\]\]/g, (_, inner) => {
    const parts = inner.split("|");
    const target = parts[0].trim();
    const label = (parts[1] ?? parts[0]).trim();
    return `<a class="wikilink" href="/wiki/${slugify(target)}">${label}</a>`;
  });
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

const CALLOUT_ICONS: Record<string, string> = {
  note: "ℹ", tip: "💡", warning: "⚠", danger: "🔴",
  info: "ℹ", success: "✓", question: "?", example: "⋮", quote: '"',
};

function parseTableCells(row: string): string[] {
  return row.split("|").slice(1, -1).map((c) => c.trim());
}

function isTableStart(lines: string[], i: number): boolean {
  return (
    lines[i].includes("|") &&
    i + 1 < lines.length &&
    /^\|[\s\-:|]+\|$/.test(lines[i + 1])
  );
}

function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.match(/^```/)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      html += `<pre><code${lang ? ` class="language-${escHtml(lang)}"` : ""}>${escHtml(codeLines.join("\n"))}</code></pre>`;
      i++;
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,3}) (.+)$/);
    if (hm) {
      const level = hm[1].length;
      const text = hm[2].trim();
      const id = slugify(text);
      html += `<h${level} id="${id}">${renderInline(text)}</h${level}>`;
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,})$/)) {
      html += "<hr>";
      i++;
      continue;
    }

    // Blockquote / callout
    if (line.startsWith("> ") || line === ">") {
      const bqLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        bqLines.push(lines[i].startsWith("> ") ? lines[i].slice(2) : "");
        i++;
      }
      const firstLine = bqLines[0] ?? "";
      const cm = firstLine.match(/^\[!([\w]+)\]\s*(.*)$/i);
      if (cm) {
        const type = cm[1].toLowerCase();
        const titleText = cm[2].trim() || (type.charAt(0).toUpperCase() + type.slice(1));
        const icon = CALLOUT_ICONS[type] ?? "📌";
        const bodyHtml = renderMarkdown(bqLines.slice(1).join("\n"));
        html += `<div class="callout callout-${escHtml(type)}"><div class="callout-title"><span>${icon}</span> ${escHtml(titleText)}</div><div class="callout-body">${bodyHtml}</div></div>`;
      } else {
        html += `<blockquote><p>${renderInline(bqLines.join(" "))}</p></blockquote>`;
      }
      continue;
    }

    // Table
    if (isTableStart(lines, i)) {
      const headers = parseTableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(parseTableCells(lines[i]));
        i++;
      }
      html +=
        "<table><thead><tr>" +
        headers.map((h) => `<th>${renderInline(h)}</th>`).join("") +
        "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => `<td>${renderInline(c)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>";
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      let isTask = false;
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        const body = lines[i].slice(2);
        const done = body.match(/^\[x\] (.+)$/i);
        const open = body.match(/^\[ \] (.+)$/);
        if (done) {
          isTask = true;
          items.push(`<li class="task-done">☑ ${renderInline(done[1])}</li>`);
        } else if (open) {
          isTask = true;
          items.push(`<li class="task-open">☐ ${renderInline(open[1])}</li>`);
        } else {
          items.push(`<li>${renderInline(body)}</li>`);
        }
        i++;
      }
      html += `<ul${isTask ? ' class="task-list"' : ""}>${items.join("")}</ul>`;
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const m = lines[i].match(/^\d+\. (.+)$/);
        if (m) items.push(`<li>${renderInline(m[1])}</li>`);
        i++;
      }
      html += `<ol>${items.join("")}</ol>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect until a blank line or a block-level starter
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6} /) &&
      !lines[i].match(/^[-*] /) &&
      !lines[i].match(/^\d+\. /) &&
      !lines[i].startsWith(">") &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^(-{3,}|\*{3,})$/) &&
      !isTableStart(lines, i)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      html += `<p>${renderInline(paraLines.join(" "))}</p>`;
    } else {
      i++; // guard against infinite loop on unhandled line
    }
  }

  return html;
}

function extractToc(content: string): Array<{ level: number; text: string; id: string }> {
  return content
    .split("\n")
    .filter((l) => /^#{1,3} /.test(l))
    .map((l) => {
      const m = l.match(/^(#{1,3}) (.+)$/)!;
      return { level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WikiPageView() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, canEdit } = useAuth();
  const { getPage, getVersions, getPageComments, addComment, resolveComment, updatePage, addSuggestion, suggestions, viewMode, setViewMode, fetchVersions } = useWikiStore();
  const router = useRouter();

  const page = getPage(slug);
  const versions = getVersions(page?.id ?? "");
  const comments = getPageComments(page?.id ?? "");
  const pageSuggestions = suggestions.filter((s) => s.pageId === page?.id);

  useEffect(() => {
    if ((viewMode === "history" || viewMode === "blame") && slug) {
      fetchVersions(slug);
    }
  }, [viewMode, slug, fetchVersions, page?.version ?? 0]);

  const [editContent, setEditContent] = useState(page?.content ?? "");
  const [editMessage, setEditMessage] = useState("");
  const [suggestContent, setSuggestContent] = useState(page?.content ?? "");
  const [suggestMessage, setSuggestMessage] = useState("");
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [saved, setSaved] = useState(false);
  const [expandedSug, setExpandedSug] = useState<string | null>(null);

  // Strip the leading H1 since the page title is already shown above the tabs
  const contentBody = useMemo(
    () => (page ? page.content.replace(/^# [^\n]*\n?/, "") : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page?.content]
  );
  const renderedHtml = useMemo(() => renderMarkdown(contentBody), [contentBody]);
  const toc = useMemo(() => extractToc(contentBody), [contentBody]);
  const sortedVersions = useMemo(() => [...versions].sort((a, b) => a.version - b.version), [versions]);
  const lines = useMemo(() => (page?.content ?? "").split("\n"), [page?.content]);
  const blame = useMemo(
    () => computeBlame(sortedVersions, lines, page?.authorName ?? "Unknown", page?.createdAt ?? ""),
    [sortedVersions, lines, page?.authorName, page?.createdAt]
  );

  if (!page) return (
    <div style={{ padding: "3rem", color: "var(--text-muted)" }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", color: "var(--navy)" }}>Page not found</h2>
      <p style={{ marginTop: "0.5rem" }}>No article at <code>{slug}</code>.</p>
      <button onClick={() => router.push("/wiki")} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--navy)", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>← Back to Wiki</button>
    </div>
  );

  const lineCommentMap: Record<number, typeof comments> = {};
  comments.forEach((c) => {
    if (!lineCommentMap[c.lineNumber]) lineCommentMap[c.lineNumber] = [];
    lineCommentMap[c.lineNumber].push(c);
  });

  const openCommentCount = comments.filter((c) => !c.resolved).length;

  function handleSave() {
    if (!editMessage.trim()) return;
    updatePage(page!.slug, editContent, user!.id, user!.name, user!.role, editMessage);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setViewMode("read");
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
    setViewMode("read");
    toast("Suggestion submitted! A coach or captain will review it.");
  }

  function handleAddComment() {
    if (!commentBody.trim() || commentLine === null) return;
    addComment({
      pageId: page!.id, lineNumber: commentLine,
      lineContent: lines[commentLine - 1] ?? "",
      authorId: user!.id, authorName: user!.name, authorRole: user!.role,
      body: commentBody, resolved: false,
    });
    setCommentBody("");
    setCommentLine(null);
  }

  return (
    <div style={{ padding: "2rem 3rem", maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        <span style={{ cursor: "pointer", color: "var(--water)" }} onClick={() => router.push("/wiki")}>Wiki</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ cursor: "pointer", color: "var(--water)" }} onClick={() => router.push(`/wiki/folder/${encodeURIComponent(page.folder)}`)}>{page.folder}</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--text)" }}>{page.title}</span>
      </div>

      {/* Title row */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)" }}>{page.title}</h1>
      </div>

      {/* Meta bar */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span>By <strong>{page.authorName}</strong></span>
        <span>v{page.version}</span>
        <span>Updated {page.updatedAt}</span>
        <span>{pageSuggestions.filter((s) => s.status === "open").length} open suggestion{pageSuggestions.filter((s) => s.status === "open").length !== 1 ? "s" : ""}</span>
      </div>

      {/* YouTube links */}
      {page.youtubeLinks && page.youtubeLinks.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.5rem" }}>▶️</span>
          <div>
            <div style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Related Videos</div>
            {page.youtubeLinks.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "white", fontSize: "0.875rem", display: "block" }}>Watch on YouTube →</a>
            ))}
          </div>
        </div>
      )}

      {/* ── READ ── */}
      {viewMode === "read" && (
        <div className="fade-in" style={{ display: "flex", gap: "3rem", alignItems: "flex-start" }}>
          {/* Rendered article */}
          <div
            className="wiki-content"
            style={{ flex: 1, minWidth: 0 }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {/* Table of contents */}
          {toc.length > 1 && (
            <nav className="toc" style={{ width: 196, flexShrink: 0 }}>
              <div className="toc-title">On this page</div>
              {toc.map((item, idx) => (
                <a key={idx} href={`#${item.id}`} className={`toc-link toc-h${item.level}`}>
                  {item.text}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      {/* ── COMMENTS ── */}
      {viewMode === "comments" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: "2rem" }}>
            {/* Line-annotated source */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Click any line number to leave a comment on that line.
              </p>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.875rem", lineHeight: "1.7" }}>
                {lines.map((line, idx) => {
                  const lineNum = idx + 1;
                  const lineComments = lineCommentMap[lineNum] ?? [];
                  const hasComment = lineComments.length > 0;
                  return (
                    <div key={idx}>
                      <div className="line-row">
                        <span className="line-number" onClick={() => setCommentLine(commentLine === lineNum ? null : lineNum)} title="Click to comment">{lineNum}</span>
                        <span
                          className={`line-content ${hasComment ? "has-comment" : ""} ${commentLine === lineNum ? "highlighted" : ""}`}
                          onClick={() => setCommentLine(commentLine === lineNum ? null : lineNum)}
                        >
                          {line || " "}
                        </span>
                        {hasComment && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--gold)", alignSelf: "center" }}>
                            💬 {lineComments.filter((c) => !c.resolved).length}
                          </span>
                        )}
                      </div>

                      {/* Inline comment thread */}
                      {hasComment && lineComments.filter((c) => !c.resolved).map((c) => (
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

                      {/* Comment input */}
                      {commentLine === lineNum && (
                        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 0.5rem 0.5rem 2.5rem", background: "var(--gold-pale)", borderLeft: "3px solid var(--water)" }}>
                          <textarea
                            value={commentBody}
                            onChange={(e) => setCommentBody(e.target.value)}
                            placeholder="Add a comment on this line…"
                            rows={2}
                            style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none" }}
                          />
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

            {/* Suggestions sidebar */}
            {pageSuggestions.length > 0 && (
              <div style={{ width: 260, flexShrink: 0 }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem" }}>Suggestions</div>
                {pageSuggestions.map((s) => {
                  const isOpen = expandedSug === s.id;
                  const diff = isOpen ? diffLines(s.originalContent, s.suggestedContent) : [];
                  return (
                    <div key={s.id} style={{ background: "white", border: `1px solid ${isOpen ? "var(--navy)" : "var(--border)"}`, borderRadius: 8, marginBottom: "0.5rem", overflow: "hidden" }}>
                      <div
                        onClick={() => setExpandedSug(isOpen ? null : s.id)}
                        style={{ padding: "0.75rem", cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{s.authorName}</span>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <span className={`badge badge-${s.status}`}>{s.status}</span>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.message}</p>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>{s.createdAt}</div>
                      </div>
                      {isOpen && (
                        <div style={{ borderTop: "1px solid var(--border)", padding: "0.6rem 0.75rem", background: "#fafafa" }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Proposed changes</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", lineHeight: 1.6 }}>
                            {diff.map((part, i) => {
                              if (!part.added && !part.removed) return null;
                              const lines = part.value.replace(/\n$/, "").split("\n");
                              return lines.map((line, j) => (
                                <div key={`${i}-${j}`} style={{ padding: "1px 4px", background: part.added ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: part.added ? "#15803d" : "#b91c1c", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                  {part.added ? "+ " : "- "}{line}
                                </div>
                              ));
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BLAME ── */}
      {viewMode === "blame" && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Git blame shows who last modified each part of this article.</p>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", lineHeight: "1.7" }}>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const ver = blame[idx] ?? { authorName: page.authorName, version: 1, createdAt: page.createdAt };
              return (
                <div key={idx} className="line-row" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                  <span style={{ minWidth: "1.8rem", color: "var(--text-muted)", textAlign: "right", padding: "0 0.4rem", fontSize: "0.72rem" }}>{lineNum}</span>
                  <span style={{ minWidth: 140, padding: "0 0.75rem", fontSize: "0.72rem", color: "var(--text-muted)", borderRight: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)" }}>{ver.authorName}</span> · v{ver.version}{ver.createdAt ? ` · ${ver.createdAt}` : ""}
                  </span>
                  <span style={{ flex: 1, padding: "0 0.75rem", whiteSpace: "pre-wrap" }}>{line || " "}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {viewMode === "history" && (
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

      {/* ── EDIT (coaches / captains) ── */}
      {viewMode === "edit" && canEdit && (
        <div className="fade-in">
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>You have editor access. Changes are saved with a commit message.</p>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={24}
            style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", padding: "1rem", border: "1.5px solid var(--border)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: "1.6", background: "var(--navy)", color: "#c8d8e8" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--gold)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
            <input value={editMessage} onChange={(e) => setEditMessage(e.target.value)} placeholder="Commit message (e.g. 'Updated catch section from practice notes')"
              style={{ flex: 1, padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--water)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            <button onClick={handleSave} disabled={!editMessage.trim()}
              style={{ padding: "0.65rem 1.5rem", background: !editMessage.trim() ? "var(--border)" : "var(--navy)", color: "var(--gold)", border: "none", borderRadius: 8, fontWeight: 600, cursor: editMessage.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── SUGGEST (athletes) ── */}
      {viewMode === "suggest" && !canEdit && (
        <div className="fade-in">
          <div style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem" }}>
            <strong>Suggesting an edit:</strong> Your suggestion will be reviewed by a coach or captain before being merged.
          </div>
          <textarea value={suggestContent} onChange={(e) => setSuggestContent(e.target.value)} rows={24}
            style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem", padding: "1rem", border: "1.5px solid var(--border)", borderRadius: 8, outline: "none", resize: "vertical", lineHeight: "1.6", background: "var(--navy)", color: "#c8d8e8" }} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
            <input value={suggestMessage} onChange={(e) => setSuggestMessage(e.target.value)} placeholder="Describe your change and why you're suggesting it"
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
