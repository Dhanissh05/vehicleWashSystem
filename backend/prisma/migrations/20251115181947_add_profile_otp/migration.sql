-- CreateTable
CREATE TABLE "ProfileOtp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProfileOtp_value_code_idx" ON "ProfileOtp"("value", "code");

-- CreateIndex
CREATE INDEX "ProfileOtp_userId_idx" ON "ProfileOtp"("userId");
