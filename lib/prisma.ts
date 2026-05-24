import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "prisma/dev.db");

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

export default prisma;
