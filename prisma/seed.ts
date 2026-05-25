import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "node:path";

const adapter = new PrismaBetterSqlite3({ url: path.join(process.cwd(), "prisma/dev.db") });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.editSuggestion.deleteMany(),
    prisma.lineComment.deleteMany(),
    prisma.pageVersion.deleteMany(),
    prisma.pageRequest.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.wikiPage.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash("coach", 12);

  const coach = await prisma.user.create({
    data: {
      name: "Coach",
      username: "coach",
      passwordHash,
      role: "coach",
      status: "active",
      joinedAt: new Date().toISOString().split("T")[0],
    },
  });

  await prisma.teamMember.create({
    data: {
      userId: coach.id,
      name: coach.name,
      role: "coach",
      username: "coach",
      registeredAt: coach.joinedAt,
    },
  });

  console.log("Database seeded.");
  console.log("Coach login — username: coach  password: coach");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
