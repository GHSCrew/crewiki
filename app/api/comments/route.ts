import prisma from "@/lib/prisma";
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

  const comment = await prisma.lineComment.create({
    data: { ...body, resolved: false, createdAt: new Date().toISOString().split("T")[0] },
  });

  return Response.json(mapComment(comment), { status: 201 });
}
