# ✅ CHECKLIST PRÁCTICO DE IMPLEMENTACIÓN

**Auditoría de Botones y Mutaciones**
**Fecha:** 21 de febrero de 2026

---

## 🎯 Fase 1: CRÍTICO (Hoy - 2-3 horas)

### A. MappingConfigAdminPage.tsx

- [ ] **Línea 100:** Fijar variable undefined
  ```
  Cambio: Remover setSaveSuccess(false) o crear el estado
  Archivos: MappingConfigAdminPage.tsx
  ```

- [ ] **Línea 111:** Agregar onError a toggleMutation
  ```
  Patrón: Error handling básico
  Archivo: Búscar en BUTTON_MUTATIONS_CORRECTION_GUIDE.md
  ```

- [ ] **Línea 157:** Agregar disabled a botón toggle
  ```
  Cambio: disabled={toggleMutation.isPending}
  Tiempo: 2 minutos
  ```

- [ ] **Línea 171:** Agregar onError a deleteMutation
  ```
  Patrón: Error handling básico
  Tiempo: 5 minutos
  ```

### B. TODOS los archivos: Agregar disabled a botones

- [ ] WarehousesPage.tsx
  - [ ] Botón crear (línea ~80)
  - [ ] Botón editar (línea ~130)
  - [ ] Botón eliminar (línea ~135)

- [ ] CompaniesPage.tsx
  - [ ] Botón crear (línea ~90)
  - [ ] Botón editar (línea ~155)
  - [ ] Botón eliminar (línea ~160)

- [ ] UsersPage.tsx
  - [ ] Botón crear (línea ~65)
  - [ ] Botón eliminar (línea ~75)

- [ ] RolesPage.tsx
  - [ ] Botón crear (línea ~90)
  - [ ] Botón editar (línea ~155)
  - [ ] Botón eliminar (línea ~160)

- [ ] PermissionsPage.tsx
  - [ ] Botón crear (línea ~90)
  - [ ] Botón editar (línea ~155)
  - [ ] Botón eliminar (línea ~160)

- [ ] ERPConnectionsPage.tsx
  - [ ] Botón crear (línea ~90)
  - [ ] Botón editar (línea ~155)
  - [ ] Botón eliminar (línea ~160)

- [ ] SessionsPage.tsx
  - [ ] Botón end session (línea ~110)
  - [ ] Botón cleanup (línea ~120)

### C. TODAS las mutations: Agregar onError básico

**Template:**
```tsx
onError: (error: any) => {
  const message = error?.response?.data?.message || error.message || 'Operation failed';
  setError(message);
  toast.error(message);
}
```

**Archivos:**
- [ ] MappingConfigAdminPage.tsx (2 mutations)
- [ ] WarehousesPage.tsx (2 mutations)
- [ ] CompaniesPage.tsx (3 mutations)
- [ ] UsersPage.tsx (2 mutations)
- [ ] RolesPage.tsx (4 mutations)
- [ ] PermissionsPage.tsx (3 mutations)
- [ ] ERPConnectionsPage.tsx (5 mutations)
- [ ] SessionsPage.tsx (2 mutations)
- [ ] InventoryCountPage.tsx (3 mutations)
- [ ] LoadInventoryFromERPPage.tsx (1 mutation)

**Total mutations:** 30+
**Tiempo estimado:** 2 horas (5 minutos cada una)

---

## 📋 Fase 2: VALIDACIÓN (Esta semana - 2-3 horas)

### A. Reemplazar confirm() con Dialog (7 casos)

- [ ] **PhysicalCountPage.tsx** (línea 152)
  - [ ] Crear estado `[confirmDelete, setConfirmDelete]`
  - [ ] Crear DialogContent
  - [ ] Reemplazar confirm() con Dialog
  - [ ] Testing

- [ ] **CompaniesPage.tsx** (línea 113)
  - [ ] Mismos pasos que arriba

- [ ] **UsersPage.tsx** (línea 55)
  - [ ] Mismos pasos que arriba

- [ ] **RolesPage.tsx** (línea 133)
  - [ ] Mismos pasos que arriba

- [ ] **PermissionsPage.tsx** (línea 107)
  - [ ] Mismos pasos que arriba

