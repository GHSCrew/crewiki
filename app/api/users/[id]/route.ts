import { compare, hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { role?: Role; activate?: boolean; currentPassword?: string; newPassword?: string; name?: string; username?: string };

  if (body.activate) {
    const user = await prisma.user.update({ where: { id }, data: { status: "active" } });
    const now = new Date().toISOString().split("T")[0];
    await prisma.teamMember.create({
      data: { userId: user.id, name: user.name, role: user.role, username: user.username ?? undefined, registeredAt: now },
    });
    return Response.json({ ok: true });
  }

  if (body.currentPassword && body.newPassword) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    const valid = await compare(body.currentPassword, user.passwordHash);
    if (!valid) return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    const passwordHash = await hash(body.newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    return Response.json({ ok: true });
  }

  if (body.name !== undefined || body.username !== undefined) {
    if (body.username !== undefined) {
      const taken = await prisma.user.findFirst({ where: { username: body.username, NOT: { id } } });
      if (taken) return Response.json({ error: "Username already taken." }, { status: 409 });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.username !== undefined && { username: body.username || null }),
      },
    });
    await prisma.teamMember.updateMany({
      where: { userId: id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.username !== undefined && { username: body.username || null }),
      },
    });
    return Response.json({
      id: updated.id, name: updated.name, email: updated.email,
      username: updated.username ?? undefined,
      role: updated.role as Role, avatarUrl: updated.avatarUrl ?? undefined, joinedAt: updated.joinedAt,
    });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role: body.role } });
  return Response.json({
    id: updated.id, name: updated.name, email: updated.email,
    username: updated.username ?? undefined,
    role: updated.role as Role, avatarUrl: updated.avatarUrl ?? undefined, joinedAt: updated.joinedAt,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return Response.json({ ok: true });
}
