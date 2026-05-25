"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import { toast } from "@/lib/toast";

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const { canEdit } = useAuth();
  const name = decodeURIComponent(params.name as string);
  const { pages, renameFolder } = useWikiStore();

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const isRoot = name === "Root";
  const folderPages = pages
    .filter(p => isRoot ? p.folder === "" : p.folder === name)
    .sort((a, b) => a.title.localeCompare(b.title));

  async function handleRename() {
    const newName = renameValue.trim();
    if (!newName || newName === name) { setShowRename(false); return; }
    await renameFolder(name, newName);
    toast(`Folder renamed to "${newName}"`, "success");
    router.replace(`/wiki/folder/${encodeURIComponent(newName)}`);
  }

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        <span style={{ cursor: "pointer", color: "var(--water)" }} onClick={() => router.push("/wiki")}>Wiki</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--text)" }}>{name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        {!showRename ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
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
        </p>
      </div>

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
  );
}
