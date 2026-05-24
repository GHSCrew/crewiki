import prisma from "@/lib/prisma";

function deserializePage(p: {
  id: string; slug: string; title: string; content: string; folder: string;
  authorId: string; authorName: string; createdAt: string; updatedAt: string;
  version: number; youtubeLinks: string;
}) {
  return { ...p, youtubeLinks: JSON.parse(p.youtubeLinks) as string[] };
}

export async function GET() {
  const pages = await prisma.wikiPage.findMany({ orderBy: { title: "asc" } });
  return Response.json(pages.map(deserializePage));
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
    data: { slug, title, content, folder, authorId, authorName, createdAt: now, updatedAt: now, version: 1, youtubeLinks: "[]" },
  });
  await prisma.pageVersion.create({
    data: { pageId: page.id, content, authorId, authorName, authorRole: "coach", message: "Initial import", createdAt: now, version: 1 },
  });
  return Response.json(deserializePage(page), { status: 201 });
}
