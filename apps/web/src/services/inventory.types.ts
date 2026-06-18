export interface InventoryCount {
  id: string;
  code: string;
  sequenceNumber: string;
  description?: string;
  status: string;
  currentVersion: number;
  totalVersions: number;
  finalizedVersion?: number;
  warehouseId: string;
  locationId?: string;
  createdAt: string;
  updatedAt?: string;
  countItems: CountItem[];
}

export interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  locationId?: string;
  systemQty: number;
  countedQty?: number;
  version: number;
  packQty: number;
  uom: string;
  baseUom: string;
  costPrice?: number;
  salePrice?: number;
  barCodeInv?: string;
  barCodeVt?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  lot?: string;
  reservedQty?: number;
  reservedSeparated?: number; // New from feacture/change01
  reservedInAisle?: number;   // New from feacture/change01
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export interface Location {
  id: string;
  code: string;
  description?: string;
}

export interface Classification {
  id: string;
  code: string;
  description: string;
  groupType: 'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | 'OTHER';
}
