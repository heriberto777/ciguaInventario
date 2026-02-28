# 🚀 INSTRUCCIONES DE INICIO - FASE 2 (APP MÓVIL)

**Documento:** Quick Start para Equipo de Desarrollo Móvil
**Fecha:** 22 de Febrero de 2026
**Duración:** 8-10 semanas

---

## 📌 ANTES DE COMENZAR

### Lectura Obligatoria (30 minutos)
```
1. EXECUTIVE_SUMMARY_VERSIONING_AND_MOBILE.md      (5 min)
2. MOBILE_INVENTORY_ARCHITECTURE.md                (10 min)
3. VERSIONING_API_ENDPOINTS.md                     (10 min)
4. MOBILE_APP_PLANNING_DETAILED.md (Resumen)       (5 min)
```

### Decisiones Necesarias (1 hora)
```
□ Framework: React Native vs Flutter vs Nativo
□ Timeline: ¿8 semanas o 12 semanas?
□ Equipo: ¿Dedicado o part-time?
□ Scope: ¿V1 en iOS/Android o solo Android?
```

---

## 🎯 OBJETIVO FASE 2

Desarrollar aplicación móvil que:
1. Descargue conteos desde servidor
2. Permita contar items en almacén (offline)
3. Sincronice datos al servidor
4. Soporte múltiples versiones de conteo
5. Funcione sin internet

---

## 🗓️ TIMELINE SUGERIDO

### SEMANA 1: Setup
```
Duración: 40 horas
Tareas:
  □ Setup proyecto React Native (Expo o Bare)
  □ Setup Redux Toolkit + persist
  □ Setup Axios + interceptors
  □ Setup SQLite local DB
  □ Estructura de carpetas
  □ Setup de CI/CD (GitHub Actions)

Deliverable: Proyecto listo, builds exitosos
```

### SEMANA 2: Autenticación
```
Duración: 35 horas
Tareas:
  □ Login screen UI
  □ Integration con /auth/login
  □ Token management (SecureStore)
  □ Session persistence
  □ Logout funcional
  □ Auth guards en rutas

Deliverable: Login/Logout funcional
```

### SEMANA 3-4: Conteo V1
```
Duración: 90 horas
Tareas:
  □ Download de items (GET /inventory-counts/{id}/items)
  □ Almacenar en SQLite
  □ Pantalla lista de items
  □ Item input (numpad)
  □ Validaciones
  □ Search/filter
  □ Progress bar

Deliverable: Conteo completo funcional
```

### SEMANA 5: Sincronización
```
Duración: 55 horas
Tareas:
  □ Detectar conexión (NetInfo)
  □ Sync service
  □ Queue offline
  □ Retry logic
  □ UI de progreso
  □ Manejo de errores

Deliverable: Sync completo offline/online
```

### SEMANA 6: Recontas (V2+)
```
Duración: 40 horas
Tareas:
  □ Download variance-items
  □ UI diferenciada para recontas
  □ Logic para V2, V3...
  □ Submit count V2+
  □ Mostrar varianzas previas

Deliverable: Recontas funcionales
```

### SEMANA 7: Testing
```
Duración: 50 horas
Tareas:
  □ Unit tests (40% cobertura)
  □ Integration tests
  □ E2E tests (Detox)
  □ Bug fixes
  □ Performance optimization

Deliverable: App testado y optimizado
```

### SEMANA 8: Deployment
```
Duración: 30 horas
Tareas:
  □ Build APK/IPA
  □ Testing en device
  □ Versioning (1.0.0)
  □ Deployment a TestFlight/Play Store
  □ Documentación para app store

Deliverable: App en stores/distribución
```

---

## 💻 SETUP INICIAL

### Option A: React Native (Recomendado)

#### Paso 1: Crear proyecto
```bash
# Opción 1: Expo (más fácil)
npx create-expo-app CiguaInventarioApp
cd CiguaInventarioApp

# Opción 2: Bare (más control)
npx react-native init CiguaInventarioApp
cd CiguaInventarioApp
```

#### Paso 2: Instalar dependencias principales
```bash
npm install @reduxjs/toolkit react-redux
npm install axios
npm install @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/native-stack
npm install native-base
npm install react-native-netinfo
npm install zod
npm install sqlite3 (or realm)
npm install expo-secure-store (si Expo)
```

