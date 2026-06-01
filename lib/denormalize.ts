import prisma from "@/lib/prisma";
import type { PrismaPromise } from "@prisma/client";
import type { Role } from "@/types";

/**
 * Several tables keep a denormalized copy of a user's name/role or a page's
 * title at the time a row was created. Some of those copies are meant to be
 * a *live* reflection of the current entity (e.g. who authored a comment),
 * while others are a *historical snapshot* that should stay frozen.
 *
 * These helpers keep the live copies in sync. History is deliberately left
 * untouched:
 *   - PageVersion.authorName/authorRole  → a version is a point-in-time record
 *   - *.authorRole on comments/suggestions → role at the moment of the action
 *   - reviewedBy / resolvedBy             → "reviewed by X on date Y"
 */

/** Live surfaces that should show the user's *current* display name. */
export function propagateUserName(userId: string, name: string): PrismaPromise<unknown>[] {
  return [
    prisma.wikiPage.updateMany({ where: { authorId: userId }, data: { authorName: name } }),
    prisma.lineComment.updateMany({ where: { authorId: userId }, data: { authorName: name } }),
    prisma.editSuggestion.updateMany({ where: { authorId: userId }, data: { authorName: name } }),
    prisma.pageRequest.updateMany({ where: { requesterId: userId }, data: { requesterName: name } }),
    prisma.discussionPost.updateMany({ where: { authorId: userId }, data: { authorName: name } }),
    prisma.discussionAssignee.updateMany({ where: { userId }, data: { userName: name } }),
  ];
}

/** Assignees represent *currently* assigned people, so their role badge tracks the live role. */
export function propagateUserRole(userId: string, role: Role): PrismaPromise<unknown>[] {
  return [
    prisma.discussionAssignee.updateMany({ where: { userId }, data: { userRole: role } }),
  ];
}

/** Open suggestions and page requests reference a page by its current title. */
export function propagatePageTitle(pageId: string, title: string): PrismaPromise<unknown>[] {
  return [
    prisma.editSuggestion.updateMany({ where: { pageId }, data: { pageTitle: title } }),
    prisma.pageRequest.updateMany({ where: { pageId }, data: { pageTitle: title } }),
  ];
}
