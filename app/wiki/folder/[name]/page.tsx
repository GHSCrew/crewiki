"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { downloadFolder } from "@/lib/download";

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

// Place uploaded files under baseFolder, preserving any nested directories.
function folderFromPath(relativePath: string, baseFolder: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  const dirs = parts.slice(0, -1);
  if (dirs.length === 0) return baseFolder;
  return baseFolder ? `${baseFolder}/${dirs.join("/")}` : dirs.join("/");
}

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, canEdit } = useAuth();
  const name = decodeURIComponent(params.name as string);
  const { pages, renameFolder, createPage, addPageRequest } = useWikiStore();

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [movePanel, setMovePanel] = useState(false);
  const [moveDest, setMoveDest] = useState("Root");
  const [moveCustom, setMoveCustom] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const isRoot = name === "Root";
  const folderPages = pages
    .filter(p => isRoot ? p.folder === "" : p.folder === name)
    .sort((a, b) => a.title.localeCompare(b.title));
  const folderPageCount = pages.filter(p => p.folder === name || p.folder.startsWith(`${name}/`)).length;

  // Direct subfolders of this folder, with a recursive article count for each.
  const subSegs = isRoot
    ? [...new Set(pages.map(p => p.folder.split("/")[0]).filter(Boolean))]
    : [...new Set(pages.filter(p => p.folder.startsWith(`${name}/`)).map(p => p.folder.slice(name.length + 1).split("/")[0]).filter(Boolean))];
  const subfolders = subSegs.sort().map(seg => {
    const path = isRoot ? seg : `${name}/${seg}`;
    const count = pages.filter(p => p.folder === path || p.folder.startsWith(`${path}/`)).length;
    return { seg, path, count };
  });

  // Destination folders for a whole-folder move: every existing folder except
  // this one and its own subtree (can't move a folder inside itself).
  const destFolders = [...new Set(pages.map(p => p.folder).filter(Boolean))]
    .filter(f => f !== name && !f.startsWith(`${name}/`) && f !== name.split("/").slice(0, -1).join("/"))
    .sort();
  const leaf = name.split("/").pop() ?? name;

  async function handleRename() {
    const newName = renameValue.trim();
    if (!newName || newName === name) { setShowRename(false); return; }
    await renameFolder(name, newName);
    toast(`Folder renamed to "${newName}"`, "success");
    router.replace(`/wiki/folder/${encodeURIComponent(newName)}`);
  }

  async function handleMoveFolder() {
    const dest = moveDest === "__custom__" ? moveCustom.trim() : moveDest === "Root" ? "" : moveDest;
    if (moveDest === "__custom__" && !dest) return;
    const target = dest ? `${dest}/${leaf}` : leaf;
    if (target === name) { toast("Folder is already there", "info"); return; }
    if (target === name || target.startsWith(`${name}/`)) { toast("Can't move a folder into itself", "error"); return; }
    await renameFolder(name, target);
    toast(`Moved "${name}" → "${target}"`, "success");
    router.replace(`/wiki/folder/${encodeURIComponent(target)}`);
  }

  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    let created = 0, skipped = 0;
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) { skipped++; continue; }
      const content = await readFileAsText(file);
      const title = file.name.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const folder = folderFromPath(relativePath, name);
      if (canEdit) {
        await createPage(title, content, folder, user!.id, user!.name, user!.role);
      } else {
        await addPageRequest({ type: "create", requesterId: user!.id, requesterName: user!.name, requesterRole: user!.role, newTitle: title, newContent: content, folder, message: `Import into "${name}": ${file.name}` });
      }
      created++;
    }
    setImporting(false);
    setManageOpen(false);
    if (canEdit) {
      toast(`Imported ${created} page${created !== 1 ? "s" : ""} into "${name}"${skipped ? `, skipped ${skipped} non-.md` : ""}`, "success");
    } else {
      toast(`Submitted ${created} import request${created !== 1 ? "s" : ""}${skipped ? `, skipped ${skipped} non-.md` : ""}`, "info");
    }
  }

  return (
    <div style={{ padding: "var(--page-pad)", maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        <span style={{ cursor: "pointer", color: "var(--water)" }} onClick={() => router.push("/wiki")}>Wiki</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--text)" }}>{name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        {!showRename ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            {/* Hidden upload inputs */}
            <input ref={fileRef} type="file" accept=".md" multiple style={{ display: "none" }}
              onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />
            <input ref={dirRef} type="file" multiple style={{ display: "none" }}
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />

            {!isRoot && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => { setManageOpen(v => !v); setMovePanel(false); }}
                  style={{ padding: "0.3rem 0.75rem", background: "var(--navy)", border: "none", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "var(--gold)", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  Manage <span style={{ fontSize: "0.6rem" }}>{manageOpen ? "▲" : "▼"}</span>
                </button>
                {manageOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 0.35rem)", left: 0, zIndex: 20, background: "white", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.12)", minWidth: 220, overflow: "hidden" }}>
                    {canEdit && (
                      <button onClick={() => setMovePanel(v => !v)}
                        style={{ width: "100%", textAlign: "left", padding: "0.6rem 0.9rem", background: movePanel ? "var(--surface-raised)" : "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: "pointer" }}>
                        ↗ Move whole folder…
                      </button>
                    )}
                    {movePanel && canEdit && (
                      <div style={{ padding: "0.75rem 0.9rem", borderBottom: "1px solid var(--border)", background: "var(--cream)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Move to:</span>
                        <select value={moveDest} onChange={e => setMoveDest(e.target.value)}
                          style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", background: "white", cursor: "pointer", outline: "none" }}>
                          <option value="Root">Root</option>
                          {destFolders.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">+ New location…</option>
                        </select>
                        {moveDest === "__custom__" && (
                          <input value={moveCustom} onChange={e => setMoveCustom(e.target.value)} placeholder="Destination folder path…"
                            style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--gold)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                        )}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          → <strong style={{ color: "var(--navy)" }}>{(moveDest === "__custom__" ? moveCustom.trim() : moveDest === "Root" ? "" : moveDest) ? `${moveDest === "__custom__" ? moveCustom.trim() : moveDest}/${leaf}` : leaf}</strong>
                        </span>
                        <button onClick={handleMoveFolder}
                          style={{ padding: "0.35rem 0.75rem", background: "var(--water)", color: "white", border: "none", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}>
                          Move folder
                        </button>
                      </div>
                    )}
                    <button onClick={() => fileRef.current?.click()} disabled={importing}
                      style={{ width: "100%", textAlign: "left", padding: "0.6rem 0.9rem", background: "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: importing ? "not-allowed" : "pointer" }}>
                      ↑ Upload .md files here
                    </button>
                    <button onClick={() => dirRef.current?.click()} disabled={importing}
                      style={{ width: "100%", textAlign: "left", padding: "0.6rem 0.9rem", background: "none", border: "none", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: importing ? "not-allowed" : "pointer" }}>
                      ↑ Upload a folder here
                    </button>
                    <button onClick={() => { downloadFolder(pages, name); setManageOpen(false); }} disabled={folderPageCount === 0}
                      style={{ width: "100%", textAlign: "left", padding: "0.6rem 0.9rem", background: "none", border: "none", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text)", cursor: folderPageCount === 0 ? "not-allowed" : "pointer", opacity: folderPageCount === 0 ? 0.5 : 1 }}>
                      ↓ Download folder
                    </button>
                  </div>
                )}
              </div>
            )}

            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", margin: 0 }}>
              {name}
            </h1>
            {canEdit && !isRoot && (
              <button
                onClick={() => { setRenameValue(name); setShowRename(true); }}
                title="Rename folder"
                style={{ padding: "0.25rem 0.65rem", background: "none", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text-muted)", cursor: "pointer", fontWeight: 500 }}
              >
                Rename
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setShowRename(false); }}
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.75rem", color: "var(--navy)", border: "none", borderBottom: "2px solid var(--water)", outline: "none", background: "transparent", width: "auto", minWidth: 200 }}
            />
            <button
              onClick={handleRename}
              style={{ padding: "0.3rem 0.85rem", background: "var(--water)", color: "white", border: "none", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer" }}
            >
              Save
            </button>
            <button
              onClick={() => setShowRename(false)}
              style={{ padding: "0.3rem 0.6rem", background: "none", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", color: "var(--text-muted)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {folderPages.length} article{folderPages.length !== 1 ? "s" : ""}
          {subfolders.length > 0 && ` · ${subfolders.length} subfolder${subfolders.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        {/* Articles */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.75rem" }}>Articles</div>
          {folderPages.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", background: "white", border: "1px solid var(--border)", borderRadius: 12 }}>
              No articles in this folder yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {folderPages.map(page => (
            <Link key={page.slug} href={`/wiki/content/${page.slug}`} style={{ textDecoration: "none" }}>
              <div
                style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem 1.5rem", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "var(--navy)", marginBottom: "0.35rem" }}>
                      {page.title}
                    </h2>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {page.content.replace(/^# [^\n]*\n?/, "").replace(/[#*\[\]`>]/g, "").trim().slice(0, 140)}…
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>v{page.version}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{page.updatedAt}</div>
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>By {page.authorName}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--water)", fontWeight: 600 }}>Read →</span>
                </div>
              </div>
            </Link>
              ))}
            </div>
          )}
        </div>

        {/* Subfolders */}
        {subfolders.length > 0 && (
          <aside style={{ width: 260, flexShrink: 0 }}>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.75rem" }}>Subfolders</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {subfolders.map(sf => (
                <Link key={sf.path} href={`/wiki/folder/${encodeURIComponent(sf.path)}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem", transition: "border-color 0.15s, box-shadow 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📁</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sf.seg}</span>
                    <span style={{ fontSize: "0.7rem", background: "var(--surface-raised)", color: "var(--text-muted)", padding: "1px 8px", borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{sf.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
