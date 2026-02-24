/*
  Warnings:

  - A unique constraint covering the columns `[sequenceNumber_idx]` on the table `InventoryCount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sequenceNumber_idx]` on the table `InventoryCount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[countId,countItemId,version]` on the table `VarianceReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `InventoryCount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber_idx` to the `InventoryCount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InventoryCount" DROP CONSTRAINT "InventoryCount_locationId_fkey";

-- DropIndex
DROP INDEX "InventoryCount_createdAt_idx";

-- DropIndex
DROP INDEX "VarianceReport_countId_countItemId_key";

-- DropIndex
DROP INDEX "VarianceReport_countItemId_key";

-- AlterTable
ALTER TABLE "InventoryCount" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedBy" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sequenceNumber_idx" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InventoryCount_Item" ALTER COLUMN "countedQty_V1" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "countedQty_V2" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "countedQty_V3" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "countedQty_V4" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "countedQty_V5" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "InventorySyncHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "itemsSynced" INTEGER NOT NULL,
    "itemsFailed" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "syncedBy" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySyncHistory_companyId_idx" ON "InventorySyncHistory"("companyId");

-- CreateIndex
CREATE INDEX "InventorySyncHistory_countId_idx" ON "InventorySyncHistory"("countId");

-- CreateIndex
CREATE INDEX "InventorySyncHistory_status_idx" ON "InventorySyncHistory"("status");

-- CreateIndex
CREATE INDEX "InventorySyncHistory_syncedAt_idx" ON "InventorySyncHistory"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_sequenceNumber_idx_key" ON "InventoryCount"("sequenceNumber_idx");

-- CreateIndex
CREATE INDEX "InventoryCount_status_warehouse" ON "InventoryCount"("status", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_sequenceNumber_unique" ON "InventoryCount"("sequenceNumber_idx");

-- CreateIndex
CREATE UNIQUE INDEX "VarianceReport_countId_countItemId_version_key" ON "VarianceReport"("countId", "countItemId", "version");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Warehouse_Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncHistory" ADD CONSTRAINT "InventorySyncHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncHistory" ADD CONSTRAINT "InventorySyncHistory_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
