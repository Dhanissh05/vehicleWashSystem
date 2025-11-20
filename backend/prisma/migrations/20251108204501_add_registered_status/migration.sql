-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "carCategory" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "receivedAt" DATETIME,
    "washingAt" DATETIME,
    "readyAt" DATETIME,
    "deliveredAt" DATETIME,
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT,
    "centerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("brand", "carCategory", "centerId", "color", "createdAt", "customerId", "deliveredAt", "id", "model", "notes", "readyAt", "receivedAt", "status", "updatedAt", "vehicleNumber", "vehicleType", "washingAt", "workerId") SELECT "brand", "carCategory", "centerId", "color", "createdAt", "customerId", "deliveredAt", "id", "model", "notes", "readyAt", "receivedAt", "status", "updatedAt", "vehicleNumber", "vehicleType", "washingAt", "workerId" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");
CREATE INDEX "Vehicle_workerId_idx" ON "Vehicle"("workerId");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "Vehicle_vehicleType_idx" ON "Vehicle"("vehicleType");
CREATE INDEX "Vehicle_receivedAt_idx" ON "Vehicle"("receivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
