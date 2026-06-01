import prisma from "@/lib/prisma";
import { pageContributorIds } from "@/lib/notify";
import type { Role } from "@/types";

function mapComment(c: {
  id: string; pageId: string; lineNumber: number; lineContent: string;
  authorId: string; authorName: string; authorRole: string;
  body: string; createdAt: string; resolved: boolean;
}) {
  return { ...c, authorRole: c.authorRole as Role };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");
  const comments = await prisma.lineComment.findMany({
    where: pageId ? { pageId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return Response.json(comments.map(mapComment));
}

export async function POST(request: Request) {
  const body = await request.json() as {
    pageId: string; lineNumber: number; lineContent: string;
    authorId: string; authorName: string; authorRole: Role; body: string;
  };

  const createdAt = new Date().toISOString().split("T")[0];
  const comment = await prisma.lineComment.create({
    data: { ...body, resolved: false, createdAt },
  });

  // Notify the page's contributors (creator + prior editors) — except the commenter.
  const page = await prisma.wikiPage.findUnique({ where: { id: body.pageId }, select: { title: true, slug: true } });
  const recipients = await pageContributorIds(body.pageId, body.authorId);
  if (page && recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map(userId => ({
        userId,
        type: "comment_added",
        title: `New comment on ${page.title}`,
        body: `${body.authorName} commented on "${page.title}".`,
        relatedId: page.slug,
        relatedType: "comment",
        read: false,
        createdAt,
      })),
    });
  }

  return Response.json(mapComment(comment), { status: 201 });
}
