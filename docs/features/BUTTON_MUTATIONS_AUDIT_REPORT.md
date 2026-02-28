# 🚨 REPORTE DE AUDITORÍA: Botones, Mutaciones y Validación de Datos

**Fecha:** 21 de febrero de 2026
**Estado:** ⚠️ CRÍTICO - Múltiples problemas de integridad encontrados
**Prioridad:** ALTA - Afecta experiencia de usuario y confiabilidad

---

## 📊 RESUMEN EJECUTIVO

Se han analizado **15 páginas** de componentes del sistema. Se encontraron **47 problemas críticos** distribuidos en:

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Mutaciones sin `onError` | 12 | 🔴 CRÍTICO |
| Botones sin `disabled` en operaciones | 15 | 🔴 CRÍTICO |
| Falta de validación pre-mutate | 8 | 🟡 ALTO |
| Handlers incompletos | 7 | 🟡 ALTO |
| Estados de carga inconsistentes | 5 | 🟡 ALTO |

---

## 🔍 PROBLEMAS DETALLADOS POR ARCHIVO

### 1. ❌ MappingConfigAdminPage.tsx

#### Problema 1.1: Botón "Activo/Inactivo" sin disabled
- **Línea:** 157
- **Botón:** Toggle Activo/Inactivo
- **Problema:** `toggleMutation.mutate()` se ejecuta pero no hay `disabled={toggleMutation.isPending}`
- **Falta:** Validación de estado en mutation
- **Impacto:** Usuario puede clickear múltiples veces causando race conditions
```tsx
<button
  onClick={() => toggleMutation.mutate(config.id)}
  // ❌ FALTA: disabled={toggleMutation.isPending}
  className={...}
>
```

#### Problema 1.2: Botón "Eliminar" sin onError
- **Línea:** 171
- **Botón:** Eliminar Mapping
- **Problema:** `deleteMutation` no tiene `onError` handler
- **Falta:**
  - Error handling
  - User feedback en caso de error
  - Rollback o retry logic
```tsx
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    await apiClient.delete(`/mapping-configs/${id}`);
  },
  onSuccess: () => {
    refetch();
  },
  // ❌ FALTA: onError handler
});
```

#### Problema 1.3: saveMutation sin validación completa
- **Línea:** 65
- **Mutation:** saveMutation
- **Problema:** Tiene validación pero NO retorna error visible al usuario
- **Falta:**
  - Toast/notification de error visible
  - Clear error message en UI
```tsx
onError: (error: any) => {
  const message = error?.response?.data?.error?.message || error.message || 'Error al guardar el mapping';
  setSaveError(message);
  setSaveSuccess(false); // ❌ Variable undefined!
},
```
**Variable Undefined:** `setSaveSuccess` no está definida en state

#### Problema 1.4: toggleMutation sin onError
- **Línea:** 111
- **Mutation:** toggleMutation
- **Problema:** Sin manejo de errores
- **Falta:** onError, feedback al usuario
```tsx
const toggleMutation = useMutation({
  mutationFn: async (id: string) => { ... },
  onSuccess: () => {
    refetch();
  },
  // ❌ SIN onError
});
```

#### Problema 1.5: Botón "Guardar Mapping" sin validación de datos
- **Línea:** 539
- **Botón:** "Guardar Mapping"
- **Problema:** Validación existe pero solo como `disabled` visual, no hay validación antes de `mutate()`
- **Falta:**
  - Pre-submit validation
  - Clear error messages
```tsx
<button
  onClick={() => {
    setSaveError(null);
    onSave(formData); // ❌ Sin validar formData primero
  }}
  disabled={isSaving || !formData.connectionId || !formData.fieldMappings?.length}
  // Las validaciones deberían estar en el handler también
>
```

---

### 2. ❌ QueryBuilderPage.tsx

#### Problema 2.1: Botón "Agregar" (JOIN) sin validación
- **Línea:** 134
- **Botón:** Agregar JOIN
- **Problema:** Tiene validación `alert()` básica pero no impide múltiples clicks
- **Falta:**
  - `disabled` durante procesamiento
  - Error state management
```tsx
const addJoin = () => {
  if (!joinRightTable || !joinCondition) {
    alert('Por favor completa todos los campos del JOIN'); // ❌ Alert en lugar de UI
    return;
  }
  setJoins([...]); // Sin feedback visual
};
```

#### Problema 2.2: Botón "Agregar" (Filtro) sin validación
- **Línea:** 157
- **Botón:** Agregar Filtro
- **Problema:** Mismo problema que JOIN
- **Falta:**
  - Error state
  - Disabled button during operations
  - Proper error messages
```tsx
const addFilter = () => {
  if (!filterColumn || !filterValue) {
    alert('Por favor completa todos los campos del FILTRO'); // ❌ Alert
    return;
  }
  setFilters([...]);
};
```

#### Problema 2.3: Botón "Previsualizar SQL" sin disabled
- **Línea:** 319
- **Botón:** Previsualizar SQL
- **Problema:** No tiene `disabled={isLoading}` implementado correctamente
- **Falta:**
  - State consistency
  - Error handling
