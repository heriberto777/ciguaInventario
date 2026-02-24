# 📋 GUÍA SISTEMA DE VERSIONES PARA RECONTEO

## 🎯 OBJETIVO

Permitir crear **nuevas versiones** de un conteo cuando hay **varianzas**, sin perder la información de las versiones anteriores. Cada versión es un reconteo completo de los mismos items.

---

## 🔄 FLUJO DE VERSIONES

```
DRAFT
  ↓
ACTIVE (V1) ← Versión inicial del conteo
  ↓
COMPLETED (V1) ← Conteo completado
  ↓
┌─ Opción A: Crear V2 → ACTIVE (V2) → COMPLETED (V2)
│                          ↓
│                    [Si hay varianza]
│                          ↓
│                      Crear V3 → ...
│
└─ Opción B: Enviar a ERP → CLOSED (Final)
```

---

## 📊 ESTRUCTURA DE DATOS

### InventoryCount (Tabla Principal)

```typescript
{
  id: "cuid123",
  companyId: "company1",
  warehouseId: "warehouse1",
  code: "INV-2026-02-001",
  sequenceNumber: "CONT-2026-001",

  status: "COMPLETED",           // Estado actual
  currentVersion: 2,              // ← Versión activa (siempre cambia)
  totalVersions: 2,               // ← Total de versiones creadas

  createdAt: "2026-02-23T10:00:00Z",
  updatedAt: "2026-02-23T14:30:00Z",

  // Items relacionados (filtrados por currentVersion en queries)
  countItems: [
    { version: 1, countedQty: 100, ... },  // V1 (histórico)
    { version: 2, countedQty: 105, ... }   // V2 (actual)
  ]
}
```

### InventoryCount_Item (Cada Item por Versión)

```typescript
{
  id: "cuid456",
  countId: "cuid123",

  itemCode: "ITEM-001",
  itemName: "Laptop Lenovo",

  systemQty: 100,      // Cantidad en ERP (no cambia)
  countedQty: 105,     // ← Cantidad contada en V2
  version: 2,          // ← Pertenece a versión 2

  status: "VARIANCE",  // PENDING, APPROVED, VARIANCE

  variance_reports: [
    { version: 1, difference: 5, ... },
    { version: 2, difference: 5, ... }
  ]
}
```

---

## 🔧 IMPLEMENTACIÓN BACKEND

### 1. Nuevo Método: `createNewVersion()`

**Ubicación:** `apps/backend/src/modules/inventory-counts/service.ts`

```typescript
async createNewVersion(
  countId: string,
  companyId: string,
  createdBy?: string
) {
  // Paso 1: Obtener el conteo actual
  const count = await this.getCountById(countId, companyId);

  if (!count) {
    throw new AppError('Conteo no encontrado', 404);
  }

  // Paso 2: Validar estado
  if (count.status !== 'COMPLETED') {
    throw new AppError(
      'Solo conteos COMPLETADOS pueden crear versiones',
      400
    );
  }

  // Paso 3: Calcular nueva versión
  const newVersion = count.currentVersion + 1;

  // Paso 4: Copiar items de versión anterior
  const prevItems = await prisma.inventoryCount_Item.findMany({
    where: {
      countId,
      version: count.currentVersion
    }
  });

  // Paso 5: Crear items para nueva versión (sin cantidades)
  const newItems = prevItems.map(item => ({
    countId,
    locationId: item.locationId,
    itemCode: item.itemCode,
    itemName: item.itemName,
    barCodeInv: item.barCodeInv,
    barCodeVt: item.barCodeVt,
    category: item.category,
    brand: item.brand,
    subcategory: item.subcategory,
    packQty: item.packQty,
    uom: item.uom,
    baseUom: item.baseUom,
    systemQty: item.systemQty,  // Del sistema (no cambia)
    countedQty: null,           // ← Vacío (para recontar)
    version: newVersion,        // ← Nueva versión
    status: 'PENDING',
    costPrice: item.costPrice,
    salePrice: item.salePrice,
    notes: `Reconteo V${newVersion}`,
    countedBy: null,
    countedAt: new Date()
  }));

  // Paso 6: Insertar items de nueva versión
  await prisma.inventoryCount_Item.createMany({
    data: newItems
  });

  // Paso 7: Actualizar conteo
  await prisma.inventoryCount.update({
    where: { id: countId },
    data: {
      currentVersion: newVersion,
      totalVersions: newVersion,
      status: 'ACTIVE',           // ← Regresa a ACTIVE para recontar
      startedBy: createdBy || 'system',
      startedAt: new Date()
    }
  });

  // Paso 8: Log
  console.log(`✅ Nueva versión V${newVersion} creada para conteo ${countId}`);

  return this.getCountById(countId, companyId);
}
```