- [ ] **ERPConnectionsPage.tsx** (línea 139)
  - [ ] Mismos pasos que arriba

- [ ] **SessionsPage.tsx** (líneas 97, 105)
  - [ ] Crear Dialog para endSession
  - [ ] Crear Dialog para cleanup
  - [ ] Testing

**Patrón:** Ver BUTTON_MUTATIONS_CORRECTION_GUIDE.md

### B. InventoryCountPage.tsx: Fijar updateItemMutation

- [ ] **Línea 64:** Convertir updateItemMutation a API call real
  ```
  Patrón: Mutation con API call real
  Tiempo: 15 minutos
  Archivo: BUTTON_MUTATIONS_CORRECTION_GUIDE.md
  ```

### C. Agregar validación pre-submit

- [ ] **WarehousesPage.tsx** (línea 57: handleSubmit)
  - [ ] Validar formData.code
  - [ ] Validar formData.name
  - [ ] Mostrar error visual
  - [ ] Testing

- [ ] **QueryBuilderPage.tsx** (línea 119: addJoin)
  - [ ] Remover alert()
  - [ ] Crear estado formErrors
  - [ ] Mostrar error en UI
  - [ ] Testing

- [ ] **QueryBuilderPage.tsx** (línea 142: addFilter)
  - [ ] Mismos pasos que arriba

- [ ] **LoadInventoryFromERPPage.tsx** (línea 93: handleLoadInventory)
  - [ ] Remover alert()
  - [ ] Mostrar error en UI
  - [ ] Testing

---

## 🔧 Fase 3: PULIDO (Próxima semana - 1-2 horas)

### A. Auto-dismiss para mensajes de error

- [ ] **CompaniesPage.tsx** (línea 181)
  - [ ] Agregar useEffect con setTimeout
  - [ ] Auto-dismiss después de 5 segundos

- [ ] **PermissionsPage.tsx** (línea 164)
  - [ ] Mismos pasos que arriba

- [ ] **SessionsPage.tsx** (línea 191)
  - [ ] Mismos pasos que arriba

### B. LoadInventoryFromERPPage.tsx

- [ ] **Línea 146:** Modal sin auto-close
  - [ ] Agregar useEffect con timeout (2-3 segundos)
  - [ ] O agregar botón "Cerrar"
  - [ ] Testing

### C. QueryExplorerPage.tsx

- [ ] **Línea 369-376:** Agregar disabled a botones
  - [ ] disabled={loading}
  - [ ] Testing

- [ ] **Línea 128:** Agregar retry button
  - [ ] Si error, mostrar "Reintentar"
  - [ ] Testing

### D. PhysicalCountPage.tsx

- [ ] **Línea 288:** Simplificar disabled logic
  - [ ] Crear variable helper `const canComplete = ...`
  - [ ] Usar en disabled
  - [ ] Testing

---

## 🧪 Testing (Continuo)

### Para Cada Cambio:

- [ ] **Prueba 1: Load**
  - [ ] La página carga sin errores
  - [ ] No hay console errors
  - [ ] Los estados iniciales son correctos

- [ ] **Prueba 2: Validación Pre-Submit**
  - [ ] Campos vacíos → muestran error
  - [ ] Botón está disabled si hay error
  - [ ] Usuario no puede hacer submit

- [ ] **Prueba 3: Operación Exitosa**
  - [ ] Click botón → estado pending
  - [ ] Botón muestra "Procesando..."
  - [ ] Botón está disabled
  - [ ] API call se hace
  - [ ] Toast de éxito aparece
  - [ ] Estado se actualiza
  - [ ] Página se recarga si es necesario

- [ ] **Prueba 4: Error Handling**
  - [ ] Simular error de API
  - [ ] Mensaje de error aparece en UI
  - [ ] Toast de error aparece
  - [ ] El usuario puede reintentar
  - [ ] Botón se re-activa

- [ ] **Prueba 5: Double-Click Prevention**
  - [ ] Double-click botón → solo 1 request
  - [ ] No hay duplicados en BD

- [ ] **Prueba 6: Confirmación (si aplica)**
  - [ ] Click delete → Dialog aparece
  - [ ] Cancel → se cierra sin hacer nada
  - [ ] Confirm → procede con delete

---

## 📊 Checklist de Revisión de Código

