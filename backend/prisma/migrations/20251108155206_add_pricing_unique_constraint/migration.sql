/*
  Warnings:

  - A unique constraint covering the columns `[vehicleType,carCategory]` on the table `Pricing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pricing_vehicleType_carCategory_key" ON "Pricing"("vehicleType", "carCategory");
