# 🧪 Guía de Validación: Fix "Conexión no válida"

## ✅ Pasos para Validar que el Fix Funciona

### Pre-requisitos
- Tener el sistema corriendo (backend + frontend)
- Tener al menos una conexión ERP configurada
- Tener al menos un mapping existente

---

## 🧪 Test 1: Conexión ERP Válida (Camino Feliz)

### Paso 1: Navegar a Mappings
1. Abre la aplicación
2. Ve a **Settings → Mappings**
3. Deberías ver lista de mappings existentes

### Paso 2: Abrir un Mapping Existente
1. Click en botón **"Editar"** en cualquier mapping
2. Deberías ver la pantalla "Editar Mapping - [TIPO]"

### Paso 3: Verificar Info de Conexión
✅ Deberías ver:
```
🔗 Conexión ERP: [nombre de tu conexión]
🗄️ Base de datos: [BD]@[servidor]:[puerto]
📊 Dataset: ITEMS (o tu tipo)

💡 Si obtienes error "Conexión no válida"...
```

### Paso 4: Verificar Carga de Tablas
1. En "Paso 1: Seleccionar Tablas y JOINs"
2. Deberías ver **spinner animado** con texto:
   ```
   🔄 Conectando con BD del ERP...
   Esto puede tomar unos segundos.
   ```
3. Después de 2-5 segundos, deberías ver **dropdown con tablas**

✅ **VALIDACIÓN:**
- [ ] Se muestra spinner mientras carga
- [ ] Dropdown se completa con tablas disponibles
- [ ] No hay error rojo

---

## 🧪 Test 2: Conexión ERP Inválida (Manejo de Errores)

### Requisito Previo: Romper Credenciales
1. Ve a **Settings → Conexiones ERP**
2. Edita la conexión que usarás para test
3. **Cambia la contraseña** a algo inválido (ej: `invalid123`)
4. Guarda cambios
5. Vuelve a Settings

### Paso 1: Abrir Mapping
1. Click **"Editar"** en un mapping

### Paso 2: Verificar Error Detallado
✅ Deberías ver mensaje de ERROR **detallado** con recomendaciones:

```
⚠️ No se puede conectar con la BD del ERP. Verifica:
- El servidor está disponible
- Las credenciales son correctas
- El puerto es accesible
- El nombre de la base de datos existe

Error: Failed to connect to MSSQL: Login failed...
```

**Validación:**
- [ ] El error es **rojo** con fondo rojo
- [ ] Muestra **recomendaciones** específicas
- [ ] Muestra el **error real** del servidor (abajo)
- [ ] **NO muestra** "Conexión no válida" genérico

### Paso 3: Verificar Botón "Reintentar"
✅ Deberías ver un botón **"🔄 Reintentar Conexión"**

**Validación:**
- [ ] Botón existe y es visible
- [ ] Tiene ícono de refresh (🔄)
- [ ] Es clickeable

### Paso 4: Verificar Entrada Manual
✅ Donde debería haber dropdown de tablas, ahora hay **input de texto**

```
📊 Tabla Principal

💡 Como alternativa, puedes escribir el nombre de la tabla manualmente:

[input: "Ej: ARTICULO, dbo.ITEMS, etc."]
```

**Validación:**
- [ ] Input aparece (no dropdown)
- [ ] Placeholder muestra ejemplos
- [ ] Puedes escribir nombre de tabla

### Paso 5: Continuar Configurando Manualmente
1. Escribe un nombre de tabla (ej: `ARTICULO`)
2. Click **"Siguiente →"**
3. Deberías poder continuar al Paso 2 sin problemas

**Validación:**
- [ ] Acepta entrada manual
- [ ] Permite continuar a siguiente paso
- [ ] No hay error bloqueante

---

## 🧪 Test 3: Reintentar Conexión

### Requisito Previo
- Estás en Test 2 (conexión rota, ves error)

### Paso 1: Arreglar Credenciales
1. En otra pestaña: **Settings → Conexiones ERP**
2. Edita la conexión
3. **Cambia contraseña** de vuelta a la correcta
4. Guarda

### Paso 2: Click "🔄 Reintentar Conexión"
1. Vuelve a la pestaña del mapping
2. Click botón **"🔄 Reintentar Conexión"**
3. Deberías ver **spinner** de nuevo

✅ **Después de 2-5 segundos:**
- [ ] Spinner desaparece
- [ ] Dropdown de tablas aparece
- [ ] Error desaparece
- [ ] Puedes ver las tablas disponibles

**VALIDACIÓN EXITOSA:** 💚 El botón "Reintentar" funciona sin cerrar formulario

---

## 🧪 Test 4: Entrada Manual en JOINs

### Requisito Previo
- Estás en Test 2 o Test 3
- Ya ingresaste tabla principal manualmente (ej: `ARTICULO`)
- Hiciste click "Siguiente →"