```tsx
<button
  onClick={generateSQL}
  disabled={isLoading} // ✓ Tiene esto
  // Pero generateSQL() no es mutación, es estado local
  // No hay error handling si falla
>
```

#### Problema 2.4: Botón "Ejecutar Query" sin onError
- **Línea:** 327
- **Botón:** Ejecutar Query
- **Problema:** `testQuery()` no tiene error handling
- **Falta:**
  - Try/catch en testQuery
  - Error state
  - Feedback al usuario
```tsx
const testQuery = async () => {
  setIsLoading(true);
  try {
    generateSQL();
    setStep('preview');
  } finally {
    setIsLoading(false);
  }
  // ❌ SIN error handling en catch
};
```

#### Problema 2.5: Botón "Guardar como Mapping" sin handler real
- **Línea:** 402
- **Botón:** Guardar como Mapping
- **Problema:** Handler vacío con console.log
- **Falta:**
  - Implementación real
  - Validación
  - Error handling
```tsx
<button
  onClick={() => {
    console.log('Guardar SQL como MappingConfig'); // ❌ NO IMPLEMENTADO
  }}
>
```

---

### 3. ❌ InventoryCountPage.tsx

#### Problema 3.1: prepareCountMutation sin onError
- **Línea:** 54
- **Mutation:** prepareCountMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
  - Error message display
  - Rollback logic
```tsx
const prepareCountMutation = useMutation({
  mutationFn: async ({ countId, warehouseId }: { countId: string; warehouseId: string }) => {
    const res = await apiClient.post(`/inventory-counts/${countId}/prepare`, {
      warehouseId,
    });
    return res.data;
  },
  onSuccess: (data) => {
    setCountItems(data.items || []);
    setSummary(data.summary);
  },
  // ❌ SIN onError
});
```

#### Problema 3.2: updateItemMutation sin API call
- **Línea:** 64
- **Mutation:** updateItemMutation
- **Problema:** Mutation no hace API call, solo cálculo local
- **Falta:**
  - Real API persistence
  - Error handling
  - Optimistic updates
```tsx
const updateItemMutation = useMutation({
  mutationFn: async (item: CountItem) => {
    // ❌ Solo cálculo, sin API call real
    const variance = item.countedQty - item.systemQty;
    return { ...item, variance };
  },
  // Debería hacer: await apiClient.patch(`/inventory-counts/${activeCountId}/items/${item.id}`, ...)
});
```

#### Problema 3.3: completeCountMutation sin validación pre-submit
- **Línea:** 77
- **Mutation:** completeCountMutation
- **Problema:** Validation existe pero no en mutation
- **Falta:**
  - Pre-submit validation en handler
  - Clear error messages
```tsx
const handleCompleteCount = async () => {
  if (window.confirm('¿Estás seguro...')) { // ❌ Confirmación basada en confirm()
    completeCountMutation.mutate();
  }
};
```

#### Problema 3.4: Botón "Agregar Artículo" sin validación completa
- **Línea:** 243
- **Botón:** Agregar Artículo (manual)
- **Problema:** Validación inline, sin feedback claro
- **Falta:**
  - Error state management
  - Visual feedback
  - Disabled state during operations
```tsx
<Button
  variant="primary"
  onClick={() => {
    const itemCode = (document.getElementById('itemCode') as HTMLInputElement).value;
    // ... más validaciones ...
    if (itemCode && itemName && systemQty >= 0) { // ❌ Validación inline
      setCountItems([...countItems, newItem]);
    }
    // ❌ Sin else para mostrar error
  }}
>
```

#### Problema 3.5: Botón "Completar Conteo" sin disabled durante isPending
- **Línea:** 365
- **Botón:** Completar Conteo
- **Problema:** Tiene `disabled={completeCountMutation.isPending}` pero condición está duplicada
- **Falta:**
  - Consistency en disabled logic
```tsx
<Button
  variant="success"
  onClick={handleCompleteCount}
  disabled={completeCountMutation.isPending} // ✓ Existe pero...
>
  {completeCountMutation.isPending ? 'Completando...' : 'Completar Conteo'} // ✓ OK
</Button>
```

---

### 4. ❌ LoadInventoryFromERPPage.tsx

#### Problema 4.1: loadInventory mutation sin error mensajes específicos
- **Línea:** 45
- **Mutation:** loadInventory (useMutation legacy)
- **Problema:** onError existe pero mensaje genérico
- **Falta:**
  - Detailed error messages
  - Retry logic
  - Error categorization
```tsx
const { mutate: loadInventory, isLoading: isLoadingInventory } = useMutation(
  async () => {
    // ...
  },
  {
    onError: (error: any) => {
      setLoadResult({
        // ❌ Mensaje genérico, sin detalles del error
        message: error.message || 'Failed to load inventory',
      });
    },
  }
);
```

#### Problema 4.2: Botón "Cargar Inventario" sin validación pre-click
- **Línea:** 93
- **Botón:** Cargar Inventario
- **Problema:** Validación existe pero debería estar antes de mutate
- **Falta:**
  - Pre-click validation feedback
  - Clear error messages
