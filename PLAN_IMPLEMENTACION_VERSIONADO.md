# 📋 PLAN DE IMPLEMENTACIÓN - VERSIONADO Y FINALIZACIÓN

## 🎯 RESUMEN EJECUTIVO

Vamos a implementar la **lógica de versionado completa** para permitir:
1. ✅ Crear múltiples versiones (V1 → V2 → V3...) cuando hay varianza
2. ✅ Cada versión tiene sus propios items registrados con `version: N`
3. ✅ Items sin varianza NO se copian a nuevas versiones
4. ✅ Historial completo preservado en BD
5. ✅ Finalización de cada versión con análisis de varianza

**SIN cambios a la BD** (solo lógica en el código)

---

## 📊 CAMBIOS POR IMPLEMENTAR

### **1. BACKEND - version-service.ts**

#### **Función: `createNewVersion()` - MODIFICAR**

**Cambio:**
```typescript
// ANTES: Solo retorna items con varianza
return {
  countId,
  newVersion,
  itemsToRecount: varianceItems.items.length,
  items: varianceItems.items,
};

// DESPUÉS: Crea registros NUEVOS en BD
```

**Qué hace:**
- ✅ Detecta items con varianza de V(n)
- ✅ **CREA nuevos registros** con `version: n+1`
- ✅ Copia datos del item original (sin `countedQty`)
- ✅ Limpia `countedQty: null` para recontar
- ✅ Actualiza `totalVersions` y `currentVersion`
- ✅ Retorna los items nuevos creados

**Loop de items:**
```
for each item with variance:
  └─ Obtener registro original (version=n)
  └─ CREAR nuevo registro:
     ├─ countId (mismo)
     ├─ locationId (mismo)
     ├─ itemCode (mismo)
     ├─ itemName (mismo)
     ├─ systemQty (mismo)
     ├─ countedQty: null  ← LIMPIO
     ├─ version: n+1      ← NUEVA VERSION
     └─ Otros datos copiados
```

---

#### **Función: `getVarianceItems()` - MODIFICAR**

**Cambio:**
```typescript
// ANTES: No filtra por version
variance_reports: { some: { ... } }

// DESPUÉS: Filtra por version específica
variance_reports: { some: { version: previousVersion, ... } }
```

**Qué hace:**
- ✅ Obtiene items DE UNA VERSIÓN ESPECÍFICA
- ✅ Que tengan `VarianceReport` en esa versión
- ✅ Con status PENDING o APPROVED
- ✅ Retorna datos del item (sin modificar BD)

---

#### **Función: `getCountItems()` - AGREGAR (nuevo endpoint)**

**Qué hace:**
- ✅ GET `/inventory-counts/{countId}/items?version=2`
- ✅ Retorna SOLO items de esa versión
- ✅ Si no especifica version, retorna la actual (`currentVersion`)

**Parámetro:** `version?: number`

**Lógica:**
```typescript
const targetVersion = version || count.currentVersion;

const items = await findMany({
  where: {
    countId,
    count: { companyId },
    version: targetVersion,  // ← FILTRAR POR VERSION
  }
});
```

---

### **2. BACKEND - Endpoints en Routes**

#### **Actualizar endpoints existentes:**

```
ANTES:
GET /inventory-counts/:countId/items
  └─ Retorna todos los items sin filtrar

DESPUÉS:
GET /inventory-counts/:countId/items?version=2
  └─ Retorna SOLO items de version=2
```

---

### **3. FRONTEND - InventoryCountPage.tsx**

#### **Función: `handleProcessCount()` - YA EXISTE ✓**
No necesita cambios. Ya actualiza la vista correctamente.

#### **Función: Mostrar items de versión actual - MODIFICAR**

**Cambio:**
```typescript
// ANTES:
const countItems = selectedCount.countItems;

// DESPUÉS:
const countItems = selectedCount.countItems.filter(
  item => item.version === selectedCount.currentVersion
);
```

**Qué hace:**
- ✅ Cuando abres un conteo, muestra items de `currentVersion`
- ✅ Si estás en V2, ve items de V2 (no los de V1)
- ✅ Si vuelves a abrir después recontar, ve los nuevos datos

---

#### **Botón: "Crear Versión" - EXISTE ✓**

**Cambio:** Ajustar flujo para que use los nuevos items creados

```typescript
onSuccess: (count) => {
  setSelectedCount(count);
  setCountItems(count.countItems.filter(
    item => item.version === count.currentVersion  // ← Filtrar
  ));
  setView('process');
}
```

---

#### **Botón: "✓ Finalizar" - EXISTE ✓**

**Cambio:** Sin cambios. Solo realiza `completeCount()`

