-- Roster members are now active user accounts; the redundant TeamMember
-- table (which duplicated name/username/role and could drift out of sync)
-- has been removed. Identity now lives solely on User.
DROP TABLE "TeamMember";
