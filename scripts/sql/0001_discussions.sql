-- CreateTable
CREATE TABLE "DiscussionPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TEXT
);

-- CreateTable
CREATE TABLE "DiscussionTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "DiscussionTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DiscussionPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscussionAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    CONSTRAINT "DiscussionAssignee_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DiscussionPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

