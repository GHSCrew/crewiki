"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useWikiStore } from "@/lib/store";
import Sidebar from "@/components/layout/Sidebar";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hydrate = useWikiStore(s => s.hydrate);

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
      <main style={{ flex: 1, overflowX: "hidden", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
