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
