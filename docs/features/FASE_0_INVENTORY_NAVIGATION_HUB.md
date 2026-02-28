# Fase 0: Centro de Navegación de Inventario

## Descripción General

Se ha creado una **página de navegación centralizada** (`InventoryDashboardNavPage`) que actúa como hub central para acceder a todas las funcionalidades del sistema de inventario.

## Localización

- **Archivo:** `apps/web/src/pages/InventoryDashboardNavPage.tsx`
- **Ruta Principal:** `/inventory`
- **Ruta Alternativa:** Raíz `/` (redirige a `/inventory`)

## Funcionalidades Principales

### 1. **Módulos Disponibles**

La página presenta 6 módulos principales organizados en tarjetas interactivas:

#### 🔍 Query Explorer
- **Descripción:** Explora datos del ERP sin crear mappings
- **Ruta:** `/settings?tab=query-explorer`
- **Funcionalidad:** Construye queries visuales y ejecuta directamente contra el ERP
- **Caso de Uso:** Exploración ad-hoc de datos antes de crear mappings permanentes

#### 📥 Cargar Inventario del ERP
- **Descripción:** Carga datos de artículos desde el ERP usando mappings
- **Ruta:** `/inventory/load-inventory`
- **Funcionalidad:** Importa productos del ERP al sistema
- **Requisito:** Mapping configurado previamente

#### 📊 Conteo Físico
- **Descripción:** Registra cantidades contadas físicamente
- **Ruta:** `/inventory/physical-count`
- **Funcionalidad:** Permite entrada de datos de conteo físico y calcula varianzas
- **Requisito:** Inventario cargado desde ERP

#### 🔄 Sincronizar al ERP
- **Descripción:** Envía resultados al ERP
- **Ruta:** `/inventory/sync-to-erp`
- **Funcionalidad:** Actualiza cantidades en ERP con estrategias (REPLACE/ADD)
- **Requisito:** Conteo físico completado

#### 📈 Reportes de Varianza
- **Descripción:** Analiza diferencias entre cantidades teóricas y contadas
- **Ruta:** `/inventory/variance-reports`
- **Funcionalidad:** Visualiza y analiza discrepancias

#### 🗺️ Configurar Mappings
- **Descripción:** Define mapeos de campos ERP → Sistema
- **Ruta:** `/settings?tab=mapping`
- **Funcionalidad:** Acceso rápido a configuración de mappings

## Flujo Visual

La página incluye un diagrama visual del flujo recomendado:

```
🔍 Explorar → 📥 Cargar → 📊 Contar → 🔄 Sincronizar
```

## Flujo Recomendado

1. **Query Explorer** → Explora estructuras de datos del ERP
2. **Cargar Inventario** → Importa datos usando mapping
3. **Conteo Físico** → Registra cantidades reales
4. **Sincronizar** → Envía resultados al ERP
5. **Reportes** → Analiza varianzas

## Características de Diseño

### Tarjetas Interactivas

- Hover effect (elevación + sombra)
- Click para navegar a módulo
- Estado visual: "✓ Listo para usar"
- Icono + Título + Descripción

### Secciones

1. **Encabezado:** Título y descripción general
2. **Diagrama de Flujo:** Visual del ciclo de inventario
3. **Módulos Principales:** Grid de tarjetas clickeables
4. **Instrucciones:** Flujo recomendado paso a paso
5. **Tips:** Consejos de uso y buenas prácticas

### Responsive Design

- Grid: `repeat(auto-fit, minmax(300px, 1fr))`
- Se adapta a pantallas pequeñas, medianas y grandes
- Máximo ancho: 1200px

## Tips Incluidos

1. **Exploración sin Compromisos:** Use Query Explorer antes de crear mappings
2. **Guardado de Queries:** Puede guardar queries como mappings reutilizables
3. **Estrategias de Actualización:** Explica diferencia entre REPLACE y ADD
4. **Validación:** Siempre validar antes de sincronizar

## Integración en la Aplicación

### Import en App.tsx

```tsx
import { InventoryDashboardNavPage } from '@/pages/InventoryDashboardNavPage';
```

### Rutas Definidas

```tsx
// Hub de navegación (página nueva)
<Route path="/inventory" element={<PrivateRoute><InventoryDashboardNavPage /></PrivateRoute>} />

// Dashboard heredado (aún disponible en /inventory/dashboard)
<Route path="/inventory/dashboard" element={<PrivateRoute><InventoryDashboardPage /></PrivateRoute>} />

// Otras rutas de inventario permanecen igual
```

### Redirección de Raíz

- `/` → `/inventory` (nuevo hub)
- Anteriormente: `/` → `/inventory/dashboard`

## Tecnologías Utilizadas

- **React 18+** para componentes
- **React Router** para navegación (`useNavigate`)
- **Inline Styles** para diseño (no requiere CSS externo)
- **TypeScript** para type safety

## Archivos Modificados

1. **apps/web/src/pages/InventoryDashboardNavPage.tsx** (NEW) - 395 líneas
2. **apps/web/src/App.tsx** (MODIFIED)
   - Agregado import de InventoryDashboardNavPage
   - Agregada ruta `/inventory` para hub
   - Modificada redirección raíz

## Compilación y Errores

✅ **Estado:** 0 errores de compilación

## Próximos Pasos

1. Verificar que cada ruta de módulo esté funcionando correctamente
2. Validar que los links naveguen correctamente
3. Implementar conexión a API para cargar estados reales de módulos
4. Agregar autenticación/permisos para módulos específicos

## Notas Técnicas

- Página completamente **autodescriptiva** con iconos y descripciones
- **Hover interactivo** para mejor UX
- **Navegación intuitiva** con flujo lógico
- **Centralización de acceso** a todas las funcionalidades de inventario
- **Fácilmente extensible** para agregar nuevos módulos

## Estado del Sistema

- **Query Explorer (Fase 1.5):** ✅ Implementado e integrado
- **Cargar Inventario (Fase 2):** ✅ Implementado (ruta disponible)
- **Conteo Físico (Fase 3):** ✅ Implementado (ruta disponible)
- **Sincronizar (Fase 4):** ✅ Implementado (ruta disponible)
- **Centro de Navegación (Fase 0):** ✅ Implementado (NUEVO)

**Versión del Sistema:** 1.0 - Hub Operacional

