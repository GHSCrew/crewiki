"use client";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import ConfirmDialog from "@/components/ConfirmDialog";

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

// Include all directory parts (including the uploaded folder root) under baseFolder
function folderFromPath(relativePath: string, baseFolder: string): string {
  const parts = relativePath.split("/").filter(Boolean);
  const dirs = parts.slice(0, -1); // everything except the filename
  if (dirs.length === 0) return baseFolder;
  return baseFolder ? `${baseFolder}/${dirs.join("/")}` : dirs.join("/");
}

export default function ManageBar() {
  const pathname = usePathname();
  const { user, canEdit } = useAuth();
  const { pages, createPage, deletePage, movePage, renamePage, addPageRequest } = useWikiStore();

  const slug = pathname.split("/")[2] === "content" ? pathname.split("/")[3] : undefined;
  const currentPage = slug ? pages.find(p => p.slug === slug) : undefined;
  const currentFolder = currentPage?.folder ?? "";

  const [moveSegs, setMoveSegs] = useState<string[]>(["Root"]);
  const [moveTexts, setMoveTexts] = useState<string[]>([]);
  const [renameTitle, setRenameTitle] = useState("");
  const [showRename, setShowRename] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  function updateMoveSeg(idx: number, value: string) {
    setMoveSegs(prev => { const next = prev.slice(0, idx + 1); next[idx] = value; return next; });
    setMoveTexts(prev => { const next = prev.slice(0, idx + 1); if (next[idx] === undefined) next[idx] = ""; return next; });
  }
  function updateMoveText(idx: number, text: string) {
    setMoveTexts(prev => { const next = [...prev]; next[idx] = text; return next; });
  }
  function resetMove() { setMoveSegs(["Root"]); setMoveTexts([]); }

  const topMoveFolders = [...new Set(pages.map(p => p.folder.split("/")[0]).filter(Boolean))].sort();
  function getMoveSubfolders(prefix: string) {
    return [...new Set(pages.filter(p => p.folder.startsWith(prefix + "/")).map(p => p.folder.slice(prefix.length + 1).split("/")[0]).filter(Boolean))].sort();
  }
  type MoveSlot = { idx: number; seg: string; text: string; subfolders: string[] };
  const moveSlots: MoveSlot[] = [];
  let _movePath = "";
  for (let i = 0; i <= 10; i++) {
    const seg = moveSegs[i] ?? (i === 0 ? "Root" : "");
    const text = moveTexts[i] ?? "";
    moveSlots.push({ idx: i, seg, text, subfolders: i === 0 ? topMoveFolders : getMoveSubfolders(_movePath) });
    const stop = (i === 0 && seg === "Root") || (i > 0 && seg === "") || (seg === "__custom__" && !text.trim());
    if (stop) break;
    const eff = seg === "__custom__" ? text.trim() : seg;
    _movePath = _movePath ? `${_movePath}/${eff}` : eff;
  }
  const moveFolder = _movePath;

  async function importFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    let created = 0;
    let skipped = 0;

    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) { skipped++; continue; }
      const content = await readFileAsText(file);
      const title = file.name.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const folder = folderFromPath(relativePath, currentFolder);

      if (canEdit) {
        await createPage(title, content, folder, user!.id, user!.name, user!.role);
      } else {
        await addPageRequest({
          type: "create",
          requesterId: user!.id,
          requesterName: user!.name,
          requesterRole: user!.role,
          newTitle: title,
          newContent: content,
          folder,
          message: `Import request: ${file.name}`,
        });
      }
      created++;
    }

    setImporting(false);
    if (canEdit) {
      toast(`Imported ${created} page${created !== 1 ? "s" : ""}${skipped ? `, skipped ${skipped} non-.md` : ""}`, "success");
    } else {
      toast(`Submitted ${created} import request${created !== 1 ? "s" : ""}${skipped ? `, skipped ${skipped} non-.md` : ""}`, "info");
    }
  }

  async function handleDelete() {
    if (!currentPage) return;
    setConfirmDelete(false);
    if (canEdit) {
      await deletePage(currentPage.slug);
      toast(`"${currentPage.title}" deleted`, "success");
      window.location.href = "/wiki";
    } else {
      await addPageRequest({
        type: "delete",
        requesterId: user!.id,
        requesterName: user!.name,
        requesterRole: user!.role,
        pageId: currentPage.id,
        pageTitle: currentPage.title,
        pageSlug: currentPage.slug,
        message: `Deletion request for "${currentPage.title}"`,
      });
      toast("Deletion request submitted", "info");
    }
  }

  async function handleMove() {
    if (!currentPage || moveFolder === currentPage.folder) return;
    if (canEdit) {
      await movePage(currentPage.slug, moveFolder);
      toast(`Moved to "${moveFolder || "root"}"`, "success");
      resetMove();
    } else {
      await addPageRequest({
        type: "move",
        requesterId: user!.id,
        requesterName: user!.name,
        requesterRole: user!.role,
        pageId: currentPage.id,
        pageTitle: currentPage.title,
        pageSlug: currentPage.slug,
        newFolder: moveFolder,
        message: `Move request: "${currentPage.title}" → "${moveFolder || "root"}"`,
      });
      toast("Move request submitted", "info");
      resetMove();
    }
  }

  async function handleRename() {
    if (!currentPage || !renameTitle.trim() || renameTitle.trim() === currentPage.title) return;
    await renamePage(currentPage.slug, renameTitle.trim());
    toast(`Renamed to "${renameTitle.trim()}"`, "success");
    setShowRename(false);
    setRenameTitle("");
  }

  const btnBase: React.CSSProperties = {
    padding: "0.35rem 0.85rem",
    borderRadius: 6,
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: importing ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif",
    opacity: importing ? 0.6 : 1,
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  };

  return (
    <>
    <div style={{
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-raised)",
      padding: "0.6rem 1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      flexWrap: "wrap",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginRight: "0.25rem" }}>
        {canEdit ? "Manage" : "Request"}
        {currentFolder && <span style={{ fontWeight: 400, marginLeft: "0.35rem", opacity: 0.7 }}>· {currentFolder}</span>}
      </span>

      {/* Hidden file inputs — no prompt, use current folder automatically */}
      <input ref={fileRef} type="file" accept=".md" multiple style={{ display: "none" }}
        onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />
      <input ref={dirRef} type="file" multiple style={{ display: "none" }}
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={e => { importFiles(e.target.files); e.target.value = ""; }} />

      <button
        disabled={importing}
        onClick={() => fileRef.current?.click()}
        style={{ ...btnBase, background: "var(--navy)", color: "var(--gold)", border: "none" }}
      >
        + Import .md files
      </button>
      <button
        disabled={importing}
        onClick={() => dirRef.current?.click()}
        style={{ ...btnBase, background: "var(--navy-light)", color: "white", border: "none" }}
      >
        + Import folder
      </button>

      {/* Per-page controls */}
      {currentPage && (
        <>
          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 0.25rem" }} />

          {/* Move */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Move to:</span>
            {moveSlots.map((slot, si) => (
              <span key={slot.idx} style={{ display: "contents" }}>
                {si > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>/</span>}
                <select
                  value={slot.seg}
                  onChange={e => updateMoveSeg(slot.idx, e.target.value)}
                  style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", background: "white", color: "var(--text)", cursor: "pointer", outline: "none" }}
                >
                  {slot.idx === 0 ? (
                    <>
                      <option value="Root">Root</option>
                      {slot.subfolders.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="__custom__">+ New folder…</option>
                    </>
                  ) : (
                    <>
                      <option value="">— here —</option>
                      {slot.subfolders.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="__custom__">+ New subfolder…</option>
                    </>
                  )}
                </select>
                {slot.seg === "__custom__" && (
                  <input
                    value={slot.text}
                    onChange={e => updateMoveText(slot.idx, e.target.value)}
                    placeholder={slot.idx === 0 ? "Folder name…" : "Subfolder name…"}
                    style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--gold)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", outline: "none", width: 130 }}
                  />
                )}
              </span>
            ))}
            {moveFolder !== currentPage.folder && (
              <button onClick={handleMove} style={{ ...btnBase, background: "var(--water)", color: "white", border: "none" }}>
                {canEdit ? "Move" : "Request move"}
              </button>
            )}
          </div>

          {/* Rename article */}
          {canEdit && !showRename && (
            <button
              onClick={() => { setRenameTitle(currentPage.title); setShowRename(true); }}
              style={{ ...btnBase, background: "none", color: "var(--navy)", border: "1px solid var(--border)" }}
            >
              Rename
            </button>
          )}
          {canEdit && showRename && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                autoFocus
                value={renameTitle}
                onChange={e => setRenameTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setShowRename(false); }}
                style={{ padding: "0.3rem 0.6rem", border: "1.5px solid var(--water)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", width: 200, outline: "none" }}
              />
              <button onClick={handleRename} style={{ ...btnBase, background: "var(--water)", color: "white", border: "none" }}>Save</button>
              <button onClick={() => setShowRename(false)} style={{ ...btnBase, background: "none", color: "var(--text-muted)", border: "1px solid var(--border)" }}>✕</button>
            </div>
          )}

          <button
            onClick={() => setConfirmDelete(true)}
            style={{ ...btnBase, background: "rgba(153,26,26,0.08)", color: "#b03030", border: "1px solid rgba(153,26,26,0.2)" }}
          >
            {canEdit ? "Delete page" : "Request delete"}
          </button>
        </>
      )}

      {importing && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Importing…</span>}
    </div>
    {confirmDelete && currentPage && (
      <ConfirmDialog
        title={canEdit ? "Delete Page?" : "Request Delete?"}
        message={canEdit
          ? <><strong style={{ color: "var(--navy)" }}>&ldquo;{currentPage.title}&rdquo;</strong> will be permanently deleted.</>
          : <>Submit a deletion request for <strong style={{ color: "var(--navy)" }}>&ldquo;{currentPage.title}&rdquo;</strong>?</>
        }
        confirmLabel={canEdit ? "Delete" : "Submit Request"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  );
}
