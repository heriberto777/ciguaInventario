# ✅ CAMBIOS FRONTEND - ELIMINACIÓN DE HARDCODING

## 📋 Resumen

Se han actualizado los componentes frontend para **ELIMINAR TODO DATOS HARDCODEADOS** y obtener dinámicamente la estructura del ERP Catelli en tiempo real.

**Fecha:** 21 de febrero de 2026
**Status:** ✅ COMPLETADO Y COMPILADO SIN ERRORES

---

## 🔄 Cambios Realizados

### 1. **QueryBuilder.tsx** - Constructor de Queries Dinámico

#### ❌ Antes (Hardcodeado)
```typescript
const CATELLI_TABLES = [
  { name: 'articulo', label: 'Artículos', icon: '📦' },
  { name: 'existencia_bodega', label: 'Existencias por Bodega', icon: '🏭' },
  // ... tablas fijas en código
];

const TABLE_COLUMNS: Record<string, string[]> = {
  articulo: ['id', 'codigo', 'descripcion', 'nombre', ...],
  existencia_bodega: ['id', 'articulo_id', 'bodega_id', ...],
  // ... columnas fijas en código
};
```

#### ✅ Ahora (Dinámico)
```typescript
interface QueryBuilderProps {
  onChange: (query: QueryBuilderState) => void;
  onPreview: (query: QueryBuilderState) => void;
  initialState?: QueryBuilderState;
  connectionId: string; // ← REQUERIDO para obtener datos del ERP
}

useEffect(() => {
  if (connectionId) {
    fetchAvailableTables(); // ← Obtiene tablas EN TIEMPO REAL del ERP
  }
}, [connectionId]);

const fetchAvailableTables = async () => {
  const response = await apiClient.get(
    `/erp-connections/${connectionId}/tables`
  );
  setAvailableTables(response.data.tables || []);
};

const fetchTableSchemas = async (tableNames: string[]) => {
  const response = await apiClient.post(
    `/erp-connections/${connectionId}/table-schemas`,
    { tableNames }
  );
  // Obtiene columnas REALES de cada tabla
  const schemas: Record<string, ERPColumn[]> = {};
  response.data.schemas.forEach(schema => {
    schemas[schema.name] = schema.columns;
  });
  setTableSchemas(schemas);
};
```

#### 🎯 Beneficios
- ✅ **Flexible:** Adapta automáticamente si Catelli cambia su estructura
- ✅ **Multi-instancia:** Funciona con diferentes instalaciones de Catelli
- ✅ **Actualizado:** Siempre muestra columnas reales disponibles
- ✅ **Información de tipo:** Obtiene tipos de datos SQL (varchar, int, decimal, etc.)

---

### 2. **FieldMappingBuilder.tsx** - Mapeador de Campos Dinámico

#### ❌ Antes (Hardcodeado/Mock)
```typescript
const mockFields: AvailableField[] = [];

if (mainTable.toLowerCase().includes('articulo')) {
  mockFields.push(
    { name: 'codigo', table: mainTable, type: 'varchar' },
    { name: 'descripcion', table: mainTable, type: 'varchar' },
    // ... más campos hardcodeados
  );
}

if (mainTable.toLowerCase().includes('existencia')) {
  mockFields.push(
    { name: 'cantidad', table: mainTable, type: 'decimal' },
    // ... más campos hardcodeados
  );
}

// TODO: Reemplazar con llamada real a Catelli
// const res = await apiClient.post('/erp/table-fields', { tables });
// setAvailableFields(res.data.fields);

setAvailableFields(mockFields);
```

#### ✅ Ahora (Dinámico)
```typescript
interface FieldMappingBuilderProps {
  datasetType: string;
  mainTable: string;
  joins?: Array<{ name: string; alias: string }>;
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
  connectionId: string; // ← REQUERIDO para obtener campos dinámicamente
}

useEffect(() => {
  if (!mainTable || !connectionId) return;

  const loadFields = async () => {
    try {
      // Obtener schema de TODAS las tablas (main + joins)
      const tables = [mainTable, ...joins.map(j => j.name)];
      const response = await apiClient.post(
        `/erp-connections/${connectionId}/table-schemas`,
        { tableNames: tables }
      );

      // Transformar al formato del frontend
      const fields: AvailableField[] = [];
      response.data.schemas.forEach(schema => {
        schema.columns.forEach(col => {
          fields.push({
            name: col.name,
            table: schema.name,
            type: col.type,
          });
        });
      });

      setAvailableFields(fields); // ← Campos REALES del ERP
    } catch (err: any) {
      setError(`Error cargando campos: ${err.message}`);
    }
  };

  loadFields();
}, [mainTable, joins, connectionId]);
```

