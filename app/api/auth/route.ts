import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function POST(request: Request) {
  const { username, password } = await request.json() as { username: string; password: string };

  if (!username || !password) {
    return Response.json({ error: "Username and password required." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { username: username.toLowerCase() },
  });

  if (!user) {
    return Response.json({ error: "No account found with that username." }, { status: 401 });
  }

  if (user.status === "pending") {
    return Response.json({ error: "Your account is pending approval by a coach or captain." }, { status: 403 });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  return Response.json({
    id: user.id,
    name: user.name,
    username: user.username ?? undefined,
    role: user.role as Role,
    joinedAt: user.joinedAt,
  });
}
