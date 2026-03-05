-- AlterTable
ALTER TABLE "CountReservedItem" ADD COLUMN     "itemProv" TEXT;

-- AlterTable
ALTER TABLE "InventoryCount_Item" ADD COLUMN     "itemProv" TEXT;

-- AlterTable
ALTER TABLE "VarianceReport" ADD COLUMN     "itemProv" TEXT;
