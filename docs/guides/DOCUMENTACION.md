# 📚 Documentación - Cigua Inversiones ERP

## 🎯 Índice de Documentación

Aquí encontrarás toda la información necesaria para usar, instalar y desarrollar en la aplicación Cigua Inversiones ERP.

---

## 📖 Documentos Disponibles

### 1. 🚀 [README_INSTALACION.md](./README_INSTALACION.md)
**Para**: Desarrolladores que necesitan instalar la aplicación por primera vez

**Contiene**:
- Requisitos del sistema
- Instalación paso a paso
- Configuración de base de datos
- Migraciones y seed
- Ejecución de servidores
- Estructura del proyecto
- Comandos útiles de desarrollo

**Leer si**: Acabas de recibir el proyecto y necesitas hacerlo funcionar.

---

### 2. 📘 [GUIA_USO.md](./GUIA_USO.md)
**Para**: Usuarios finales y administradores de la aplicación

**Contiene**:
- Login y autenticación
- Descripción de los 9 módulos
- Cómo usar cada módulo
- Guía de operaciones comunes
- Datos de usuario inicial
- Tips y mejores prácticas

**Leer si**: Eres usuario final o necesitas aprender a usar la aplicación.

---

### 3. 🔗 [API_REFERENCE.md](./API_REFERENCE.md)
**Para**: Desarrolladores backend y API integrators

**Contiene**:
- Lista completa de endpoints
- Parámetros de cada endpoint
- Ejemplos de request/response
- Códigos HTTP
- Ejemplos cURL
- Autenticación

**Leer si**: Necesitas integrar con el API o entender los endpoints.

---

### 4. 🆘 [PREGUNTAS_FRECUENTES.md](./PREGUNTAS_FRECUENTES.md)
**Para**: Cualquiera que encuentre un problema

**Contiene**:
- Problemas comunes y soluciones
- Errores del backend
- Errores del frontend
- Cómo limpiar y empezar de cero
- Checklist de debug
- Pasos finales si nada funciona

**Leer si**: Algo no funciona y necesitas solucionar el problema.

---

## 🗺️ Mapa de Navegación por Caso de Uso

### 👨‍💻 "Soy desarrollador y quiero instalar la aplicación"
```
1. Lee: README_INSTALACION.md (pasos 1-7)
2. Ejecuta: Comandos de instalación
3. Lee: API_REFERENCE.md (para entender endpoints)
4. Comienza: Desarrollo
```

### 👤 "Soy usuario final y necesito usar la aplicación"
```
1. Lee: GUIA_USO.md (secciones Inicio Rápido y Módulos)
2. Login: admin@cigua.com / admin123456
3. Explora: Cada módulo según tus necesidades
4. Ayuda: PREGUNTAS_FRECUENTES.md si hay problemas
```

### 🔌 "Necesito integrar mi API con este sistema"
```
1. Lee: README_INSTALACION.md (estructura arquitectura)
2. Lee: API_REFERENCE.md (endpoints completos)
3. Lee: API_REFERENCE.md (ejemplos cURL)
4. Integra: Usa los ejemplos como referencia
```

### 🐛 "Algo no funciona"
```
1. Ve: PREGUNTAS_FRECUENTES.md
2. Busca: Tu error específico
3. Sigue: La solución propuesta
4. Aún roto?: Chequea el checklist de debug
5. Último recurso: Limpiar y empezar de cero
```

### 🔧 "Quiero desarrollar un nuevo módulo"
```
1. Lee: README_INSTALACION.md (estructura proyecto)
2. Lee: API_REFERENCE.md (ver patrón de otros módulos)
3. Analiza: Un módulo existente (ej: companies)
4. Copia: Estructura y adapta
5. Prueba: Con ejemplos de API_REFERENCE.md
```

---

## 🎓 Resumen Rápido por Documento

| Documento | Duración | Público | Nivel |
|-----------|----------|---------|-------|
| README_INSTALACION | 30 min | Devs | Beginner |
| GUIA_USO | 20 min | Todos | Beginner |
| API_REFERENCE | 15 min (lectura rápida) | Devs | Intermediate |
| PREGUNTAS_FRECUENTES | As needed | Todos | Beginner |

