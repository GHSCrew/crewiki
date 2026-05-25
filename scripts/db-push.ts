/**
 * Pushes the Prisma schema to Turso by generating a SQL migration with
 * `prisma migrate diff` and applying it via @libsql/client.executeMultiple().
 *
 * Use for initial setup or after schema changes:
 *   pnpm db:push
 *
 * Note: this is a destructive "from empty" diff — it will fail if the tables
 * already exist. For incremental changes, write a migration SQL manually and
 * run it in the Turso web shell at app.turso.tech.
 */

import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";

if (!process.env.TURSO_DATABASE_URL) {
  console.error(
    "Error: TURSO_DATABASE_URL is not set.\n" +
    "Copy .env.example to .env and fill in your Turso credentials."
  );
  process.exit(1);
}

console.log("Generating schema SQL from prisma/schema.prisma ...");

const sql = execSync(
  "prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  { encoding: "utf-8" }
);

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("Applying schema to Turso ...");
  await client.executeMultiple(sql);
  console.log("✓ Schema pushed to Turso successfully!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