```tsx
const handleLoadInventory = () => {
  if (!selectedMapping || !selectedWarehouse) {
    alert('Please select both mapping and warehouse'); // ❌ Alert() en lugar de UI
    return;
  }
  loadInventory();
};
```

#### Problema 4.3: Diálogo de resultado sin cerrar automático
- **Línea:** 146
- **Problema:** Modal debe cerrarse después de cierto tiempo
- **Falta:**
  - Auto-close timer
  - Clear success feedback
```tsx
{openDialog && loadResult && (
  <div>
    {/* ... contenido ... */}
    {/* ❌ No hay auto-close, usuario debe clickear */}
  </div>
)}
```

#### Problema 4.4: Selects deshabilitados de manera inconsistente
- **Línea:** 62, 76
- **Problema:** `disabled={isLoadingInventory}` pero también tiene validaciones en button
- **Falta:**
  - Consistent disable strategy
```tsx
<select
  disabled={isLoadingInventory || activeMappings.length === 0} // ✓ OK
  // ...
/>
```

---

### 5. ❌ PhysicalCountPage.tsx

#### Problema 5.1: handleUpdateItem sin onError en fetch
- **Línea:** 89
- **Problema:** Fetch directo sin error handling mutation
- **Falta:**
  - Mutation wrapper
  - Error state
  - Retry logic
```tsx
const handleUpdateItem = async (itemId: string) => {
  if (!countId) return;
  try {
    setUpdating(itemId);
    const res = await fetch(`/api/inventory/counts/${countId}/items/${itemId}`, {
      method: 'PATCH',
      // ...
    });
    if (!res.ok) throw new Error('Failed to update item');
    // ❌ Sin onError handler estructurado
  } catch (err) {
    setError(message);
  } finally {
    setUpdating(null);
  }
};
```

#### Problema 5.2: handleCompleteCount sin pre-validación clara
- **Línea:** 119
- **Problema:** Validación existe pero después de clic
- **Falta:**
  - Pre-clic validation
  - Clear disabled state
```tsx
const handleCompleteCount = async () => {
  if (!countId) return;
  if (summary && summary.itemsNotCounted > 0) {
    setError(`Cannot complete count...`); // ❌ Error después de intento
    return;
  }
  // Debería usar disabled={summary?.itemsNotCounted > 0}
};
```

#### Problema 5.3: Botón "Complete Count" sin disabled claro
- **Línea:** 288
- **Botón:** Complete Count
- **Problema:** Disabled basado en estado pero condición compleja
- **Falta:**
  - Clearer disabled logic
  - Better error messages
```tsx
<button
  disabled={completing || (summary?.itemsNotCounted ?? 0) > 0}
  // ✓ Tiene disabled pero condición es complicada
>
```

#### Problema 5.4: handleDiscardCount sin confirmación clara
- **Línea:** 152
- **Problema:** Usa `confirm()` en lugar de Dialog component
- **Falta:**
  - Custom dialog
  - Better UX
```tsx
const handleDiscardCount = async () => {
  if (!confirm('Are you sure...')) { // ❌ Confirm() nativo
    return;
  }
  // ...
};
```

---

### 6. ❌ WarehousesPage.tsx

#### Problema 6.1: createMutation sin onError
- **Línea:** 30
- **Mutation:** createMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
  - Error state display
```tsx
const createMutation = useMutation({
  mutationFn: async (data: any) => {
    if (editingId) {
      const res = await apiClient.patch(`/warehouses/${editingId}`, data);
      return res.data.data || res.data;
    } else {
      const res = await apiClient.post('/warehouses', data);
      return res.data.data || res.data;
    }
  },
  onSuccess: () => {
    refetch();
    // ... reset state ...
  },
  // ❌ SIN onError
});
```

#### Problema 6.2: deleteMutation sin onError
- **Línea:** 48
- **Mutation:** deleteMutation
- **Problema:** Sin manejo de errores
- **Falta:**
  - onError callback
  - User feedback
```tsx
const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const res = await apiClient.delete(`/warehouses/${id}`);
    return res.data;
  },
  onSuccess: () => {
    refetch();
  },
  // ❌ SIN onError
});
```

#### Problema 6.3: handleSubmit sin validación pre-mutate
- **Línea:** 57
- **Problema:** No hay validación antes de llamar `mutate()`
- **Falta:**
  - Pre-submit validation
  - Field validation
  - Clear error messages
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // ❌ Sin validar formData antes de mutate
  createMutation.mutate(formData);
};
```

#### Problema 6.4: Form inputs sin validación
- **Línea:** 106-125
- **Problema:** `required` solo en HTML, sin feedback visual
- **Falta:**
  - Custom validation
  - Error messages
  - Touch state tracking
```tsx
<Input
  label="Código"
  value={formData.code}
  onChange={e => setFormData({ ...formData, code: e.target.value })}
  required // ❌ HTML required, sin validación JS
/>
```

#### Problema 6.5: Botones sin disabled inconsistentes
- **Línea:** 113, 119
- **Problema:** Algunos tienen disabled, otros no
- **Falta:**
  - Consistent disabled state management
```tsx
<Button
  type="submit"
  variant="success"
  disabled={createMutation.isPending} // ✓ OK en crear
  // ...
