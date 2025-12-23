-- Clean up duplicate slotBookingId values before applying unique constraint
UPDATE "Vehicle" 
SET "slotBookingId" = NULL 
WHERE "slotBookingId" IN (
  SELECT "slotBookingId" 
  FROM "Vehicle" 
  WHERE "slotBookingId" IS NOT NULL 
  GROUP BY "slotBookingId" 
  HAVING COUNT(*) > 1
);
