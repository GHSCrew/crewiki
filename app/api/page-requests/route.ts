import prisma from "@/lib/prisma";

export async function GET() {
  const requests = await prisma.pageRequest.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(requests);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      type: "create" | "delete" | "move";
      requesterId: string;
      requesterName: string;
      requesterRole: string;
      pageId?: string;
      pageTitle?: string;
      pageSlug?: string;
      newFolder?: string;
      newTitle?: string;
      newContent?: string;
      folder?: string;
      message?: string;
    };

    const now = new Date().toISOString().split("T")[0];
    const req = await prisma.pageRequest.create({
      data: {
        type: body.type,
        requesterId: body.requesterId,
        requesterName: body.requesterName,
        requesterRole: body.requesterRole,
        pageId: body.pageId ?? null,
        pageTitle: body.pageTitle ?? null,
        pageSlug: body.pageSlug ?? null,
        newFolder: body.newFolder ?? null,
        newTitle: body.newTitle ?? null,
        newContent: body.newContent ?? null,
        folder: body.folder ?? null,
        message: body.message ?? "",
        createdAt: now,
      },
    });
    return Response.json(req, { status: 201 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
