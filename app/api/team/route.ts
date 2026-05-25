import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function POST(request: Request) {
  const body = await request.json() as { name: string; role: string; username?: string; registeredAt: string };
  const username = body.username?.trim() || undefined;

  let userId: string | undefined;
  if (username) {
    const existing = await prisma.user.findFirst({ where: { username } });
    if (!existing) {
      const passwordHash = await hash(username, 10);
      const user = await prisma.user.create({
        data: {
          name: body.name,
          username,
          passwordHash,
          role: body.role,
          status: "active",
          joinedAt: body.registeredAt,
        },
      });
      userId = user.id;
    } else {
      userId = existing.id;
    }
  }

  const m = await prisma.teamMember.create({
    data: { userId, name: body.name, role: body.role, username, registeredAt: body.registeredAt },
  });
  return Response.json({ ...m, role: m.role as Role, username: m.username ?? undefined });
}

export async function GET() {
  const members = await prisma.teamMember.findMany({ orderBy: { registeredAt: "asc" } });
  return Response.json(members.map(m => ({
    ...m,
    role: m.role as Role,
    userId: m.userId ?? undefined,
    username: m.username ?? undefined,
  })));
}
