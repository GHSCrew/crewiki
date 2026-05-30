import type { WikiPage } from "@/types";
import { createZip } from "@/lib/zip";

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download a single page's markdown source. */
export function downloadPageMarkdown(page: WikiPage) {
  downloadBlob(new Blob([page.content], { type: "text/markdown" }), `${page.slug}.md`);
}

/** Archive path for a page, preserving its folder structure. */
function zipPath(page: WikiPage): string {
  return page.folder ? `${page.folder}/${page.slug}.md` : `${page.slug}.md`;
}

/** Download every page as a zip, preserving the folder hierarchy. */
export function downloadWiki(pages: WikiPage[]) {
  const zip = createZip(pages.map(p => ({ name: zipPath(p), content: p.content })));
  downloadBlob(zip, "crewwiki.zip");
}

/** Download all pages within a folder (and its subfolders) as a zip. */
export function downloadFolder(pages: WikiPage[], folder: string) {
  const inFolder = pages.filter(p => p.folder === folder || p.folder.startsWith(`${folder}/`));
  const zip = createZip(inFolder.map(p => ({ name: zipPath(p), content: p.content })));
  const safe = folder.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "folder";
  downloadBlob(zip, `${safe}.zip`);
}
