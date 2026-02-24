/*
  Warnings:

  - Made the column `itemName` on table `InventoryCount_Item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InventoryCount_Item" ADD COLUMN     "baseUom" TEXT NOT NULL DEFAULT 'PZ',
ADD COLUMN     "costPrice" DECIMAL(65,30),
ADD COLUMN     "packQty" DECIMAL(65,30) NOT NULL DEFAULT 1,
ADD COLUMN     "salePrice" DECIMAL(65,30),
ALTER COLUMN "itemName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryCount_Item_itemCode_idx" ON "InventoryCount_Item"("itemCode");
