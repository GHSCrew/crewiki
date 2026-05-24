"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";
import WikiTopbar from "@/components/layout/WikiTopbar";
import ManageBar from "@/components/layout/ManageBar";
import ToastContainer from "@/components/Toast";

const NAMED_ROUTES = new Set(["suggestions", "team", "notifications", "admin", "folder"]);

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hydrate = useWikiStore(s => s.hydrate);
  const viewMode = useWikiStore(s => s.viewMode);
  const segment = pathname.split("/")[2];
  const isArticlePage = !!segment && !NAMED_ROUTES.has(segment);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user) hydrate(user.id);
  }, [user, loading, router, hydrate]);

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--gold)", fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem" }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <WikiTopbar isArticlePage={isArticlePage} />
        {viewMode === "manage" && <ManageBar />}
        <main style={{ flex: 1, overflowX: "hidden" }}>
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
