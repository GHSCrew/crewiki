/**
 * Applies a raw SQL file to both the local prisma/dev.db (kept in sync so
 * future `prisma migrate diff` stays clean) and the remote Turso database.
 *
 *   tsx --env-file=.env scripts/apply-sql.ts scripts/sql/0001_discussions.sql
 *
 * Intended for additive, non-destructive schema changes (CREATE TABLE, etc.).
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx scripts/apply-sql.ts <path-to-sql-file>");
  process.exit(1);
}
const sql = readFileSync(file, "utf-8");

async function applyTo(label: string, url: string, authToken?: string) {
  const client = createClient({ url, authToken });
  await client.executeMultiple(sql);
  console.log(`✓ Applied ${file} to ${label}`);
  client.close();
}

async function main() {
  await applyTo("local dev.db", "file:./prisma/dev.db");
  if (process.env.TURSO_DATABASE_URL) {
    await applyTo("Turso", process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN);
  } else {
    console.warn("⚠ TURSO_DATABASE_URL not set — skipped remote.");
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
