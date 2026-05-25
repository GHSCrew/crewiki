import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pending = searchParams.get("pending") === "true";
  const users = await prisma.user.findMany({
    where: pending
      ? { status: "pending" }
      : { status: { not: "pending" }, teamMember: { isNot: null } },
    orderBy: { joinedAt: "asc" },
  });
  return Response.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username ?? undefined,
    role: u.role as Role,
    status: u.status,
    avatarUrl: u.avatarUrl ?? undefined,
    joinedAt: u.joinedAt,
  })));
}
