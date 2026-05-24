-- CreateTable
CREATE TABLE "PageRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterRole" TEXT NOT NULL,
    "pageId" TEXT,
    "pageTitle" TEXT,
    "pageSlug" TEXT,
    "newFolder" TEXT,
    "newTitle" TEXT,
    "newSlug" TEXT,
    "newContent" TEXT,
    "folder" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TEXT,
    "reviewNote" TEXT
);
