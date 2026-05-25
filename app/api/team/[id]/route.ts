import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.teamMember.delete({ where: { id } });
  return Response.json({ ok: true });
}
