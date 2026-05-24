import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email: string; password: string };

  if (!email || !password) {
    return Response.json({ error: "Email and password required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return Response.json({ error: "No account found with that email." }, { status: 401 });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl ?? undefined,
    joinedAt: user.joinedAt,
  });
}
