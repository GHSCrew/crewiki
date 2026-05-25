ALTER TABLE "TeamMember" ADD COLUMN "username" TEXT;
UPDATE "TeamMember" SET "username" = "email";
ALTER TABLE "TeamMember" DROP COLUMN "email";
