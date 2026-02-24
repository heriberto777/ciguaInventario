# 🔗 Referencia Rápida de API - Cigua Inversiones ERP

## 📌 Base URL
```
http://localhost:3000
```

## 🔐 Autenticación
Todos los endpoints (excepto login) requieren:
```
Header: Authorization: Bearer {accessToken}
```

---

## 🔓 AUTH - Autenticación

### POST /auth/login
Inicia sesión con email y contraseña.

**Request**:
```json
{
  "email": "admin@cigua.com",
  "password": "admin123456"
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@cigua.com",
    "name": "Admin System",
    "companyId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### POST /auth/logout
Cierra la sesión actual.

**Response** (200):
```json
{
  "message": "Logged out successfully",
  "statusCode": 200
}
```

### POST /auth/refresh
Renova el access token usando refresh token.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 🏢 COMPANIES - Empresas

### GET /companies
Lista todas las empresas.

**Query Parameters**:
```
?skip=0&take=10&search=Cigua&isActive=true
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Cigua Inversiones",
      "description": "Empresa principal",
      "email": "contact@cigua.com",
      "phone": "+1-234-567-8900",
      "website": "https://cigua.com",
      "address": "Calle Principal 123",
      "city": "Santo Domingo",
      "country": "Dominican Republic",
      "isActive": true,
      "userCount": 5,
      "createdAt": "2026-02-20T21:57:00Z",
      "updatedAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### POST /companies
Crea una nueva empresa.

**Request**:
```json
{
  "name": "Nueva Empresa",
  "description": "Descripción",
  "email": "info@empresa.com",
  "phone": "+1-234-567-8900",
  "website": "https://empresa.com",
  "address": "Dirección",
  "city": "Ciudad",
  "country": "País"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Nueva Empresa",
  "description": "Descripción",
  "email": "info@empresa.com",
  "isActive": true,
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /companies/:id
Obtiene detalle de una empresa.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cigua Inversiones",
  "description": "Empresa principal",
  "email": "contact@cigua.com",
  "isActive": true,
  "createdAt": "2026-02-20T21:57:00Z"
}
```

### PATCH /companies/:id
Actualiza una empresa.

**Request**:
```json
{
  "name": "Cigua Inversiones Actualizada",
  "description": "Nueva descripción",
  "email": "newemail@cigua.com"
}
```

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cigua Inversiones Actualizada",
  "description": "Nueva descripción",
  "email": "newemail@cigua.com",
  "updatedAt": "2026-02-20T22:05:00Z"
}
```

### DELETE /companies/:id
Elimina una empresa.

**Response** (204): Sin contenido

---

## 👥 USERS - Usuarios

### GET /users
Lista todos los usuarios.

**Query Parameters**:
```
?skip=0&take=10&search=juan&isActive=true
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "email": "admin@cigua.com",
      "firstName": "Admin",
      "lastName": "System",
      "companyId": "550e8400-e29b-41d4-a716-446655440001",
      "isActive": true,
      "createdAt": "2026-02-20T21:57:00Z",
      "roles": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "Admin"
        }
      ]
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### POST /users
Crea un nuevo usuario.

**Request**:
```json
{
  "email": "newuser@cigua.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "password": "SecurePassword123"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "email": "newuser@cigua.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "isActive": true,
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /users/:id
Obtiene detalle de un usuario.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "email": "admin@cigua.com",
  "firstName": "Admin",
  "lastName": "System",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "isActive": true,
  "roles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "name": "Admin",
      "permissions": ["create_company", "read_company", ...]
    }
  ],
  "createdAt": "2026-02-20T21:57:00Z"
}
```

### PATCH /users/:id
Actualiza un usuario.

**Request**:
```json
{
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "isActive": true
}
```

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "email": "newuser@cigua.com",
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "updatedAt": "2026-02-20T22:05:00Z"
}
```

### DELETE /users/:id
Elimina un usuario.

**Response** (204): Sin contenido

### POST /users/:id/roles
Asigna un rol a un usuario.

**Request**:
```json
{
  "roleId": "550e8400-e29b-41d4-a716-446655440020"
}
```

**Response** (200):
```json
{
  "message": "Role assigned successfully"
}
```

---

## 🎯 ROLES - Roles

### GET /roles
Lista todos los roles.

**Query Parameters**:
```
?skip=0&take=10&search=admin&isActive=true
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "name": "Admin",
      "description": "Administrador del sistema",
      "permissionCount": 7,
      "isActive": true,
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### POST /roles
Crea un nuevo rol.