#### 🎯 Beneficios
- ✅ **Campos REALES:** Obtiene exactamente lo que existe en ERP
- ✅ **Completamente dinámico:** Soporta cualquier estructura de Catelli
- ✅ **Tipos incluidos:** Conoce el tipo de cada columna (string, number, decimal, date)
- ✅ **Mantenible:** Sin código hardcodeado, solo configuración

---

### 3. **MappingConfigAdminPage.tsx** - Página de Configuración Actualizada

#### ❌ Antes
```typescript
interface MappingConfig {
  id?: string;
  datasetType: string;
  mainTable: { name: string; alias: string };
  fieldMappings: FieldMapping[];
  // ... sin referencia a conexión ERP
}

<QueryBuilder
  onChange={...}
  onPreview={...}
  initialState={...}
  // ← Faltaba connectionId
/>

<FieldMappingBuilder
  datasetType={formData.datasetType}
  mainTable={formData.mainTable.name}
  joins={formData.joins}
  mappings={formData.fieldMappings}
  onChange={...}
  // ← Faltaba connectionId
/>
```

#### ✅ Ahora (Dinámico)
```typescript
interface MappingConfig {
  id?: string;
  connectionId: string; // ← NUEVO: ID de la conexión al ERP
  datasetType: string;
  mainTable: { name: string; alias: string };
  fieldMappings: FieldMapping[];
  // ...
}

// Cargar conexiones disponibles
const { data: connections } = useQuery({
  queryKey: ['erp-connections'],
  queryFn: async () => {
    const res = await apiClient.get('/erp-connections');
    return Array.isArray(res.data) ? res.data : res.data.data || [];
  },
});

// En el formulario: selector de conexión
<select
  value={formData.connectionId}
  onChange={(e) => updateField('connectionId', e.target.value)}
  className="border border-gray-300 p-2 rounded w-full"
>
  <option value="">Selecciona una conexión...</option>
  {connections?.map((conn: any) => (
    <option key={conn.id} value={conn.id}>
      {conn.name} - {conn.database || 'Catelli'}
    </option>
  ))}
</select>

// Pasar connectionId a componentes
<QueryBuilder
  connectionId={formData.connectionId}
  onChange={...}
  onPreview={...}
  initialState={...}
/>

<FieldMappingBuilder
  connectionId={formData.connectionId}
  datasetType={formData.datasetType}
  mainTable={formData.mainTable.name}
  joins={formData.joins}
  mappings={formData.fieldMappings}
  onChange={...}
/>
```

#### 🎯 Beneficios
- ✅ **Multi-ERP:** Soporta múltiples conexiones a diferentes Catelli
- ✅ **Clara conexión:** Usuario selecciona qué ERP usar
- ✅ **Trazable:** El mapping sabe de qué ERP vienen sus datos
- ✅ **Flexible:** Fácil agregar más conexiones sin cambiar código

---

## 🔌 Flujo de Datos (Dinámico)

```
Usuario selecciona conexión ERP
    ↓
Frontend: "Necesito tablas del ERP"
    ↓
GET /api/erp-connections/{id}/tables
    ↓
Backend: Consulta INFORMATION_SCHEMA de Catelli
    ↓
Retorna: [articulo, existencia_bodega, bodega, ...]
    ↓
Frontend renderiza list de tablas (dinámicas)
    ↓
Usuario selecciona tabla: "articulo"
    ↓
Frontend: "Necesito schema de esta tabla"
    ↓
POST /api/erp-connections/{id}/table-schemas
Body: { tableNames: ["articulo"] }
    ↓
Backend: Consulta columnas y tipos de "articulo"
    ↓
Retorna: {
  name: "articulo",
  columns: [
    { name: "id", type: "int", isPK: true },
    { name: "codigo", type: "varchar(50)" },
    { name: "descripcion", type: "varchar(255)" },
    ...
  ]
}
    ↓
Frontend renderiza checkboxes con COLUMNAS REALES
    ↓
Usuario selecciona columnas y hace mapeo
    ↓
Usuario clica "Vista Previa"
    ↓
POST /api/erp-connections/{id}/preview-query
Body: { sql: "SELECT a.codigo, a.descripcion FROM articulo a LIMIT 10" }
    ↓
Backend ejecuta SQL EN VIVO contra Catelli
    ↓
Retorna datos REALES de Catelli
    ↓
Frontend muestra en tabla: datos actuales del ERP
    ↓
Usuario confirma: "Se ve bien"
    ↓
Guardamos mapping con connectionId
```

