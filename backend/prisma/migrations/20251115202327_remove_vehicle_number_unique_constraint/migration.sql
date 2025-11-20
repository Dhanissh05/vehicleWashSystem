-- DropIndex
DROP INDEX "Vehicle_vehicleNumber_key";

-- CreateIndex
CREATE INDEX "Vehicle_vehicleNumber_idx" ON "Vehicle"("vehicleNumber");
