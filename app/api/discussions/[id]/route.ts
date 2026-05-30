import prisma from "@/lib/prisma";
import type { Role } from "@/types";

type Assignee = { userId: string; userName: string; userRole: string };

function serialize(p: {
  authorRole: string;
  assignees: { userRole: string }[];
  tags: { kind: string }[];
} & Record<string, unknown>) {
  return {
    ...p,
    authorRole: p.authorRole as Role,
    assignees: p.assignees.map(a => ({ ...a, userRole: a.userRole as Role })),
    tags: p.tags.map(t => ({ ...t, kind: t.kind as "page" | "folder" })),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    action: "resolve" | "reopen" | "setAssignees";
    resolvedBy?: string;
    assignees?: Assignee[];
  };

  if (body.action === "resolve") {
    await prisma.discussionPost.update({
      where: { id },
      data: { resolved: true, resolvedBy: body.resolvedBy ?? null, resolvedAt: new Date().toISOString() },
    });
  } else if (body.action === "reopen") {
    await prisma.discussionPost.update({
      where: { id },
      data: { resolved: false, resolvedBy: null, resolvedAt: null },
    });
  } else if (body.action === "setAssignees") {
    // Replace the full assignee set atomically.
    await prisma.$transaction([
      prisma.discussionAssignee.deleteMany({ where: { postId: id } }),
      prisma.discussionAssignee.createMany({
        data: (body.assignees ?? []).map(a => ({
          postId: id,
          userId: a.userId,
          userName: a.userName,
          userRole: a.userRole,
        })),
      }),
    ]);
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = await prisma.discussionPost.findUnique({
    where: { id },
    include: { tags: true, assignees: true },
  });
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(serialize(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.discussionPost.delete({ where: { id } });
  return Response.json({ ok: true });
}
