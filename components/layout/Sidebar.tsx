"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import type { WikiPage } from "@/types";

interface FolderNode {
  pages: WikiPage[];
  children: Record<string, FolderNode>;
}

function buildTree(pages: WikiPage[]): Record<string, FolderNode> {
  const root: Record<string, FolderNode> = {};
  for (const page of pages) {
    const parts = page.folder.split("/").filter(Boolean);
    let level = root;
    for (const part of parts) {
      if (!level[part]) level[part] = { pages: [], children: {} };
      if (part === parts[parts.length - 1]) {
        level[part].pages.push(page);
      } else {
        level = level[part].children;
      }
    }
    if (parts.length === 0) {
      if (!root["Root"]) root["Root"] = { pages: [], children: {} };
      root["Root"].pages.push(page);
    }
  }
  return root;
}

function FolderTree({ node, name, depth, pathname, folderPath, onNavigate }: {
  node: FolderNode;
  name: string;
  depth: number;
  pathname: string;
  folderPath: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = Object.keys(node.children).length > 0;
  const indent = depth * 12;
  return (
    <div>
      <div
        className="nav-row nav-row--folder"
        style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: `0.4rem 0.75rem 0.4rem ${0.75 + indent / 16}rem`, cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        {(hasChildren || node.pages.length > 0) && (
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
        )}
        <Link
          href={`/wiki/folder/${encodeURIComponent(folderPath)}`}
          onClick={e => { e.stopPropagation(); onNavigate?.(); }}
          style={{ textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: pathname === `/wiki/folder/${encodeURIComponent(folderPath)}` ? "var(--gold)" : "rgba(255,255,255,0.55)", flex: 1 }}
        >
          {name}
        </Link>
      </div>
      {open && (
        <>
          {node.pages.map(p => {
            const active = pathname === `/wiki/content/${p.slug}`;
            return (
              <Link key={p.slug} href={`/wiki/content/${p.slug}`} onClick={() => onNavigate?.()} style={{ textDecoration: "none" }}>
                <div className="nav-row nav-row--page" style={{ padding: `0.4rem 0.75rem 0.4rem ${1.5 + indent / 16}rem`, fontSize: "0.82rem", color: active ? "var(--gold)" : "var(--gold-pale)", background: active ? "rgba(201,168,76,0.12)" : undefined, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.title}
                </div>
              </Link>
            );
          })}
          {Object.entries(node.children).sort(([a], [b]) => a.localeCompare(b)).map(([childName, childNode]) => (
            <FolderTree key={childName} name={childName} node={childNode} depth={depth + 1} pathname={pathname} folderPath={`${folderPath}/${childName}`} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { href: "/wiki", label: "Home", icon: "🏠" },
  { href: "/wiki/activity", label: "Activity", icon: "📜" },
  { href: "/wiki/issues", label: "Issues", icon: "💬" },
  { href: "/wiki/suggestions", label: "Suggestions", icon: "✏️" },
  { href: "/wiki/team", label: "Team", icon: "⛵" },
  { href: "/wiki/notifications", label: "Notifications", icon: "🔔" },
  { href: "/wiki/settings", label: "Settings", icon: "⚙" },
];

const COACH_NAV = [
  { href: "/wiki/admin", label: "Admin Panel", icon: "⚙️" },
];

/**
 * The scrollable body of the sidebar (user pill → nav → content tree → logout).
 * Shared by the desktop <Sidebar> and the mobile full-screen <MobileNav> so the
 * two stay in sync. `onNavigate` lets the mobile overlay close itself when a
 * link is tapped.
 */
export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canEdit } = useAuth();
  const { notifications, pages } = useWikiStore();
  const unread = notifications.filter(n => n.userId === user?.id && !n.read).length;

  function handleLogout() { onNavigate?.(); logout(); router.push("/login"); }

  const tree = buildTree(pages);

  return (
    <>
      {/* User pill */}
      {user && (
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 600, color: "var(--gold-light)" }}>
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <span className={`badge badge-${user.role}`} style={{ marginTop: 2 }}>{user.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav style={{ padding: "0.75rem 0.75rem", flex: 1, overflowY: "auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => onNavigate?.()} style={{ textDecoration: "none" }}>
                <div className="nav-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", marginBottom: "0.15rem", background: active ? "rgba(201,168,76,0.15)" : undefined, color: active ? "var(--gold)" : "rgba(255,255,255,0.75)", fontSize: "0.9rem", fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span>{item.icon}</span>{item.label}
                  </span>
                  {item.label === "Notifications" && unread > 0 && (
                    <span style={{ background: "var(--gold)", color: "var(--navy)", borderRadius: 99, padding: "0 6px", fontSize: "0.7rem", fontWeight: 700 }}>{unread}</span>
                  )}
                </div>
              </Link>
            );
          })}
          {canEdit && COACH_NAV.map(item => (
            <Link key={item.href} href={item.href} onClick={() => onNavigate?.()} style={{ textDecoration: "none" }}>
              <div className="nav-row" style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.75rem", marginBottom: "0.15rem", background: pathname === item.href ? "rgba(201,168,76,0.15)" : undefined, color: pathname === item.href ? "var(--gold)" : "rgba(255,255,255,0.75)", fontSize: "0.9rem", cursor: "pointer" }}>
                <span>{item.icon}</span>{item.label}
              </div>
            </Link>
          ))}
        </div>

        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, padding: "0 0.75rem", marginBottom: "0.5rem" }}>Content</div>
        {Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).map(([name, node]) => (
          <FolderTree key={name} name={name} node={node} depth={0} pathname={pathname} folderPath={name} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={handleLogout} style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="sidebar-desktop" style={{ width: 48, background: "var(--navy)", height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0.75rem", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
        >›</button>
      </aside>
    );
  }

  return (
    <aside className="sidebar-desktop" style={{ width: 260, background: "var(--navy)", color: "white", height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Brand */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/wiki" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, background: "var(--gold)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "1.1rem" }}>⛵</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.1rem", color: "white" }}>CrewWiki</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.05rem" }}>Team Knowledge Base</div>
          </div>
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >‹</button>
      </div>

      <SidebarBody />
    </aside>
  );
}
