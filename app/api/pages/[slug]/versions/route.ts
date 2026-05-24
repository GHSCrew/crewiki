import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { slug }, select: { id: true } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });

  const versions = await prisma.pageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { version: "desc" },
  });

  return Response.json(versions.map(v => ({ ...v, authorRole: v.authorRole as Role })));
}
