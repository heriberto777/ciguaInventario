-- AlterTable
ALTER TABLE "VarianceReport" ADD COLUMN     "reservedQty" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CountReservedInvoice" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountReservedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountReservedItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT,
    "reservedQty" DECIMAL(65,30) NOT NULL,
    "uom" TEXT,

    CONSTRAINT "CountReservedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountReservedInvoice_countId_idx" ON "CountReservedInvoice"("countId");

-- CreateIndex
CREATE UNIQUE INDEX "CountReservedInvoice_countId_invoiceNumber_key" ON "CountReservedInvoice"("countId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "CountReservedItem_invoiceId_idx" ON "CountReservedItem"("invoiceId");

-- CreateIndex
CREATE INDEX "CountReservedItem_itemCode_idx" ON "CountReservedItem"("itemCode");

-- AddForeignKey
ALTER TABLE "CountReservedInvoice" ADD CONSTRAINT "CountReservedInvoice_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountReservedItem" ADD CONSTRAINT "CountReservedItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CountReservedInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
