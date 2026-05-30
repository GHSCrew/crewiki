import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await prisma.shareLink.deleteMany({ where: { token } });
  return Response.json({ ok: true });
}