**Lógica:**
1. ✅ Obtiene el conteo completado
2. ✅ Valida que esté en estado COMPLETED
3. ✅ Copia todos los items de la versión anterior
4. ✅ Crea nuevos items con `countedQty = null` (para recontar)
5. ✅ Actualiza `currentVersion` y `status` a ACTIVE
6. ✅ Retorna el conteo actualizado

---

### 2. Nuevo Endpoint: POST `/inventory-counts/:countId/new-version`

**Ubicación:** `apps/backend/src/modules/inventory-counts/controller.ts`

```typescript
async createNewVersion(req: FastifyRequest, res: FastifyReply) {
  try {
    const { countId } = req.params as { countId: string };
    const { userId } = req.user as { userId: string };

    // Validación
    if (!countId) {
      return res.status(400).send({
        error: 'countId es requerido'
      });
    }

    // Obtener companyId del usuario
    const company = await this.inventoryCountService.getCountById(
      countId,
      userId
    );

    if (!company) {
      return res.status(404).send({ error: 'Conteo no encontrado' });
    }

    // Crear nueva versión
    const result = await this.inventoryCountService.createNewVersion(
      countId,
      company.companyId,
      userId
    );

    console.log('✅ Nueva versión creada:', result);

    return res.status(200).send({
      success: true,
      message: `Nueva versión V${result.currentVersion} creada`,
      data: result
    });

  } catch (error) {
    console.error('❌ Error creating new version:', error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).send({
        error: error.message
      });
    }

    return res.status(500).send({
      error: 'Error interno del servidor'
    });
  }
}
```

---

### 3. Registrar Ruta

**Ubicación:** `apps/backend/src/modules/inventory-counts/routes.ts`

```typescript
router.post(
  '/:countId/new-version',
  { preHandler: [tenantGuard] },
  (req, res) => controller.createNewVersion(req, res)
);
```

---

## 🎨 IMPLEMENTACIÓN FRONTEND

### 1. Botón en Vista de Proceso

**Ubicación:** `apps/web/src/pages/InventoryCountPage.tsx` (línea ~1050)

```tsx
{selectedCount.status === 'COMPLETED' && (
  <div className="flex gap-2">
    {/* Botón Crear Versión */}
    <Button
      onClick={() => {
        const versionNum = selectedCount.currentVersion + 1;
        if (confirm(`¿Crear versión V${versionNum} para recontar items con varianza?`)) {
          createNewVersionMutation.mutate(selectedCount.id);
        }
      }}
      variant="primary"
      disabled={createNewVersionMutation.isPending}
      title="Crear nueva versión para recontar items con varianza"
    >
      {createNewVersionMutation.isPending
        ? '⏳ Creando versión...'
        : `🔄 Crear Versión V${selectedCount.currentVersion + 1}`}
    </Button>

    {/* Botón Enviar a ERP */}
    <Button
      onClick={() => sendToERP.mutate(selectedCount.id)}
      variant="success"
      disabled={sendToERP.isPending}
      title="Enviar conteo a ERP para finalizar"
    >
      {sendToERP.isPending ? '⏳ Enviando...' : '🚀 Enviar a ERP'}
    </Button>

    {/* Botón Cancelar */}
    <Button
      onClick={() => setSelectedCount(null)}
      variant="secondary"
      title="Volver a la lista"
    >
      ← Volver
    </Button>
  </div>
)}
```

### 2. Mutación en Hook

**Ubicación:** `apps/web/src/hooks/useInventoryCountState.ts`

```typescript
// Crear nueva versión
const createNewVersionMutation = useMutation({
  mutationFn: async (countId: string) => {
    const response = await fetch(
      `${API_URL}/inventory-counts/${countId}/new-version`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creating version');
    }

    return response.json();
  },
  onSuccess: (data) => {
    // Actualizar cache
    queryClient.invalidateQueries({ queryKey: ['inventoryCounts'] });
    queryClient.setQueryData(['count', data.data.id], data.data);

    // Mostrar éxito
    toast.success(
      `✅ ${data.message}. Items listos para recontar.`
    );

    // Limpiar localStorage si existe
    localStorage.removeItem(`count_${data.data.id}`);
  },
  onError: (error: Error) => {
    toast.error(`❌ ${error.message}`);
  }
});
```

### 3. Exportar Mutación del Hook

```typescript
return {
  // ... otras mutaciones
  createNewVersionMutation
};
```

---

## 📱 FLUJO EN UI/UX

### Paso 1: Completar V1
```
┌──────────────────────────────┐
│ COMPLETED - Versión 1 de 1   │
├──────────────────────────────┤
│ ✅ Conteo completado         │
│ Tienes 5 items con varianza  │
├──────────────────────────────┤
│ [🔄 Crear Versión V2]        │ ← Usuario hace click aquí
│ [🚀 Enviar a ERP]            │
│ [← Volver]                   │
└──────────────────────────────┘
```

### Paso 2: Confirmación
```
¿Crear versión V2 para recontar items con varianza?
[Aceptar] [Cancelar]
```

