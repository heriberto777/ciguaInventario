/*
  Warnings:

  - A unique constraint covering the columns `[countId,locationId,itemCode,version]` on the table `InventoryCount_Item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InventoryCount_Item_countId_locationId_version_key";

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_Item_countId_locationId_itemCode_version_key" ON "InventoryCount_Item"("countId", "locationId", "itemCode", "version");
