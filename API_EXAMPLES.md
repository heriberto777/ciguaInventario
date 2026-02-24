# API Examples

## Authentication

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123456"
  }'
```

Response:
```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "user-123",
      "email": "admin@example.com",
      "name": "Admin User",
      "companyId": "company-123"
    }
  }
}
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

## Mapping Configuration

### List Mappings

```bash
curl -X GET http://localhost:3000/config/mapping \
  -H "Authorization: Bearer <accessToken>" \
  -H "Cookie: accessToken=<cookie>"

# With filters
curl -X GET "http://localhost:3000/config/mapping?datasetType=ITEMS&isActive=true" \
  -H "Authorization: Bearer <accessToken>"
```

Response:
```json
{
  "data": [
    {
      "id": "mapping-123",
      "companyId": "company-123",
      "erpConnectionId": "erp-123",
      "datasetType": "ITEMS",
      "sourceTables": ["inventory_items"],
      "sourceQuery": null,
      "fieldMappings": [
        {
          "sourceField": "item_id",
          "targetField": "id",
          "dataType": "INT"
        },
        {
          "sourceField": "item_name",
          "targetField": "name",
          "dataType": "STRING"
        }
      ],
      "version": 1,
      "isActive": true,
      "createdAt": "2026-02-19T10:00:00Z",
      "updatedAt": "2026-02-19T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Get Single Mapping

```bash
curl -X GET http://localhost:3000/config/mapping/mapping-123 \
  -H "Authorization: Bearer <accessToken>"
```

### Create Mapping

```bash
curl -X POST http://localhost:3000/config/mapping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "erpConnectionId": "erp-123",
    "datasetType": "ITEMS",
    "sourceTables": ["inventory_items"],
    "fieldMappings": [
      {
        "sourceField": "item_id",
        "targetField": "id",
        "dataType": "INT"
      },
      {
        "sourceField": "item_name",
        "targetField": "name",
        "dataType": "STRING"
      },
      {
        "sourceField": "unit_price",
        "targetField": "price",
        "dataType": "DECIMAL"
      }
    ],
    "filters": {
      "is_active": 1
    }
  }'
```

Response:
```json
{
  "data": {
    "id": "mapping-456",
    "companyId": "company-123",
    "erpConnectionId": "erp-123",
    "datasetType": "ITEMS",
    "sourceTables": ["inventory_items"],
    "fieldMappings": [...],
    "version": 1,
    "isActive": true,
    "createdAt": "2026-02-19T10:05:00Z",
    "updatedAt": "2026-02-19T10:05:00Z"
  }
}
```

### Test Mapping (Preview Data)

```bash
curl -X POST http://localhost:3000/config/mapping/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "mappingId": "mapping-123",
    "limitRows": 10
  }'
```

Response:
```json
{
  "data": {
    "mappingId": "mapping-123",
    "datasetType": "ITEMS",
    "rowCount": 3,
    "data": [
      {
        "id": 1,
        "name": "Item 1",
        "quantity": 100
      },
      {
        "id": 2,
        "name": "Item 2",
        "quantity": 50
      },
      {
        "id": 3,
        "name": "Item 3",
        "quantity": 200
      }
    ],
    "executionTimeMs": 145
  }
}
```

## Error Responses

### Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "path": ["fieldMappings"],
        "message": "Array must have at least 1 element"
      }
    ]
  }
}
```

### Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing token"
  }
}
```

### Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Mapping config mapping-123 not found"
  }
}
```

## Using with Frontend

### React Hook Form + React Query

```typescript
const { register, handleSubmit } = useForm({
  resolver: zodResolver(createMappingSchema),
});

const { mutate: createMapping } = useCreateMapping();

const onSubmit = (data) => {
  createMapping(data, {
    onSuccess: (response) => {
      console.log('Created:', response);
    },
    onError: (error) => {
      console.error('Error:', error.response?.data?.error);
    },
  });
};
```

## Database Queries Reference

### View Audit Trail

```sql
SELECT id, action, resource, resource_id, user_id, created_at
FROM "AuditLog"
WHERE company_id = '<company-id>'
ORDER BY created_at DESC
LIMIT 100;
```

### Get Mapping Versions

```sql
SELECT id, version, is_active, created_at
FROM "MappingConfig"
WHERE company_id = '<company-id>'
AND dataset_type = 'ITEMS'
ORDER BY version DESC;
```

### User Permissions

```sql
SELECT u.email, r.name, p.name as permission
FROM "User" u
JOIN "UserRole" ur ON u.id = ur.user_id
JOIN "Role" r ON ur.role_id = r.id
JOIN "RolePermission" rp ON r.id = rp.role_id
JOIN "Permission" p ON rp.permission_id = p.id
WHERE u.company_id = '<company-id>';
```

---

## Notes

- Todas las requests requieren `Authorization: Bearer <token>`
- El cookie `accessToken` se envía automáticamente en el navegador
- Los tokens expiran: access token (15 min), refresh token (7 días)
- El servidor rechaza requests sin valid company_id en el token
- Todas las queries filtran automáticamente por company_id
