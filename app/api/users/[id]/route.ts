import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { role } = await request.json() as { role: Role };

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role as Role,
    avatarUrl: updated.avatarUrl ?? undefined,
    joinedAt: updated.joinedAt,
  });
}