```typescript
onClick={() => completeCountMutation.mutate(selectedCount.id)}
```

---

### **4. FRONTEND - Actualizar getCountItems en API calls**

**Cambio:**

```typescript
// ANTES:
const response = await apiClient.get(`/inventory-counts/${countId}`);

// DESPUÉS:
const response = await apiClient.get(
  `/inventory-counts/${countId}/items?version=${selectedCount.currentVersion}`
);
```

---

## 🎬 FLUJO RESULTANTE

```
V1 DIGITACIÓN:
├─ Creas conteo: Items con version=1
├─ Digitas cantidades: countedQty se guarda
├─ Clic [✓ Finalizar]:
│  └─ Status: ACTIVE → COMPLETED
│  └─ Sistema calcula varianzas
│
└─ Si hay varianza:
   └─ Aparece botón [🔄 Crear Versión]

CREAR V2:
├─ Clic [🔄 Crear Versión]:
│  ├─ Sistema detecta items con varianza (version=1)
│  ├─ **CREA nuevos items: version=2, countedQty=null**
│  ├─ Frontend se refresca
│  └─ Muestra SOLO items de version=2
│
├─ Recontas V2:
│  └─ countedQty de items V2 se actualiza
│
└─ Clic [✓ Finalizar V2]:
   └─ Status: IN_PROGRESS → COMPLETED
   └─ Sistema calcula varianzas de V2

   Si hay varianza:
   └─ Puedes crear V3 (mismo proceso)

   Si NO hay varianza:
   └─ FIN (Conteo completado)
```

---

## 📊 MATRIZ DE CAMBIOS

```
┌──────────────────┬─────────────────────┬────────────────────┐
│ Archivo          │ Función/Cambio      │ Tipo               │
├──────────────────┼─────────────────────┼────────────────────┤
│ version-service  │ createNewVersion()  │ ✏️ MODIFICAR       │
│                  │ getVarianceItems()  │ ✏️ MODIFICAR       │
│                  │ getCountItems()     │ 🔄 AGREGAR FILTRO  │
├──────────────────┼─────────────────────┼────────────────────┤
│ InventoryCountPage│ countItems filter  │ ✏️ MODIFICAR       │
│ .tsx             │ createVersionMutation│ ✏️ AJUSTAR FLUJO   │
├──────────────────┼─────────────────────┼────────────────────┤
│ API calls        │ GET items endpoint  │ ✏️ AGREGAR ?version│
├──────────────────┼─────────────────────┼────────────────────┤
│ Prisma Schema    │ (sin cambios)       │ ✅ OK              │
│ DB              │ (sin cambios)       │ ✅ OK              │
└──────────────────┴─────────────────────┴────────────────────┘
```

---

## 🔍 VALIDACIONES A MANTENER

```
✅ No permitir crear V2 sin varianza
✅ No permitir finalizar sin items
✅ No permitir finalizar sin todas las cantidades digitadas
✅ Preservar histórico (V1, V2, V3...)
✅ Cada versión independiente en BD
```

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

### **Paso 1: Backend**
1. Modificar `createNewVersion()` para crear items
2. Modificar `getVarianceItems()` para filtrar versión
3. Agregar filtro `version` a `getCountItems()`
4. Actualizar rutas si necesario

### **Paso 2: Frontend**
1. Filtrar items por versión en InventoryCountPage
2. Actualizar `createVersionMutation` onSuccess
3. Verificar API calls usen ?version=X

### **Paso 3: Testing**
1. Crear V1 → Digitar → Finalizar
2. Crear V2 → Ver que solo tenga items con varianza
3. Recontar V2 → Finalizar
4. Crear V3 si hay varianza
5. Verificar histórico en BD

---

## ✅ CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Confirmas que sea sin cambios a BD
- [ ] Confirmas que cada versión sea independiente
- [ ] Confirmas que items sin varianza NO se copien
- [ ] Confirmas que el histórico se preserve
- [ ] Confirmas el orden de implementación

---

## 📝 RESUMEN FINAL

### **¿Qué implementamos?**
1. ✅ Creación de items nuevos cuando haces nueva versión
2. ✅ Cada item con su `version` asignado
3. ✅ Filtrado de items por versión en frontend
4. ✅ Histórico completo preservado
5. ✅ Sin cambios a estructura BD

### **¿Qué NO implementamos?**
- ❌ Cambios a BD (prisma schema)
- ❌ Migraciones
- ❌ Envío al ERP (es para después)
- ❌ Nuevas tablas

### **¿Tiempo estimado?**
- Backend: 30-45 minutos
- Frontend: 20-30 minutos
- Testing: 15-20 minutos
- **Total: ~1.5 horas**

