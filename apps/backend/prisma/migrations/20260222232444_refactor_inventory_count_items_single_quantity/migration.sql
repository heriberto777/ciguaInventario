/*
  Warnings:

  - You are about to drop the column `countedQty_V1` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - You are about to drop the column `countedQty_V2` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - You are about to drop the column `countedQty_V3` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - You are about to drop the column `countedQty_V4` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - You are about to drop the column `countedQty_V5` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - You are about to drop the column `currentVersion` on the `InventoryCount_Item` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[countId,locationId,itemCode,version]` on the table `InventoryCount_Item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InventoryCount_Item_countId_locationId_itemCode_key";

-- AlterTable
ALTER TABLE "InventoryCount_Item" DROP COLUMN "countedQty_V1",
DROP COLUMN "countedQty_V2",
DROP COLUMN "countedQty_V3",
DROP COLUMN "countedQty_V4",
DROP COLUMN "countedQty_V5",
DROP COLUMN "currentVersion",
ADD COLUMN     "countedQty" DECIMAL(65,30),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "InventoryCount_Item_countId_version_idx" ON "InventoryCount_Item"("countId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_Item_countId_locationId_itemCode_version_key" ON "InventoryCount_Item"("countId", "locationId", "itemCode", "version");
