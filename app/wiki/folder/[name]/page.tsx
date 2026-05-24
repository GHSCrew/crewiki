"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useWikiStore } from "@/lib/store";

export default function FolderPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { pages } = useWikiStore();

  const folderPages = pages
    .filter(p => p.folder === name)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        <span
          style={{ cursor: "pointer", color: "var(--water)" }}
          onClick={() => router.push("/wiki")}
        >
          Wiki
        </span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--text)" }}>{name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>
          {name}
        </h1>
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
            <Link key={page.slug} href={`/wiki/${page.slug}`} style={{ textDecoration: "none" }}>
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
