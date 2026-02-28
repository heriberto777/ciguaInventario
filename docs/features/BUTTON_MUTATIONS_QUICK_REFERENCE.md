# 📑 MATRIZ DE PROBLEMAS - REFERENCIA RÁPIDA POR ARCHIVO

## MappingConfigAdminPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 100 | saveMutation.onError | `setSaveSuccess(false)` - variable undefined | Remover o crear estado `setSaveSuccess` |
| 111 | toggleMutation | Sin `onError` | Agregar: `onError: (error) => { toast.error(error.message); }` |
| 157 | toggle-btn | Sin `disabled={toggleMutation.isPending}` | Agregar disabled |
| 171 | delete-btn | Sin `onError` en deleteMutation | Agregar onError handler |
| 539 | save-btn | Sin validación pre-mutate en handler | Validar `formData` antes de `onSave()` |

**Orden de Corrección:**
1. Fix variable undefined (línea 100)
2. Agregar onError a toggleMutation (línea 111)
3. Agregar disabled a toggle-btn (línea 157)
4. Agregar onError a deleteMutation (línea 171)
5. Agregar validación a save handler (línea 539)

---

## QueryBuilderPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 119-134 | addJoin() | Usa `alert()`, sin disabled en botón | Crear estado de error, agregar disabled |
| 142-157 | addFilter() | Usa `alert()`, sin disabled en botón | Crear estado de error, agregar disabled |
| 319 | previsualizar-btn | Sin error handling en generateSQL | Agregar try/catch |
| 327 | ejecutar-btn | Sin error handling en testQuery | Agregar try/catch y error state |
| 402 | guardar-btn | Handler vacío con console.log | Implementar handler real con validación |

**Cambios Necesarios:**
```tsx
// Estado nuevo necesario
const [formErrors, setFormErrors] = useState<{ joins: string; filters: string }>({
  joins: '',
  filters: '',
});

// Modificar addJoin
const addJoin = () => {
  if (!joinRightTable || !joinCondition) {
    setFormErrors(prev => ({ ...prev, joins: 'Complete all JOIN fields' }));
    return;
  }
  setFormErrors(prev => ({ ...prev, joins: '' }));
  setJoins([...joins, { ... }]);
};

// Botón debe tener disabled y mostrar error
<button onClick={addJoin} disabled={isLoading}>Agregar</button>
{formErrors.joins && <p className="text-red-600">{formErrors.joins}</p>}
```

---

## InventoryCountPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 54 | prepareCountMutation | Sin `onError` | Agregar: `onError: (error) => toast.error(error.message)` |
| 64 | updateItemMutation | Solo cálculo, sin API call | Implementar API call real |
| 77 | completeCountMutation | Sin `onError` | Agregar onError handler |
| 243 | agregar-articulo-btn | Validación inline, sin feedback | Crear estado de error, mostrar en UI |
| 365 | completar-btn | Verificar disabled consistency | ✓ OK (tiene disabled) |

**Cambios Más Importantes:**

```tsx
// updateItemMutation - REVISAR ESTO (línea 64)
const updateItemMutation = useMutation({
  mutationFn: async (item: CountItem) => {
    // ❌ ACTUAL: Solo cálculo local
    const variance = item.countedQty - item.systemQty;
    return { ...item, variance };

    // ✅ DEBERÍA SER: API call real
    const res = await apiClient.patch(
      `/inventory-counts/${activeCountId}/items/${item.id}`,
      { countedQty: item.countedQty }
    );
    return res.data;
  },
  onSuccess: () => { /* ... */ },
  onError: (error) => {
    toast.error(error.message);
    // Reset item
  },
});
```

---

## LoadInventoryFromERPPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 45 | loadInventory | Mensaje de error genérico | Mostrar detalles del error específico |
| 93 | handleLoadInventory | Usa `alert()` para validación | Mostrar error en UI state |
| 146 | modal-resultado | Sin auto-close | Agregar timeout auto-close |

**Quick Fix:**
```tsx
// Línea 93: Reemplazar alert()
const handleLoadInventory = () => {
  const errors = [];
  if (!selectedMapping) errors.push('Select a mapping');
  if (!selectedWarehouse) errors.push('Select a warehouse');

  if (errors.length > 0) {
    setError(errors.join('; '));
    return;
  }

  loadInventory();
};

// Mostrar error en UI
{loadError && (
  <div className="bg-red-50 p-3 rounded text-red-800">
    {loadError}
  </div>
)}
```

---

## PhysicalCountPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 89 | handleUpdateItem | Fetch directo, sin mutation structure | Crear updateItemMutation con useMutation |
| 119 | handleCompleteCount | Validación post-clic | Mover a disabled del botón |
| 152 | handleDiscardCount | Usa `confirm()` | Usar Dialog component |
| 288 | complete-btn | Condición disabled compleja | Simplificar con variable helper |

**Refactor Necesario:**

```tsx
// Convertir fetch a mutation
const updateItemMutation = useMutation({
  mutationFn: async (itemId: string, data: any) => {
    const res = await fetch(`/api/inventory/counts/${countId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update');
    return res.json();
  },
  onSuccess: () => {
    loadCountData(); // Reload
  },
  onError: (error) => {
    setError(error.message);
  },
});

