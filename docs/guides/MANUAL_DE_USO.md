# Manual de Uso - Sistema ERP CiguaInv

## Tabla de Contenidos
1. [Autenticación](#autenticación)
2. [Panel de Control](#panel-de-control)
3. [Módulos Disponibles](#módulos-disponibles)
4. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Autenticación

### Acceso al Sistema

1. **Abrir la aplicación**: Ingresa a `http://localhost:5174` en tu navegador
2. **Página de Login**: Se mostrará una pantalla de autenticación
3. **Credenciales por defecto**:
   - **Email**: `admin@cigua.com`
   - **Contraseña**: `admin123456`

### Características de Seguridad
- Las contraseñas se guardan con hash bcrypt
- Los tokens JWT expiran automáticamente
- Los tokens se almacenan en localStorage de forma segura
- La sesión persiste incluso si cierras el navegador (mientras no cierres sesión)

### Cierre de Sesión
- Haz clic en **"Logout"** en el menú superior derecho
- Esto borrará tu sesión y tokens
- Serás redirigido a la página de login

---

## Panel de Control

### Estructura del Menú

El menú lateral tiene 8 módulos principales:

```
├── Mapping (Config-Mapping)
├── Empresas (Companies)
├── ERP Connections
├── Usuarios (Users)
├── Roles
├── Permisos (Permissions)
├── Sesiones (Sessions)
└── Registros de Auditoría (Audit Logs)
```

### Navegación
- **Haz clic** en cualquier opción del menú para cambiar de módulo
- El módulo activo se resalta en azul
- Los datos se cargan automáticamente al entrar a cada sección

---

## Módulos Disponibles

---

## 1. MAPPING (Configuración de Mapeo)

### ¿Qué es el Mapping?
El módulo de Mapping te permite configurar la relación entre campos de tu ERP (SAP, MSSQL, Oracle) y campos de tu base de datos local.

### Casos de Uso
- Sincronizar datos de clientes desde SAP a tu base de datos
- Mapear campos de productos
- Configurar campos de órdenes de compra/venta
- Sincronizar datos financieros

### Pasos para Crear un Mapping

#### 1. Acceder al módulo
- Haz clic en **"Mapping"** en el menú lateral
- Verás la lista de mappings existentes

#### 2. Crear un nuevo Mapping
- Haz clic en **"Add Mapping"** (botón azul superior derecho)
- Se abrirá un formulario con los siguientes campos:

#### 3. Completar la información

**Campo: ERP Connection ID** (Obligatorio)
- ID de la conexión ERP que usará este mapping
- Este es el identificador único de la conexión que creaste en "ERP Connections"
- Selecciona de la lista desplegable las conexiones disponibles
- Si no tienes ninguna, primero crea una en "ERP Connections" módulo

**Campo: DataSet Type** (Obligatorio)
- El tipo de datos que deseas sincronizar. Selecciona uno de estos tipos:
  - **ITEMS**: Artículos/Productos (catálogo, inventario de productos)
  - **STOCK**: Existencias/Inventario (cantidad disponible en almacén)
  - **COST**: Costos (costo unitario, costo de producción)
  - **PRICE**: Precios (precio de venta, precio por cliente)
  - **DESTINATION**: Destinos/Ubicaciones (almacenes, sucursales, centros de distribución)

**Campo: Source Tables** (Obligatorio)
- Lista de tablas en el ERP de donde se extraerán los datos
- Puedes incluir una o varias tablas
- Ejemplos: "dbo.Products", "SAP.PUBLIC.ITEMS", "ORACLE.INVENTORY"
- Las tablas deben existir en el ERP configurado en "ERP Connection ID"

**Campo: Source Query** (Opcional)
- Consulta SQL personalizada para filtrar o transformar datos del ERP
- Ejemplo: `SELECT * FROM ITEMS WHERE active = 1`
- Si la dejas vacía, se usan todas las filas de las tablas configuradas
- Permite filtros, JOINs, cálculos, etc.

**Campo: Field Mappings** (Obligatorio)
- Define cómo se mapean los campos del ERP a tu base de datos local
- Para cada mapeo, especifica:

  **Subfield: Source Field** (Campo origen en ERP)
  - Nombre del campo en el ERP de donde viene el dato
  - Ejemplo: "ITEM_ID", "PRODUCT_NAME", "CURRENT_STOCK"

  **Subfield: Target Field** (Campo destino en BD local)
  - Nombre del campo en tu base de datos local donde se guardará
  - Ejemplo: "id", "name", "stock_quantity"

  **Subfield: Data Type** (Tipo de dato)
  - Tipo de dato que tendrá en la base de datos destino:
    - **STRING**: Texto (varchar, text)
    - **INT**: Número entero (integer, int)
    - **DECIMAL**: Número decimal (decimal, float)
    - **DATE**: Fecha (date, datetime)
    - **BOOLEAN**: Verdadero/Falso (boolean, bit)

  **Subfield: Transformation** (Opcional)
  - Fórmula o transformación a aplicar al dato
  - Ejemplo: `UPPER(${sourceField})` para convertir a mayúsculas
  - Ejemplo: `CAST(${sourceField} AS DECIMAL) * 1.15` para multiplicar por 1.15
  - ${sourceField} representa el valor del campo origen

**Campo: Filters** (Opcional)
- Filtros adicionales para limitar qué datos se sincronizan
- Formato: Pares de clave-valor
- Ejemplo: `status = "ACTIVE"` para sincronizar solo items activos

#### 4. Guardar el Mapping
- Haz clic en **"Create Mapping"** (botón azul)
- Verás un mensaje de éxito
- El mapping aparecerá en la lista y comenzará a sincronizar datos

#### 5. Ver detalles de un Mapping
- Haz clic en una fila del mapping para ver detalles
- Información visible:
  - Conexión ERP asociada
  - Tipo de datos (Dataset Type)
  - Tablas origen
  - Mappeos de campos (source → target)
  - Transformaciones configuradas
  - Filtros aplicados
  - Versión del mapping
  - Fecha de creación y última actualización

#### 6. Editar un Mapping
- Haz clic en el botón **"✏️ Edit"** en la fila
- Modifica los campos que necesites
- Nota: Cambiar la conexión ERP afectará a qué datos se sincronizan
- Haz clic en **"Update Mapping"**
- Se confirmará el cambio

#### 7. Probar un Mapping
- Haz clic en **"Test Mapping"** (botón con símbolo de prueba)
- Se ejecutará una sincronización de prueba con primeras 10 filas
- Puedes ver los resultados en la tabla de vista previa
- Útil para validar que los mappeos están correctos

#### 8. Desactivar/Activar un Mapping
- Haz clic en el botón **"Toggle"** (⚫/⚪) en la fila
- Esto pausará o reanudará la sincronización
- Los datos ya sincronizados permanecerán en la base de datos

#### 9. Eliminar un Mapping
- Haz clic en el botón **"🗑️ Delete"** en la fila
- Se pedirá confirmación
- Una vez eliminado, la sincronización se detiene
- Los datos ya sincronizados NO se borran

### Ejemplo Práctico: Mapear Productos desde SAP

**Escenario**: Tienes un catálogo de productos en SAP y quieres sincronizar precios a tu base de datos local

**Pasos**:
1. Abre el módulo "Mapping"
2. Haz clic en "Add Mapping"
3. Completa con:
   - **ERP Connection ID**: Selecciona tu conexión SAP configurada
   - **Dataset Type**: `PRICE` (porque quieres sincronizar precios)
   - **Source Tables**: `SAP.PUBLIC.PRODUCTS` (tabla de productos en SAP)
   - **Source Query**: `SELECT * FROM SAP.PUBLIC.PRODUCTS WHERE ACTIVE = 1` (solo productos activos)
   - **Field Mappings**: Define los mappeos:
     - Source: `PRODUCT_ID` → Target: `id` (Type: INT)
     - Source: `PRODUCT_NAME` → Target: `name` (Type: STRING)
     - Source: `LIST_PRICE` → Target: `price` (Type: DECIMAL)
     - Source: `CURRENCY` → Target: `currency_code` (Type: STRING)
   - **Filters**: (opcional) Puedes agregar filtros adicionales
4. Haz clic en "Create Mapping"
5. El sistema obtiene los datos de SAP y los almacena en tu base de datos local
6. Usa "Test Mapping" para verificar que los datos se sincronizan correctamente

### Filtros (Parte inferior)
- **Filter by Dataset Type**: Filtra por tipo de datos (ITEMS, STOCK, COST, PRICE, DESTINATION)
- **Filter by ERP Connection**: Filtra por conexión ERP usada
- **Filter by Status**: Muestra solo activos o inactivos

### Paginación
- Los mappings se muestran de 10 en 10
- Usa los botones de navegación para ver más

### Tabla de Vista Previa
- Después de crear o probar un mapping, verás una tabla con los datos sincrónizados
- Te permite validar que los datos se están copiando correctamente
- Muestra las primeras filas para inspección rápida

### Panel de Prueba de Conexión
- Prueba la conexión al ERP sin crear el mapping
- Útil para validar credenciales y conectividad antes de configurar

---

## 2. EMPRESAS (Companies)

### ¿Qué es una Empresa?
Una empresa es una entidad dentro del sistema. Cada empresa tiene sus propios usuarios, roles, permisos y datos.

### Pasos para Crear una Empresa

#### 1. Acceder al módulo
- Haz clic en **"Empresas"** en el menú lateral

#### 2. Crear una nueva Empresa
- Haz clic en **"Add Company"** (botón azul)
- Se abrirá un formulario

#### 3. Completar la información

**Campo: Company Name** (Obligatorio)
- Nombre oficial de la empresa
- Ejemplo: "Cigüeña Inversiones S.A."
- Máximo 255 caracteres

**Campo: Email** (Obligatorio y Único)
- Email corporativo de contacto
- Debe ser único (no puede haber dos empresas con el mismo email)
- Ejemplo: "contact@cigua.com"

**Campo: Description** (Opcional)
- Descripción de la empresa
- Puedes incluir su sector, ubicación, etc.
- Máximo 1000 caracteres

**Campo: Phone** (Opcional)
- Número de teléfono de la empresa
- Ejemplo: "+56 9 1234 5678"

**Campo: Website** (Opcional)
- Sitio web de la empresa
- Ejemplo: "https://www.cigua.com"

**Campo: Address** (Opcional)
- Dirección física de la empresa
- Ejemplo: "Av. Providencia 123, Santiago"

**Campo: City** (Opcional)
- Ciudad donde está ubicada la empresa
- Ejemplo: "Santiago"

**Campo: Country** (Opcional)
- País donde está ubicada la empresa
- Ejemplo: "Chile"

#### 4. Guardar la Empresa
- Haz clic en **"Create Company"**
- La empresa se crea y aparece en la lista

#### 5. Ver detalles de una Empresa
- Haz clic en una fila para expandirla
- Se mostrará toda la información

#### 6. Editar una Empresa
- Haz clic en **"✏️ Edit"** en la fila
- Modifica los campos necesarios
- Haz clic en **"Update Company"**

#### 7. Desactivar/Activar una Empresa
- Haz clic en **"Toggle"** para pausar o reactivar la empresa
- Cuando está inactiva, sus usuarios no pueden acceder

#### 8. Eliminar una Empresa
- Haz clic en **"🗑️ Delete"**
- Se pedirá confirmación
- Se eliminarán todos los datos asociados

### Filtros y Búsqueda
- **Search by name**: Busca empresas por nombre
- **Filter by status**: Muestra solo activas o inactivas

---

## 3. ERP CONNECTIONS

### ¿Qué es una Conexión ERP?
Una conexión ERP es la configuración necesaria para conectarse a un sistema externo (SAP, MSSQL, Oracle) y sincronizar datos.

### Pasos para Crear una Conexión ERP

#### 1. Acceder al módulo
- Haz clic en **"ERP Connections"** en el menú lateral

#### 2. Crear una nueva Conexión
- Haz clic en **"Add Connection"** (botón azul)
- Se abrirá un formulario

#### 3. Completar la información

**Campo: ERP Type** (Obligatorio)
- Selecciona el tipo de ERP:
  - **MSSQL**: Microsoft SQL Server
  - **SAP**: SAP ERP
  - **ORACLE**: Oracle Database

**Campo: Host** (Obligatorio)
- Dirección IP o nombre del servidor ERP
- Ejemplos:
  - `192.168.1.100`
  - `sap-server.company.com`
  - `oracle.internal.local`

**Campo: Port** (Obligatorio)
- Puerto en el que escucha el servidor
- Puertos típicos:
  - **MSSQL**: 1433
  - **SAP**: 50000
  - **ORACLE**: 1521
- Debe estar entre 1 y 65535

**Campo: Database** (Obligatorio)
- Nombre de la base de datos a conectar
- Ejemplos:
  - Para MSSQL: `ERP_SYSTEM` o `SAP_DATA`
  - Para SAP: nombre de la instancia
  - Para Oracle: nombre del SID

**Campo: Username** (Obligatorio)
- Usuario para autenticación en el ERP
- Debe tener permisos de lectura en las tablas

**Campo: Password** (Obligatorio)
- Contraseña del usuario ERP
- Se almacena de forma segura encriptada

#### 4. Probar la Conexión (Importante)
- **Antes de guardar**, haz clic en **"Test Connection"**
- El sistema intentará conectarse con los datos proporcionados
- Espera el resultado:
  - ✓ "Connection successful!" → Datos correctos
  - ✗ "Connection failed" → Revisa credenciales, host, puerto

#### 5. Guardar la Conexión
- Una vez que la prueba sea exitosa, haz clic en **"Create Connection"**
- La conexión se guarda y está lista para usarse en Mappings

#### 6. Ver detalles de una Conexión
- Haz clic en una fila para ver los detalles
- Se muestran todos los datos de configuración (sin la contraseña)

#### 7. Editar una Conexión
- Haz clic en **"✏️ Edit"**
- Modifica los campos necesarios
- Prueba la conexión nuevamente
- Haz clic en **"Update Connection"**

#### 8. Desactivar/Activar una Conexión
- Haz clic en **"Toggle"**
- Si está inactiva, los mappings que la usan dejan de sincronizar

#### 9. Eliminar una Conexión
- Haz clic en **"🗑️ Delete"**
- Nota: No puedes eliminar si hay mappings que la usan

### Ejemplo: Conectar a SAP

**Datos típicos de conexión a SAP**:
- **ERP Type**: SAP
- **Host**: `sap-prod.empresa.com` (obtén del administrador)
- **Port**: `50000` (puerto típico de SAP)
- **Database**: `PRD` (instancia de producción)
- **Username**: `SYSADMIN` o tu usuario SAP
- **Password**: Tu contraseña SAP

**Pasos**:
1. Rellena los datos arriba
2. Haz clic en "Test Connection"
3. Si falla, verifica:
   - Host y puerto correctos
   - Usuario existe en SAP
   - Contraseña correcta
   - Firewall permite acceso al puerto

---

## 4. USUARIOS (Users)

### ¿Qué es un Usuario?
Un usuario es una persona que puede acceder al sistema. Cada usuario tiene:
- Email y contraseña únicos
- Roles asignados (definen permisos)
- Asociación a empresas
- Historial de sesiones

### Pasos para Crear un Usuario

#### 1. Acceder al módulo
- Haz clic en **"Usuarios"** en el menú lateral

#### 2. Crear un nuevo Usuario
- Haz clic en **"Add User"** (botón azul)
- Se abrirá un formulario

#### 3. Completar la información

**Campo: First Name** (Obligatorio)
- Nombre del usuario
- Ejemplo: "Juan"

**Campo: Last Name** (Obligatorio)
- Apellido del usuario
- Ejemplo: "García"

**Campo: Email** (Obligatorio y Único)
- Email de acceso al sistema
- Ejemplo: "juan.garcia@cigua.com"
- Será el usuario para hacer login

**Campo: Password** (Obligatorio al crear)
- Contraseña inicial del usuario
- Mínimo 6 caracteres
- Se recomienda una contraseña fuerte

**Campo: Company** (Obligatorio)
- Selecciona a qué empresa pertenece el usuario
- El usuario solo verá datos de esa empresa

**Campo: Roles** (Obligatorio)
- Selecciona los roles que tendrá el usuario
- Puedes seleccionar múltiples roles
- Los roles definen qué puede hacer en el sistema
- Ejemplo: "Admin", "Viewer", "Editor"

#### 4. Guardar el Usuario
- Haz clic en **"Create User"**
- El usuario ahora puede hacer login con su email y contraseña

#### 5. Ver detalles de un Usuario
- Haz clic en una fila para expandirla
- Se muestra:
  - Nombre completo
  - Email
  - Empresa asignada
  - Roles
  - Fechas de creación y actualización

#### 6. Editar un Usuario
- Haz clic en **"✏️ Edit"**
- Puedes cambiar:
  - Nombre/Apellido
  - Roles asignados
  - Empresa
- **No puedes cambiar el email** (es único)
- Haz clic en **"Update User"**

#### 7. Cambiar Contraseña de un Usuario
- En la vista de edición, hay un campo "New Password"
- Si lo dejas vacío, la contraseña no cambia
- Si ingresas una nueva, se actualiza
- El usuario deberá usar la nueva contraseña en el siguiente login

#### 8. Desactivar/Activar un Usuario
- Haz clic en **"Toggle"**
- Un usuario inactivo no puede acceder al sistema
- Sus datos se preservan

#### 9. Eliminar un Usuario
- Haz clic en **"🗑️ Delete"**
- Se pedirá confirmación
- Se elimina el usuario y sus datos

### Búsqueda y Filtros
- **Search by email**: Busca usuarios por email
- **Filter by company**: Filtra por empresa
- **Filter by status**: Muestra solo activos o inactivos

---

## 5. ROLES

### ¿Qué es un Rol?
Un rol es un conjunto de permisos. Los usuarios obtienen permisos al asignarles roles.

**Ejemplo**:
- Rol "Admin" puede: crear usuarios, ver reportes, actualizar empresas
- Rol "Viewer" puede: solo ver datos, sin permisos de edición

### Pasos para Crear un Rol

#### 1. Acceder al módulo
- Haz clic en **"Roles"** en el menú lateral

#### 2. Crear un nuevo Rol
- Haz clic en **"Add Role"** (botón azul)
- Se abrirá un formulario

#### 3. Completar la información

**Campo: Role Name** (Obligatorio)
- Nombre del rol
- Ejemplos: "Admin", "Manager", "Analyst", "Viewer"
- Máximo 255 caracteres

**Campo: Description** (Opcional)
- Descripción de qué puede hacer este rol
- Ejemplo: "Acceso total al sistema"

**Campo: Permissions** (Obligatorio)
- Selecciona qué permisos tiene este rol
- Puedes seleccionar múltiples permisos
- Los permisos definen acciones específicas:
  - `view:users` → Ver usuarios
  - `create:users` → Crear usuarios
  - `edit:users` → Editar usuarios
  - `delete:users` → Eliminar usuarios
  - `view:reports` → Ver reportes
  - etc.

#### 4. Guardar el Rol
- Haz clic en **"Create Role"**
- El rol se crea y está listo para asignar a usuarios

#### 5. Ver detalles de un Rol
- Haz clic en una fila
- Se muestra:
  - Nombre del rol
  - Descripción
  - Permisos asignados
  - Número de usuarios con este rol

#### 6. Editar un Rol
- Haz clic en **"✏️ Edit"**
- Puedes cambiar:
  - Nombre y descripción
  - Permisos asociados
- Haz clic en **"Update Role"**
- Los cambios afectan a todos los usuarios con este rol

#### 7. Desactivar/Activar un Rol
- Haz clic en **"Toggle"**
- Los usuarios con un rol inactivo pierden esos permisos

#### 8. Eliminar un Rol
- Haz clic en **"🗑️ Delete"**
- Solo puedes eliminar si ningún usuario lo usa

### Roles Predefinidos
El sistema incluye algunos roles por defecto:
- **Admin**: Acceso total
- **Manager**: Gestión de datos y usuarios
- **Analyst**: Solo lectura de reportes
- **Viewer**: Solo visualización de datos

---

## 6. PERMISOS (Permissions)

### ¿Qué es un Permiso?
Un permiso es una acción específica que puede hacer alguien en el sistema. Es muy simple:

**Un permiso = una acción en un recurso**

**Estructura**: `[recurso]:[acción]`
- **Recurso**: ¿Sobre qué quiero actuar? (users, companies, mappings, reports)
- **Acción**: ¿Qué quiero hacer? (create, view, update, delete)

**Ejemplos prácticos**:
- `users:create` → Crear usuarios
- `users:view` → Ver usuarios
- `users:update` → Editar usuarios
- `companies:delete` → Eliminar empresas
- `mappings:view` → Ver mappings
- `reports:export` → Exportar reportes

### ¿Cómo funcionan los Permisos?

**Flujo simple**:
1. Creas un **Permiso** (ejemplo: `users:create`)
2. Lo asignas a un **Rol** (ejemplo: el rol "Manager" tiene el permiso `users:create`)
3. Asignas el **Rol** a un **Usuario** (ejemplo: Juan tiene el rol "Manager")
4. **Resultado**: Juan puede crear usuarios (porque tiene ese permiso a través del rol)

**Diagrama**:
```
Permiso (users:create)
        ↓
        ├→ Rol "Manager"
        │   ↓
        │   └→ Usuario "Juan"
        │       ↓
        │       Resultado: Juan puede crear usuarios
        │
        ├→ Rol "Admin"
        │   ↓
        │   └→ Usuario "María"
        │       ↓
        │       Resultado: María puede crear usuarios
        │
        └→ Rol "Viewer"
            ↓
            └→ Usuario "Carlos"
                ↓
                Resultado: Carlos NO puede crear usuarios
```

### Lo NUEVO y MÁS FÁCIL: Usar Dropdowns

Ahora crear permisos es **mucho más simple**. El formulario te proporciona:

✨ **Dropdown 1**: Selecciona el recurso (users, companies, mappings, etc.)
✨ **Dropdown 2**: Selecciona la acción (view, create, update, delete, etc.)
✨ **Auto-generado**: El sistema crea automáticamente el nombre del permiso
✨ **Descripción**: Solo tienes que explicar qué permite

**Ventajas**:
- ✅ No hay errores de tipografía
- ✅ No hay que recordar el formato exacto
- ✅ Es evidente qué opciones hay disponibles
- ✅ Puedes crear múltiples permisos para el mismo recurso fácilmente

### Paso a Paso: Crear un Permiso

#### 1. Acceder al módulo
- Haz clic en **"Permisos"** en el menú lateral
- Verás una tabla vacía si no hay permisos creados

#### 2. Crear un nuevo Permiso
- Haz clic en **"Create Permission"** (botón azul superior derecho)
- Se abrirá un formulario con dropdowns (NO tienes que escribir nada manualmente)

#### 3. Completar la información

**Campo: Recurso (Resource)** (Obligatorio)
- Haz clic en el dropdown y selecciona sobre QUÉ quieres establecer permisos
- **Opciones disponibles**:
  - `users` → Permisos sobre usuarios
  - `companies` → Permisos sobre empresas
  - `roles` → Permisos sobre roles
  - `permissions` → Permisos sobre permisos
  - `erp-connections` → Permisos sobre conexiones ERP
  - `mappings` → Permisos sobre mappings
  - `sessions` → Permisos sobre sesiones
  - `audit-logs` → Permisos sobre registros de auditoría
  - `reports` → Permisos sobre reportes

**Campo: Acción (Action)** (Obligatorio)
- Después de seleccionar un recurso, haz clic en el segundo dropdown
- Verás las acciones disponibles para ese recurso
- **Acciones típicas**:
  - `view` → Ver/visualizar
  - `create` → Crear nuevos
  - `update` → Editar/modificar
  - `delete` → Eliminar
  - `test` → Probar (solo para ERP Connections y Mappings)
  - `close` → Cerrar (solo para Sessions)
  - `export` → Exportar (solo para Reports)

**Ejemplo práctico**:
1. Selecciona Recurso: `users`
2. Selecciona Acción: `create`
3. El sistema automáticamente genera el nombre: `users:create`
4. El sistema automáticamente asigna la categoría: `users`

**Campo: Descripción** (Obligatorio)
- Una descripción clara de qué permite este permiso
- Escribe en lenguaje natural y claro
- **Ejemplos**:
  - `Permite crear nuevos usuarios en el sistema`
  - `Permite eliminar empresas existentes`
  - `Permite exportar reportes en Excel`
  - `Permite visualizar todos los mappings disponibles`

**Campo: Nombre (auto-generado)**
- **No tienes que escribir nada aquí**
- Se genera automáticamente como: `recurso:acción`
- Ejemplo: `users:create`, `companies:delete`

**Campo: Categoría (auto-generado)**
- **No tienes que escribir nada aquí**
- Se genera automáticamente basado en el recurso
- Ejemplo: Recurso `users` → Categoría `users`

#### 4. Ver la vista previa
- Antes de guardar, verás una sección amarilla que muestra:
  - El nombre que se generará (Ej: `users:create`)
  - La categoría (Ej: `users`)
  - Tu descripción

#### 5. Guardar el Permiso
- Haz clic en **"Guardar Permiso"**
- El permiso se crea y está listo para asignar a roles

#### 6. Crear múltiples permisos para un recurso
- Ahora es muy fácil crear varios permisos para el mismo recurso
- Solo selecciona el recurso una vez, y luego cambia la acción
- Ejemplo: Para `users`:
  1. users:view
  2. users:create
  3. users:update
  4. users:delete

#### 7. Ver un Permiso en la tabla
- En la tabla verás:
  - **Name**: El nombre del permiso (users:create)
  - **Description**: Lo que permite
  - **Category**: La categoría (auto-detectada)
  - **Usado en X roles**: Cuántos roles lo usan

#### 8. Editar un Permiso
- Haz clic en **"Edit"** en la fila
- Modifica los campos necesarios
- Haz clic en **"Guardar Permiso"**
- Los cambios afectan a todos los roles que lo usan

#### 9. Eliminar un Permiso
- Haz clic en **"Delete"** en la fila
- Se pedirá confirmación
- **Nota**: Solo puedes eliminar un permiso si ningún rol lo usa

### Ejemplo Completo: Crear Permiso para Crear Usuarios

**Escenario**: Quieres crear un permiso que permita a ciertos usuarios crear nuevos usuarios

**Pasos**:
1. Ve a **"Permisos"** → "Create Permission"
2. **Recurso**: Selecciona `users` del dropdown
3. **Acción**: Selecciona `create` del dropdown
4. **Descripción**: Escribe `Permite crear nuevos usuarios en el sistema`
5. Verás la vista previa:
   - Nombre: `users:create`
   - Categoría: `users`
   - Descripción: `Permite crear nuevos usuarios en el sistema`
6. Haz clic en "Guardar Permiso"
7. Ahora asigna este permiso a los roles que necesiten crear usuarios:
   - Ve a **"Roles"**
   - Edita el rol "Manager"
   - Agrega el permiso `users:create`
   - Haz clic en "Update Role"
8. **Resultado**: Todos los usuarios con rol "Manager" pueden crear usuarios

### Crear todos los permisos para Usuarios (Ejemplo Completo)

Si quieres crear permisos completos para gestionar usuarios:

**Paso 1**: Ve a "Permisos" → "Create Permission"

**Permiso 1 - Ver usuarios**:
- Recurso: `users`
- Acción: `view`
- Descripción: `Permite ver la lista de usuarios`
- Haz clic en "Guardar Permiso"

**Permiso 2 - Crear usuarios**:
- Recurso: `users`
- Acción: `create`
- Descripción: `Permite crear nuevos usuarios`
- Haz clic en "Guardar Permiso"

**Permiso 3 - Editar usuarios**:
- Recurso: `users`
- Acción: `update`
- Descripción: `Permite editar usuarios existentes`
- Haz clic en "Guardar Permiso"

**Permiso 4 - Eliminar usuarios**:
- Recurso: `users`
- Acción: `delete`
- Descripción: `Permite eliminar usuarios`
- Haz clic en "Guardar Permiso"

**Resultado**: Ahora tienes 4 permisos para usuarios. Puedes asignarlos a diferentes roles según necesites.

### Permisos Comunes (Referencia)

Estos son todos los permisos que puedes crear combinando recursos y acciones:

**Para Usuarios**:
| Permiso | Descripción |
|---------|-------------|
| `users:view` | Ver lista de usuarios |
| `users:create` | Crear nuevos usuarios |
| `users:update` | Editar usuarios existentes |
| `users:delete` | Eliminar usuarios |

**Para Empresas**:
| Permiso | Descripción |
|---------|-------------|
| `companies:view` | Ver empresas |
| `companies:create` | Crear nuevas empresas |
| `companies:update` | Editar empresas |
| `companies:delete` | Eliminar empresas |

**Para Roles**:
| Permiso | Descripción |
|---------|-------------|
| `roles:view` | Ver roles |
| `roles:create` | Crear nuevos roles |
| `roles:update` | Editar roles |
| `roles:delete` | Eliminar roles |

**Para Permisos**:
| Permiso | Descripción |
|---------|-------------|
| `permissions:view` | Ver permisos |
| `permissions:create` | Crear nuevos permisos |
| `permissions:update` | Editar permisos |
| `permissions:delete` | Eliminar permisos |

**Para Conexiones ERP**:
| Permiso | Descripción |
|---------|-------------|
| `erp-connections:view` | Ver conexiones ERP |
| `erp-connections:create` | Crear nuevas conexiones |
| `erp-connections:update` | Editar conexiones |
| `erp-connections:delete` | Eliminar conexiones |
| `erp-connections:test` | Probar conexiones |

**Para Mappings**:
| Permiso | Descripción |
|---------|-------------|
| `mappings:view` | Ver mappings |
| `mappings:create` | Crear nuevos mappings |
| `mappings:update` | Editar mappings |
| `mappings:delete` | Eliminar mappings |
| `mappings:test` | Probar mappings |

**Para Sesiones**:
| Permiso | Descripción |
|---------|-------------|
| `sessions:view` | Ver sesiones activas |
| `sessions:close` | Cerrar sesiones de usuarios |

**Para Auditoría**:
| Permiso | Descripción |
|---------|-------------|
| `audit-logs:view` | Ver registros de auditoría |

**Para Reportes**:
| Permiso | Descripción |
|---------|-------------|
| `reports:view` | Ver reportes |
| `reports:export` | Exportar reportes |

### Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "Resource is required" | No seleccionaste recurso | Selecciona un recurso del primer dropdown |
| "Action is required" | No seleccionaste acción | Selecciona una acción del segundo dropdown |
| "Description is required" | Campo vacío | Escribe una descripción clara del permiso |
| "Can't delete - used in X roles" | El permiso está asignado a roles | Primero remueve el permiso de esos roles |
| El dropdown de acciones está vacío | Debes seleccionar primero un recurso | Selecciona un recurso antes de elegir acción |

### Tips y Buenas Prácticas

✅ **Haz**:
- Usa los dropdowns para seleccionar recursos y acciones (es fácil y sin errores)
- Agrupa permisos por recurso (todos los de users juntos, todos de companies juntos)
- Crea descripciones claras que el usuario promedio pueda entender
- Crea permisos para las 4 acciones básicas: view, create, update, delete
- Piensa en principio de mínimo privilegio (solo permisos necesarios)
- Revisa el ejemplo de "Crear todos los permisos para Usuarios" como guía

❌ **No hagas**:
- Escribir manualmente nombres (usa los dropdowns)
- Crear permisos que nunca usarás
- Permisos muy genéricos (evita nombres como `admin:all`)
- Asignar permisos directamente a usuarios (siempre usa roles como intermediarios)

---

## 7. SESIONES (Sessions)

### ¿Qué es una Sesión?
Una sesión es el período de tiempo en que un usuario está conectado al sistema.

### Información de una Sesión
- **Usuario**: Quién inició sesión
- **Empresa**: A qué empresa pertenece
- **IP Address**: Dirección IP desde donde se conectó
- **User Agent**: Navegador/dispositivo usado
- **Last Activity**: Cuándo fue la última actividad
- **Status**: Activa o inactiva

### Usar el módulo de Sesiones

#### 1. Acceder al módulo
- Haz clic en **"Sesiones"** en el menú lateral

#### 2. Ver sesiones activas
- Se muestra una tabla con todas las sesiones
- Las sesiones activas (current) están marcadas

#### 3. Información útil
- Ver quién está conectado en este momento
- Ver desde qué dispositivos se conectan
- Detectar accesos no autorizados (IPs sospechosas)

#### 4. Cerrar una sesión
- Haz clic en **"Close Session"** (botón rojo)
- Eso desconecta al usuario
- Se pedirá confirmación

#### 5. Filtros
- **Filter by user**: Busca sesiones de un usuario
- **Filter by company**: Filtra por empresa
- **Filter by status**: Muestra solo activas o inactivas

### Caso de Uso: Monitorear Sesiones
- Ve regularmente a este módulo
- Verifica que solo usuarios autorizados estén conectados
- Si encuentras sesiones sospechosas, ciérralas
- Revisa las direcciones IP (¿de dónde se conectan?)

---

## 8. REGISTROS DE AUDITORÍA (Audit Logs)

### ¿Qué es la Auditoría?
Los registros de auditoría registran todas las acciones importantes en el sistema:
- Quién hizo qué
- Cuándo lo hizo
- Qué datos cambió

### Información de un Registro de Auditoría
- **Usuario**: Quién hizo la acción
- **Empresa**: En qué empresa ocurrió
- **Acción**: Qué hizo (CREATE, UPDATE, DELETE, LOGIN)
- **Recurso**: Sobre qué actuó (Users, Companies, Mappings)
- **Descripción**: Detalles de qué cambió
- **Fecha/Hora**: Cuándo ocurrió

### Usar el módulo de Auditoría

#### 1. Acceder al módulo
- Haz clic en **"Registros de Auditoría"** en el menú lateral

#### 2. Ver registros
- Se muestra una tabla con todas las acciones del sistema
- Los registros más recientes aparecen primero

#### 3. Ver detalles de un registro
- Haz clic en una fila para expandirla
- Se muestra:
  - Quién realizó la acción
  - Qué cambió exactamente
  - Valores antes y después (si aplica)

#### 4. Filtros y búsqueda
- **Filter by action**: Solo CREATE, UPDATE, DELETE, LOGIN
- **Filter by resource**: Solo cambios a Users, Companies, etc.
- **Filter by user**: Acciones de un usuario específico
- **Filter by date range**: Entre dos fechas

### Casos de Uso de Auditoría
- **Compliance**: Demostrar quién hizo cambios importantes
- **Debugging**: Encontrar quién eliminó o modificó datos
- **Seguridad**: Detectar acciones no autorizadas
- **Historial**: Ver cómo evolucionó un registro

### Ejemplo: Investigar un cambio
1. Alguien reporta que un usuario fue eliminado
2. Ve a "Auditoría"
3. Filtra por: Resource = "Users", Action = "DELETE"
4. Encuentra quién lo eliminó y cuándo
5. Haz clic en el registro para ver los detalles

---

## PREGUNTAS FRECUENTES

### ¿Qué es "ERP Connection ID" y qué va ahí?

**ERP Connection ID** es el identificador único de la conexión que configuraste en el módulo "ERP Connections".

**¿Qué pasa aquí?**
- Cuando creas una conexión en "ERP Connections" (ejemplo: conectar a tu servidor SAP), el sistema le asigna un ID único
- Este ID es lo que va en el campo "ERP Connection ID" del mapping
- El ID permite que el mapping sepa a qué servidor/ERP conectarse

**Ejemplo**:
1. Creas una conexión ERP llamada "SAP Production":
   - Host: `sap-prod.empresa.com`
   - Port: `50000`
   - Usuario/contraseña: configurados
   - El sistema asigna ID: `cm1v5f2b000001jxt2t8246n4`

2. Luego en Mapping, seleccionas esa conexión:
   - El campo "ERP Connection ID" automáticamente se llena con: `cm1v5f2b000001jxt2t8246n4`

**¿Cómo lo encuentro?**
- Ve a "ERP Connections"
- Cada conexión muestra su ID en la fila (a veces está visible, a veces en detalles)
- En el formulario de Mapping, hay un dropdown que te muestra todas las conexiones disponibles

---

### ¿Qué es "DataSet Type" y cuándo usar cada uno?

**DataSet Type** define **qué tipo de información** vas a sincronizar del ERP. El sistema tiene 5 tipos predefinidos:

| Tipo | Para qué sirve | Ejemplos de datos |
|------|---|---|
| **ITEMS** | Sincronizar el catálogo de productos/artículos | Código de producto, nombre, descripción, unidad de medida |
| **STOCK** | Sincronizar existencias/inventario | Cantidad disponible en almacén, stock mínimo, stock máximo |
| **COST** | Sincronizar costos | Costo unitario, costo de fabricación, costo de transporte |
| **PRICE** | Sincronizar precios | Precio de venta, precio por cliente, precio de lista |
| **DESTINATION** | Sincronizar ubicaciones | Almacenes, sucursales, centros de distribución, puntos de venta |

**¿Cómo sé cuál elegir?**

Depende de QUÉ datos quieres traer del ERP:

**Si tu pregunta es**: "Quiero traer la lista de productos"
→ Usa **ITEMS**

**Si tu pregunta es**: "Quiero traer cuánta cantidad hay en stock"
→ Usa **STOCK**

**Si tu pregunta es**: "Quiero traer el costo de cada producto"
→ Usa **COST**

**Si tu pregunta es**: "Quiero traer los precios de venta"
→ Usa **PRICE**

**Si tu pregunta es**: "Quiero traer la lista de almacenes/sucursales"
→ Usa **DESTINATION**

**Ejemplo práctico**:
- Si necesitas sincronizar todo (productos Y precios Y stock)
- Creas **3 mappings separados**:
  1. Mapping 1: DataSet Type = ITEMS (trae producto, nombre, descripción)
  2. Mapping 2: DataSet Type = PRICE (trae código producto y precio)
  3. Mapping 3: DataSet Type = STOCK (trae código producto y cantidad)

---

### ¿Puedo tener varias "tablas de origen" en un mapping?

**Sí**, en el campo **"Source Tables"** puedes incluir:

**Una tabla simple**:
```
SAP.PUBLIC.PRODUCTS
```

**Múltiples tablas** (separadas por coma):
```
SAP.PUBLIC.PRODUCTS, SAP.PUBLIC.PRODUCT_PRICES
```

**Mejor aún, usa una Query SQL** en el campo "Source Query":
```sql
SELECT
  p.PRODUCT_ID,
  p.PRODUCT_NAME,
  pp.PRICE
FROM SAP.PUBLIC.PRODUCTS p
LEFT JOIN SAP.PUBLIC.PRODUCT_PRICES pp ON p.PRODUCT_ID = pp.PRODUCT_ID
WHERE p.ACTIVE = 1
```

Esto te permite combinar datos de múltiples tablas, aplicar filtros, y transformarlos antes de sincronizar.



### ¿Cómo cambio mi contraseña?
- Actualmente solo el administrador puede cambiar contraseñas
- Pide al administrador que actualice tu contraseña

### ¿Qué diferencia hay entre Rol y Permiso?
- **Rol**: Es un conjunto de permisos (Ej: "Admin")
- **Permiso**: Es una acción específica (Ej: "users:create")
- Un usuario obtiene permisos a través de los roles que se le asignan

### ¿Puedo pertenecer a múltiples empresas?
- Actualmente cada usuario pertenece a una sola empresa
- Si necesitas acceso a otra, se te debe crear otro usuario en esa empresa

### ¿Qué pasa si elimino un mapping?
- Se detiene la sincronización
- Los datos ya sincronizados NO se borran
- El mapping se puede recrear sin afectar los datos existentes

### ¿Qué pasa si elimino una conexión ERP?
- Se detiene la sincronización de todos los mappings que la usan
- Los datos ya sincronizados NO se borran
- No puedes eliminar si hay mappings que la usan

### ¿Cómo veo qué usuarios están activos ahora?
- Ve al módulo "Sesiones"
- Verás todos los usuarios conectados
- Muestra IP, navegador y última actividad

### ¿Puedo exportar datos o reportes?
- El módulo "Reports" está disponible
- Aquí puedes generar reportes y exportar en diferentes formatos

### ¿Por cuánto tiempo se guardan los registros de auditoría?
- Se guardan indefinidamente
- Puedes filtrar por fecha para búsquedas más rápidas

### ¿Qué tan seguido se sincronizan los datos?
- Depende de la "Sync Frequency" que configuraste en el mapping
- Opciones: Real-time, Hourly, Daily, Weekly, Monthly

### ¿Qué ocurre si la conexión ERP falla?
- Se registra en los logs
- La sincronización se reintenta automáticamente
- Revisa el estado en "ERP Connections"

### ¿Puedo cambiar el tipo de ERP de un mapping?
- No, debes eliminar y recrear el mapping
- Pero los datos sincronizados permanecen

### ¿Quién puede ver la auditoría?
- Solo usuarios con el permiso `audit:view`
- Típicamente el rol "Admin"

---

## RESUMEN DE FLUJOS COMUNES

### Flujo 1: Configurar un Nuevo Sistema ERP

1. **Crear Empresa** → "Empresas" → "Add Company"
2. **Crear Conexión ERP** → "ERP Connections" → "Add Connection" → Probar conexión
3. **Crear Mapping** → "Mapping" → "Add Mapping" → Seleccionar conexión
4. **Crear Usuarios** → "Usuarios" → "Add User" → Asignar empresa y roles
5. **Asignar Permisos** → "Roles" → Editar rol → Agregar permisos
6. **Monitorear** → "Auditoría" y "Sesiones"

### Flujo 2: Agregar un Nuevo Usuario

1. Ve a "Usuarios" → "Add User"
2. Completa datos: Nombre, Email, Empresa
3. Asigna roles (Ej: "Manager")
4. El usuario recibe email con credenciales
5. Primer login: Accede con email y contraseña temporal
6. Puede cambiar contraseña si lo desea

### Flujo 3: Sincronizar Datos desde SAP

1. Ve a "ERP Connections"
2. Crea una conexión a SAP (prueba primero)
3. Ve a "Mapping"
4. Crea un mapping:
   - Entity: "Customers"
   - Source: Tabla de SAP
   - Target: Tabla local
   - Frequency: Según necesites
5. El sistema sincroniza automáticamente

### Flujo 4: Auditar un Cambio

1. Ve a "Registros de Auditoría"
2. Filtra por recurso, acción o usuario
3. Busca el cambio que investigas
4. Expande el registro para ver detalles
5. Verifica valores antes/después

---

## TIPS Y BUENAS PRÁCTICAS

### 1. Seguridad
- ✅ Cambia tu contraseña regularmente
- ✅ Usa contraseñas fuertes (12+ caracteres, símbolos, números)
- ✅ No compartas credenciales
- ✅ Revisa regularmente "Sesiones" para detectar accesos no autorizados

### 2. Mapping/Sincronización
- ✅ Prueba las conexiones ERP antes de crear mappings
- ✅ Comienza con DAILY o WEEKLY, luego ajusta a REALTIME si es necesario
- ✅ Monitorea la auditoría para ver si hay errores de sincronización

### 3. Gestión de Usuarios
- ✅ Asigna solo los permisos necesarios (principio de mínimo privilegio)
- ✅ Usa roles para agrupar permisos relacionados
- ✅ Desactiva usuarios cuando se van (no los elimines)

### 4. Auditoría
- ✅ Revisa regularmente los registros de auditoría
- ✅ Investiga acciones sospechosas inmediatamente
- ✅ Usa auditoría para training (enseña a otros cómo se usa)

---

## CONTACTO Y SOPORTE

Si necesitas ayuda:
1. Consulta este manual (MANUAL_DE_USO.md)
2. Ve a "Registros de Auditoría" para ver si alguien ya hizo algo similar
3. Contacta al administrador del sistema

---

## APÉNDICE A: REFERENCIA RÁPIDA DE MAPPING

### Dataset Types Explicados

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| **ITEMS** | Artículos/Productos del catálogo | Código producto, nombre, descripción |
| **STOCK** | Cantidades en inventario | Cantidad disponible, stock mínimo, stock máximo |
| **COST** | Costos de productos | Costo unitario, costo de fabricación, costo histórico |
| **PRICE** | Precios de venta | Precio lista, precio cliente, precio promoción |
| **DESTINATION** | Ubicaciones/Almacenes | Almacén principal, sucursal, centro de distribución |

### Transformaciones Comunes

Ejemplos de transformaciones que puedes usar:

```
// Convertir a mayúsculas
UPPER(${sourceField})

// Convertir a minúsculas
LOWER(${sourceField})

// Multiplicar por factor (ej: margen de ganancia)
CAST(${sourceField} AS DECIMAL) * 1.25

// Redondear a 2 decimales
ROUND(${sourceField}, 2)

// Concatenar valores
CONCAT(${sourceField}, ' - ', 'texto fijo')

// Extraer parte de string (primeros 10 caracteres)
SUBSTRING(${sourceField}, 1, 10)

// Reemplazar valores
REPLACE(${sourceField}, 'viejo', 'nuevo')

// Condicional (si es NULL, usa valor por defecto)
COALESCE(${sourceField}, 'valor_default')

// Convertir fecha a formato ISO
CONVERT(VARCHAR, ${sourceField}, 23)
```

### Tipos de Datos

| Tipo | Uso | Ejemplos de Valores |
|------|-----|-------------------|
| **STRING** | Texto | "Producto A", "Santiago", "activo" |
| **INT** | Números enteros | 100, -50, 0 |
| **DECIMAL** | Números decimales | 99.99, 1234.50, 0.001 |
| **DATE** | Fechas | 2026-02-20, 2025-12-31 |
| **BOOLEAN** | Verdadero/Falso | true, false, 1, 0 |

### Errores Comunes en Mapping

| Problema | Causa | Solución |
|----------|-------|----------|
| "Field not found in source" | El nombre del campo fuente no existe en la tabla ERP | Verifica el nombre exacto en SAP/MSSQL/Oracle |
| "Type mismatch" | El tipo de dato no coincide con los datos reales | Ajusta el Data Type (STRING si es texto aunque sea número) |
| "Transformation error" | La fórmula de transformación tiene sintaxis incorrecta | Revisa la sintaxis SQL, usa ${sourceField} correctamente |
| "No data synchronized" | El filtro está eliminando todos los datos | Elimina o modifica el filtro, revisa la lógica |

---

## APÉNDICE B: CASOS DE USO AVANZADOS

### Caso 1: Sincronizar Solo Productos Activos

**Escenario**: Solo quieres sincronizar productos cuyo estado es "ACTIVO"

**Configuración**:
- **Dataset Type**: ITEMS
- **Source Tables**: PRODUCTS
- **Source Query**: `SELECT * FROM PRODUCTS WHERE STATUS = 'ACTIVO'`
- **Field Mappings**: (como necesites)

**Resultado**: Solo los productos activos se sincronizan a tu BD local

---

### Caso 2: Aplicar Margen de Ganancia en Precios

**Escenario**: El ERP tiene precios de costo, pero necesitas agregar un margen del 30%

**Configuración**:
- **Dataset Type**: PRICE
- **Source Tables**: PRODUCT_COSTS
- **Field Mappings**:
  - Source: `PRODUCT_ID` → Target: `id` (INT)
  - Source: `COST_PRICE` → Target: `selling_price` (DECIMAL)
    - **Transformation**: `CAST(${sourceField} AS DECIMAL) * 1.30`

**Resultado**: Cada precio de costo se multiplica por 1.30 (margen del 30%)

---

### Caso 3: Consolidar Datos de Múltiples Tablas

**Escenario**: Los precios vienen de una tabla y la disponibilidad de otra

**Configuración**:
- **Dataset Type**: PRICE
- **Source Tables**: PRODUCTS, INVENTORY
- **Source Query**:
```sql
SELECT
  p.PRODUCT_ID,
  p.PRODUCT_NAME,
  p.PRICE,
  i.QUANTITY_AVAILABLE
FROM PRODUCTS p
LEFT JOIN INVENTORY i ON p.PRODUCT_ID = i.PRODUCT_ID
WHERE p.ACTIVE = 1
```

**Resultado**: Datos de ambas tablas se sincronizan en un solo mapping

---

### Caso 4: Filtrar por Fecha de Actualización

**Escenario**: Solo sincronizar productos que se actualizaron en los últimos 7 días

**Configuración**:
- **Dataset Type**: ITEMS
- **Source Query**:
```sql
SELECT * FROM PRODUCTS
WHERE LAST_MODIFIED >= DATEADD(day, -7, GETDATE())
```

**Resultado**: Solo cambios recientes se sincronizan

---

## RESUMEN DE FLUJOS COMUNES (ACTUALIZADO)

### Flujo 1: Configurar un Nuevo Mapping

1. Ve a **"ERP Connections"** → Crea/selecciona una conexión
2. Prueba la conexión (Test Connection) para validar acceso
3. Ve a **"Mapping"** → "Add Mapping"
4. Completa:
   - **ERP Connection ID**: Tu conexión ERP
   - **Dataset Type**: Tipo de datos a sincronizar
   - **Source Tables**: Tabla(s) del ERP
   - **Source Query**: (Opcional) Filtros/transformaciones SQL
   - **Field Mappings**: Mapeo de campos
5. Haz clic en **"Create Mapping"**
6. Usa **"Test Mapping"** para validar
7. Revisa los datos en la tabla de vista previa

---

**Última actualización**: Febrero 2026
**Versión**: 1.1
**Mantenedor**: Equipo de CiguaInv
