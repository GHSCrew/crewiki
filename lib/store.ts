import { create } from "zustand";
import type { WikiPage, EditSuggestion, LineComment, Notification, PageVersion, PageRequest, ViewMode, DiscussionPost, DiscussionType, DiscussionAssignee } from "@/types";

interface WikiStore {
  pages: WikiPage[];
  suggestions: EditSuggestion[];
  comments: LineComment[];
  notifications: Notification[];
  versions: PageVersion[];
  pageRequests: PageRequest[];
  discussions: DiscussionPost[];
  hydrated: boolean;
  viewMode: ViewMode;

  hydrate: (userId?: string) => Promise<void>;
  getPage: (slug: string) => WikiPage | undefined;
  updatePage: (slug: string, content: string, authorId: string, authorName: string, authorRole: string, message: string) => Promise<void>;
  createPage: (title: string, content: string, folder: string, authorId: string, authorName: string, authorRole: string) => Promise<WikiPage>;
  deletePage: (slug: string) => Promise<void>;
  movePage: (slug: string, newFolder: string) => Promise<void>;
  renamePage: (slug: string, newTitle: string) => Promise<WikiPage>;
  renameFolder: (oldName: string, newName: string) => Promise<void>;
  addSuggestion: (s: Omit<EditSuggestion, "id" | "createdAt">) => Promise<void>;
  updateSuggestionStatus: (id: string, status: EditSuggestion["status"], reviewedBy: string, note: string, reviewerId?: string) => Promise<void>;
  addComment: (c: Omit<LineComment, "id" | "createdAt">) => Promise<void>;
  resolveComment: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  setViewMode: (m: ViewMode) => void;
  fetchVersions: (slug: string) => Promise<void>;
  fetchPageRequests: () => Promise<void>;
  addPageRequest: (req: Omit<PageRequest, "id" | "createdAt" | "status">) => Promise<void>;
  reviewPageRequest: (id: string, status: "approved" | "rejected", reviewedBy: string, reviewNote: string) => Promise<void>;
  getVersions: (pageId: string) => PageVersion[];
  getPageComments: (pageId: string) => LineComment[];
  getOpenSuggestions: () => EditSuggestion[];
  fetchDiscussions: () => Promise<void>;
  createDiscussion: (input: {
    type: DiscussionType; title: string; body: string;
    authorId: string; authorName: string; authorRole: string;
    tags: { kind: "page" | "folder"; ref: string; label: string }[];
  }) => Promise<void>;
  setDiscussionResolved: (id: string, resolved: boolean, resolvedBy: string) => Promise<void>;
  setDiscussionAssignees: (id: string, assignees: Omit<DiscussionAssignee, "id" | "postId">[], actor?: { id: string; name: string }) => Promise<void>;
  deleteDiscussion: (id: string) => Promise<void>;
}

