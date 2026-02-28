# ⚡ GUÍA DE INICIO RÁPIDO

## 🚀 Comenzar en 3 Pasos

### 1️⃣ Iniciar Servidor Backend

```powershell
cd apps/backend
pnpm dev
```

**Espera a ver:**
```
✓ Fastify server listening
✓ DB connected
✓ Ready for requests
```

### 2️⃣ Iniciar Servidor Frontend (nueva terminal)

```powershell
cd apps/web
pnpm dev
```

**Espera a ver:**
```
✓ Vite server running at http://localhost:5173
```

### 3️⃣ Acceder a la Aplicación

1. Abre: `http://localhost:5173`
2. Ingresa con tu usuario/contraseña
3. ¡Serás redirigido automáticamente a `/inventory`

---

## 📍 Ubicaciones Principales

| Sección | URL | Icono |
|---------|-----|-------|
| **Hub de Inventario** | `/inventory` | 📦 |
| **Query Explorer** | `/settings?tab=query-explorer` | 🔍 |
| **Cargar Inventario** | `/inventory/load-inventory` | 📥 |
| **Conteo Físico** | `/inventory/physical-count` | 📊 |
| **Sincronizar** | (integrado en dashboard) | 🔄 |
| **Reportes** | `/inventory/variances` | 📈 |
| **Settings** | `/settings` | ⚙️ |

---

## 🧪 Flujo de Testing Recomendado

### Paso 1: Verificar Navegación ✅

```
1. Acceder a http://localhost:5173
2. Deberías ver el hub con 6 tarjetas
3. Hacer click en cada tarjeta (debe navegar sin errores)
```

### Paso 2: Query Explorer 🔍

```
1. Click en "Query Explorer" desde el hub
2. Selecciona una conexión ERP existente
3. Selecciona una tabla
4. Marca algunas columnas
5. Haz click "Generar SQL" (debe mostrar SQL válido)
6. Haz click "Ejecutar Query" (debe mostrar resultados)
```

### Paso 3: Cargar Inventario 📥

```
1. Click en "Cargar Inventario"
2. Selecciona un mapping (o crea uno desde Query Explorer)
3. Haz click "Vista Previa" (debe mostrar datos)
4. Haz click "Cargar" (debe importar datos a BD)
```

### Paso 4: Conteo Físico 📊

```
1. Click en "Conteo Físico"
2. Busca un artículo cargado
3. Ingresa cantidad contada
4. Sistema calcula varianza automáticamente
5. Guarda el conteo
```

### Paso 5: Sincronizar 🔄

```
1. Desde Dashboard, click en artículo
2. Selecciona estrategia (REPLACE = actualizar, ADD = agregar)
3. Validar cambios
4. Sincronizar al ERP
5. Verificar en ERP que actualizó
```

---

## 🐛 Troubleshooting

### Backend no inicia

**Error:** `Port 3000 already in use`
```powershell
# Encuentrar y matar proceso
$process = Get-Process | Where-Object {$_.ProcessName -match "node"}
Stop-Process -Id $process.Id -Force
```

### Frontend no carga

**Error:** `Cannot find module...`
```powershell
cd apps/web
pnpm install
pnpm dev
```

### Errores de autenticación

**Error:** `401 Unauthorized`
1. Verificar que estás logueado
2. Check token en DevTools → Storage → cookies
3. Intentar logout/login nuevamente

### Query no ejecuta

**Error:** `500 Internal Server Error`
1. Verificar que conectaste al ERP primero
2. Verificar que la tabla existe en ERP
3. Revisar logs del backend para más detalles

---

## 📊 Datos de Prueba

### Usuario de Prueba

```
Email: test@example.com
Contraseña: password123
Empresa: Test Company
```

### Conexión ERP de Prueba

```
Host: localhost
Port: 1433
Database: TestDB
User: sa
Password: YourPassword123!
```

### Tabla de Ejemplo

```
Tabla: Products
Columnas:
  - ProductID (int)
  - ProductName (varchar)
  - Quantity (int)
  - Price (decimal)
```

---

## 🎯 Puntos Clave

### Query Explorer
- ✅ NO necesita guardar como mapping
- ✅ Prueba directamente contra ERP
- ✅ Puedes guardar queries interesantes como mappings

### Cargar Inventario
- ✅ Usa un mapping existente
- ✅ Validación automática de datos
- ✅ Historial de todas las cargas

### Conteo Físico
- ✅ Interfaz simple de entrada
- ✅ Varianzas calculadas automáticamente
- ✅ Múltiples conteos por artículo

### Sincronizar
- ✅ REPLACE: Actualiza cantidades existentes
- ✅ ADD: Suma las varianzas a cantidades existentes
- ✅ Siempre valida antes de sincronizar

---

## 📚 Documentación Completa

Para más detalles:
- `RESUMEN_FINAL_SISTEMA_COMPLETO_v2.md` - Overview total
- `FASE_0_INVENTORY_NAVIGATION_HUB.md` - Hub de navegación
- `FASE_1_5_QUERY_EXPLORER.md` - Query Explorer
- `PLAN_TESTING_COMPLETO.md` - Plan de testing

---

## 🚨 Checklist Antes de Testing

- [ ] Backend iniciado en `http://localhost:3000`
- [ ] Frontend iniciado en `http://localhost:5173`
- [ ] Logueado con usuario válido
- [ ] Conexión ERP configurada
- [ ] Al menos 1 mapping existe
- [ ] Datos en tabla ERP de prueba

---

## 💡 Tips Rápidos

1. **Usar Query Explorer primero** para explorar estructura de datos
2. **Guardar queries útiles** como mappings reutilizables
3. **Siempre preview** antes de cargar inventario
4. **Validar siempre** antes de sincronizar al ERP
5. **Revisar reportes** para entender varianzas

---

## 📞 Ayuda Rápida

| Problema | Solución |
|----------|----------|
| Hub no aparece | Verificar `/inventory` route en App.tsx |
| Query Explorer no carga | Conectar a ERP desde settings |
| No hay datos para contar | Cargar inventario desde Query Explorer o Mappings |
| Sincronización falla | Validar conexión ERP y estrategia seleccionada |
| Errores de tipo | Verificar que mapping está correcto |

---

**¡Listo para comenzar! 🎉**

Cualquier pregunta, revisa la documentación completa o el código en los archivos mencionados.

