export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
  createdAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  companyId: string;
  iat: number;
  exp: number;
}

export interface JWTClaims {
  sub: string;
  email: string;
  companyId: string;
  type: 'access' | 'refresh';
}

export enum DatasetType {
  ITEMS = 'ITEMS',
  STOCK = 'STOCK',
  COST = 'COST',
  PRICE = 'PRICE',
  DESTINATION = 'DESTINATION',
}

export enum ERPType {
  MSSQL = 'MSSQL',
  SAP = 'SAP',
  ORACLE = 'ORACLE',
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: string;
  transformation?: string;
}

export interface ERPConnectionConfig {
  id: string;
  companyId: string;
  erpType: ERPType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  isActive: boolean;
}
