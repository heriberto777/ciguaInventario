-- Añade la columna type a CountReservedInvoice
-- Valores: 'SEPARATED' (mercancía separada, sin doc ERP) | 'IN_AISLE' (en pasillo, ERP ya la descontó)
ALTER TABLE "CountReservedInvoice" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'SEPARATED';
