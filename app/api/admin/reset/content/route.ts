import prisma from "@/lib/prisma";

export async function POST() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.editSuggestion.deleteMany(),
    prisma.lineComment.deleteMany(),
    prisma.pageVersion.deleteMany(),
    prisma.pageRequest.deleteMany(),
    prisma.discussionPost.deleteMany(),
    prisma.wikiPage.deleteMany(),
  ]);
  return Response.json({ ok: true });
}