// Usar en handler
const handleUpdateItem = (itemId: string, value: number) => {
  updateItemMutation.mutate(itemId, { countedQty: value });
};
```

---

## WarehousesPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 30 | createMutation | Sin `onError` | Agregar onError handler |
| 48 | deleteMutation | Sin `onError` | Agregar onError handler |
| 57 | handleSubmit | Sin validación pre-mutate | Validar formData antes de mutate |
| 106-125 | form-inputs | Solo HTML `required`, sin JS validation | Agregar validación con onChange |
| 113/119 | buttons | Disabled inconsistentes | Verificar que ambos respeten mutation state |

---

## CompaniesPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 51 | createMutation | Sin `onError` | Agregar onError |
| 63 | updateMutation | Sin `onError` | Agregar onError |
| 80 | deleteMutation | Sin `onError` | Agregar onError |
| 113 | handleDelete | Usa `confirm()` | Usar Dialog component |
| 181 | error-msg | Sin auto-dismiss | Agregar useEffect con timeout |

**Template onError:**
```tsx
onError: (error: any) => {
  const message = error?.response?.data?.message || error.message || 'Operation failed';
  toast.error(message);
  setDeleteError(message);

  // Auto-dismiss después de 5 segundos
  setTimeout(() => setDeleteError(null), 5000);
}
```

---

## UsersPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 29 | createUserMutation | Sin `onError` | Agregar onError |
| 41 | deleteUserMutation | Sin `onError` | Agregar onError |
| 55 | handleDeleteUser | Usa `confirm()` | Usar Dialog component |
| 87 | edit-card | Edit no implementado | Implementar o remover |

---

## RolesPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 56 | createRoleMutation | Sin `onError` | Agregar onError |
| 66 | updateRoleMutation | Sin `onError` | Agregar onError |
| 83 | deleteRoleMutation | Sin `onError` | Agregar onError |
| 92 | assignPermissionsMutation | Sin `onError` | Agregar onError |
| 133 | handleDeleteRole | Usa `confirm()` | Usar Dialog component |

---

## PermissionsPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 49 | createMutation | Sin `onError` | Agregar onError |
| 61 | updateMutation | Sin `onError` | Agregar onError |
| 78 | deleteMutation | Sin `onError` | Agregar onError |
| 107 | handleDelete | Usa `confirm()` | Usar Dialog component |
| 164 | error-msg | Sin auto-dismiss | Agregar auto-dismiss |

---

## ERPConnectionsPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 46 | createMutation | Sin `onError` | Agregar onError |
| 60 | updateMutation | Sin `onError` | Agregar onError |
| 76 | deleteMutation | Sin `onError` | Agregar onError |
| 88 | toggleMutation | Sin `onError` | Agregar onError |
| 105 | testMutation | Sin callbacks | Agregar onSuccess y onError |
| 139 | handleDelete | Usa `confirm()` | Usar Dialog component |

---

## SessionsPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 76 | endSessionMutation | Sin `onError` | Agregar onError |
| 87 | cleanupMutation | Sin `onError` | Agregar onError |
| 97 | handleEndSession | Usa `confirm()` | Usar Dialog component |
| 105 | handleCleanup | Usa `confirm()` | Usar Dialog component |
| 191 | error-msg | Sin auto-dismiss | Agregar auto-dismiss |

---

## QueryExplorerPage.tsx

| Línea | Elemento | Problema | Fix |
|-------|----------|----------|-----|
| 128 | handleExecuteQuery | Sin retry logic | Agregar retry button en error |
| 150 | handleSaveAsMapping | Validación incompleta | Mejorar validación pre-submit |
| 369-376 | action-btns | Sin disabled durante loading | Agregar disabled={loading} |

---

## AuditLogsPage.tsx
✓ **SIN PROBLEMAS** - Solo lectura, no hay mutations

---

## SettingsPage.tsx
⚠️ **Contenedor de otros componentes** - Los problemas están en los subcomponentes incluidos

---

## 🚀 Plan de Ejecución

### Prioridad 1: HORAS (Críticos)
1. **MappingConfigAdminPage.tsx línea 100:** Fix variable undefined
2. **Todos los archivos:** Agregar `disabled={isPending}` a botones de mutation
3. **Todas las mutations:** Agregar `onError` handler básico

### Prioridad 2: HOY (Altos)
4. **7 archivos:** Reemplazar `confirm()` con Dialog
5. **InventoryCountPage:** Fijar updateItemMutation
6. **QueryBuilderPage:** Remover `alert()` y usar error state

### Prioridad 3: ESTA SEMANA
7. **Validación pre-submit:** Implementar en todos los formularios
8. **Auto-dismiss:** Para mensajes de error
9. **Toast notifications:** Feedback consistente

---

## 📊 Resumen de Cambios Necesarios

| Tipo de Cambio | Cantidad | Tiempo Estimado |
|----------------|----------|-----------------|
| Agregar `onError` | 30+ | 2 horas |
| Agregar `disabled` | 15+ | 1 hora |
| Fix variable undefined | 1 | 5 minutos |
| Reemplazar `confirm()` | 7 | 1.5 horas |
| Validación pre-submit | 8+ | 2 horas |
| Auto-dismiss errors | 5+ | 30 minutos |
| Fix API calls | 2 | 1 hora |
| **TOTAL** | **~70+** | **~8 horas** |

---

Generado: 21 de febrero de 2026
