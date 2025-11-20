/*
  Warnings:

  - You are about to drop the column `availableSlots` on the `Center` table. All the data in the column will be lost.
  - You are about to drop the column `dailySlots` on the `Center` table. All the data in the column will be lost.

*/
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
    "dailySlotsTwoWheeler" INTEGER NOT NULL DEFAULT 10,
    "availableSlotsTwoWheeler" INTEGER NOT NULL DEFAULT 10,
    "dailySlotsCar" INTEGER NOT NULL DEFAULT 10,
    "availableSlotsCar" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Center" ("address", "createdAt", "email", "id", "isActive", "latitude", "logoUrl", "longitude", "mobile", "name", "updatedAt") SELECT "address", "createdAt", "email", "id", "isActive", "latitude", "logoUrl", "longitude", "mobile", "name", "updatedAt" FROM "Center";
DROP TABLE "Center";
ALTER TABLE "new_Center" RENAME TO "Center";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
