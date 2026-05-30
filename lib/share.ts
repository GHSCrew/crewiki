import prisma from "@/lib/prisma";
import type { WikiPage } from "@/types";

export interface SharedPageResult {
  page: WikiPage;
  expiresAt: string;
}

/**
 * Resolve a share token to its page. Returns null if the token is unknown,
 * expired, or its page no longer exists. Expired links are deleted on access
 * (along with any other stragglers) so the table can't accumulate junk.
 */
export async function getSharedPage(token: string): Promise<SharedPageResult | null> {
  const nowIso = new Date().toISOString();

  // Sweep expired links (cheap, keeps the table bounded).
  await prisma.shareLink.deleteMany({ where: { expiresAt: { lt: nowIso } } }).catch(() => {});

  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.expiresAt < nowIso) {
    await prisma.shareLink.delete({ where: { token } }).catch(() => {});
    return null;
  }

  const page = await prisma.wikiPage.findUnique({ where: { id: link.pageId } });
  if (!page) return null;

  return { page: page as WikiPage, expiresAt: link.expiresAt };
}
