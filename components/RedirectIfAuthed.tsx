"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// On a public share page: if the visitor is actually signed in, send them to
// the normal (full-featured) page instead of the read-only shared view.
export default function RedirectIfAuthed({ slug }: { slug: string }) {
  const router = useRouter();
  useEffect(() => {
    try {
      if (localStorage.getItem("crewwiki_user")) {
        router.replace(`/wiki/content/${slug}`);
      }
    } catch {
      /* no localStorage access — stay on the shared view */
    }
  }, [slug, router]);
  return null;
}