**Request**:
```json
{
  "name": "Manager",
  "description": "Gerente de empresa",
  "permissionIds": [
    "550e8400-e29b-41d4-a716-446655440030",
    "550e8400-e29b-41d4-a716-446655440031"
  ]
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "name": "Manager",
  "description": "Gerente de empresa",
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /roles/:id
Obtiene detalle de un rol.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "name": "Admin",
  "description": "Administrador del sistema",
  "permissions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "name": "create_company",
      "category": "companies"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "name": "read_company",
      "category": "companies"
    }
  ],
  "userCount": 1,
  "createdAt": "2026-02-20T21:57:00Z"
}
```

### GET /roles/available-permissions
Obtiene todos los permisos disponibles.

**Response** (200):
```json
{
  "permissions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "name": "create_company",
      "description": "Crear nuevas empresas",
      "category": "companies"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "name": "read_company",
      "description": "Ver empresas",
      "category": "companies"
    }
  ]
}
```

### PATCH /roles/:id
Actualiza un rol.

**Request**:
```json
{
  "name": "Manager Updated",
  "description": "Descripción actualizada",
  "permissionIds": ["550e8400-e29b-41d4-a716-446655440030"]
}
```

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "name": "Manager Updated",
  "description": "Descripción actualizada",
  "updatedAt": "2026-02-20T22:05:00Z"
}
```

### DELETE /roles/:id
Elimina un rol (soft delete).

**Response** (204): Sin contenido

---

## 🔑 PERMISSIONS - Permisos

### GET /permissions
Lista todos los permisos.

**Query Parameters**:
```
?skip=0&take=10&search=create&category=companies
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "name": "create_company",
      "description": "Crear nuevas empresas",
      "category": "companies",
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 7
  }
}
```

### POST /permissions
Crea un nuevo permiso.

**Request**:
```json
{
  "name": "manage_settings",
  "description": "Gestionar configuraciones del sistema",
  "category": "settings"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "name": "manage_settings",
  "description": "Gestionar configuraciones del sistema",
  "category": "settings",
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /permissions/categories
Obtiene todas las categorías de permisos.

**Response** (200):
```json
{
  "categories": ["companies", "users", "roles", "audit", "settings"]
}
```

### GET /permissions/category/:category
Obtiene permisos de una categoría específica.

**Response** (200):
```json
{
  "category": "companies",
  "permissions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "name": "create_company",
      "description": "Crear nuevas empresas"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440031",
      "name": "read_company",
      "description": "Ver empresas"
    }
  ]
}
```

---

## 🔌 ERP CONNECTIONS - Conexiones ERP

### GET /erp-connections
Lista todas las conexiones ERP.

**Query Parameters**:
```
?skip=0&take=10&erpType=SAP
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440050",
      "companyId": "550e8400-e29b-41d4-a716-446655440001",
      "erpType": "SAP",
      "host": "erp.example.com",
      "port": 3050,
      "database": "sap_db",
      "username": "sap_user",
      "isActive": true,
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### POST /erp-connections
Crea una nueva conexión ERP.

**Request**:
```json
{
  "erpType": "SAP",
  "host": "erp.example.com",
  "port": 3050,
  "database": "sap_db",
  "username": "sap_user",
  "password": "encrypted_password"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440050",
  "erpType": "SAP",
  "host": "erp.example.com",
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /erp-connections/:id
Obtiene detalle de una conexión.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440050",
  "erpType": "SAP",
  "host": "erp.example.com",
  "port": 3050,
  "database": "sap_db",
  "isActive": true,
  "createdAt": "2026-02-20T21:57:00Z"
}
```

### PATCH /erp-connections/:id
Actualiza una conexión.

**Request**:
```json
{
  "host": "new-erp.example.com",
  "port": 3051,
  "password": "new_password"
}
```

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440050",
  "host": "new-erp.example.com",
  "updatedAt": "2026-02-20T22:05:00Z"
}
```

### DELETE /erp-connections/:id
Elimina una conexión.

**Response** (204): Sin contenido

---

## 📝 SESSIONS - Sesiones

### GET /sessions
Lista todas las sesiones activas.

**Query Parameters**:
```
?skip=0&take=10&isActive=true
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440060",
      "userId": "550e8400-e29b-41d4-a716-446655440010",
      "userName": "admin@cigua.com",
      "companyId": "550e8400-e29b-41d4-a716-446655440001",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.100",
      "isActive": true,
      "lastActivityAt": "2026-02-20T22:10:00Z",
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### GET /sessions/current
Obtiene la sesión actual del usuario.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440060",
  "userId": "550e8400-e29b-41d4-a716-446655440010",
  "userName": "admin@cigua.com",
  "isActive": true,
  "lastActivityAt": "2026-02-20T22:10:00Z"
}
```

### GET /sessions/:id
Obtiene detalle de una sesión.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440060",
  "userId": "550e8400-e29b-41d4-a716-446655440010",
  "userName": "admin@cigua.com",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.100",
  "isActive": true,
  "lastActivityAt": "2026-02-20T22:10:00Z"
}
```

### DELETE /sessions/:id
Cierra una sesión específica.

**Response** (204): Sin contenido

### POST /sessions/end-all
Cierra todas las sesiones de un usuario.

**Request**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440010"
}
```