#### Paso 3: Estructura de carpetas
```bash
mkdir -p src/{components,screens,services,store,hooks,db,utils,types}
mkdir -p src/store/slices
mkdir -p src/services
```

### Option B: Flutter

```bash
flutter create cigua_inventario_app
cd cigua_inventario_app
```

(Agregar dependencias en pubspec.yaml)

---

## 📁 ESTRUCTURA DE PROYECTO RECOMENDADA

```
CiguaInventarioApp/
├── src/
│   ├── components/
│   │   ├── LoginScreen.tsx
│   │   ├── CountingScreen.tsx
│   │   ├── ItemList.tsx
│   │   ├── ItemInput.tsx
│   │   ├── SyncStatus.tsx
│   │   └── SummaryCard.tsx
│   │
│   ├── screens/
│   │   ├── AuthStack.tsx
│   │   ├── AppStack.tsx
│   │   └── RootNavigator.tsx
│   │
│   ├── services/
│   │   ├── api.ts        # HTTP client con axios
│   │   ├── auth.ts       # Auth logic
│   │   ├── sync.ts       # Sync logic
│   │   ├── storage.ts    # Local storage
│   │   └── network.ts    # Network detection
│   │
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── countSlice.ts
│   │   │   └── itemsSlice.ts
│   │   └── store.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCount.ts
│   │   └── useSync.ts
│   │
│   ├── db/
│   │   ├── sqlite.ts
│   │   └── queries.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   │
│   └── App.tsx
│
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── app.json
└── README.md
```

---

## 🔌 INTEGRACIÓN CON BACKEND

### Endpoints que necesitas consumir

```typescript
// Tipos
interface InventoryCount {
  id: string;
  code: string;
  locationId: string;
  currentVersion: number;
  items: CountItem[];
}

interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty_V1?: number;
  countedQty_V2?: number;
  uom: string;
}

// Endpoints
const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',

  // Counts
  GET_COUNT: '/inventory-counts/{id}',
  LIST_COUNTS: '/inventory-counts',

  // Items
  GET_ITEMS: '/inventory-counts/{id}/items',
  GET_VARIANCE_ITEMS: '/inventory-counts/{id}/variance-items',

  // Submit
  SUBMIT_COUNT: '/inventory-counts/{id}/submit-count',
  NEW_VERSION: '/inventory-counts/{id}/new-version',

  // History
  VERSION_HISTORY: '/inventory-counts/{id}/version-history',
};
```

---

## 🔑 AUTENTICACIÓN

### Flujo de login

```typescript
// 1. Usuario ingresa email/password
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });

  // 2. Guardar token encriptado
  await SecureStore.setItemAsync('jwt_token', response.token);

  // 3. Guardar user info en Redux
  dispatch(setUser(response.user));

  // 4. Navegar a AppStack
  navigation.reset({ routes: [{ name: 'AppStack' }] });
};

// 5. En cada request, incluir token
api.defaults.headers.Authorization = `Bearer ${token}`;
```

---

## 💾 ALMACENAMIENTO LOCAL

### SQLite Schema

```sql
-- Items
CREATE TABLE IF NOT EXISTS count_items (
  id TEXT PRIMARY KEY,
  countId TEXT NOT NULL,
  itemCode TEXT NOT NULL,
  itemName TEXT,
  systemQty DECIMAL,
  countedQty_V1 DECIMAL,
  countedQty_V2 DECIMAL,
  uom TEXT,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY(countId) REFERENCES inventory_counts(id)
);

-- Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  countId TEXT,
  version INTEGER,
  payload JSON,
  status TEXT DEFAULT 'PENDING',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 FLUJO DE SINCRONIZACIÓN

```typescript
// 1. Detectar cambio de conexión
const { isConnected, isInternetReachable } = useNetInfo();

