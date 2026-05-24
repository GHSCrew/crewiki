import { create } from "zustand";
import type { WikiPage, EditSuggestion, LineComment, Notification, PageVersion } from "@/types";

interface WikiStore {
  pages: WikiPage[];
  suggestions: EditSuggestion[];
  comments: LineComment[];
  notifications: Notification[];
  versions: PageVersion[];
  hydrated: boolean;

  hydrate: (userId?: string) => Promise<void>;
  getPage: (slug: string) => WikiPage | undefined;
  updatePage: (slug: string, content: string, authorId: string, authorName: string, authorRole: string, message: string) => Promise<void>;
  addSuggestion: (s: Omit<EditSuggestion, "id" | "createdAt">) => Promise<void>;
  updateSuggestionStatus: (id: string, status: EditSuggestion["status"], reviewedBy: string, note: string) => Promise<void>;
  addComment: (c: Omit<LineComment, "id" | "createdAt">) => Promise<void>;
  resolveComment: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  getVersions: (pageId: string) => PageVersion[];
  getPageComments: (pageId: string) => LineComment[];
  getOpenSuggestions: () => EditSuggestion[];
}

export const useWikiStore = create<WikiStore>((set, get) => ({
  pages: [],
  suggestions: [],
  comments: [],
  notifications: [],
  versions: [],
  hydrated: false,

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

  updateSuggestionStatus: async (id, status, reviewedBy, note) => {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewedBy, reviewNote: note }),
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

  getVersions: (pageId) => get().versions.filter(v => v.pageId === pageId).sort((a, b) => b.version - a.version),
  getPageComments: (pageId) => get().comments.filter(c => c.pageId === pageId),
  getOpenSuggestions: () => get().suggestions.filter(s => s.status === "open"),
}));
