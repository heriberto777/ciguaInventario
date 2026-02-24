-- InventoryCount: Agregar campos de versionado
ALTER TABLE "InventoryCount" ADD COLUMN "locationId" TEXT;
ALTER TABLE "InventoryCount" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "InventoryCount" ADD COLUMN "totalVersions" INTEGER NOT NULL DEFAULT 1;

-- InventoryCount: Agregar índice para locationId
CREATE INDEX "InventoryCount_locationId_idx" ON "InventoryCount"("locationId");

-- InventoryCount: Agregar constraint de clave foránea
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Warehouse_Location"("id") ON DELETE SET NULL;

-- InventoryCount_Item: Agregar campos para versionado de cantidades
ALTER TABLE "InventoryCount_Item" ADD COLUMN "countedQty_V1" DECIMAL(18,2);
ALTER TABLE "InventoryCount_Item" ADD COLUMN "countedQty_V2" DECIMAL(18,2);
ALTER TABLE "InventoryCount_Item" ADD COLUMN "countedQty_V3" DECIMAL(18,2);
ALTER TABLE "InventoryCount_Item" ADD COLUMN "countedQty_V4" DECIMAL(18,2);
ALTER TABLE "InventoryCount_Item" ADD COLUMN "countedQty_V5" DECIMAL(18,2);
ALTER TABLE "InventoryCount_Item" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "InventoryCount_Item" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';

-- InventoryCount_Item: Migrar datos existentes de countedQty a countedQty_V1
UPDATE "InventoryCount_Item" SET "countedQty_V1" = "countedQty" WHERE "countedQty" IS NOT NULL;

-- InventoryCount_Item: Eliminar la columna countedQty antigua
ALTER TABLE "InventoryCount_Item" DROP COLUMN "countedQty";

-- VarianceReport: Agregar campo de versión
ALTER TABLE "VarianceReport" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- VarianceReport: Agregar índice para versión
CREATE INDEX "VarianceReport_version_idx" ON "VarianceReport"("version");