### Paso 3: Nueva Versión Creada
```
┌──────────────────────────────┐
│ ACTIVE - Versión 2 de 2      │
├──────────────────────────────┤
│ 📝 Registrando items         │
│ Recontar los 5 items que     │
│ tienen varianza              │
├──────────────────────────────┤
│ [✓ Finalizar]                │
│ [⏸ Pausar]                   │
│ [✕ Cancelar]                 │
└──────────────────────────────┘
```

### Paso 4: Tabla de Items - V2
```
| Item Code | Description | System | V1 Count | V2 Count | Status   |
|-----------|-------------|--------|----------|----------|----------|
| ITEM-001  | Laptop      | 100    | 95       | [vacío]  | PENDING  |
| ITEM-002  | Mouse       | 50     | 50       | [vacío]  | PENDING  |
```

---

## 🔐 VALIDACIONES

### Backend
- ✅ Conteo debe estar en estado `COMPLETED`
- ✅ CompanyId debe coincidir
- ✅ CountId debe existir
- ✅ No duplicar items
- ✅ Actualizar `totalVersions` correctamente

### Frontend
- ✅ Botón solo visible si status = `COMPLETED`
- ✅ Confirmación antes de crear versión
- ✅ Tooltip explicativo
- ✅ Estados de carga

---

## 📊 ESTADO DESPUÉS DE CREAR VERSIÓN

### Base de Datos
```
InventoryCount:
- id: "cuid123"
- status: "ACTIVE"             ← Cambió de COMPLETED a ACTIVE
- currentVersion: 2            ← Incrementado
- totalVersions: 2             ← Incrementado

InventoryCount_Item (V1):
- version: 1
- countedQty: 95               ← Conserva valor de V1
- status: "VARIANCE"

InventoryCount_Item (V2):
- version: 2
- countedQty: null             ← Vacío para recontar
- status: "PENDING"
```

### UI
```
- Vista muestra: "Versión 2 de 2"
- Items muestran: V1 (95) | V2 (vacío)
- Botones: [✓ Finalizar] [⏸ Pausar] [✕ Cancelar]
```

---

## 🎯 CASOS DE USO

### Caso 1: Reconteo por Varianza
```
1. Usuario completa V1: 100 items, pero 5 tienen diferencia
2. Hace click [🔄 Crear Versión V2]
3. Sistema crea V2 con items sin cantidades
4. Usuario recontas los 5 items problemáticos
5. Usuario finaliza V2
6. Ahora puede enviar a ERP con información de ambas versiones
```

### Caso 2: Múltiples Reconteos
```
1. V1 Completada: 100 items, 5 varianzas
2. V2 Completada: 100 items, 2 varianzas (de los 5)
3. V3 Completada: 100 items, 0 varianzas
4. Envía V3 (más confiable) a ERP
```

### Caso 3: Sin Varianzas
```
1. V1 Completada: 100 items, 0 varianzas
2. Usuario hace click [🚀 Enviar a ERP]
3. Status cambia a CLOSED
4. No necesita crear V2
```

---

## 📈 VENTAJAS DEL SISTEMA

✅ **Trazabilidad:** Conserva histórico de todas las versiones
✅ **Auditoría:** Sabe cuántas versiones se hicieron y cuándo
✅ **Flexibilidad:** Usuario decide cuándo recontar
✅ **Integridad:** Datos anteriores nunca se pierden
✅ **Comparación:** Puede ver diferencias entre versiones
✅ **Confianza:** Envía versión con menos varianzas a ERP

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

**Backend:**
- [ ] Implementar método `createNewVersion()`
- [ ] Crear endpoint POST `/new-version`
- [ ] Registrar ruta con tenantGuard
- [ ] Agregar validaciones
- [ ] Probar en Postman

**Frontend:**
- [ ] Agregar mutación en hook
- [ ] Agregar botón en vista COMPLETED
- [ ] Agregar confirmación
- [ ] Mostrar nueva versión en UI
- [ ] Probar flujo completo

**Testing:**
- [ ] Crear V1, completar, crear V2
- [ ] Verificar items en BD
- [ ] Verificar currentVersion incrementó
- [ ] Verificar totalVersions incrementó
- [ ] Recontar V2 y completar
- [ ] Crear V3 si hay varianza

---

## 🚀 RESULTADO ESPERADO

```
╔═══════════════════════════════════════════════╗
║                                               ║
║     ✅ SISTEMA DE VERSIONES COMPLETADO       ║
║                                               ║
║  • Crear V2, V3, ... automático              ║
║  • Items preparados sin cantidades           ║
║  • Status actualiza a ACTIVE                 ║
║  • Histórico de versiones guardado           ║
║  • UI muestra versión actual                 ║
║  • Auditoría completa                        ║
║                                               ║
║  👉 Usuario puede recontar sin perder info   ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

---

**Versión:** 1.0
**Estado:** Ready to Implement
**Tiempo Estimado:** 1-2 horas
