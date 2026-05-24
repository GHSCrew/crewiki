import prisma from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return Response.json({
    ...updated,
    relatedId: updated.relatedId ?? undefined,
    relatedType: updated.relatedType as "page" | "suggestion" | "comment" | undefined ?? undefined,
  });
}
