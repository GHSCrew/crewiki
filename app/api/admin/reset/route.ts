import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.editSuggestion.deleteMany(),
    prisma.lineComment.deleteMany(),
    prisma.pageVersion.deleteMany(),
    prisma.pageRequest.deleteMany(),
    prisma.discussionPost.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.wikiPage.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash("coach", 12);
  const today = new Date().toISOString().split("T")[0];

  const coach = await prisma.user.create({
    data: {
      name: "Coach",
      username: "coach",
      passwordHash,
      role: "coach",
      status: "active",
      joinedAt: today,
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: coach.id,
      name: coach.name,
      role: "coach",
      username: "coach",
      registeredAt: today,
    },
  });

  return Response.json({ ok: true });
}
