import prisma from "@/lib/prisma";
import type { DiscussionType, Role } from "@/types";

const VALID_TYPES: DiscussionType[] = ["stub", "error", "redundancy", "reference"];

export async function GET() {
  const posts = await prisma.discussionPost.findMany({
    include: { tags: true, assignees: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(
    posts.map(p => ({
      ...p,
      authorRole: p.authorRole as Role,
      assignees: p.assignees.map(a => ({ ...a, userRole: a.userRole as Role })),
      tags: p.tags.map(t => ({ ...t, kind: t.kind as "page" | "folder" })),
    }))
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type: DiscussionType;
    title: string;
    body?: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    tags?: { kind: "page" | "folder"; ref: string; label: string }[];
  };

  if (!VALID_TYPES.includes(body.type)) {
    return Response.json({ error: "Invalid request type" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const created = await prisma.discussionPost.create({
    data: {
      type: body.type,
      title: body.title.trim(),
      body: body.body?.trim() ?? "",
      authorId: body.authorId,
      authorName: body.authorName,
      authorRole: body.authorRole,
      createdAt: new Date().toISOString(),
      tags: {
        create: (body.tags ?? []).map(t => ({ kind: t.kind, ref: t.ref, label: t.label })),
      },
    },
    include: { tags: true, assignees: true },
  });

  return Response.json(created, { status: 201 });
}
