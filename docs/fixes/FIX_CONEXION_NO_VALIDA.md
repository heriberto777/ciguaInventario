# Fix: Error "Conexión no válida" al Editar Mappings de ERP

## 🔍 Problema Identificado

Cuando intentabas editar un Mapping en la pantalla "Editar Mapping - ITEMS", aparecía este error:

```
❌ Error: Conexión no válida. Por favor, vuelve a intentar.
```

Este error ocurría porque el sistema intentaba conectarse automáticamente con el servidor ERP/MSSQL cuando:
1. Abres un mapping para editar
2. El Paso 1 intenta cargar las tablas disponibles

Si la conexión ERP tiene credenciales inválidas o el servidor no está disponible, fallaba con "Conexión no válida".

---

## ✅ Soluciones Implementadas

### 1. **Mejora en el Manejo de Errores del Frontend**
📁 `apps/web/src/components/SimpleMappingBuilder/steps/TablesAndJoinsStep.tsx`

#### Cambios:
- ✅ Mensajes de error mejorados con contexto específico
- ✅ Botón "🔄 Reintentar Conexión" para intentar de nuevo
- ✅ Soporte para entrada manual de tablas cuando falla la carga automática
- ✅ Spinner animado mientras carga las tablas
- ✅ Fallback a inputs de texto si no se pueden cargar las tablas

#### Ejemplo del Nuevo Error:
```
⚠️ No se puede conectar con la BD del ERP. Verifica:
- El servidor está disponible
- Las credenciales son correctas
- El puerto es accesible
- El nombre de la base de datos existe

Error: Failed to connect to MSSQL: ...
```

---

### 2. **Mejor Información de Conexión en el Formulario**
📁 `apps/web/src/pages/MappingConfigAdminPage.tsx`

#### Cambios:
- Muestra detalles de la conexión ERP (servidor, puerto, base de datos)
- Proporciona consejo cuando hay error de conexión
- Más claro qué datos está usando

---

### 3. **Error Handling Mejorado en el Backend**
📁 `apps/backend/src/modules/erp-connections/controller.ts`

#### Cambios en `getAvailableTables()`:
```typescript
// ANTES: Sin try-catch, errores sin detalles
await connector.connect();
const tables = await introspection.getAvailableTables();

// DESPUÉS: Con try-catch y mensajes informativos
try {
  await connector.connect();
  const tables = await introspection.getAvailableTables();
  return reply.send({ tables });
} catch (error: any) {
  console.error('❌ Error in getAvailableTables:', error);
  return reply.status(500).send({
    error: {
      message: `Failed to connect to ERP: ${errorMessage}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });
}
```

Lo mismo aplicado a `getTableSchemas()`.

---

## 🎯 Cómo Usar Ahora

### Escenario 1: Conexión ERP Válida
1. Abre "Configuración de Mappings"
2. Click en "Editar" en un mapping existente
3. ✅ Las tablas se cargan automáticamente desde el ERP
4. Puedes navegar por los 4 pasos normalmente

### Escenario 2: Conexión ERP Inválida
1. Abre "Configuración de Mappings"
2. Click en "Editar" en un mapping existente
3. ❌ Ves error detallado con recomendaciones
4. **Opción A**: Click "🔄 Reintentar Conexión" después de arreglar credenciales
5. **Opción B**: Ingresa manualmente el nombre de la tabla (ej: `ARTICULO`)
6. Continúa configurando el mapping sin conectar al ERP

---

## 🔧 Verificar Conexión ERP

Si constantemente obtienes "Conexión no válida", verifica:

1. **Ir a Settings → Conexiones ERP**
2. Busca tu conexión Catelli/SAP
3. Click en el botón de "Test" (si existe)
4. Verifica estos datos:
   - ✅ Host/Servidor: ¿Es correcto? (ej: 192.168.1.100, catelli.empresa.com)
   - ✅ Puerto: ¿Es el correcto? (default MSSQL: 1433)
   - ✅ Base de datos: ¿Existe ese nombre? (ej: Catelli, CATELLI_PROD)
   - ✅ Usuario/Contraseña: ¿Son correctos?
   - ✅ Red: ¿El servidor es alcanzable desde aquí?

---

## 📝 Cambios Técnicos Específicos

### TablesAndJoinsStep.tsx - Nueva Lógica de Carga

```typescript
// Mejora en loadAvailableTables()
const loadAvailableTables = async () => {
  try {
    // ... cargar tablas ...
  } catch (err: any) {
    // Parsear diferentes tipos de errores
    const errorMessage = err.response?.data?.error?.message || err.message;

    // Proporcionar contexto diferente según el error
    if (err.response?.status === 500 && errorMessage.includes('Failed to connect')) {
      // Error de conexión
      userFriendlyMessage = `⚠️ No se puede conectar...`;
    } else if (err.response?.status === 404) {
      // Conexión no encontrada
      userFriendlyMessage = `❌ Conexión no encontrada...`;
    }
  }
};
```

### Inputs Dinámicos (Select/Texto)

```typescript
// ANTES: Solo dropdown (falla si no hay conexión)
<select value={config.mainTable}>
  {availableTables.map(...)}
</select>

// DESPUÉS: Dropdown si hay tablas, sino text input
{availableTables.length > 0 ? (
  <select>...</select>
) : (
  <input type="text" placeholder="Ej: ARTICULO" />
)}
```

---

## 🎁 Beneficios

| Antes | Después |
|-------|---------|
| ❌ Error genérico "Conexión no válida" | ✅ Mensaje detallado con causas posibles |
| ❌ No se puede continuar | ✅ Puedes ingresar manualmente tabla |
| ❌ Sin opción de reintentar | ✅ Botón "Reintentar Conexión" |
| ❌ No muestra detalles de conexión | ✅ Muestra servidor, puerto, BD |
| ❌ Error backend sin contexto | ✅ Backend con try-catch y detalles |

---

## 🚀 Próximos Pasos

1. Prueba editando un mapping que ya existe
2. Si funciona con conexión válida ✅
3. Si falla, usa la entrada manual de tablas para continuar
4. Opcional: Crea endpoint para "Validar Conexión" sin cargar tablas

---

## 📞 Soporte

Si aún ves "Conexión no válida":
1. Verifica las credenciales ERP en Settings
2. Verifica que el servidor ERP está disponible
3. Prueba desde la línea de comandos: `ping <servidor>`
4. Revisa logs del backend: `npm run dev` en la consola
