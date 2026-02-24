# ⚡ QUICK START - LO QUE NECESITAS SABER

## 🔗 URLs Importantes

| Elemento | URL |
|----------|-----|
| Backend API | http://10.0.11.49:3000 |
| Swagger Docs | http://localhost:3000/docs |
| Mobile App | Expo Go (emulador) |

## 👤 Credenciales de Prueba

```
Email:    admin@cigua.com
Password: admin123456
```

## 📂 Estructura de Carpetas

```
apps/
├── mobile/              ← App React Native
│   ├── src/
│   │   ├── app/        ← Pantallas (Expo Router)
│   │   │   ├── auth/   ← Login
│   │   │   ├── (tabs)/ ← Navegación principal
│   │   │   └── _layout.tsx ← Root layout
│   │   ├── hooks/      ← Custom hooks (useInventory, etc)
│   │   ├── services/   ← API client, offline sync
│   │   └── components/ ← Componentes reutilizables
│   └── package.json
│
└── backend/             ← API Fastify
    ├── src/
    │   ├── modules/    ← Lógica (inventory-counts, auth, etc)
    │   ├── plugins/    ← Prisma, Auth JWT, CORS
    │   └── server.ts   ← Punto de entrada
    ├── prisma/         ← Schema BD y seed
    └── package.json
```

## 🔧 Comandos Importantes

### Backend
```bash
cd apps/backend

# Iniciar servidor (en terminal 1)
npm run dev

# Ver datos en interfaz gráfica
npm run prisma:studio

# Llenar BD con datos de prueba
npm run seed
```

### Mobile
```bash
cd apps/mobile

# Iniciar Expo (en terminal 2)
npx expo start -c --android

# En la app presiona:
# 'r' - recargar
# 'w' - toggle web
# 'q' - salir
```

## 📱 Flujo de la App (Actual)

```
1. Splash Screen
   ↓
2. Auth Check (¿hay token?)
   ↓ SI          ↓ NO
3. Tabs           Login Screen
   ↓              ↓
4. Conteos     (usuario ingresa credenciales)
               ↓
              Guarda token en AsyncStorage
              ↓
              Va a Tabs
```

## 🎨 Pantallas Implementadas

| Pantalla | Ruta | Estado | Funciona |
|----------|------|--------|----------|
| Login | `auth/login` | ✅ | Sí |
| Conteos | `(tabs)/inventory-counts` | ⚠️ | Parcial |
| Detalle Conteo | `(tabs)/count-detail` | ⚠️ | Parcial |
| Ajustes | `(tabs)/settings` | ✅ | Sí |

## 🔌 APIs Backend Disponibles

### Autenticación
```
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Conteos
```
GET    /inventory-counts              ← Listar
POST   /inventory-counts              ← Crear
GET    /inventory-counts/:id          ← Obtener
POST   /inventory-counts/:id/start    ← Iniciar
POST   /inventory-counts/:id/complete ← Completar
```

### Items de Conteo
```
GET    /inventory-counts/:id/items           ← Listar
POST   /inventory-counts/:id/items           ← Agregar
PATCH  /inventory-counts/:id/items/:itemId   ← Actualizar cantidad
DELETE /inventory-counts/:id/items/:itemId   ← Eliminar
GET    /inventory-counts/:id/variance-items  ← Solo con diferencia
```

## 🐛 Solucionar Problemas

### La app se congela en splash screen
- Reinicia el emulador
- `npx expo start -c --android` (opción -c limpia caché)

### Error 401 en login
- Usuario/contraseña incorrecta
- Revisa que backend esté corriendo

### Error "Cannot get /inventory-counts"
- Backend NO está corriendo
- Abre otra terminal y: `cd apps/backend && npm run dev`

### Cambiar IP del backend
- En `settings` de la app
- O editar: `apps/mobile/src/app/auth/login.tsx` (línea 14)

## 📝 Próximos Pasos

1. ✅ Validar que login funcione → **YA HECHO**
2. ⏭️ Mejorar pantalla de conteos (PASO 1)
3. ⏭️ Crear pantalla "Crear Conteo" (PASO 2)
4. ⏭️ Reescribir detalle conteo (PASO 3)
5. ⏭️ Agregar navegación (PASO 4)

Ver: `PLAN_IMPLEMENTACION_FASE_1_MOBILE.md`

## 💾 Archivos Importantes para Editar

```
apps/mobile/src/
├── app/(tabs)/inventory-counts.tsx   ← Listar conteos
├── app/(tabs)/count-detail.tsx       ← Detalle conteo
├── app/(tabs)/create-count.tsx       ← [CREAR NUEVO]
├── hooks/useInventory.ts             ← ✅ Hooks listos
└── services/api.ts                   ← Axios client

apps/backend/src/
└── modules/inventory-counts/
    ├── routes.ts                     ← ✅ Endpoints
    ├── controller.ts                 ← ✅ Controladores
    └── service.ts                    ← ✅ Lógica
```

## 🎯 Meta Semanal

| Día | Tarea |
|-----|-------|
| Hoy | ✅ Login funcional |
| Mañana | 🎯 Pantalla conteos mejorada |
| +1 día | 🎯 Crear conteo |
| +2 días | 🎯 Detalle + editar |
| +3 días | 🎯 MVP funcional |

---

**¿Listo para continuar con PASO 1?** 🚀
