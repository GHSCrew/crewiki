import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

const ALLOWED_DAYS = [1, 7, 30];

export async function GET() {
  const nowIso = new Date().toISOString();
  // Sweep expired links so the admin list only ever shows live ones.
  await prisma.shareLink.deleteMany({ where: { expiresAt: { lt: nowIso } } });

  const links = await prisma.shareLink.findMany({
    include: { page: { select: { title: true, slug: true, folder: true } } },
    orderBy: { expiresAt: "asc" },
  });

  return Response.json(
    links.map(l => ({
      token: l.token,
      pageSlug: l.page.slug,
      pageTitle: l.page.title,
      folder: l.page.folder,
      createdAt: l.createdAt,
      expiresAt: l.expiresAt,
    }))
  );
}

export async function POST(request: Request) {
  const { pageSlug, days } = (await request.json()) as { pageSlug: string; days?: number };

  const page = await prisma.wikiPage.findUnique({ where: { slug: pageSlug }, select: { id: true, slug: true } });
  if (!page) return Response.json({ error: "Page not found" }, { status: 404 });

  const validDays = ALLOWED_DAYS.includes(days as number) ? (days as number) : 30;

  // Opportunistic cleanup: drop anything already expired so the table stays lean.
  await prisma.shareLink.deleteMany({ where: { expiresAt: { lt: new Date().toISOString() } } });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();
  const token = randomUUID();

  await prisma.shareLink.create({
    data: { token, pageId: page.id, pageSlug: page.slug, createdAt: now.toISOString(), expiresAt },
  });

  return Response.json({ token, expiresAt, days: validDays }, { status: 201 });
}