export const useWikiStore = create<WikiStore>((set, get) => ({
  pages: [],
  suggestions: [],
  comments: [],
  notifications: [],
  versions: [],
  pageRequests: [],
  discussions: [],
  hydrated: false,
  viewMode: "read",

  hydrate: async (userId?: string) => {
    if (get().hydrated) return;
    const [pages, suggestions, comments, notifications] = await Promise.all([
      fetch("/api/pages").then(r => r.json()),
      fetch("/api/suggestions").then(r => r.json()),
      fetch("/api/comments").then(r => r.json()),
      userId ? fetch(`/api/notifications?userId=${userId}`).then(r => r.json()) : Promise.resolve([]),
    ]);
    set({ pages, suggestions, comments, notifications, hydrated: true });
  },

  getPage: (slug) => get().pages.find(p => p.slug === slug),

  createPage: async (title, content, folder, authorId, authorName, authorRole) => {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, folder, authorId, authorName, authorRole }),
    });
    const created: WikiPage = await res.json();
    set(state => ({ pages: [...state.pages, created].sort((a, b) => a.title.localeCompare(b.title)) }));
    return created;
  },

  deletePage: async (slug) => {
    await fetch(`/api/pages/${slug}`, { method: "DELETE" });
    set(state => ({ pages: state.pages.filter(p => p.slug !== slug) }));
  },

  movePage: async (slug, newFolder) => {
    const res = await fetch(`/api/pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: newFolder }),
    });
    const updated: WikiPage = await res.json();
    set(state => ({ pages: state.pages.map(p => p.slug === slug ? updated : p) }));
  },

  renamePage: async (slug, newTitle) => {
    const res = await fetch(`/api/pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    const updated: WikiPage = await res.json();
    set(state => ({ pages: state.pages.map(p => p.slug === slug ? updated : p) }));
    return updated;
  },

  renameFolder: async (oldName, newName) => {
    const res = await fetch("/api/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldFolder: oldName, newFolder: newName }),
    });
    const updatedPages: WikiPage[] = await res.json();
    const updatedIds = new Set(updatedPages.map(p => p.id));
    set(state => ({
      pages: state.pages.map(p => {
        const updated = updatedPages.find(u => u.id === p.id);
        return updatedIds.has(p.id) && updated ? updated : p;
      }),
    }));
  },

  updatePage: async (slug, content, authorId, authorName, authorRole, message) => {
    const res = await fetch(`/api/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, authorId, authorName, authorRole, message }),
    });
    const updated: WikiPage = await res.json();
    set(state => ({ pages: state.pages.map(p => p.slug === slug ? updated : p) }));
  },

  addSuggestion: async (s) => {
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const created: EditSuggestion = await res.json();
    set(state => ({ suggestions: [...state.suggestions, created] }));
  },

  updateSuggestionStatus: async (id, status, reviewedBy, note, reviewerId) => {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewedBy, reviewNote: note, reviewerId }),
    });
    const updated: EditSuggestion = await res.json();
    set(state => ({ suggestions: state.suggestions.map(s => s.id !== id ? s : updated) }));
  },

  addComment: async (c) => {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    const created: LineComment = await res.json();
    set(state => ({ comments: [...state.comments, created] }));
  },

  resolveComment: async (id) => {
    const res = await fetch(`/api/comments/${id}`, { method: "PATCH" });
    const updated: LineComment = await res.json();
    set(state => ({ comments: state.comments.map(c => c.id !== id ? c : updated) }));
  },

  markNotificationRead: async (id) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    set(state => ({ notifications: state.notifications.map(n => n.id !== id ? n : { ...n, read: true }) }));
  },

  markAllRead: async (userId) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    set(state => ({ notifications: state.notifications.map(n => n.userId !== userId ? n : { ...n, read: true }) }));
  },

  setViewMode: (m) => set({ viewMode: m }),

  fetchPageRequests: async () => {
    const reqs: PageRequest[] = await fetch("/api/page-requests").then(r => r.json());
    set({ pageRequests: reqs });
  },

  addPageRequest: async (req) => {
    const res = await fetch("/api/page-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const created: PageRequest = await res.json();
    set(state => ({ pageRequests: [created, ...state.pageRequests] }));
  },

  reviewPageRequest: async (id, status, reviewedBy, reviewNote) => {
    const res = await fetch(`/api/page-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewedBy, reviewNote }),
    });
    const data = await res.json();
    set(state => ({
      pageRequests: state.pageRequests.map(r => r.id !== id ? r : data.request),
      pages: data.pages ?? state.pages,
    }));
  },

  fetchVersions: async (slug) => {
    const fetched: PageVersion[] = await fetch(`/api/pages/${slug}/versions`).then(r => r.json());
    set(state => {
      const page = state.pages.find(p => p.slug === slug);
      if (!page) return {};
      const others = state.versions.filter(v => v.pageId !== page.id);
      return { versions: [...others, ...fetched] };
    });
  },

  getVersions: (pageId) => get().versions.filter(v => v.pageId === pageId).sort((a, b) => b.version - a.version),
  getPageComments: (pageId) => get().comments.filter(c => c.pageId === pageId),
  getOpenSuggestions: () => get().suggestions.filter(s => s.status === "open"),

  fetchDiscussions: async () => {
    const discussions: DiscussionPost[] = await fetch("/api/discussions").then(r => r.json());
    set({ discussions });
  },

  createDiscussion: async (input) => {
    const res = await fetch("/api/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const created: DiscussionPost = await res.json();
    set(state => ({ discussions: [created, ...state.discussions] }));
  },

  setDiscussionResolved: async (id, resolved, resolvedBy) => {
    const res = await fetch(`/api/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: resolved ? "resolve" : "reopen", resolvedBy }),
    });
    const updated: DiscussionPost = await res.json();
    set(state => ({ discussions: state.discussions.map(d => d.id === id ? updated : d) }));
  },

  setDiscussionAssignees: async (id, assignees, actor) => {
    const res = await fetch(`/api/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setAssignees", assignees, actorId: actor?.id, actorName: actor?.name }),
    });
    const updated: DiscussionPost = await res.json();
    set(state => ({ discussions: state.discussions.map(d => d.id === id ? updated : d) }));
  },

  deleteDiscussion: async (id) => {
    await fetch(`/api/discussions/${id}`, { method: "DELETE" });
    set(state => ({ discussions: state.discussions.filter(d => d.id !== id) }));
  },
}));
