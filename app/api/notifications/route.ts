import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const notifications = await prisma.notification.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(notifications.map(n => ({
    ...n,
    relatedId: n.relatedId ?? undefined,
    relatedType: n.relatedType as "page" | "suggestion" | "comment" | "discussion" | undefined ?? undefined,
  })));
}

export async function PATCH(request: Request) {
  const { userId } = await request.json() as { userId: string };
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return Response.json({ ok: true });
}
