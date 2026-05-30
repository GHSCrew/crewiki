/**
 * One-off: upgrade legacy PageVersion.createdAt values that are date-only
 * ("YYYY-MM-DD") to full ISO timestamps so the Activity feed can order edits
 * down to the minute. Existing rows are pinned to noon UTC of their day;
 * going forward the API writes real timestamps.
 *
 *   tsx --env-file=.env scripts/backfill-version-times.ts
 */
import prisma from "@/lib/prisma";

async function main() {
  const versions = await prisma.pageVersion.findMany({ select: { id: true, createdAt: true } });
  const stale = versions.filter(v => !v.createdAt.includes("T"));
  console.log(`Found ${versions.length} versions, ${stale.length} need upgrading.`);

  if (stale.length === 0) { console.log("Nothing to do."); return; }

  await prisma.$transaction(
    stale.map(v =>
      prisma.pageVersion.update({
        where: { id: v.id },
        data: { createdAt: `${v.createdAt}T12:00:00.000Z` },
      })
    )
  );
  console.log(`✓ Upgraded ${stale.length} version timestamps.`);
}

main()
  .catch(e => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
