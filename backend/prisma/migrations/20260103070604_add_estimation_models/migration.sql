/*
  Warnings:

  - Added the required column `categoryName` to the `Pricing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SlotBooking" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "SlotBooking" ADD COLUMN "cancelledByName" TEXT;
ALTER TABLE "SlotBooking" ADD COLUMN "cancelledByRole" TEXT;

-- CreateTable
CREATE TABLE "SlotService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slotBookingId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "pricingId" TEXT,
    "customPrice" REAL,
    "customPricingName" TEXT,
    "startedAt" DATETIME,
    "startedBy" TEXT,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "cancelledAt" DATETIME,
    "cancelledBy" TEXT,
    "cancelledByRole" TEXT,
    "cancelledByName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SlotService_slotBookingId_fkey" FOREIGN KEY ("slotBookingId") REFERENCES "SlotBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SlotService_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "Pricing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Estimation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estimationNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "vehicleNumber" TEXT,
    "vehicleType" TEXT,
    "centerId" TEXT,
    "preparedBy" TEXT NOT NULL,
    "preparedByName" TEXT NOT NULL,
    "preparedByRole" TEXT NOT NULL,
    "termsAndConditions" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "validUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Estimation_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estimationId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimationItem_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleType" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "carCategory" TEXT,
    "price" REAL NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Pricing" ("carCategory", "createdAt", "description", "id", "isActive", "price", "updatedAt", "vehicleType") SELECT "carCategory", "createdAt", "description", "id", "isActive", "price", "updatedAt", "vehicleType" FROM "Pricing";
DROP TABLE "Pricing";
ALTER TABLE "new_Pricing" RENAME TO "Pricing";
CREATE INDEX "Pricing_vehicleType_idx" ON "Pricing"("vehicleType");
CREATE INDEX "Pricing_isActive_idx" ON "Pricing"("isActive");
CREATE UNIQUE INDEX "Pricing_vehicleType_categoryName_key" ON "Pricing"("vehicleType", "categoryName");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "carCategory" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "photoUrl" TEXT,
    "serviceType" TEXT NOT NULL DEFAULT 'WASH',
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "receivedAt" DATETIME,
    "washingAt" DATETIME,
    "readyAt" DATETIME,
    "deliveredAt" DATETIME,
    "bodyRepairAssessmentAt" DATETIME,
    "bodyRepairInProgressAt" DATETIME,
    "bodyRepairPaintingAt" DATETIME,
    "bodyRepairCompleteAt" DATETIME,
    "notes" TEXT,
    "pricingId" TEXT,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT,
    "centerId" TEXT NOT NULL,
    "slotBookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "Pricing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_slotBookingId_fkey" FOREIGN KEY ("slotBookingId") REFERENCES "SlotBooking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("bodyRepairAssessmentAt", "bodyRepairCompleteAt", "bodyRepairInProgressAt", "bodyRepairPaintingAt", "brand", "carCategory", "centerId", "color", "createdAt", "customerId", "deliveredAt", "id", "model", "notes", "photoUrl", "readyAt", "receivedAt", "serviceType", "status", "updatedAt", "vehicleNumber", "vehicleType", "washingAt", "workerId") SELECT "bodyRepairAssessmentAt", "bodyRepairCompleteAt", "bodyRepairInProgressAt", "bodyRepairPaintingAt", "brand", "carCategory", "centerId", "color", "createdAt", "customerId", "deliveredAt", "id", "model", "notes", "photoUrl", "readyAt", "receivedAt", "serviceType", "status", "updatedAt", "vehicleNumber", "vehicleType", "washingAt", "workerId" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");
CREATE INDEX "Vehicle_workerId_idx" ON "Vehicle"("workerId");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "Vehicle_vehicleType_idx" ON "Vehicle"("vehicleType");
CREATE INDEX "Vehicle_receivedAt_idx" ON "Vehicle"("receivedAt");
CREATE INDEX "Vehicle_vehicleNumber_idx" ON "Vehicle"("vehicleNumber");
CREATE INDEX "Vehicle_pricingId_idx" ON "Vehicle"("pricingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SlotService_slotBookingId_idx" ON "SlotService"("slotBookingId");

-- CreateIndex
CREATE INDEX "SlotService_status_idx" ON "SlotService"("status");

-- CreateIndex
CREATE INDEX "SlotService_serviceType_idx" ON "SlotService"("serviceType");

-- CreateIndex
CREATE INDEX "SlotService_pricingId_idx" ON "SlotService"("pricingId");

-- CreateIndex
CREATE UNIQUE INDEX "Estimation_estimationNumber_key" ON "Estimation"("estimationNumber");

-- CreateIndex
CREATE INDEX "Estimation_estimationNumber_idx" ON "Estimation"("estimationNumber");

-- CreateIndex
CREATE INDEX "Estimation_customerMobile_idx" ON "Estimation"("customerMobile");

-- CreateIndex
CREATE INDEX "Estimation_status_idx" ON "Estimation"("status");

-- CreateIndex
CREATE INDEX "Estimation_centerId_idx" ON "Estimation"("centerId");

-- CreateIndex
CREATE INDEX "EstimationItem_estimationId_idx" ON "EstimationItem"("estimationId");
