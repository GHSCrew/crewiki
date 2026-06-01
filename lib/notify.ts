import prisma from "@/lib/prisma";

/**
 * The set of *active* users who are involved with a page — its creator plus
 * anyone who has authored a version of it — optionally excluding one user
 * (typically whoever triggered the event, so they aren't notified about their
 * own action). Used to decide who hears about edits, suggestions, and comments
 * on a page. Filtering to active users keeps notifications relevant and avoids
 * referencing a deleted account (Notification.userId is a real FK).
 */
export async function pageContributorIds(pageId: string, exclude?: string): Promise<string[]> {
  const page = await prisma.wikiPage.findUnique({ where: { id: pageId }, select: { authorId: true } });
  const versions = await prisma.pageVersion.findMany({ where: { pageId }, select: { authorId: true } });

  const ids = new Set<string>();
  if (page) ids.add(page.authorId);
  for (const v of versions) ids.add(v.authorId);
  if (exclude) ids.delete(exclude);
  if (ids.size === 0) return [];

  const active = await prisma.user.findMany({
    where: { id: { in: [...ids] }, status: "active" },
    select: { id: true },
  });
  return active.map(u => u.id);
}
