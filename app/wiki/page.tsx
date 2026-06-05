"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { downloadWiki } from "@/lib/download";

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

function folderFromPath(relativePath: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  const dirs = parts.slice(0, -1);
  return dirs.join("/");
}

export default function WikiHome() {
  const { user, canEdit } = useAuth();
  const { pages, createPage, addPageRequest } = useWikiStore();
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showNewPage, setShowNewPage] = useState(false);
  const [segments, setSegments] = useState<string[]>(["Root"]);
  const [customTexts, setCustomTexts] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? pages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.content.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const folderMap: Record<string, typeof pages> = {};
  pages.forEach(p => {
    const key = p.folder || "Root";
    if (!folderMap[key]) folderMap[key] = [];
    folderMap[key].push(p);
  });
  const folders = Object.keys(folderMap).sort();

  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    let created = 0, skipped = 0;
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) { skipped++; continue; }
      const content = await readFileAsText(file);
      const title = file.name.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const folder = folderFromPath(relativePath);
      if (canEdit) {
        await createPage(title, content, folder, user!.id, user!.name, user!.role);
      } else {
        await addPageRequest({ type: "create", requesterId: user!.id, requesterName: user!.name, requesterRole: user!.role, newTitle: title, newContent: content, folder, message: `Import: ${file.name}` });
      }
      created++;
    }
    setImporting(false);
    if (canEdit) {
      toast(`Imported ${created} page${created !== 1 ? "s" : ""}${skipped ? `, skipped ${skipped} non-.md` : ""}`, "success");
    } else {
      toast(`Submitted ${created} import request${created !== 1 ? "s" : ""}`, "info");
    }
  }

  function updateSegment(idx: number, value: string) {
    setSegments(prev => { const next = prev.slice(0, idx + 1); next[idx] = value; return next; });
    setCustomTexts(prev => { const next = prev.slice(0, idx + 1); if (next[idx] === undefined) next[idx] = ""; return next; });
  }
  function updateCustomText(idx: number, text: string) {
    setCustomTexts(prev => { const next = [...prev]; next[idx] = text; return next; });
  }

  const topLevelFolders = [...new Set(pages.map(p => p.folder.split("/")[0]).filter(Boolean))].sort();
  function getSubfolders(prefix: string) {
    return [...new Set(pages.filter(p => p.folder.startsWith(prefix + "/")).map(p => p.folder.slice(prefix.length + 1).split("/")[0]).filter(Boolean))].sort();
  }

  type FolderSlot = { idx: number; seg: string; text: string; subfolders: string[] };
  const folderSlots: FolderSlot[] = [];
  let _path = "";
  for (let i = 0; i <= 10; i++) {
    const seg = segments[i] ?? (i === 0 ? "Root" : "");
    const text = customTexts[i] ?? "";
    folderSlots.push({ idx: i, seg, text, subfolders: i === 0 ? topLevelFolders : getSubfolders(_path) });
    const stop = (i === 0 && seg === "Root") || (i > 0 && seg === "") || (seg === "__custom__" && !text.trim());
    if (stop) break;
    const eff = seg === "__custom__" ? text.trim() : seg;
    _path = _path ? `${_path}/${eff}` : eff;
  }
  const folderValue = _path;

  function resetNewPage() {
    setShowNewPage(false);
    setNewTitle("");
    setSegments(["Root"]);
    setCustomTexts([]);
  }

  async function handleCreatePage() {
    const title = newTitle.trim();
    if (!title) return;
    if (canEdit) {
      await createPage(title, `# ${title}\n`, folderValue, user!.id, user!.name, user!.role);
      toast(`"${title}" created`, "success");
    } else {
      await addPageRequest({ type: "create", requesterId: user!.id, requesterName: user!.name, requesterRole: user!.role, newTitle: title, newContent: `# ${title}\n`, folder: folderValue, message: `New page request: "${title}"` });
      toast("Page request submitted", "info");
    }
    resetNewPage();
  }

  const btnBase: React.CSSProperties = {
    padding: "0.35rem 0.85rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600,
    cursor: importing ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
    opacity: importing ? 0.6 : 1, display: "flex", alignItems: "center", gap: "0.35rem",
  };

  return (
    <div style={{ padding: "var(--page-pad)", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.5rem", color: "var(--navy)", marginBottom: "0.35rem" }}>
          Welcome back, {user?.name.split(" ")[0]}.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          Your team&apos;s interactive knowledge base — technique, equipment, training, and more.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "2.5rem", position: "relative" }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search articles, techniques, drills…"
          style={{ width: "100%", maxWidth: 560, padding: "0.8rem 1.25rem 0.8rem 3rem", border: "2px solid var(--border)", borderRadius: 40, fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white", transition: "border-color 0.2s" }}
          onFocus={e => (e.target.style.borderColor = "var(--water)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
      </div>

      {/* Search results */}
      {query && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </h2>
          {filtered.map(p => (
            <Link key={p.id} href={`/wiki/content/${p.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "1rem 1.25rem", background: "white", border: "1px solid var(--border)", borderRadius: 10, marginBottom: "0.5rem", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.7rem", background: "var(--navy)", color: "var(--gold-light)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{p.folder || "root"}</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.05rem", color: "var(--navy)" }}>{p.title}</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{p.content.replace(/[#*\[\]`]/g, "").slice(0, 120)}…</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No articles matched your search.</p>}
        </div>
      )}

      {/* Quick stats */}
      {!query && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Articles", value: pages.length, icon: "📄" },
            { label: "Folders", value: folders.length, icon: "📁" },
            { label: "Your Role", value: user?.role, icon: "🎖️" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "var(--navy)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Folder grid */}
      {!query && (
        <>
          {/* Hidden inputs — root folder (empty string) */}
          <input ref={fileRef} type="file" accept=".md" multiple style={{ display: "none" }}
            onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />
          <input ref={dirRef} type="file" multiple style={{ display: "none" }}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--navy)" }}>Browse by Category</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button disabled={importing} onClick={() => setShowNewPage(v => !v)}
                style={{ ...btnBase, background: "var(--navy)", color: "var(--gold)", border: "none" }}>
                + New page
              </button>
              <button disabled={importing} onClick={() => fileRef.current?.click()}
                style={{ ...btnBase, background: "white", color: "var(--navy)", border: "1.5px solid var(--border)" }}>
                Import .md
              </button>
              <button disabled={importing} onClick={() => dirRef.current?.click()}
                style={{ ...btnBase, background: "white", color: "var(--navy)", border: "1.5px solid var(--border)" }}>
                Import folder
              </button>
              <button disabled={pages.length === 0} onClick={() => downloadWiki(pages)}
                style={{ ...btnBase, background: "white", color: "var(--navy)", border: "1.5px solid var(--border)", opacity: pages.length === 0 ? 0.6 : 1, cursor: pages.length === 0 ? "not-allowed" : "pointer" }}>
                ↓ Download wiki
              </button>
              {importing && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Importing…</span>}
            </div>
          </div>

          {/* Inline new-page form */}
          {showNewPage && (
            <div style={{ background: "white", border: "1.5px solid var(--gold)", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* Row 1: title + buttons */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreatePage(); if (e.key === "Escape") resetNewPage(); }}
                  placeholder="Page title…"
                  style={{ flex: 1, minWidth: 200, padding: "0.5rem 0.85rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                />
                <button onClick={handleCreatePage} disabled={!newTitle.trim()}
                  style={{ ...btnBase, background: newTitle.trim() ? "var(--navy)" : "var(--border)", color: "var(--gold)", border: "none", opacity: 1, cursor: newTitle.trim() ? "pointer" : "not-allowed" }}>
                  {canEdit ? "Create" : "Request"}
                </button>
                <button onClick={resetNewPage}
                  style={{ ...btnBase, background: "none", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  Cancel
                </button>
              </div>
              {/* Row 2: recursive folder path picker */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Folder:</span>
                {folderSlots.map((slot, si) => (
                  <span key={slot.idx} style={{ display: "contents" }}>
                    {si > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>/</span>}
                    <select
                      value={slot.seg}
                      onChange={e => updateSegment(slot.idx, e.target.value)}
                      style={{ padding: "0.25rem 0.5rem", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--navy)", cursor: "pointer", outline: "none" }}
                    >
                      {slot.idx === 0 ? (
                        <>
                          <option value="Root">Root</option>
                          {slot.subfolders.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">+ Type your own…</option>
                        </>
                      ) : (
                        <>
                          <option value="">— none —</option>
                          {slot.subfolders.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">+ Type your own…</option>
                        </>
                      )}
                    </select>
                    {slot.seg === "__custom__" && (
                      <input
                        value={slot.text}
                        onChange={e => updateCustomText(slot.idx, e.target.value)}
                        placeholder={slot.idx === 0 ? "Folder name…" : "Subfolder name…"}
                        style={{ padding: "0.25rem 0.5rem", border: "1px solid var(--gold)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", outline: "none", width: 140 }}
                      />
                    )}
                  </span>
                ))}
                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  → will be added to {folderValue ? <strong style={{ color: "var(--navy)" }}>{folderValue}</strong> : "root"}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {folders.map(folder => {
              const fps = folderMap[folder] ?? [];
              const href = folder === "Root" ? "/wiki" : `/wiki/folder/${encodeURIComponent(folder)}`;
              return (
                <div key={folder} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem", transition: "box-shadow 0.2s, border-color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                    <Link href={href} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "var(--navy)", cursor: "pointer" }}>{folder}</h3>
                    </Link>
                    <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>{fps.length}</span>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {fps.map(p => (
                      <li key={p.slug}>
                        <Link href={`/wiki/content/${p.slug}`} style={{ textDecoration: "none", color: "var(--water)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>↗</span>{p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