---

## 🔑 Información Crítica

### Credenciales de Prueba
```
Email:    admin@cigua.com
Password: admin123456
Empresa:  Cigua Inversiones
Rol:      Admin
```

### URLs
```
Frontend:  http://localhost:5173
Backend:   http://localhost:3000
BD:        postgresql://postgres:eli112910@localhost:5432/cigua_inv
```

### Puertos
```
Frontend:  5173
Backend:   3000
PostgreSQL: 5432
```

### Módulos del Sistema (9 total)
```
1. Auth          - Login/Logout/Refresh tokens
2. Companies     - Gestión de empresas
3. Users         - Gestión de usuarios
4. Roles         - Definición de roles
5. Permissions   - Control de permisos
6. Sessions      - Gestión de sesiones
7. Audit Logs    - Registros de auditoría
8. ERP Conn.     - Conexiones a ERP
9. Config Map.   - Mapeo de configuraciones
```

---

## 🚀 Inicio Rápido (3 pasos)

### Paso 1: Instalar
```bash
cd d:\proyectos\app\ciguaInv
pnpm install
pnpm -F @cigua-inv/backend exec prisma migrate reset --force
```

### Paso 2: Ejecutar (2 terminales)
```bash
# Terminal 1
pnpm -F @cigua-inv/backend dev

# Terminal 2
pnpm -F @cigua-inv/web dev
```

### Paso 3: Usar
```
Abre: http://localhost:5173
Email: admin@cigua.com
Pass: admin123456
```

**¡Listo!** ✅

---

## 📚 Tabla de Contenidos Completa

### README_INSTALACION.md
- Requisitos del sistema
- Instalación inicial
- Configuración de PostgreSQL
- Variables de entorno
- Instalar dependencias
- Migraciones y seed
- Ejecutar aplicación
- Estructura del proyecto
- Arquitectura API
- Base de datos
- Troubleshooting
- Deployment

### GUIA_USO.md
- Inicio rápido
- Login y autenticación
- 9 Módulos descritos:
  - Companies
  - Users
  - Roles
  - Permissions
  - ERP Connections
  - Config Mapping
  - Sessions
  - Audit Logs
  - Auth
- Guía de operaciones
- Ejemplos de API
- Configuración avanzada
- Solución de problemas
- Estadísticas del sistema
- Tips y mejores prácticas

### API_REFERENCE.md
- Base URL
- Autenticación
- 9 Módulos con endpoints:
  - Auth (3 endpoints)
  - Companies (5 endpoints)
  - Users (6 endpoints)
  - Roles (7 endpoints)
  - Permissions (6 endpoints)
  - ERP Connections (5 endpoints)
  - Sessions (7 endpoints)
  - Audit Logs (4 endpoints)
  - Config Mapping (4 endpoints)
- Códigos HTTP
- Ejemplos cURL

### PREGUNTAS_FRECUENTES.md
- Backend errors
- Frontend errors
- Problemas de sincronización
- Limpiar y empezar de cero
- Checklist de debug
- Pasos de troubleshooting

---

## 🎯 Donde Encontrar Información Específica

**¿Cómo loguear?**
→ GUIA_USO.md > Login y Autenticación

**¿Cómo crear una empresa?**
→ GUIA_USO.md > Guía de Operaciones

**¿Cuál es el endpoint de companies?**
→ API_REFERENCE.md > COMPANIES

**¿Qué hacer si no puedo conectar a BD?**
→ PREGUNTAS_FRECUENTES.md > Error Cannot connect

**¿Cómo instalar la app?**
→ README_INSTALACION.md > Instalación Inicial

**¿Cuál es la estructura del proyecto?**
→ README_INSTALACION.md > Estructura del Proyecto

**¿Cómo se autentica?**
→ API_REFERENCE.md > Autenticación

**¿Qué bases de datos soporta?**
→ README_INSTALACION.md > Base de Datos

**¿Cuántos módulos hay?**
→ GUIA_USO.md > Módulos Disponibles (9 módulos)

