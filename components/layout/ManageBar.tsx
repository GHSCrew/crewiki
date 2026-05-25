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

  const [moveFolder, setMoveFolder] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [showRename, setShowRename] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);

  const allFolders = Array.from(new Set(pages.map(p => p.folder))).sort();

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
    if (!currentPage || !moveFolder || moveFolder === currentPage.folder) return;
    if (canEdit) {
      await movePage(currentPage.slug, moveFolder);
      toast(`Moved to "${moveFolder}"`, "success");
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
        message: `Move request: "${currentPage.title}" → "${moveFolder}"`,
      });
      toast("Move request submitted", "info");
      setMoveFolder("");
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <select
              value={moveFolder}
              onChange={e => setMoveFolder(e.target.value)}
              style={{ padding: "0.3rem 0.5rem", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", background: "white", color: "var(--text)", minWidth: 140 }}
            >
              <option value="">Move to folder…</option>
              {allFolders.filter(f => f !== currentPage.folder).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {moveFolder && moveFolder !== currentPage.folder && (
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
