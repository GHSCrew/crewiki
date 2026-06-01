import prisma from "@/lib/prisma";

// Deregistering removes someone from the roster. Since a roster member is just
// an active user account, we soft-delete by marking the account inactive: this
// drops them from the roster and blocks login while preserving any pages,
// comments, and edit history they authored.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { status: "inactive" } });
  return Response.json({ ok: true });
}
