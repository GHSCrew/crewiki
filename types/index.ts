export type Role = "athlete" | "captain" | "coach";

export interface User {
  id: string;
  name: string;
  username?: string;
  role: Role;
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
    | "page_updated";
  title: string;
  body: string;
  relatedId?: string;
  relatedType?: "page" | "suggestion" | "comment";
  read: boolean;
  createdAt: string;
}


export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  role: Role;
  username?: string;
  registeredAt: string;
}

export type ViewMode = "read" | "comments" | "edit" | "suggest" | "blame" | "history" | "manage" | "graph";

export interface PageRequest {
  id: string;
  type: "create" | "delete" | "move";
  status: "pending" | "approved" | "rejected";
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  pageId?: string;
  pageTitle?: string;
  pageSlug?: string;
  newFolder?: string;
  newTitle?: string;
  newSlug?: string;
  newContent?: string;
  folder?: string;
  message: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type DiscussionType = "stub" | "error" | "redundancy" | "reference";

export interface DiscussionTag {
  id: string;
  postId: string;
  kind: "page" | "folder";
  ref: string;   // page slug or folder path
  label: string; // page title or folder name
}

export interface DiscussionAssignee {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userRole: Role;
}

export interface DiscussionPost {
  id: string;
  type: DiscussionType;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: string; // full ISO timestamp
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  tags: DiscussionTag[];
  assignees: DiscussionAssignee[];
}

export type Permission = "view" | "suggest" | "edit";

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  athlete: "suggest",
  captain: "edit",
  coach: "edit",
};
