import prisma from "@/lib/prisma";
import type { Role } from "@/types";

function deserializePage(p: {
  id: string; slug: string; title: string; content: string; folder: string;
  authorId: string; authorName: string; createdAt: string; updatedAt: string;
  version: number; youtubeLinks: string;
}) {
  return { ...p, youtubeLinks: JSON.parse(p.youtubeLinks) as string[] };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(deserializePage(page));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { content, authorId, authorName, authorRole, message } = await request.json() as {
    content: string; authorId: string; authorName: string; authorRole: Role; message: string;
  };

  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });

  const newVersion = page.version + 1;
  const updatedAt = new Date().toISOString().split("T")[0];

  const [updated] = await prisma.$transaction([
    prisma.wikiPage.update({
      where: { slug },
      data: { content, version: newVersion, updatedAt },
    }),
    prisma.pageVersion.create({
      data: {
        pageId: page.id,
        content,
        authorId,
        authorName,
        authorRole,
        message,
        createdAt: updatedAt,
        version: newVersion,
      },
    }),
  ]);

  return Response.json(deserializePage(updated));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await request.json() as { folder?: string; title?: string };

  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.wikiPage.update({
    where: { slug },
    data: {
      ...(body.folder !== undefined && { folder: body.folder }),
      ...(body.title !== undefined && { title: body.title }),
      updatedAt: new Date().toISOString().split("T")[0],
    },
  });
  return Response.json(deserializePage(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  await prisma.wikiPage.delete({ where: { slug } });
  return new Response(null, { status: 204 });
}
