import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function GET() {
  const members = await prisma.teamMember.findMany({ orderBy: { registeredAt: "asc" } });
  return Response.json(members.map(m => ({
    ...m,
    role: m.role as Role,
    userId: m.userId ?? undefined,
    boatClass: m.boatClass ?? undefined,
    seat: m.seat ?? undefined,
    side: m.side as "port" | "starboard" | "cox" | undefined ?? undefined,
    email: m.email ?? undefined,
  })));
}
