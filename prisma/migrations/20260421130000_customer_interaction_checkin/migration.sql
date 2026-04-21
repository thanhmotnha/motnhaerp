-- Add photo check-in fields to CustomerInteraction (CRM Phase 2)
ALTER TABLE "CustomerInteraction"
  ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "interestLevel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "outcome" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "companionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CustomerInteraction_createdBy_idx" ON "CustomerInteraction"("createdBy");
