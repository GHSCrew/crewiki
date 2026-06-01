import { compare, hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { propagateUserName, propagateUserRole } from "@/lib/denormalize";
import type { Role } from "@/types";

/** Normalize a username the same way signup does, so login lookups always match. */
function normalizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { role?: Role; activate?: boolean; currentPassword?: string; newPassword?: string; name?: string; username?: string };

  if (body.activate) {
    // Approving a pending signup just flips the account to active, which adds
    // them to the roster (the roster is the set of active users).
    await prisma.user.update({ where: { id }, data: { status: "active" } });
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
    let username: string | null | undefined;
    if (body.username !== undefined) {
      username = body.username.trim() ? normalizeUsername(body.username) : null;
      if (username) {
        const taken = await prisma.user.findFirst({ where: { username, NOT: { id } } });
        if (taken) return Response.json({ error: "Username already taken." }, { status: 409 });
      }
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(username !== undefined && { username }),
      },
    });
    // Keep denormalized name copies on the user's live content in sync.
    if (body.name !== undefined) {
      await prisma.$transaction(propagateUserName(id, updated.name));
    }
    return Response.json({
      id: updated.id, name: updated.name,
      username: updated.username ?? undefined,
      role: updated.role as Role, joinedAt: updated.joinedAt,
    });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role: body.role } });
  // Keep live role copies (currently: discussion assignees) in sync.
  await prisma.$transaction(propagateUserRole(id, updated.role as Role));
  return Response.json({
    id: updated.id, name: updated.name,
    username: updated.username ?? undefined,
    role: updated.role as Role, joinedAt: updated.joinedAt,
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
