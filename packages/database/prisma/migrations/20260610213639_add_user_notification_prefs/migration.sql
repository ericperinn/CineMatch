-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "notifyFriendRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifySessionInvites" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyMatches" BOOLEAN NOT NULL DEFAULT true;
