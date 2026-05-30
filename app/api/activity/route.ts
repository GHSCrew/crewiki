import prisma from "@/lib/prisma";
import type { Role } from "@/types";

// Wiki-wide activity feed. Only integrated/approved history is surfaced:
// every PageVersion is a committed edit (v1 = page created, later versions =
// merged edits and approved suggestions). Pending suggestions and unapproved
// requests are intentionally excluded.
export async function GET() {
  const versions = await prisma.pageVersion.findMany({
    include: { page: { select: { slug: true, title: true, folder: true } } },
  });

  const items = versions.map(v => ({
    id: v.id,
    pageId: v.pageId,
    pageSlug: v.page.slug,
    pageTitle: v.page.title,
    folder: v.page.folder,
    authorName: v.authorName,
    authorRole: v.authorRole as Role,
    message: v.message,
    version: v.version,
    createdAt: v.createdAt,
    kind: v.version === 1 ? "created" : "edited",
  }));

  // Newest first; tie-break same-day entries by version so a page's later
  // revisions sit above its earlier ones.
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.version - a.version));

  return Response.json(items);
}
