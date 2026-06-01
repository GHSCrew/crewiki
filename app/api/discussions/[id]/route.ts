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
    actorId?: string;
    actorName?: string;
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
    const incoming = body.assignees ?? [];

    // Figure out who is *newly* assigned (in the new set but not the old) so we
    // can notify just them — not people who were already assigned, and not the
    // person doing the assigning if they assigned themselves.
    const existing = await prisma.discussionAssignee.findMany({
      where: { postId: id },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map(e => e.userId));
    const post = await prisma.discussionPost.findUnique({ where: { id }, select: { title: true } });
    const newlyAssigned = incoming.filter(a => !existingIds.has(a.userId) && a.userId !== body.actorId);
    const createdAt = new Date().toISOString().split("T")[0];

    // Replace the full assignee set atomically, alongside any notifications.
    await prisma.$transaction([
      prisma.discussionAssignee.deleteMany({ where: { postId: id } }),
      prisma.discussionAssignee.createMany({
        data: incoming.map(a => ({
          postId: id,
          userId: a.userId,
          userName: a.userName,
          userRole: a.userRole,
        })),
      }),
      ...(post && body.actorName
        ? newlyAssigned.map(a =>
            prisma.notification.create({
              data: {
                userId: a.userId,
                type: "issue_assigned",
                title: "New issue assignment",
                body: `${body.actorName} assigned you to the issue "${post.title}".`,
                relatedId: id,
                relatedType: "discussion",
                read: false,
                createdAt,
              },
            })
          )
        : []),
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
