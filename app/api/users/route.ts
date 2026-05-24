import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { joinedAt: "asc" } });
  return Response.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    avatarUrl: u.avatarUrl ?? undefined,
    joinedAt: u.joinedAt,
  })));
}