### Paso 1: Llegar a JOINs
- Deberías estar en "Paso 1: Seleccionar Tablas y JOINs"
- Deberías ver "📊 Tabla Principal" con tu tabla

### Paso 2: Agregar JOIN
1. Click en botón **"+ Agregar JOIN"**
2. Deberías ver formulario de JOIN

### Paso 3: Verificar Campo de Tabla en JOIN
✅ Donde debería haber dropdown, ahora hay **input de texto**

```
JOIN #1
Tabla: [input: "Ej: EXISTENCIA_BODEGA"]
Alias: [input]
Tipo: [dropdown]
Condición: [input]
```

**Validación:**
- [ ] Campo "Tabla" es INPUT (no dropdown)
- [ ] Puedes escribir nombre (ej: `EXISTENCIA_BODEGA`)
- [ ] Otros campos funcionan normalmente

---

## 📊 Tabla de Validación Completa

| # | Test | Paso | Validación | ✅ |
|---|------|------|-----------|---|
| 1 | Válida | Info conexión | Muestra 🔗, 🗄️, 📊 | [ ] |
| 1 | Válida | Spinner | Muestra "🔄 Conectando..." | [ ] |
| 1 | Válida | Tablas | Dropdown se llena de tablas | [ ] |
| 2 | Inválida | Error | Muestra error detallado con recomendaciones | [ ] |
| 2 | Inválida | Botón | Botón "🔄 Reintentar Conexión" existe | [ ] |
| 2 | Inválida | Manual | Input manual para tabla aparece | [ ] |
| 2 | Inválida | Continuar | Puedes escribir tabla y continuar | [ ] |
| 3 | Reintentar | Fix | Arreglar credenciales funciona | [ ] |
| 3 | Reintentar | Retry | Click reintentar carga tablas | [ ] |
| 4 | JOINs | Manual | Input manual en campo de tabla de JOIN | [ ] |
| 4 | JOINs | Escribir | Puedes escribir nombre de tabla JOIN | [ ] |

---

## 🎯 Criterios de Éxito

### ✅ El fix es exitoso si:

1. ✅ **Sin conexión válida:**
   - Muestra error detallado (no "Conexión no válida" genérico)
   - Botón "Reintentar" funciona
   - Puedes entrar manual valores
   - Puedes continuar configurando

2. ✅ **Con conexión válida:**
   - Carga tablas automáticamente
   - Dropdown se completa correctamente
   - Todo funciona como antes

3. ✅ **Reintentar funciona:**
   - Después de arreglar credenciales
   - Click reintentar carga tablas
   - No necesita cerrar/abrir formulario

### ❌ El fix falló si:

- ❌ Sigue apareciendo "Conexión no válida" genérico
- ❌ No hay botón "Reintentar Conexión"
- ❌ No puedes entrar valores manualmente
- ❌ Estás bloqueado cuando falla conexión
- ❌ Los JOINs no permiten entrada manual

---

## 🐛 Si Algo No Funciona

### Issue: "Aún veo 'Conexión no válida' genérico"
**Solución:**
1. Verifica que compilaste los cambios (rebuild)
2. Limpia cache del navegador (Ctrl+Shift+Del)
3. Recarga la página (F5)

### Issue: "No veo botón 'Reintentar Conexión'"
**Solución:**
1. Verifica que `TablesAndJoinsStep.tsx` fue modificado
2. Busca "Reintentar Conexión" en el archivo
3. Si no está, el cambio no se guardó

### Issue: "El dropdown sigue apareciendo incluso sin conexión"
**Solución:**
1. Verifica que `availableTables.length > 0 ?` existe
2. Verifica que la lógica condicional es correcta
3. Rebuild frontend

### Issue: "Puedo escribir pero no continúa"
**Solución:**
1. Verifica que MainTable tiene valor (console log)
2. Verifica que validación permite valores manual
3. Revisa errors en consola del navegador

---

## 📞 Logging para Debug

### Frontend (Browser Console)
```javascript
// Ver en: F12 → Console
// Si está guardando, deberías ver:
console.log('🔄 [MappingEditor.onSave] newConfig:', newConfig);
console.log('✅ [MappingEditor.onSave] Mutate success');
```

### Backend (Terminal)
```javascript
// Cuando falla conexión, deberías ver:
console.error('❌ Error in getAvailableTables:', error);
// Y ver status 500 en la respuesta
```

---

## ✨ Conclusión

Una vez que pases todos los tests:

✅ El fix está **correctamente implementado**
✅ Los usuarios **NO estarán bloqueados** con "Conexión no válida"
✅ Tendrán **opciones para continuar** incluso si falla ERP
✅ Verán **mensajes claros** sobre qué salió mal

🎉 **¡Fix completado exitosamente!**
