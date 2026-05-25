import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
  const { oldFolder, newFolder } = await request.json() as { oldFolder: string; newFolder: string };
  if (!newFolder || oldFolder === newFolder) return Response.json({ error: "Invalid folder names" }, { status: 400 });
  const today = new Date().toISOString().split("T")[0];

  // Match the folder itself and any nested subfolders (e.g. "Team/Boats" when renaming "Team")
  const affected = await prisma.wikiPage.findMany({
    where: { OR: [{ folder: oldFolder }, { folder: { startsWith: `${oldFolder}/` } }] },
  });

  // Each page may be in a different subfolder — replace only the leading prefix
  await prisma.$transaction(
    affected.map(p =>
      prisma.wikiPage.update({
        where: { id: p.id },
        data: { folder: newFolder + p.folder.slice(oldFolder.length), updatedAt: today },
      })
    )
  );

  const updated = await prisma.wikiPage.findMany({
    where: { OR: [{ folder: newFolder }, { folder: { startsWith: `${newFolder}/` } }] },
  });
  return Response.json(updated);
}

export async function GET() {
  const pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
  return Response.json(pages);
}

export async function POST(request: Request) {
  const { title, content, folder, authorId, authorName, authorRole } = await request.json() as {
    title: string; content: string; folder: string; authorId: string; authorName: string; authorRole: string;
  };

  const base = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  let slug = base;
  let attempt = 1;
  while (await prisma.wikiPage.findUnique({ where: { slug } })) {
    slug = `${base}-${++attempt}`;
  }

  const now = new Date().toISOString().split("T")[0];
  const page = await prisma.wikiPage.create({
    data: { slug, title, content, folder, authorId, authorName, createdAt: now, updatedAt: now, version: 1 },
  });
  await prisma.pageVersion.create({
    data: { pageId: page.id, content, authorId, authorName, authorRole: authorRole ?? "coach", message: "Initial import", createdAt: now, version: 1 },
  });
  return Response.json(page, { status: 201 });
}
