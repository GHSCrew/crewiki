import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

// The roster is simply the set of active user accounts — there is no separate
// "team member" record. Identity (name, username, role) lives only on User.

function toMember(u: { id: string; name: string; username: string | null; role: string; joinedAt: string }) {
  return { id: u.id, name: u.name, username: u.username ?? undefined, role: u.role as Role, joinedAt: u.joinedAt };
}

export async function POST(request: Request) {
  const body = await request.json() as { name: string; role: string; username?: string; registeredAt?: string };
  const username = body.username?.trim().toLowerCase() || undefined;
  if (!username) {
    return Response.json({ error: "Username is required." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) {
    return Response.json({ error: "Username already taken." }, { status: 409 });
  }

  const joinedAt = body.registeredAt || new Date().toISOString().split("T")[0];
  const passwordHash = await hash(username, 10);
  const user = await prisma.user.create({
    data: { name: body.name, username, passwordHash, role: body.role, status: "active", joinedAt },
  });
  return Response.json(toMember(user));
}

export async function GET() {
  const users = await prisma.user.findMany({
    where: { status: "active" },
    orderBy: { joinedAt: "asc" },
  });
  return Response.json(users.map(toMember));
}
