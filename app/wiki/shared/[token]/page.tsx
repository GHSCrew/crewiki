import { cache } from "react";
import { headers } from "next/headers";
import { format, parseISO } from "date-fns";
import type { Metadata } from "next";
import { getSharedPage } from "@/lib/share";
import { renderMarkdown, plainExcerpt } from "@/lib/markdown";
import RedirectIfAuthed from "@/components/RedirectIfAuthed";

// Always render fresh so expiry is enforced and previews stay accurate.
export const dynamic = "force-dynamic";

// Dedupe the DB lookup between generateMetadata and the page render (same request).
const loadShare = cache(getSharedPage);

async function originFromHeaders(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const result = await loadShare(token);
  if (!result) {
    return { title: "Shared link expired — CrewWiki", robots: { index: false, follow: false } };
  }
  const { page } = result;
  const description = plainExcerpt(page.content) || "A shared page from the CrewWiki team knowledge base.";
  const origin = await originFromHeaders();
  const url = origin ? `${origin}/wiki/shared/${token}` : undefined;
  return {
    title: `${page.title} — CrewWiki`,
    description,
    openGraph: {
      title: page.title,
      description,
      type: "article",
      siteName: "CrewWiki",
      ...(url ? { url } : {}),
    },
    twitter: { card: "summary_large_image", title: page.title, description },
  };
}

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadShare(token);

  if (!result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔗</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.75rem", color: "var(--navy)", marginBottom: "0.5rem" }}>This shared link has expired</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Shared links are temporary and may have been removed. Ask whoever sent it to share a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const { page, expiresAt } = result;
  const body = page.content.replace(/^# [^\n]*\n?/, "");
  const html = renderMarkdown(body);
  const until = (() => { try { return format(parseISO(expiresAt), "MMMM d, yyyy"); } catch { return null; } })();

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <RedirectIfAuthed slug={page.slug} />

      {/* Top banner */}
      <header style={{ background: "var(--navy)", color: "white", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 28, height: 28, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "0.95rem" }}>⛵</span>
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.05rem" }}>CrewWiki</span>
          <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.12)", padding: "2px 8px", borderRadius: 99, color: "var(--gold-light)", fontWeight: 600 }}>Shared page</span>
        </div>
        {until && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)" }}>Link active until {until}</span>}
      </header>

      {/* Article */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
        {/* Path */}
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          <span>{page.folder || "Root"}</span>
          <span style={{ margin: "0 0.4rem" }}>›</span>
          <span style={{ color: "var(--text)" }}>{page.title}</span>
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.2rem", color: "var(--navy)", marginBottom: "0.5rem" }}>{page.title}</h1>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "2rem" }}>
          By {page.authorName} · Updated {page.updatedAt}
        </div>

        <div className="wiki-content" dangerouslySetInnerHTML={{ __html: html }} />

        <footer style={{ marginTop: "3rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
          This is a read-only shared page from CrewWiki.
        </footer>
      </main>
    </div>
  );
}