**Response** (200):
```json
{
  "message": "All sessions ended",
  "count": 3
}
```

### GET /sessions/stats
Obtiene estadísticas de sesiones.

**Response** (200):
```json
{
  "activeSessions": 5,
  "totalSessions": 25,
  "activeUsers": 3,
  "sessionsLastHour": 2
}
```

### POST /sessions/cleanup
Limpia sesiones inactivas.

**Request**:
```json
{
  "inactiveMinutes": 60
}
```

**Response** (200):
```json
{
  "message": "Cleanup completed",
  "deletedCount": 10
}
```

---

## 📋 AUDIT LOGS - Registros de Auditoría

### GET /audit-logs
Lista todos los registros de auditoría.

**Query Parameters**:
```
?skip=0&take=20&action=CREATE&resourceType=Company
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440070",
      "companyId": "550e8400-e29b-41d4-a716-446655440001",
      "userId": "550e8400-e29b-41d4-a716-446655440010",
      "userName": "admin@cigua.com",
      "action": "CREATE",
      "resourceType": "Company",
      "resourceId": "550e8400-e29b-41d4-a716-446655440001",
      "oldValue": null,
      "newValue": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Cigua Inversiones"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 100
  }
}
```

### GET /audit-logs/:id
Obtiene detalle de un registro.

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440070",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440010",
  "userName": "admin@cigua.com",
  "action": "UPDATE",
  "resourceType": "Company",
  "resourceId": "550e8400-e29b-41d4-a716-446655440001",
  "oldValue": {
    "name": "Old Name",
    "email": "old@email.com"
  },
  "newValue": {
    "name": "New Name",
    "email": "new@email.com"
  },
  "createdAt": "2026-02-20T22:00:00Z"
}
```

### GET /audit-logs/stats
Obtiene estadísticas de auditoría.

**Response** (200):
```json
{
  "totalLogs": 500,
  "actions": {
    "CREATE": 150,
    "UPDATE": 300,
    "DELETE": 50
  },
  "resourceTypes": {
    "Company": 200,
    "User": 150,
    "Role": 100,
    "Permission": 50
  },
  "topUsers": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440010",
      "userName": "admin@cigua.com",
      "count": 450
    }
  ]
}
```

### POST /audit-logs/cleanup
Limpia registros antiguos.

**Request**:
```json
{
  "daysOld": 30
}
```

**Response** (200):
```json
{
  "message": "Cleanup completed",
  "deletedCount": 100
}
```

---

## ⚙️ CONFIG MAPPING - Mapeo de Configuración

### GET /config-mapping
Lista todos los mapeos.

**Query Parameters**:
```
?skip=0&take=10
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440080",
      "source": "CRM_Field_X",
      "target": "ERP_FieldY",
      "mappingType": "MANUAL",
      "isActive": true,
      "createdAt": "2026-02-20T21:57:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 10,
    "total": 1
  }
}
```

### POST /config-mapping
Crea un nuevo mapeo.

**Request**:
```json
{
  "source": "CRM_Customer_ID",
  "target": "ERP_Customer_Code",
  "mappingType": "MANUAL"
}
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440080",
  "source": "CRM_Customer_ID",
  "target": "ERP_Customer_Code",
  "createdAt": "2026-02-20T22:00:00Z"
}
```

---

## 📊 Códigos de Estado HTTP

| Código | Significado | Causa |
|--------|-------------|-------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado |
| 204 | No Content | Eliminado exitosamente |
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | Token faltante o inválido |
| 403 | Forbidden | Permisos insuficientes |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Recurso ya existe |
| 500 | Server Error | Error del servidor |

---

## 🧪 Ejemplos cURL

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cigua.com","password":"admin123456"}'
```

### Listar Empresas (con token)
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X GET "http://localhost:3000/companies?skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Crear Empresa
```bash
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nueva Empresa",
    "email": "info@empresa.com"
  }'
```

---

## 💡 Tips Útiles

- Usa **Postman** o **Insomnia** para probar endpoints
- Copia el `accessToken` de login para usarlo en otros requests
- Los tokens expiran en **15 minutos** (acceso) y **7 días** (refresh)
- Todos los errores incluyen descripción en JSON
- Las fechas están en formato **ISO 8601 UTC**

