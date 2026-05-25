"use client";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";

const TYPE_ICONS: Record<string, string> = {
  suggestion_opened: "✏️",
  suggestion_approved: "✅",
  suggestion_rejected: "❌",
  suggestion_merged: "🔀",
  comment_added: "💬",
  page_updated: "📄",
  assignment_posted: "📋",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllRead } = useWikiStore();
  const userNotifs = notifications.filter(n => n.userId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div style={{ padding: "2.5rem 3rem", maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Notifications</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{userNotifs.filter(n => !n.read).length} unread</p>
        </div>
        {userNotifs.some(n => !n.read) && (
          <button onClick={() => markAllRead(user!.id)} style={{ padding: "0.45rem 1rem", background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
            Mark all read
          </button>
        )}
      </div>

      {userNotifs.length === 0 && <p style={{ color: "var(--text-muted)" }}>No notifications yet.</p>}

      {userNotifs.map(n => (
        <div key={n.id} className="fade-in"
          onClick={() => markNotificationRead(n.id)}
          style={{ display: "flex", gap: "1rem", padding: "1rem 1.25rem", background: n.read ? "white" : "rgba(201,168,76,0.08)", border: `1px solid ${n.read ? "var(--border)" : "var(--gold)"}`, borderRadius: 10, marginBottom: "0.5rem", cursor: "pointer", transition: "background 0.2s" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: n.read ? "var(--surface-raised)" : "var(--gold-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
            {TYPE_ICONS[n.type] || "🔔"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontWeight: n.read ? 400 : 600, fontSize: "0.9rem", color: "var(--navy)" }}>{n.title}</span>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />}
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{n.body}</p>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{n.createdAt}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
