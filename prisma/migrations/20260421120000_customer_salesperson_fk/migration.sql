ALTER TABLE "Customer" RENAME COLUMN "salesPerson" TO "salesPersonNote";

ALTER TABLE "Customer" ADD COLUMN "salesPersonId" TEXT;
CREATE INDEX "Customer_salesPersonId_idx" ON "Customer"("salesPersonId");
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_salesPersonId_fkey"
  FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Customer" c
SET "salesPersonId" = u.id
FROM "User" u
WHERE u.name = c."salesPersonNote"
  AND c."salesPersonNote" != ''
  AND c."salesPersonId" IS NULL
  AND (SELECT COUNT(*) FROM "User" WHERE name = c."salesPersonNote") = 1;