Para cada archivo modificado:

- [ ] **onError handlers**
  - [ ] Existe onError en TODAS las mutations
  - [ ] Mensaje es específico (no genérico)
  - [ ] Se limpia estado después
  - [ ] Se muestra al usuario

- [ ] **Disabled states**
  - [ ] disabled={mutation.isPending} en botones
  - [ ] Opacidad/color visual indica disabled
  - [ ] Texto cambia durante operación
  - [ ] Consistente en toda la app

- [ ] **Validación pre-submit**
  - [ ] Valida ANTES de mutate()
  - [ ] Mensajes de error claros
  - [ ] Se muestra en UI state
  - [ ] No usa alert()

- [ ] **Confirmaciones**
  - [ ] Operaciones destructivas tienen confirmación
  - [ ] Usa Dialog component (no confirm())
  - [ ] Muestra contexto relevante
  - [ ] Botones son claros (Cancel/Delete)

- [ ] **Estados consistentes**
  - [ ] No hay race conditions
  - [ ] Estados se resetean
  - [ ] Manejo de errores consistente
  - [ ] Sin variables "zombie"

---

## 🔍 Verificación Final

Antes de marcar algo como "Hecho":

- [ ] **Código compilado sin errores**
  ```bash
  npm run build
  ```

- [ ] **Linting pasa**
  ```bash
  npm run lint
  ```

- [ ] **Tests pasan**
  ```bash
  npm run test
  ```

- [ ] **Prueba manual exitosa**
  - [ ] Happy path funciona
  - [ ] Error path muestra mensaje
  - [ ] Confirmación funciona
  - [ ] No hay console errors

- [ ] **Code review aprobado**
  - [ ] Sigue los patrones de la guía
  - [ ] Coherente con resto del código
  - [ ] Sin "code smells"

---

## 📈 Progreso Tracking

### Fase 1: CRÍTICO
```
- MappingConfigAdminPage: 5/5 ✓
- Agregar disabled: 0/25
- Agregar onError: 0/30+

Progreso: 5/60+ (8%)
```

### Fase 2: VALIDACIÓN
```
- Reemplazar confirm(): 0/7
- InventoryCountPage mutation: 0/1
- Agregar validación pre-submit: 0/4

Progreso: 0/12 (0%)
```

### Fase 3: PULIDO
```
- Auto-dismiss: 0/3
- Modal auto-close: 0/1
- Agregar disabled queryexplorer: 0/1
- Retry buttons: 0/1
- Simplificar logic: 0/1

Progreso: 0/6 (0%)
```

---

## 💾 Commits Sugeridos

### Commit 1: Critical Fixes
```
git commit -m "fix: critical mutation and button issues

- Fix undefined setSaveSuccess variable (MappingConfigAdminPage)
- Add disabled states to all mutation buttons
- Add onError handlers to critical mutations

Fixes: [list of issues]"
```

### Commit 2: Validation
```
git commit -m "refactor: improve form validation and confirmations

- Replace native confirm() with Dialog component
- Add pre-submit validation
- Fix updateItemMutation to use real API call

Fixes: [list of issues]"
```

### Commit 3: Polish
```
git commit -m "feat: improve error handling UX

- Add auto-dismiss for error messages
- Add retry buttons
- Simplify disabled state logic

Fixes: [list of issues]"
```

---

## 📞 Recursos

- **Guía de soluciones:** BUTTON_MUTATIONS_CORRECTION_GUIDE.md
- **Referencia rápida:** BUTTON_MUTATIONS_QUICK_REFERENCE.md
- **Detalles técnicos:** BUTTON_MUTATIONS_AUDIT_REPORT.md

---

## 🎓 Notas Importantes

1. **No cambies todo a la vez** - Sigue las fases
2. **Haz commits pequeños** - Facilita reviews
3. **Prueba cada cambio** - No es difícil de romper
4. **Sigue los patrones** - Usa la guía de soluciones
5. **Pide feedback** - Code review es importante

---

## ✅ Marca Como Completado

Cuando termines una sección:
```
- [x] Sección completada
  - [x] Sub-tarea 1
  - [x] Sub-tarea 2
  - [x] Sub-tarea 3
```

---

Generado: 21 de febrero de 2026
Estado: ✅ Listo para implementar
