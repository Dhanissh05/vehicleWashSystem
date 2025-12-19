-- CreateTable
CREATE TABLE "SlotBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerMobile" TEXT NOT NULL,
    "customerName" TEXT,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "carCategory" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "photoUrl" TEXT,
    "carWash" BOOLEAN NOT NULL DEFAULT false,
    "twoWheelerWash" BOOLEAN NOT NULL DEFAULT false,
    "bodyRepair" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "centerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SlotBooking_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SlotBooking_customerMobile_idx" ON "SlotBooking"("customerMobile");

-- CreateIndex
CREATE INDEX "SlotBooking_status_idx" ON "SlotBooking"("status");

-- CreateIndex
CREATE INDEX "SlotBooking_otp_idx" ON "SlotBooking"("otp");
