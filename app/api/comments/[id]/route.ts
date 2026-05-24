import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updated = await prisma.lineComment.update({
    where: { id },
    data: { resolved: true },
  });
  return Response.json({ ...updated, authorRole: updated.authorRole as Role });
}
