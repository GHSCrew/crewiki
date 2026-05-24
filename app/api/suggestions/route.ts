import prisma from "@/lib/prisma";
import type { Role } from "@/types";

function mapSuggestion(s: {
  id: string; pageId: string; pageTitle: string; pageSlug: string;
  authorId: string; authorName: string; authorRole: string;
  originalContent: string; suggestedContent: string; message: string;
  status: string; lineStart: number | null; lineEnd: number | null; createdAt: string;
  reviewedBy: string | null; reviewedAt: string | null; reviewNote: string | null;
}) {
  return {
    ...s,
    authorRole: s.authorRole as Role,
    status: s.status as "open" | "approved" | "rejected" | "merged",
    lineStart: s.lineStart ?? undefined,
    lineEnd: s.lineEnd ?? undefined,
    reviewedBy: s.reviewedBy ?? undefined,
    reviewedAt: s.reviewedAt ?? undefined,
    reviewNote: s.reviewNote ?? undefined,
  };
}

export async function GET() {
  const suggestions = await prisma.editSuggestion.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(suggestions.map(mapSuggestion));
}

export async function POST(request: Request) {
  const body = await request.json() as {
    pageId: string; pageTitle: string; pageSlug: string;
    authorId: string; authorName: string; authorRole: Role;
    originalContent: string; suggestedContent: string; message: string;
    lineStart?: number; lineEnd?: number;
  };

  const createdAt = new Date().toISOString().split("T")[0];

  const [suggestion] = await prisma.$transaction([
    prisma.editSuggestion.create({
      data: { ...body, status: "open", createdAt },
    }),
    prisma.notification.create({
      data: {
        userId: "u1",
        type: "suggestion_opened",
        title: `New suggestion on ${body.pageTitle}`,
        body: `${body.authorName} suggested an edit.`,
        relatedType: "suggestion",
        read: false,
        createdAt,
      },
    }),
  ]);

  return Response.json(mapSuggestion(suggestion), { status: 201 });
}
