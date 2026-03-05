# 🔐 Guía Maestra de Permisos: Control Total RBAC 360°

Esta guía es el documento de referencia oficial para todos los permisos disponibles en el sistema Cigua Inventory. Los permisos están diseñados bajo el principio de **Privilegio Mínimo** y **Denegación por Defecto**.

---

## 🛡️ Seguridad y Usuarios
Control de acceso al núcleo administrativo y gestión de identidad.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `users:view` | Seguridad | Ver lista de usuarios vinculados a la empresa. | Acceso a la página de Usuarios. |
| `users:create` | Seguridad | Crear nuevos perfiles de usuario. | Botón **+ Nuevo Usuario**. |
| `users:edit` | Seguridad | Modificar datos de usuarios existentes. | Botón **Editar** en tabla de usuarios. |
| `users:delete` | Seguridad | Eliminar usuarios (Acción destructiva). | Botón **Eliminar** en tabla de usuarios. |
| `users:manage` | Seguridad | Acceso total a la lógica de usuarios. | Bypass de restricciones de usuario. |
| `roles:view` | Seguridad | Listar roles y ver qué permisos tienen. | Acceso a la configuración de Roles. |
| `roles:manage` | Seguridad | Crear, editar roles y mapear permisos. | Guardado de configuraciones de Rol. |
| `permissions:view` | Seguridad | Ver el catálogo maestro de permisos. | Tabla de selección de permisos en un Rol. |
| `sessions:view` | Seguridad | Ver quién está conectado actualmente. | Panel de Control de Sesiones. |
| `sessions:delete` | Seguridad | Terminar sesiones remotamente (Kick). | Botón de cierre de sesión forzoso. |

---

## 🏢 Almacenes y Logística
Definición de la estructura física donde reside el inventario.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `warehouses:view` | Almacenes | Listar almacenes y sus códigos. | Acceso a la página de Almacenes. |
| `warehouses:manage` | Almacenes | Crear o modificar centros logísticos. | Botón **Nuevo Almacén** / Guardar edición. |
| `locations:view` | Almacenes | Ver estantes y pasillos dentro de un almacén. | Detalle de ubicaciones físicas. |
| `locations:manage` | Almacenes | Gestionar el layout físico (Pasillos/Cajas). | Botones de gestión de ubicaciones. |
| `classifications:view` | Almacenes | Ver Marcas, Categorías y Subcategorías. | Acceso a Clasificaciones. |
| `classifications:manage` | Almacenes | ABM de taxonomía de productos. | Botones Nueva/Editar/Sinc/Excel. |

---

## 📦 Procesos de Inventario (Físico)
Control del flujo de trabajo operativo de conteos.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `inv_counts:view` | Inventario | Ver listado de procesos de conteo. | Acceso a historial y conteos activos. |
| `inv_counts:create` | Inventario | Iniciar un nuevo proceso de inventario. | Botón **Nuevo Inventario**. |
| `inv_counts:execute` | Inventario | Registrar cantidades (Crítico para App móvil). | Input de teclado en Conteos (App/Web). |
| `inv_counts:complete` | Inventario | Entregar conteo para revisión final. | Botón **Entregar/Completar Conteo**. |
| `inv_counts:approve` | Inventario | Supervisor aprueba los resultados finales. | Botón de Firma/Aprobación de Varianza. |
| `inv_counts:finalize` | Inventario | Cierre administrativo de periodos contables. | Cambio de estado legal a "Finalizado". |
| `inv_counts:reactivate` | Inventario | Reabrir un conteo cerrado (Excepcional). | Botón de Reactivación en historial. |
| `inv_counts:new_version` | Inventario | Crear segundas/terceras vueltas de conteo. | Botón de **Nueva Versión** (Re-conteo). |
| `inv_counts:reserved_invoices` | Inventario | Vincular facturas ERP a conteos físicos. | Pestaña **Despachos/Facturas Reservadas**. |

---

## 🧿 Privacidad y Blind Count (Datos Sensibles)
Permisos de visibilidad selectiva para evitar sesgos u ocultar información financiera.

| Permiso | Categoría | Descripción Técnica | Impacto en la UI |
| :--- | :--- | :--- | :--- |
| `inventory:view_qty` | Privacidad | Ver stock teórico del sistema. | **Blind Count**: Si falta, oculta el stock teórico. |
| `inventory:view_costs` | Privacidad | Ver costos de compra unitarios. | Oculta columnas de Costo en tablas/reportes. |
| `inventory:view_prices` | Privacidad | Ver precios de venta pública. | Oculta columnas de Precio de Venta. |
| `inventory:view_variances` | Privacidad | Ver diferencias (+/-) y %. | Oculta indicadores de varianza en tiempo real. |
| `inventory:edit_items` | Privacidad | Modificar datos de productos en vuelo. | Habilita edición de descripciones en conteos. |

---

## 🔌 Integración ERP y Query Explorer
Gestión de datos de bajo nivel y comunicación entre sistemas.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `erp_conn:view` | ERP | Ver detalles de servidores base de datos. | Acceso a Configuración de Conexión ERP. |
| `erp_conn:manage` | ERP | Alterar parámetros de conexión SQL. | Botón **Guardar Conexión** (Crítico). |
| `mappings:view` | ERP | Ver reglas de traducción de campos. | Visualizar mapeos de importación. |
| `mappings:manage` | ERP | Crear nuevas reglas de mapeo de datos. | Botón **Guardar Mapeo** en Query Explorer. |
| `sync:inventory` | ERP | Gatillar carga de ítems desde el ERP. | Botón **Importar desde ERP**. |
| `sync:erp` | ERP | Enviar resultados de varianza al ERP. | Botón **🚀 Enviar a ERP** al finalizar. |
| `queries:execute` | ERP | Ejecutar SQL puro contra la base de datos. | Botón **Ejecutar** en Query Explorer. |

---

## 🤖 Inteligencia Artificial
Nuevas capacidades de análisis generativo.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `ai:chat` | AI | Acceso al Chatbot interactivo. | Burbuja/Ventana de Chat IA. |
| `ai:audit` | AI | Generación de análisis de mermas complejos. | Botón **Analizar con IA** en Audit Hub. |
| `ai:config` | AI | Modificar el comportamiento de la IA. | Configuración de prompts de personalidad. |

---

## ⚙️ Sistema e Identidad
Personalización y mantenimiento global.

| Permiso | Categoría | Descripción Técnica | Uso en la UI |
| :--- | :--- | :--- | :--- |
| `branding:manage` | Sistema | Control de identidad visual. | Subida de Logo y selección de colores. |
| `companies:manage` | Sistema | Gestión de múltiples empresas/sedes. | Formulario de datos fiscales y sucursales. |
| `settings:manage` | Sistema | Configuración técnica del servidor Node. | Acceso a logs críticos y variables entorno. |
| `admin:view` | Sistema | Acceso general al panel de control. | Entrada general a la ruta `/admin`. |

---
*Documento generado automáticamente el 04 de Marzo de 2026.*
