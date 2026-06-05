"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import WikiTopbar from "@/components/layout/WikiTopbar";
import ManageBar from "@/components/layout/ManageBar";
import ToastContainer from "@/components/Toast";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useWikiStore(s => s.hydrate);
  const viewMode = useWikiStore(s => s.viewMode);
  const setViewMode = useWikiStore(s => s.setViewMode);
  const isContentPage = pathname.split("/")[2] === "content";
  // Public shared pages live under /wiki/shared/* but must bypass auth + chrome
  // so anyone (logged in or not, including crawlers) can view them.
  const isSharedPage = pathname.startsWith("/wiki/shared/");

  useEffect(() => {
    if (isSharedPage) return;
    if (!loading && !user) router.replace("/login");
    if (!loading && user) hydrate(user.id);
  }, [user, loading, router, hydrate, isSharedPage]);

  useEffect(() => {
    if (!isContentPage) setViewMode("read");
  }, [isContentPage, setViewMode]);

  if (isSharedPage) return <>{children}</>;

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--gold)", fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <MobileNav />
      <div className="wiki-main-col" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {isContentPage && <WikiTopbar />}
        {isContentPage && viewMode === "manage" && <ManageBar />}
        <main className={isContentPage ? "wiki-main" : "wiki-main wiki-main--no-topbar"} style={{ flex: 1, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
