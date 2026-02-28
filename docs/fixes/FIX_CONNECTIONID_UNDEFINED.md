# 🔧 FIX: ConnectionId Undefined Error

**Fecha**: 22 Feb 2026
**Error**: `GET /api/erp-connections/undefined/available-tables` (404)
**Causa**: `connectionId` estaba undefined cuando SimpleMappingBuilder intentaba cargar tablas
**Status**: ✅ ARREGLADO

---

## 🐛 PROBLEMA IDENTIFICADO

Cuando abrías "Nuevo Mapping", SimpleMappingBuilder intentaba hacer:
```
GET /api/erp-connections/undefined/available-tables
```

### Root Cause:
En `MappingConfigAdminPage.handleNew()`:
```typescript
const firstConnection = connections?.[0]?.id || '';  // ❌ PROBLEMA
setSelectedConfig({
  connectionId: firstConnection,  // Si connections no está cargado, es ''
  ...
});
```

Cuando `connections` aún no había cargado o estaba vacío, `firstConnection` era string vacío `''`.

---

## ✅ SOLUCIÓN APLICADA

### 1. **Validación en handleNew()**
```typescript
const handleNew = () => {
  // ✅ NUEVO: Validar que connections exista
  if (!connections || connections.length === 0) {
    setSaveError('No hay conexiones ERP disponibles. Por favor, crea una primero.');
    return;
  }

  // ✅ NUEVO: Usar directamente, no conditional
  const firstConnection = connections[0].id;

  setSelectedConfig({
    connectionId: firstConnection,  // ✅ Siempre válido ahora
    datasetType: 'ITEMS',
    mainTable: '',
    joins: [],
    filters: [],
    selectedColumns: [],
    fieldMappings: [],
  });
  setStep('create');
};
```

### 2. **Validación en MappingEditor**
```typescript
{/* Validación: ConnectionId debe estar presente */}
{!config.connectionId ? (
  <div className="p-4 bg-red-50 border border-red-300 rounded">
    <p className="text-red-700">
      ❌ <strong>Error:</strong> Conexión no válida. Por favor, vuelve a intentar.
    </p>
    <button onClick={onCancel} className="...">
      Volver
    </button>
  </div>
) : (
  // ✅ SimpleMappingBuilder se renderiza solo si connectionId es válido
  <SimpleMappingBuilder
    connectionId={config.connectionId}
    datasetType={config.datasetType}
    initialConfig={config}
    onSave={...}
  />
)}
```

---

## 🎯 CAMBIOS

### Archivo: `src/pages/MappingConfigAdminPage.tsx`

#### Función `handleNew()` (Líneas 99-114):
- ❌ Removido: `connections?.[0]?.id || ''` (permitía string vacío)
- ✅ Agregado: Validación if para connections
- ✅ Agregado: Error message si no hay conexiones
- ✅ Agregado: Early return si no hay conexiones

#### Componente `MappingEditor` (Líneas 242-275):
- ✅ Agregado: Condicional para validar connectionId
- ✅ Agregado: Error display si connectionId es inválido
- ✅ Agregado: Envolvimiento de SimpleMappingBuilder en condicional

---

## ✅ VALIDACIÓN

```
TypeScript Errors:     0 ✅
Imports:              Correctos ✅
Tipos:                Correctos ✅
Compilación:          EXITOSA ✅
```

---

## 🧪 CÓMO PROBAR EL FIX

### Escenario 1: Conexión válida
1. Settings → Mappings
2. Clic "+ Nuevo Mapping"
3. ✅ SimpleMappingBuilder debería cargar las tablas correctamente
4. API call: `GET /api/erp-connections/{connectionId}/available-tables` (200 OK)

### Escenario 2: Sin conexiones (solo si lo tienes así)
1. Settings → Mappings
2. Clic "+ Nuevo Mapping"
3. ✅ Debería mostrar error: "No hay conexiones ERP disponibles"
4. No hay API call (se previene en frontend)

### Escenario 3: ConnectionId inválido (edge case)
1. Si de alguna forma `connectionId` llega a ser vacío
2. ✅ MappingEditor muestra error rojo
3. ✅ SimpleMappingBuilder NO se renderiza

---

## 🔍 VERIFICACIÓN ADICIONAL

Si necesitas estar 100% seguro, verifica:

### En Browser Console (F12 → Network tab):
- Cuando abras "+ Nuevo Mapping", debería ver:
  ```
  GET /api/erp-connections/{ID_VALIDO}/available-tables → 200 OK ✅
  ```

- NO debería ver:
  ```
  GET /api/erp-connections/undefined/available-tables → 404 ❌
  GET /api/erp-connections//available-tables → 404 ❌
  ```

### En Browser Console (F12 → Console tab):
- Debería estar limpia (sin errores)
- Si ves error de connectionId undefined → algo más está mal

---

## 📝 RESUMEN

**Problema**: ConnectionId undefined → API 404
**Causa**: Falta validación en handleNew()
**Solución**:
1. Validar connections antes de usar
2. Validar connectionId antes de renderizar SimpleMappingBuilder
3. Mostrar errores claros al usuario

**Resultado**: ✅ ConnectionId siempre válido cuando SimpleMappingBuilder intenta usarlo

---

## 🚀 PRÓXIMO PASO

Abre navegador y prueba:
1. Settings → Mappings
2. "+ Nuevo Mapping"
3. Debería cargar tablas sin error 404 ✅

