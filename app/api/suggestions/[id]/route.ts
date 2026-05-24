import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, reviewedBy, reviewNote } = await request.json() as {
    status: "approved" | "rejected" | "merged";
    reviewedBy: string;
    reviewNote: string;
  };

  const updated = await prisma.editSuggestion.update({
    where: { id },
    data: { status, reviewedBy, reviewedAt: new Date().toISOString().split("T")[0], reviewNote },
  });

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
