-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Center" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "logoUrl" TEXT,
    "dailySlots" INTEGER NOT NULL DEFAULT 10,
    "availableSlots" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Center" ("address", "createdAt", "email", "id", "isActive", "latitude", "logoUrl", "longitude", "mobile", "name", "updatedAt") SELECT "address", "createdAt", "email", "id", "isActive", "latitude", "logoUrl", "longitude", "mobile", "name", "updatedAt" FROM "Center";
DROP TABLE "Center";
ALTER TABLE "new_Center" RENAME TO "Center";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
