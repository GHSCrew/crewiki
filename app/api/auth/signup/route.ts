import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, username, password } = await request.json() as { name: string; username: string; password: string };

  if (!name?.trim() || !username?.trim() || !password) {
    return Response.json({ error: "Name, username, and password are required." }, { status: 400 });
  }

  const slug = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!slug) return Response.json({ error: "Invalid username." }, { status: 400 });

  const existing = await prisma.user.findFirst({ where: { username: slug } });
  if (existing) {
    return Response.json({ error: "That username is already taken." }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const now = new Date().toISOString().split("T")[0];

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      username: slug,
      passwordHash,
      role: "athlete",
      status: "pending",
      joinedAt: now,
    },
  });

  return Response.json({ id: user.id, name: user.name, username: user.username }, { status: 201 });
}
