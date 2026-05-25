import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
  const { oldFolder, newFolder } = await request.json() as { oldFolder: string; newFolder: string };
  if (!newFolder || oldFolder === newFolder) return Response.json({ error: "Invalid folder names" }, { status: 400 });
  const today = new Date().toISOString().split("T")[0];
  await prisma.wikiPage.updateMany({ where: { folder: oldFolder }, data: { folder: newFolder, updatedAt: today } });
  const pages = await prisma.wikiPage.findMany({ where: { folder: newFolder } });
  return Response.json(pages);
}

export async function GET() {
  const pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
  return Response.json(pages);
}

export async function POST(request: Request) {
  const { title, content, folder, authorId, authorName } = await request.json() as {
    title: string; content: string; folder: string; authorId: string; authorName: string;
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
    data: { pageId: page.id, content, authorId, authorName, authorRole: "coach", message: "Initial import", createdAt: now, version: 1 },
  });
  return Response.json(page, { status: 201 });
}