**¿Cómo resetear la contraseña?**
→ PREGUNTAS_FRECUENTES.md > Login fallido

---

## 🔄 Flujo de Trabajo Típico

```
Día 1: Instalación
├─ Lee: README_INSTALACION.md
├─ Ejecuta: Comandos de instalación
└─ Verifica: Backend y Frontend corriendo

Día 2: Aprendizaje
├─ Lee: GUIA_USO.md
├─ Prueba: Login y navegación
├─ Explora: Cada módulo
└─ Lee: Tips y mejores prácticas

Día 3: Desarrollo
├─ Lee: API_REFERENCE.md
├─ Analiza: Estructura de módulos
├─ Estudia: Un módulo existente
└─ Comienza: Desarrollo personalizado

Durante: Cualquier problema
├─ Consulta: PREGUNTAS_FRECUENTES.md
├─ Aplica: Solución propuesta
└─ Vuelve: Al trabajo
```

---

## 💬 Preguntas Frecuentes Más Comunes

### "¿Por dónde empiezo?"
→ Lee [GUIA_USO.md](./GUIA_USO.md) > Inicio Rápido

### "No puedo loguear"
→ Lee [PREGUNTAS_FRECUENTES.md](./PREGUNTAS_FRECUENTES.md) > Login fallido

### "¿Cuáles son los endpoints?"
→ Lee [API_REFERENCE.md](./API_REFERENCE.md)

### "¿Cómo agrego un nuevo módulo?"
→ Lee [README_INSTALACION.md](./README_INSTALACION.md) > Estructura del Proyecto

### "¿Cómo despliego a producción?"
→ Lee [README_INSTALACION.md](./README_INSTALACION.md) > Deployment

### "¿Qué tecnologías usa?"
→ Lee [README_INSTALACION.md](./README_INSTALACION.md) > Requisitos

---

## 📞 Soporte y Ayuda

1. **Revisa primero**: [PREGUNTAS_FRECUENTES.md](./PREGUNTAS_FRECUENTES.md)
2. **Busca en**: [API_REFERENCE.md](./API_REFERENCE.md) para endpoints
3. **Consulta**: Logs del backend y console del navegador (F12)
4. **Último recurso**: Limpiar y empezar de cero (ver FAQ)

---

## 📈 Próximos Pasos Recomendados

### Para Usuarios
1. Loguear con credenciales default
2. Explorar módulo de Empresas
3. Crear una empresa de prueba
4. Crear un usuario
5. Asignar roles

### Para Desarrolladores
1. Instalar la aplicación
2. Revisar estructura del proyecto
3. Estudiar un módulo existente
4. Crear un endpoint nuevo
5. Escribir tests

### Para Integradores
1. Revisar API_REFERENCE.md
2. Probar endpoints con Postman/Insomnia
3. Implementar autenticación
4. Integrar endpoints necesarios
5. Hacer testing en staging

---

## ✅ Checklist Post-Lectura

- [ ] He leído la documentación relevante a mi rol
- [ ] He instalado la aplicación (si soy dev)
- [ ] He podido loguear exitosamente
- [ ] Entiendo cómo funcionan los módulos
- [ ] Sé dónde encontrar ayuda
- [ ] He guardado las credenciales de acceso
- [ ] He anotado los puertos (3000, 5173, 5432)

---

## 🎉 ¡Listo para Comenzar!

Elige tu rol y ve al documento correspondiente:

- 👨‍💻 **Desarrollador**: [README_INSTALACION.md](./README_INSTALACION.md)
- 👤 **Usuario Final**: [GUIA_USO.md](./GUIA_USO.md)
- 🔌 **Integrador API**: [API_REFERENCE.md](./API_REFERENCE.md)
- 🐛 **Con Problemas**: [PREGUNTAS_FRECUENTES.md](./PREGUNTAS_FRECUENTES.md)

**¡Bienvenido a Cigua Inversiones ERP!** 🚀

---

*Última actualización: 20 de febrero de 2026*
*Versión: 1.0*
*Estado: Estable ✅*

