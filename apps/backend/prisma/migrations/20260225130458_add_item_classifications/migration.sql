-- CreateEnum
CREATE TYPE "ItemClassificationGroup" AS ENUM ('CATEGORY', 'SUBCATEGORY', 'BRAND', 'OTHER');

-- CreateTable
CREATE TABLE "ItemClassification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "groupType" "ItemClassificationGroup" NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemClassification_companyId_idx" ON "ItemClassification"("companyId");

-- CreateIndex
CREATE INDEX "ItemClassification_companyId_groupType_idx" ON "ItemClassification"("companyId", "groupType");

-- CreateIndex
CREATE UNIQUE INDEX "ItemClassification_companyId_code_key" ON "ItemClassification"("companyId", "code");

-- AddForeignKey
ALTER TABLE "ItemClassification" ADD CONSTRAINT "ItemClassification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