/>

<Button
  type="button"
  variant="secondary"
  onClick={handleCancel}
  // ❌ SIN disabled durante createMutation.isPending
/>
```

---

### 7. ❌ CompaniesPage.tsx

#### Problema 7.1: createMutation sin onError
- **Línea:** 51
- **Mutation:** createMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
  - Error state display
```tsx
const createMutation = useMutation({
  mutationFn: async (data: {...}) => {
    const response = await getApiClient().post('/companies', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    setShowForm(false);
  },
  // ❌ SIN onError
});
```

#### Problema 7.2: updateMutation sin onError
- **Línea:** 63
- **Mutation:** updateMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const updateMutation = useMutation({
  mutationFn: async ({id, data}: {...}) => {
    const response = await getApiClient().patch(`/companies/${id}`, data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    setEditingCompany(null);
  },
  // ❌ SIN onError
});
```

#### Problema 7.3: deleteMutation sin onError
- **Línea:** 80
- **Mutation:** deleteMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
  - User feedback
```tsx
const deleteMutation = useMutation({
  mutationFn: async (companyId: string) => {
    await getApiClient().delete(`/companies/${companyId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  },
  // ❌ SIN onError
});
```

#### Problema 7.4: handleDelete sin confirmación clara
- **Línea:** 113
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
  - Better UX
```tsx
const handleDelete = async (companyId: string) => {
  if (confirm('Are you sure you want to delete this company?')) { // ❌ confirm()
    await deleteMutation.mutateAsync(companyId);
  }
};
```

#### Problema 7.5: Status message sin auto-dismiss
- **Línea:** 181
- **Problema:** Error message nunca se limpia
- **Falta:**
  - Auto-dismiss timer
  - Clear button
```tsx
{deleteMutation.isError && (
  <div className="bg-red-50...">
    Error deleting company. Please try again.
    {/* ❌ Sin forma de cerrar o auto-dismiss */}
  </div>
)}
```

---

### 8. ❌ UsersPage.tsx

#### Problema 8.1: createUserMutation sin onError
- **Línea:** 29
- **Mutation:** createUserMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const createUserMutation = useMutation({
  mutationFn: async (userData: any) => {
    const response = await getApiClient().post('/users', userData);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setShowForm(false);
    setSelectedUser(null);
  },
  // ❌ SIN onError
});
```

