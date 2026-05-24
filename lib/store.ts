import { create } from "zustand";
import type { WikiPage, EditSuggestion, LineComment, Notification, PageVersion } from "@/types";
import {
  MOCK_PAGES, MOCK_SUGGESTIONS, MOCK_COMMENTS, MOCK_NOTIFICATIONS, MOCK_VERSIONS
} from "@/lib/data";

interface WikiStore {
  pages: WikiPage[];
  suggestions: EditSuggestion[];
  comments: LineComment[];
  notifications: Notification[];
  versions: PageVersion[];

  getPage: (slug: string) => WikiPage | undefined;
  updatePage: (id: string, content: string, authorId: string, authorName: string, message: string) => void;
  addSuggestion: (s: Omit<EditSuggestion, "id" | "createdAt">) => void;
  updateSuggestionStatus: (id: string, status: EditSuggestion["status"], reviewedBy: string, note: string) => void;
  addComment: (c: Omit<LineComment, "id" | "createdAt">) => void;
  resolveComment: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  getVersions: (pageId: string) => PageVersion[];
  getPageComments: (pageId: string) => LineComment[];
  getOpenSuggestions: () => EditSuggestion[];
}

export const useWikiStore = create<WikiStore>((set, get) => ({
  pages: MOCK_PAGES,
  suggestions: MOCK_SUGGESTIONS,
  comments: MOCK_COMMENTS,
  notifications: MOCK_NOTIFICATIONS,
  versions: MOCK_VERSIONS,

  getPage: (slug) => get().pages.find(p => p.slug === slug),

  updatePage: (id, content, authorId, authorName, message) => set(state => {
    const pages = state.pages.map(p => {
      if (p.id !== id) return p;
      const newVersion = p.version + 1;
      return { ...p, content, updatedAt: new Date().toISOString().split("T")[0], version: newVersion };
    });
    const page = pages.find(p => p.id === id)!;
    const newVer: PageVersion = {
      id: `v-${Date.now()}`, pageId: id, content, authorId, authorName,
      authorRole: "coach", message, createdAt: new Date().toISOString().split("T")[0], version: page.version,
    };
    return { pages, versions: [...state.versions, newVer] };
  }),

  addSuggestion: (s) => set(state => ({
    suggestions: [...state.suggestions, { ...s, id: `s-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] }],
    notifications: [...state.notifications, {
      id: `n-${Date.now()}`, userId: "u1",
      type: "suggestion_opened",
      title: `New suggestion on ${s.pageTitle}`,
      body: `${s.authorName} suggested an edit.`,
      relatedId: `s-${Date.now()}`, relatedType: "suggestion", read: false,
      createdAt: new Date().toISOString().split("T")[0],
    }],
  })),

  updateSuggestionStatus: (id, status, reviewedBy, note) => set(state => ({
    suggestions: state.suggestions.map(s => s.id !== id ? s : {
      ...s, status, reviewedBy, reviewedAt: new Date().toISOString().split("T")[0], reviewNote: note,
    }),
  })),

  addComment: (c) => set(state => ({
    comments: [...state.comments, { ...c, id: `c-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] }],
  })),

  resolveComment: (id) => set(state => ({
    comments: state.comments.map(c => c.id !== id ? c : { ...c, resolved: true }),
  })),

  markNotificationRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id !== id ? n : { ...n, read: true }),
  })),

  markAllRead: (userId) => set(state => ({
    notifications: state.notifications.map(n => n.userId !== userId ? n : { ...n, read: true }),
  })),

  getVersions: (pageId) => get().versions.filter(v => v.pageId === pageId).sort((a, b) => b.version - a.version),
  getPageComments: (pageId) => get().comments.filter(c => c.pageId === pageId),
  getOpenSuggestions: () => get().suggestions.filter(s => s.status === "open"),
}));
