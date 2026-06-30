-- CreateTable
CREATE TABLE "CountItemContribution" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountItemContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: un usuario solo puede tener una contribucion por item (UPSERT la actualiza)
CREATE UNIQUE INDEX "CountItemContribution_itemId_userId_key" ON "CountItemContribution"("itemId", "userId");

-- CreateIndex
CREATE INDEX "CountItemContribution_itemId_idx" ON "CountItemContribution"("itemId");

-- AddForeignKey
ALTER TABLE "CountItemContribution" ADD CONSTRAINT "CountItemContribution_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryCount_Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
