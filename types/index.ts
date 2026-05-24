export type Role = "athlete" | "captain" | "coach" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  joinedAt: string;
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  folder: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: string[];
  youtubeLinks?: string[];
}

export interface PageVersion {
  id: string;
  pageId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  message: string;
  createdAt: string;
  version: number;
}

export interface LineComment {
  id: string;
  pageId: string;
  lineNumber: number;
  lineContent: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
  resolved: boolean;
}

export interface EditSuggestion {
  id: string;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  originalContent: string;
  suggestedContent: string;
  message: string;
  status: "open" | "approved" | "rejected" | "merged";
  lineStart?: number;
  lineEnd?: number;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "suggestion_opened"
    | "suggestion_approved"
    | "suggestion_rejected"
    | "suggestion_merged"
    | "comment_added"
    | "page_updated"
    | "assignment_posted";
  title: string;
  body: string;
  relatedId?: string;
  relatedType?: "page" | "suggestion" | "comment" | "assignment";
  read: boolean;
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  createdBy: string;
  createdByName: string;
  type: "erg" | "reading" | "video" | "other";
  googleClassroomLink?: string;
  youtubeLink?: string;
  targetRoles: Role[];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  role: Role;
  boatClass?: string;
  seat?: string;
  side?: "port" | "starboard" | "cox";
  email?: string;
  registeredAt: string;
}

export type Permission = "view" | "suggest" | "edit" | "admin";

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  athlete: "suggest",
  captain: "edit",
  coach: "edit",
  admin: "admin",
};