useEffect(() => {
  if (isConnected && isInternetReachable) {
    // 2. Obtener items sin sincronizar
    const unsyncedItems = await db.getUnsyncedItems();

    // 3. Compilar payload
    const payload = {
      version: 1,
      locationId,
      items: unsyncedItems,
    };

    // 4. Enviar al servidor
    try {
      await api.post(`/inventory-counts/${countId}/submit-count`, payload);

      // 5. Marcar como sincronizado
      await db.markAsSynced(unsyncedItems.map(i => i.id));
    } catch (error) {
      // 6. Reintentar más tarde
      console.error('Sync failed:', error);
    }
  }
}, [isConnected]);
```

---

## ✅ CHECKLIST SEMANA 1

- [ ] Proyecto creado y estructurado
- [ ] Redux Toolkit funcionando
- [ ] Axios configurado con interceptors
- [ ] SQLite inicializado
- [ ] SecureStore funcionando
- [ ] Build exitoso (Android/iOS)
- [ ] Git repository creado
- [ ] CI/CD configurado (opcional)

---

## ✅ CHECKLIST SEMANA 2

- [ ] Login screen diseñada
- [ ] POST /auth/login integrado
- [ ] Token guardado encriptado
- [ ] Token enviado en requests
- [ ] Logout funcional
- [ ] Session persistence
- [ ] Auth guards en rutas
- [ ] Error handling en auth

---

## ✅ CHECKLIST SEMANA 3-4

- [ ] GET /inventory-counts/{id}/items integrado
- [ ] Items guardados en SQLite
- [ ] Pantalla de lista de items
- [ ] Búsqueda por código/nombre
- [ ] Filtros (todos/contados/pendientes)
- [ ] Numpad para ingresar cantidad
- [ ] Validación de formato
- [ ] Progress bar
- [ ] UI responsive

---

## 📊 TESTING

### Unit Tests
```typescript
describe('Auth Service', () => {
  it('should login with valid credentials', async () => {
    const result = await authService.login('test@test.com', 'pass123');
    expect(result.token).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Sync Flow', () => {
  it('should sync items when online', async () => {
    // Agregar items
    // Marcar como online
    // Verificar que sincronizó
  });
});
```

### E2E Tests
```typescript
describe('Complete Counting Flow', () => {
  it('should complete full workflow', async () => {
    // Login
    // Download items
    // Count items
    // Sync
    // Verify in DB
  });
});
```

---

## 🐛 DEBUGGING

### Herramientas recomendadas
```
- React Native Debugger
- Flipper
- Redux DevTools
- Network Interceptor (axios)
```

### Logs útiles
```typescript
// En api.ts
api.interceptors.response.use(
  response => {
    console.log('✓ Response:', response.config.url, response.status);
    return response;
  },
  error => {
    console.error('✗ Error:', error.config.url, error.message);
    return Promise.reject(error);
  }
);
```

---

## 🚨 ERRORES COMUNES

### Error 1: Token expirido
```typescript
// Solución: Refresh token automático
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      return api.request(error.config);
    }
  }
);
```

### Error 2: Items no sincronizando
```
Verificar:
□ ¿Token válido?
□ ¿Conexión activa?
□ ¿Formato de payload correcto?
□ ¿Items en SQLite?
```

### Error 3: UI congelada durante sync
```typescript
// Solución: Usar background tasks
import BackgroundTimer from 'react-native-background-timer';

BackgroundTimer.runBackgroundTimer(() => {
  syncService.sync();
}, 300000); // Cada 5 minutos
```

---

## 📱 DEPLOYMENT

### Android
```bash
# Build APK
eas build --platform android

# Versioning: 1.0.0 (major.minor.patch)
# En app.json: "version": "1.0.0"

# Upload a Play Store Console
```

### iOS
```bash
# Build IPA
eas build --platform ios

# Requiere Apple Developer Account
# Upload a TestFlight
```

---

## 📞 CONTACTO DURANTE DESARROLLO

```
Preguntas sobre API:
→ Ver: VERSIONING_API_ENDPOINTS.md

Problemas de integration:
→ Ver: BACKEND_VERSIONING_IMPLEMENTATION_COMPLETE.md

Dudas de arquitectura:
→ Ver: MOBILE_APP_PLANNING_DETAILED.md

Issues técnicos con backend:
→ Contactar: [Backend Team]
```

---

## 🎉 FIN DE SEMANAS

Después de cada semana:
```
□ Demo del progreso
□ Feedback del equipo
□ Ajuste de scope si necesario
□ Planning de próxima semana
```

---

## 📚 REFERENCIAS

- `VERSIONING_API_ENDPOINTS.md` - API details
- `MOBILE_APP_PLANNING_DETAILED.md` - Arquitectura
- Backend repo: `apps/backend/src/modules/inventory-counts/`
- API Base: `http://localhost:3000/api` (dev)

---

**¡ADELANTE CON LA FASE 2!** 🚀

Estamos aquí para apoyar el desarrollo. Las bases están listas.

