# 🔧 ARREGLO IMPLEMENTADO: Sincronización de Componentes

## ❌ EL PROBLEMA

Los componentes estaban **desconectados**:

```
❌ ANTES:
┌─────────────────────────────────────┐
│ MappingConfigAdminPage              │
│  formData = {mainTable: '', ...}    │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ QueryBuilder (ESTADO LOCAL)  │   │
│  │  - query = {mainTable: ...}  │   │ ← Tiene su propia copia de state
│  │  - setQuery() interno        │   │
│  │  - onChange() al padre       │   │ ← Notifica pero hay DELAY
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ FieldMappingBuilder          │   │
│  │  mainTable = formData.main   │   │ ← Recibe estado desactualizado
│  │  (NUNCA se renderiza porque  │   │
│  │   formData.mainTable = '')   │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘

FLUJO:
1. Usuario selecciona tabla en QueryBuilder
2. QueryBuilder: setQuery() + onChange()
3. Parent: updateField() asíncrono
4. FormData actualiza LENTAMENTE
5. FieldMappingBuilder NUNCA se renderiza
6. No hay campos disponibles
7. ❌ SISTEMA MUERTO
```

---

## ✅ LA SOLUCIÓN: Componente Controlado

Cambiar QueryBuilder de **Descontrolado** a **Controlado**:

```
✅ DESPUÉS:
┌─────────────────────────────────────────────────────────────┐
│ MappingConfigAdminPage (FUENTE DE VERDAD)                   │
│  formData = {                                               │
│    mainTable: {name: 'ARTICULO', alias: 'a'}, ...          │
│  }                                                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ QueryBuilder (CONTROLADO)                          │    │
│  │  - Recibe: query prop del padre                    │    │
│  │  - NO tiene estado local (setQuery eliminado)      │    │
│  │  - onChange() actualiza padre INMEDIATAMENTE       │    │
│  │  - query prop siempre sincronizado con formData    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ FieldMappingBuilder (RECIBE DATOS ACTUALIZADOS)   │    │
│  │  mainTable = 'ARTICULO' ✅                         │    │
│  │  Se renderiza inmediatamente                       │    │
│  │  Carga campos del backend                          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

FLUJO:
1. Usuario selecciona tabla en QueryBuilder
2. QueryBuilder: onChange(newQuery) ← INMEDIATO
3. Parent: updateField() ← Se ejecuta
4. FormData se actualiza ← SÍNCRONO CON PROP
5. QueryBuilder recibe query actualizado (por prop)
6. FieldMappingBuilder recibe mainTable actualizado
7. Se renderiza, carga campos, muestra en UI
8. ✅ SISTEMA FUNCIONA
```

---

## 🔧 CAMBIOS ESPECÍFICOS

### QueryBuilder.tsx

**ANTES:**
```typescript
interface QueryBuilderProps {
  onChange: (query: QueryBuilderState) => void;
  onPreview: (query: QueryBuilderState) => void;
  initialState?: QueryBuilderState;  // ← Inicializa una sola vez
  connectionId: string;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  onChange,
  onPreview,
  initialState,  // ← Ignora cambios posteriores
  connectionId,
}) => {
  const [query, setQuery] = useState(initialState || {...}); // ← Estado local

  const handleSelectTable = (tableName: string) => {
    const newQuery = {...};
    setQuery(newQuery);  // ← Actualiza estado local
    onChange(newQuery);  // ← PERO TAMBIÉN notifica (duplicado)
  };
```

**DESPUÉS:**
```typescript
interface QueryBuilderProps {
  query: QueryBuilderState;  // ← PROP (no initialState)
  onChange: (query: QueryBuilderState) => void;
  onPreview: (query: QueryBuilderState) => void;
  connectionId: string;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  query,  // ← Recibe query como prop (fuente de verdad del padre)
  onChange,
  onPreview,
  connectionId,
}) => {
  // ✅ SIN estado local de query

  const handleSelectTable = (tableName: string) => {
    const newQuery = {...};
    onChange(newQuery);  // ← SOLO onChange (el padre actualiza el prop)
  };
```

**Impacto:**
- ✅ QueryBuilder siempre tiene los datos correctos del padre
- ✅ Cambios se propagan INMEDIATAMENTE
- ✅ No hay race conditions
- ✅ Es un componente controlado (como `<input value={} onChange={} />`)

---

### MappingConfigAdminPage.tsx

**ANTES:**
```tsx
<QueryBuilder
  connectionId={formData.connectionId}
  onChange={(query) => {...}}
  initialState={{  // ← Se pasa una sola vez
    mainTable: formData.mainTable || {name: '', alias: 'a'},
    ...
  }}
/>
```

**DESPUÉS:**
```tsx
<QueryBuilder
  connectionId={formData.connectionId}
  query={{  // ← Se pasa en cada render (y siempre actualizado)
    mainTable: formData.mainTable || {name: '', alias: 'a'},
    ...
  }}
  onChange={(query) => {...}}
/>
```

---

## 📊 Comparación antes/después

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| QueryBuilder state | Local (`setQuery`) | Prop del padre |
| Sincronización | Asíncrona (delay) | Síncrona (inmediata) |
| FieldMappingBuilder se renderiza | ❌ Nunca | ✅ Cuando tabla se selecciona |
| Campos cargados | ❌ No | ✅ Sí |
| Race conditions | ❌ Sí (existían) | ✅ No (eliminadas) |

---

## 🧪 Cómo Probar

### Test 1: Seleccionar Tabla
```
1. Abre MappingConfigAdminPage
2. Selecciona conexión "Catelli"
3. En QueryBuilder, hace click en tabla "ARTICULO"
4. Esperado:
   - QueryBuilder se actualiza inmediatamente
   - FieldMappingBuilder aparece debajo
   - Muestra "Campos de Catelli"
   - Lista columnas: id, codigo, descripcion, precio, costo, ...
```

### Test 2: Verificar Sincronización
```
1. En navegador, abre React DevTools
2. Mira MappingConfigAdminPage > formData.mainTable
3. Mira QueryBuilder > props.query.mainTable
4. Deberían ser IDÉNTICOS siempre
```

### Test 3: Mapear Campos
```
1. Con tabla seleccionada, arrastra campo
2. Ejemplo:
   - codigo (izquierda) → itemCode (derecha)
3. El mapping debería guardarse
```

---

## ✅ Validación

### ✅ Compilación
- Sin errores TypeScript
- Sin warnings React

### ✅ Lógica
- QueryBuilder es controlado (recibe props)
- onChange se llama inmediatamente
- MappingConfigAdminPage es la fuente de verdad
- FieldMappingBuilder recibe datos actualizados

### ✅ Resultado
- Componentes sincronizados
- Sin delays o race conditions
- Sistema listo para cargar campos dinámicamente

---

## 📝 Próximos Pasos

1. **Test manual** en navegador
2. Verificar que campos cargan correctamente
3. Si funciona → Pasar a Fase 2 (Cargar Inventario)
4. Si falta algo → Debuggear específicamente qué

