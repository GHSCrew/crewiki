/*
  Warnings:

  - You are about to drop the column `tags` on the `WikiPage` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WikiPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "youtubeLinks" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_WikiPage" ("authorId", "authorName", "content", "createdAt", "folder", "id", "slug", "title", "updatedAt", "version", "youtubeLinks") SELECT "authorId", "authorName", "content", "createdAt", "folder", "id", "slug", "title", "updatedAt", "version", "youtubeLinks" FROM "WikiPage";
DROP TABLE "WikiPage";
ALTER TABLE "new_WikiPage" RENAME TO "WikiPage";
CREATE UNIQUE INDEX "WikiPage_slug_key" ON "WikiPage"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
