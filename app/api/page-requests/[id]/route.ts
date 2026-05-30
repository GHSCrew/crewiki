import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, reviewedBy, reviewNote } = await request.json() as {
    status: "approved" | "rejected";
    reviewedBy: string;
    reviewNote?: string;
  };

  const req = await prisma.pageRequest.findUnique({ where: { id } });
  if (!req) return Response.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  let pages = null;

  if (status === "approved") {
    if (req.type === "create" && req.newTitle && req.newContent && req.folder) {
      const base = req.newTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      let slug = base;
      let attempt = 1;
      while (await prisma.wikiPage.findUnique({ where: { slug } })) {
        slug = `${base}-${++attempt}`;
      }
      const page = await prisma.wikiPage.create({
        data: {
          slug,
          title: req.newTitle,
          content: req.newContent,
          folder: req.folder,
          authorId: req.requesterId,
          authorName: req.requesterName,
          createdAt: now,
          updatedAt: now,
          version: 1,
        },
      });
      await prisma.pageVersion.create({
        data: {
          pageId: page.id,
          content: req.newContent,
          authorId: req.requesterId,
          authorName: req.requesterName,
          authorRole: req.requesterRole,
          message: "Created via approved request",
          createdAt: nowIso,
          version: 1,
        },
      });
      pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
    } else if (req.type === "delete" && req.pageSlug) {
      const page = await prisma.wikiPage.findUnique({ where: { slug: req.pageSlug } });
      if (page) await prisma.wikiPage.delete({ where: { slug: req.pageSlug } });
      pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
    } else if (req.type === "move" && req.pageSlug && req.newFolder) {
      await prisma.wikiPage.update({
        where: { slug: req.pageSlug },
        data: { folder: req.newFolder, updatedAt: now },
      });
      pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
    }
  }

  const updated = await prisma.pageRequest.update({
    where: { id },
    data: { status, reviewedBy, reviewedAt: now, reviewNote: reviewNote ?? null },
  });

  return Response.json({ request: updated, pages });
}
