# 🚀 REFERENCIA RÁPIDA: VERSIONADO Y ERP

## Cambios Implementados (5 archivos)

### Backend (3 archivos)

#### 1. `version-service.ts`
```typescript
// createNewVersion() - Ahora CREA nuevos items en BD
const newItem = await prisma.inventoryCount_Item.create({
  version: newVersion,
  countedQty: null, // Limpio para recontar
  // ... otros campos copiados de V(n)
});

// getCountItems() - Filtra por currentVersion
where: {
  version: count.currentVersion, // ← FILTRO NUEVO
}
```

#### 2. `repository.ts`
```typescript
// getCountById() - Filtra items automáticamente
include: {
  countItems: {
    where: {
      version: count.currentVersion, // ← FILTRO AUTOMÁTICO
    }
  }
}
```

#### 3. `service.ts` + `controller.ts` + `routes.ts`
```typescript
// Nuevo endpoint
POST /inventory-counts/:countId/send-to-erp

// Qué hace
- Valida status === COMPLETED
- Cambia a CLOSED
- Registra closedBy, closedAt
- Retorna confirmación
```

### Frontend (1 archivo)

#### 4. `InventoryCountPage.tsx`
```typescript
// Mutation
const sendToERPMutation = useMutation({
  mutationFn: async (countId) => {
    return await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
  }
});

// Botón
{selectedCount.status === 'COMPLETED' && (
  <Button onClick={() => sendToERPMutation.mutate(selectedCount.id)}>
    🚀 Enviar a ERP
  </Button>
)}
```

---

## Estados

```
DRAFT → ACTIVE → COMPLETED → CLOSED
        ↓
      ON_HOLD ─────┐
        ↓           │
      ACTIVE → COMPLETED → CLOSED

      CANCELLED (desde cualquier estado)
```

**Nuevo:** `COMPLETED → CLOSED` para envío a ERP

---

## Flujo Versionado

```
1. Crear V1 conteo
2. Si hay varianza → Crear Versión (V2)
   └─ Crea nuevos registros con version=2, countedQty=null
   └─ V1 items quedan históricos
3. Recontar V2
4. Si varianza → Crear V3, etc.
5. Finalizar → COMPLETED
6. Enviar a ERP → CLOSED
```

---

## BD - Sin cambios de estructura

- ✅ Usa `version` y `currentVersion` (ya existen)
- ✅ Usa `closedBy`, `closedAt` (ya existen)
- ✅ NO requiere migraciones

---

## Testing

```bash
# Endpoint nuevo
curl -X POST http://localhost:3000/api/inventory-counts/{countId}/send-to-erp

# Estado antes: COMPLETED
# Estado después: CLOSED
```

---

## TODO Future

- [ ] Conectar a ERP real (Catelli, SAP)
- [ ] Mapear campos a formato ERP
- [ ] Manejar errores y reintentos
- [ ] Registrar en InventorySyncHistory

