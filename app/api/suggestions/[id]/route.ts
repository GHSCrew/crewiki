import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, reviewedBy, reviewNote, reviewerId } = await request.json() as {
    status: "approved" | "rejected" | "merged";
    reviewedBy: string;
    reviewNote: string;
    reviewerId?: string;
  };

  const updated = await prisma.editSuggestion.update({
    where: { id },
    data: { status, reviewedBy, reviewedAt: new Date().toISOString().split("T")[0], reviewNote },
  });

  // Let the suggestion's author know the outcome (unless they reviewed it themselves).
  // The status word ("approved"/"rejected"/"merged") doubles as the past-tense verb.
  if (updated.authorId !== reviewerId) {
    const author = await prisma.user.findFirst({ where: { id: updated.authorId, status: "active" }, select: { id: true } });
    if (author) {
      await prisma.notification.create({
        data: {
          userId: updated.authorId,
          type: `suggestion_${status}`,
          title: `Suggestion ${status}`,
          body: `${reviewedBy} ${status} your suggestion on "${updated.pageTitle}".`,
          relatedId: updated.pageSlug,
          relatedType: "suggestion",
          read: false,
          createdAt: new Date().toISOString().split("T")[0],
        },
      });
    }
  }

  return Response.json({
    ...updated,
    authorRole: updated.authorRole as Role,
    status: updated.status as "open" | "approved" | "rejected" | "merged",
    lineStart: updated.lineStart ?? undefined,
    lineEnd: updated.lineEnd ?? undefined,
    reviewedBy: updated.reviewedBy ?? undefined,
    reviewedAt: updated.reviewedAt ?? undefined,
    reviewNote: updated.reviewNote ?? undefined,
  });
}