---

## 📝 Cambios de API/Interfaces

### MappingConfig (Actualizada)
```typescript
interface MappingConfig {
  id?: string;
  connectionId: string;        // ← NUEVO CAMPO
  datasetType: 'ITEMS' | 'STOCK' | 'COST' | 'PRICE';
  mainTable: { name: string; alias: string };
  joins?: TableJoin[];
  customQuery?: string;
  fieldMappings: FieldMapping[];
  filters?: Filter[];
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  isActive?: boolean;
}
```

### QueryBuilderProps (Actualizada)
```typescript
interface QueryBuilderProps {
  onChange: (query: QueryBuilderState) => void;
  onPreview: (query: QueryBuilderState) => void;
  initialState?: QueryBuilderState;
  connectionId: string;  // ← NUEVO: REQUERIDO para funcionar
}
```

### FieldMappingBuilderProps (Actualizada)
```typescript
interface FieldMappingBuilderProps {
  datasetType: string;
  mainTable: string;
  joins?: Array<{ name: string; alias: string }>;
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
  connectionId: string;  // ← NUEVO: REQUERIDO para funcionar
}
```

---

## ✅ Validaciones

**Compilación:** ✅ Sin errores
**Tipos:** ✅ TypeScript validado
**Interfaces:** ✅ Consistentes

---

## 🚀 Próximos Pasos

### Phase 1: Usar los datos dinámicos ✅ COMPLETADO
- ✅ QueryBuilder obtiene tablas dinámicamente
- ✅ FieldMappingBuilder obtiene columnas dinámicamente
- ✅ MappingConfig sabe qué conexión usar

### Phase 2: Cargar datos reales (PRÓXIMO)
- Crear LoadInventoryFromERPService en backend
- Endpoint POST /inventory/load-from-erp
- Ejecutar mapeo y cargar datos a Cigua

### Phase 3: UI de carga (PRÓXIMO)
- LoadInventoryFromERPPage
- Mostrar progreso
- Validar éxito

### Phase 4: Sincronización (PRÓXIMO)
- SyncToERPService
- Enviar cambios de vuelta a Catelli
- Completar ciclo

---

## 💡 Notas Importantes

1. **No más hardcoding:** Todos los datos vienen del ERP en tiempo real
2. **Completamente flexible:** Funciona con cualquier estructura de Catelli
3. **Multi-instancia:** Soporta múltiples conexiones ERP diferentes
4. **Mantenible:** Sin constantes fijas, solo API calls dinámicas
5. **Escalable:** Fácil agregar nuevas tablas/campos sin modificar código

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Tablas** | Hardcodeadas en CATELLI_TABLES | Obtenidas dinámicamente |
| **Columnas** | Hardcodeadas en TABLE_COLUMNS | Obtenidas dinámicamente |
| **Tipos** | Adivinados (todos strings) | Reales del ERP (varchar, int, decimal, date) |
| **Conexión ERP** | Sin referencia | Explícita en MappingConfig |
| **Multi-ERP** | No soportado | ✅ Completamente soportado |
| **Mantenimiento** | Alto (cambios en código) | Bajo (solo BD) |
| **Flexibilidad** | Baja (nueva tabla = recodificar) | Alta (nueva tabla = automática) |

---

## 🎯 Conclusión

**Eliminación total de hardcoding lograda.** El sistema ahora:
- ✅ Consulta el ERP en TIEMPO REAL
- ✅ Adapta automáticamente a cualquier estructura
- ✅ Soporta múltiples instalaciones de Catelli
- ✅ Mantiene código limpio y mantenible
- ✅ Prepara el terreno para fases siguientes

**Status:** Listo para Phase 2 (Cargar datos reales)