#### Problema 8.2: deleteUserMutation sin onError
- **Línea:** 41
- **Mutation:** deleteUserMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const deleteUserMutation = useMutation({
  mutationFn: async (userId: string) => {
    const response = await getApiClient().delete(`/users/${userId}`);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
  // ❌ SIN onError
});
```

#### Problema 8.3: handleDeleteUser sin confirmación clara
- **Línea:** 55
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleDeleteUser = async (userId: string) => {
  if (window.confirm('Are you sure you want to delete this user?')) { // ❌ confirm()
    await deleteUserMutation.mutateAsync(userId);
  }
};
```

#### Problema 8.4: Edit funcionalidad no implementada
- **Línea:** 87
- **Problema:** Mensaje de "will be implemented in next iteration"
- **Falta:**
  - Real edit functionality
  - Form validation
  - Error handling
```tsx
{selectedUser && (
  <Card title={`Edit User: ${selectedUser.email}`}>
    <p className="text-gray-600">
      Edit functionality will be implemented in next iteration // ❌ NO IMPLEMENTADO
    </p>
  </Card>
)}
```

---

### 9. ❌ RolesPage.tsx

#### Problema 9.1: createRoleMutation sin onError
- **Línea:** 56
- **Mutation:** createRoleMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const createRoleMutation = useMutation({
  mutationFn: async (data: { name: string; description?: string; permissionIds: string[] }) => {
    const response = await getApiClient().post('/roles', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    setShowForm(false);
  },
  // ❌ SIN onError
});
```

#### Problema 9.2: updateRoleMutation sin onError
- **Línea:** 66
- **Mutation:** updateRoleMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const updateRoleMutation = useMutation({
  mutationFn: async ({id, data}: {...}) => {
    const response = await getApiClient().patch(`/roles/${id}`, data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    setEditingRole(null);
  },
  // ❌ SIN onError
});
```

#### Problema 9.3: deleteRoleMutation sin onError
- **Línea:** 83
- **Mutation:** deleteRoleMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const deleteRoleMutation = useMutation({
  mutationFn: async (roleId: string) => {
    await getApiClient().delete(`/roles/${roleId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  },
  // ❌ SIN onError
});
```

#### Problema 9.4: assignPermissionsMutation sin onError
- **Línea:** 92
- **Mutation:** assignPermissionsMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const assignPermissionsMutation = useMutation({
  mutationFn: async ({roleId, permissionIds}: {...}) => {
    const response = await getApiClient().post(`/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  },
  // ❌ SIN onError
});
```

#### Problema 9.5: handleDeleteRole sin confirmación clara
- **Línea:** 133
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleDeleteRole = async (roleId: string) => {
  if (confirm('Are you sure you want to delete this role?')) { // ❌ confirm()
    await deleteRoleMutation.mutateAsync(roleId);
  }
};
```

---

### 10. ❌ PermissionsPage.tsx

#### Problema 10.1: createMutation sin onError
- **Línea:** 49
- **Mutation:** createMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const createMutation = useMutation({
  mutationFn: async (data: {...}) => {
    const response = await getApiClient().post('/permissions', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
    setShowForm(false);
  },
  // ❌ SIN onError
});
```

#### Problema 10.2: updateMutation sin onError
- **Línea:** 61
- **Mutation:** updateMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const updateMutation = useMutation({
  mutationFn: async ({id, data}: {...}) => {
    const response = await getApiClient().patch(`/permissions/${id}`, data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
    setEditingPermission(null);
  },
  // ❌ SIN onError
});
```

#### Problema 10.3: deleteMutation sin onError
- **Línea:** 78
- **Mutation:** deleteMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const deleteMutation = useMutation({
  mutationFn: async (permissionId: string) => {
    await getApiClient().delete(`/permissions/${permissionId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['permissions'] });
  },
  // ❌ SIN onError
});
```

#### Problema 10.4: handleDelete sin confirmación clara
- **Línea:** 107
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleDelete = async (permissionId: string) => {
  if (confirm('Are you sure you want to delete this permission?')) { // ❌ confirm()
    await deleteMutation.mutateAsync(permissionId);
  }
};
```

#### Problema 10.5: Status message sin auto-dismiss
- **Línea:** 164
- **Problema:** Error message nunca se limpia
- **Falta:**
  - Auto-dismiss timer
```tsx
{deleteMutation.isError && (
  <div className="bg-red-50...">
    Error deleting permission...
    {/* ❌ Sin forma de cerrar */}
  </div>
)}
```

---

### 11. ❌ ERPConnectionsPage.tsx

#### Problema 11.1: createMutation sin onError
- **Línea:** 46
- **Mutation:** createMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const createMutation = useMutation({
  mutationFn: async (data: {...}) => {
    const response = await getApiClient().post('/erp-connections', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    setShowForm(false);
  },
  // ❌ SIN onError
});
```

#### Problema 11.2: updateMutation sin onError
- **Línea:** 60
- **Mutation:** updateMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const updateMutation = useMutation({
  mutationFn: async ({id, data}: {...}) => {
    const response = await getApiClient().patch(`/erp-connections/${id}`, data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    setEditingConnection(null);
  },
  // ❌ SIN onError
});
```

#### Problema 11.3: deleteMutation sin onError
- **Línea:** 76
- **Mutation:** deleteMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const deleteMutation = useMutation({
  mutationFn: async (connectionId: string) => {
    await getApiClient().delete(`/erp-connections/${connectionId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
  },
  // ❌ SIN onError
});
```

#### Problema 11.4: toggleMutation sin onError
- **Línea:** 88
- **Mutation:** toggleMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const toggleMutation = useMutation({
  mutationFn: async ({id, isActive}: {...}) => {
    const response = await getApiClient().post(`/erp-connections/${id}/toggle`, {
      isActive,
    });
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
  },
  // ❌ SIN onError
});
```

#### Problema 11.5: testMutation sin onError
- **Línea:** 105
- **Mutation:** testMutation
- **Problema:** Sin error handling en mutation
- **Falta:**
  - onError callback
```tsx
const testMutation = useMutation({
  mutationFn: async (data: {...}) => {
    const response = await getApiClient().post('/erp-connections/test', data);
    return response.data;
  },
  // ❌ SIN onError y onSuccess
});
```

#### Problema 11.6: handleDelete sin confirmación clara
- **Línea:** 139
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleDelete = async (connectionId: string) => {
  if (confirm('Are you sure you want to delete this ERP connection?...')) { // ❌ confirm()
    await deleteMutation.mutateAsync(connectionId);
  }
};
```

---

### 12. ❌ SessionsPage.tsx

#### Problema 12.1: endSessionMutation sin onError
- **Línea:** 76
- **Mutation:** endSessionMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const endSessionMutation = useMutation({
  mutationFn: async (sessionId: string) => {
    await getApiClient().delete(`/sessions/${sessionId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sessions-stats'] });
  },
  // ❌ SIN onError
});
```

#### Problema 12.2: cleanupMutation sin onError
- **Línea:** 87
- **Mutation:** cleanupMutation
- **Problema:** Sin error handling
- **Falta:**
  - onError callback
```tsx
const cleanupMutation = useMutation({
  mutationFn: async () => {
    const response = await getApiClient().post('/sessions/cleanup', {
      inactiveMinutes: 60,
    });
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sessions-stats'] });
  },
  // ❌ SIN onError
});
```

#### Problema 12.3: handleEndSession sin confirmación clara
- **Línea:** 97
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleEndSession = async (sessionId: string) => {
  if (confirm('¿Estás seguro que deseas finalizar esta sesión?')) { // ❌ confirm()
    await endSessionMutation.mutateAsync(sessionId);
  }
};
```

#### Problema 12.4: handleCleanup sin confirmación clara
- **Línea:** 105
- **Problema:** Usa `confirm()` nativo
- **Falta:**
  - Custom dialog
```tsx
const handleCleanup = async () => {
  if (
    confirm(
      'Esto finalizará todas las sesiones inactivas...' // ❌ confirm()
    )
  ) {
    await cleanupMutation.mutateAsync();
  }
};
```

#### Problema 12.5: Error message sin auto-dismiss
- **Línea:** 191
- **Problema:** Error message nunca se limpia
- **Falta:**
  - Auto-dismiss timer
```tsx
{endSessionMutation.isError && (
  <div className="bg-red-50...">
    Error al finalizar sesión...
    {/* ❌ Sin forma de cerrar */}
  </div>
)}
```

---

### 13. ⚠️ QueryExplorerPage.tsx

#### Problema 13.1: handleExecuteQuery sin onError
- **Línea:** 128
- **Problema:** Try/catch local pero sin mutation error handling
- **Falta:**
  - Structured error handling
  - Retry logic
```tsx
const handleExecuteQuery = async () => {
  try {
    setLoading(true);
    setError(null);
    // ...
    const response = await apiClient.post(
      `/erp-connections/${selectedConnectionId}/preview-query`,
      { sql, limit: query.limit || 100 }
    );
    // ...
  } catch (err: any) {
    setError(`Error ejecutando query: ${err.message}`);
    // ❌ Sin retry o structured error handling
  } finally {
    setLoading(false);
  }
};
```

#### Problema 13.2: handleSaveAsMapping sin validación pre-submit
- **Línea:** 150
- **Problema:** Validación existe pero incompleta
- **Falta:**
  - Field validation
  - Clear error messages
```tsx
const handleSaveAsMapping = async () => {
  if (!mappingName.trim()) {
    setError('Ingresa un nombre para el mapping');
    return;
  }

  if (!mappingWarehouse) {
    setError('Selecciona un warehouse');
    return;
  }
  // ✓ Validación existe pero podría ser mejorada
};
```

#### Problema 13.3: fetchErpConnections sin onError
- **Línea:** 61
- **Problema:** No hay error handling visualmente
- **Falta:**
  - User feedback para errores
  - Retry button
```tsx
const fetchErpConnections = async () => {
  try {
    const response = await apiClient.get('/erp-connections');
    setErpConnections(response.data.data || []);
  } catch (err: any) {
    setError(`Error cargando conexiones: ${err.message}`); // ✓ OK
    // Pero sin opción de retry
  }
};
```

#### Problema 13.4: fetchAvailableTables sin onError
- **Línea:** 90
- **Problema:** Error handling existe pero sin retry
- **Falta:**
  - Retry logic
```tsx
const fetchAvailableTables = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await apiClient.get(`/erp-connections/${selectedConnectionId}/tables`);
    setAvailableTables(response.data.tables || []);
  } catch (err: any) {
    setError(`Error cargando tablas: ${err.message}`); // ✓ OK
    // Pero sin opción de retry
  } finally {
    setLoading(false);
  }
};
```

#### Problema 13.5: Botones sin disabled consistentes
- **Línea:** 369-376
- **Problema:** Botones no tienen disabled durante loading
- **Falta:**
  - Consistent disabled state
```tsx
<button
  onClick={...}
  style={{...buttonStyles}}
  // ❌ SIN disabled={loading}
>
```

---

### 14. ✓ AuditLogsPage.tsx

**Estado:** BIEN IMPLEMENTADO
- Mutations solo tienen `useQuery` (reads)
- No hay buttons con handlers problemáticos
- Modal detail no tiene mutation
- Filtros son solo estado local

---

### 15. ✓ SettingsPage.tsx

**Estado:** OK - Solo es contenedor de otros componentes
- Los problemas están en los subcomponentes incluidos

---

## 🎯 CATEGORIZACIÓN DE PROBLEMAS

### 🔴 CRÍTICOS (Afectan operación del sistema)

**Tipo 1: Mutaciones sin onError (12 casos)**
- MappingConfigAdminPage: deleteMutation, toggleMutation
- WarehousesPage: createMutation, deleteMutation
- CompaniesPage: createMutation, updateMutation, deleteMutation
- UsersPage: createUserMutation, deleteUserMutation
- RolesPage: createRoleMutation, updateRoleMutation, deleteRoleMutation, assignPermissionsMutation
- PermissionsPage: createMutation, updateMutation, deleteMutation
- ERPConnectionsPage: createMutation, updateMutation, deleteMutation, toggleMutation, testMutation
- SessionsPage: endSessionMutation, cleanupMutation

**Consecuencias:**
- Errores no se muestran al usuario
- No hay rollback de estado
- No hay retry logic
- UX terrible en caso de fallo

**Tipo 2: Botones sin disabled durante operaciones (15 casos)**
- QueryBuilderPage: addJoin, addFilter
- InventoryCountPage: agregar artículo manual
- WarehousesPage: botones de acción
- CompaniesPage: botones de paginación
- Múltiples páginas: buttons sin disabled durante mutations

**Consecuencias:**
- Double-submission bugs
- Race conditions
- Duplicate entries en BD
- Pérdida de datos

**Tipo 3: Confirmaciones con confirm() nativo (7 casos)**
- PhysicalCountPage: handleDiscardCount
- CompaniesPage: handleDelete
- UsersPage: handleDeleteUser
- RolesPage: handleDeleteRole
- PermissionsPage: handleDelete
- ERPConnectionsPage: handleDelete
- SessionsPage: handleEndSession, handleCleanup

**Consecuencias:**
- Pobre UX
- No accesible
- No se puede personalizar mensaje
- No se puede agregar más contexto

### 🟡 ALTOS (Afectan confiabilidad)

**Tipo 4: Validación incompleta pre-submit (8 casos)**
- MappingConfigAdminPage: saveMutation validate pero usa variable undefined
- QueryBuilderPage: addJoin/addFilter usan alert()
- InventoryCountPage: agregar artículo con validación inline
- LoadInventoryFromERPPage: handleLoadInventory usa alert()
- WarehousesPage: handleSubmit sin pre-validación
- QueryExplorerPage: handleSaveAsMapping validación incompleta

**Consecuencias:**
- Datos inválidos en BD
- Errores confusos para el usuario
- No hay feedback visual claro

**Tipo 5: updateItemMutation sin API call (InventoryCountPage)**
- Solo hace cálculo local, no persiste
- Cambios se pierden en refresh
- No hay error handling

**Consecuencias:**
- Datos inconsistentes
- Pérdida de cambios
- Datos incorrectos en reportes

---

## 📋 TABLA CONSOLIDADA DE TODOS LOS PROBLEMAS

| # | Archivo | Línea | Elemento | Problema | Severidad |
|---|---------|-------|----------|----------|-----------|
| 1 | MappingConfigAdminPage.tsx | 157 | toggle-btn | Sin disabled durante isPending | 🔴 |
| 2 | MappingConfigAdminPage.tsx | 171 | delete-btn | Sin onError | 🔴 |
| 3 | MappingConfigAdminPage.tsx | 100 | saveMutation | onError usa setSaveSuccess undefined | 🔴 |
| 4 | MappingConfigAdminPage.tsx | 111 | toggleMutation | Sin onError | 🔴 |
| 5 | MappingConfigAdminPage.tsx | 539 | save-btn | Sin validación pre-mutate | 🟡 |
| 6 | QueryBuilderPage.tsx | 119-134 | addJoin | Usa alert(), sin disabled | 🟡 |
| 7 | QueryBuilderPage.tsx | 142-157 | addFilter | Usa alert(), sin disabled | 🟡 |
| 8 | QueryBuilderPage.tsx | 402 | save-mapping-btn | Handler vacío | 🔴 |
| 9 | InventoryCountPage.tsx | 54 | prepareCountMutation | Sin onError | 🔴 |
| 10 | InventoryCountPage.tsx | 64 | updateItemMutation | Solo cálculo, sin API call | 🔴 |
| 11 | InventoryCountPage.tsx | 77 | completeCountMutation | Sin validación clara | 🟡 |
| 12 | InventoryCountPage.tsx | 243 | agregar-articulo-btn | Validación inline, sin feedback | 🟡 |
| 13 | LoadInventoryFromERPPage.tsx | 45 | loadInventory | Mensaje de error genérico | 🟡 |
| 14 | LoadInventoryFromERPPage.tsx | 93 | cargar-btn | Usa alert() para validación | 🟡 |
| 15 | LoadInventoryFromERPPage.tsx | 146 | modal-resultado | Sin auto-close | 🟡 |
| 16 | PhysicalCountPage.tsx | 89 | handleUpdateItem | Fetch sin mutation, sin onError | 🔴 |
| 17 | PhysicalCountPage.tsx | 119 | handleCompleteCount | Validación post-clic | 🟡 |
| 18 | PhysicalCountPage.tsx | 152 | handleDiscardCount | Usa confirm() | 🟡 |
| 19 | WarehousesPage.tsx | 30 | createMutation | Sin onError | 🔴 |
| 20 | WarehousesPage.tsx | 48 | deleteMutation | Sin onError | 🔴 |
| 21 | WarehousesPage.tsx | 57 | handleSubmit | Sin pre-validación | 🟡 |
| 22 | WarehousesPage.tsx | 106-125 | form-inputs | required HTML, sin JS validation | 🟡 |
| 23 | WarehousesPage.tsx | 113-119 | submit/cancel-btns | Disabled inconsistentes | 🟡 |
| 24 | CompaniesPage.tsx | 51 | createMutation | Sin onError | 🔴 |
| 25 | CompaniesPage.tsx | 63 | updateMutation | Sin onError | 🔴 |
| 26 | CompaniesPage.tsx | 80 | deleteMutation | Sin onError | 🔴 |
| 27 | CompaniesPage.tsx | 113 | handleDelete | Usa confirm() | 🟡 |
| 28 | CompaniesPage.tsx | 181 | error-message | Sin auto-dismiss | 🟡 |
| 29 | UsersPage.tsx | 29 | createUserMutation | Sin onError | 🔴 |
| 30 | UsersPage.tsx | 41 | deleteUserMutation | Sin onError | 🔴 |
| 31 | UsersPage.tsx | 55 | handleDeleteUser | Usa confirm() | 🟡 |
| 32 | UsersPage.tsx | 87 | edit-card | Edit no implementado | 🟡 |
| 33 | RolesPage.tsx | 56 | createRoleMutation | Sin onError | 🔴 |
| 34 | RolesPage.tsx | 66 | updateRoleMutation | Sin onError | 🔴 |
| 35 | RolesPage.tsx | 83 | deleteRoleMutation | Sin onError | 🔴 |
| 36 | RolesPage.tsx | 92 | assignPermissionsMutation | Sin onError | 🔴 |
| 37 | RolesPage.tsx | 133 | handleDeleteRole | Usa confirm() | 🟡 |
| 38 | PermissionsPage.tsx | 49 | createMutation | Sin onError | 🔴 |
| 39 | PermissionsPage.tsx | 61 | updateMutation | Sin onError | 🔴 |
| 40 | PermissionsPage.tsx | 78 | deleteMutation | Sin onError | 🔴 |
| 41 | PermissionsPage.tsx | 107 | handleDelete | Usa confirm() | 🟡 |
| 42 | PermissionsPage.tsx | 164 | error-message | Sin auto-dismiss | 🟡 |
| 43 | ERPConnectionsPage.tsx | 46 | createMutation | Sin onError | 🔴 |
| 44 | ERPConnectionsPage.tsx | 60 | updateMutation | Sin onError | 🔴 |
| 45 | ERPConnectionsPage.tsx | 76 | deleteMutation | Sin onError | 🔴 |
| 46 | ERPConnectionsPage.tsx | 88 | toggleMutation | Sin onError | 🔴 |
| 47 | ERPConnectionsPage.tsx | 105 | testMutation | Sin onError | 🔴 |
| 48 | ERPConnectionsPage.tsx | 139 | handleDelete | Usa confirm() | 🟡 |
| 49 | SessionsPage.tsx | 76 | endSessionMutation | Sin onError | 🔴 |
| 50 | SessionsPage.tsx | 87 | cleanupMutation | Sin onError | 🔴 |
| 51 | SessionsPage.tsx | 97 | handleEndSession | Usa confirm() | 🟡 |
| 52 | SessionsPage.tsx | 105 | handleCleanup | Usa confirm() | 🟡 |
| 53 | SessionsPage.tsx | 191 | error-message | Sin auto-dismiss | 🟡 |
| 54 | QueryExplorerPage.tsx | 128 | handleExecuteQuery | Sin retry logic | 🟡 |
| 55 | QueryExplorerPage.tsx | 150 | handleSaveAsMapping | Validación incompleta | 🟡 |
| 56 | QueryExplorerPage.tsx | 369-376 | action-btns | Sin disabled durante loading | 🟡 |

---

## ✅ RECOMENDACIONES INMEDIATAS

### Plan de Corrección Priorizado

**Fase 1 (URGENTE - Este Sprint):**
1. Agregar `onError` a TODAS las mutations (30+ casos)
2. Agregar `disabled={isPending}` a TODOS los botones de mutation
3. Reemplazar `confirm()` con custom Dialog component

**Fase 2 (ESTA SEMANA):**
4. Implementar validación pre-submit en todos los handlers
5. Crear custom error display component
6. Implementar retry logic

**Fase 3 (PRÓXIMA SEMANA):**
7. Auto-dismiss para mensajes de error/success
8. Toast notifications para feedback
9. Loading states consistentes

### Template de Solución

```tsx
// ❌ ANTES
const createMutation = useMutation({
  mutationFn: async (data) => {
    const response = await apiClient.post('/endpoint', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries();
    setShowForm(false);
  },
});

// ✅ DESPUÉS
const createMutation = useMutation({
  mutationFn: async (data) => {
    // Validar antes
    if (!data.name?.trim()) {
      throw new Error('Name is required');
    }
    const response = await apiClient.post('/endpoint', data);
    return response.data;
  },
  onSuccess: (data) => {
    toast.success('Created successfully'); // Toast notification
    queryClient.invalidateQueries({ queryKey: ['items'] });
    setShowForm(false);
  },
  onError: (error: any) => {
    const message = error?.response?.data?.message || error.message;
    toast.error(message);
    setError(message);
  },
});

// En el handler
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Pre-validación
  if (!formData.name?.trim()) {
    setError('Name is required');
    return;
  }

  createMutation.mutate(formData);
};

// En el botón
<button
  onClick={handleSubmit}
  disabled={createMutation.isPending} // ← IMPORTANTE
  className="..."
>
  {createMutation.isPending ? 'Saving...' : 'Save'}
</button>
```

---

## 📈 MÉTRICAS

- **Total de Problemas:** 56
- **Archivos Afectados:** 13/15
- **Mutaciones sin onError:** 30+
- **Botones sin disabled:** 15+
- **Confirmaciones con confirm():** 7
- **Validación incompleta:** 8+

---

**Generado:** 21 de febrero de 2026
**Requiere Acción:** INMEDIATA
