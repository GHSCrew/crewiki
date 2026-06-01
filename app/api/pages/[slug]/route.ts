import prisma from "@/lib/prisma";
import { propagatePageTitle } from "@/lib/denormalize";
import { pageContributorIds } from "@/lib/notify";
import type { Role } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(page);
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
  const createdAtIso = new Date().toISOString();

  // Notify everyone who has contributed to this page — except whoever is making
  // this edit.
  const recipients = await pageContributorIds(page.id, authorId);

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
        createdAt: createdAtIso,
        version: newVersion,
      },
    }),
    ...recipients.map(userId =>
      prisma.notification.create({
        data: {
          userId,
          type: "page_updated",
          title: `Page updated: ${page.title}`,
          body: `${authorName} edited "${page.title}".`,
          relatedId: page.slug,
          relatedType: "page",
          read: false,
          createdAt: updatedAt,
        },
      })
    ),
  ]);

  return Response.json(updated);
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
  // Keep the title shown on open suggestions and page requests in sync.
  if (body.title !== undefined) {
    await prisma.$transaction(propagatePageTitle(page.id, updated.title));
  }
  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { slug } });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  // Comments, suggestions, versions, and share links cascade via FK. PageRequest
  // and DiscussionTag reference pages by loose string (no relation), so clean up
  // those dangling references explicitly.
  await prisma.$transaction([
    prisma.pageRequest.deleteMany({ where: { pageId: page.id } }),
    prisma.discussionTag.deleteMany({ where: { kind: "page", ref: slug } }),
    prisma.wikiPage.delete({ where: { slug } }),
  ]);
  return new Response(null, { status: 204 });
}
