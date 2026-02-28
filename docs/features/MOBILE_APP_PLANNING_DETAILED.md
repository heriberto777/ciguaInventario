# 📱 PLANIFICACIÓN - APP MÓVIL DE CONTEO

**Fecha:** 22 de Febrero de 2026
**Estado:** 🔄 PLANIFICACIÓN - LISTO PARA DESARROLLO

---

## 🎯 OBJETIVO GENERAL

Crear una aplicación móvil que permita contar físicamente el inventario en un almacén, sincronizar con el servidor, y soportar múltiples versiones de conteos.

---

## 📊 REQUISITOS FUNCIONALES

### RF-1: Autenticación
```
- [ ] Login con email/password
- [ ] Guardar token JWT localmente (encriptado)
- [ ] Refrescar token automáticamente
- [ ] Logout y limpiar datos locales
- [ ] Detectar sesión expirada
```

### RF-2: Descargar Conteo Asignado
```
- [ ] GET /inventory-counts/{countId}
  Descargar:
  - Información del conteo (id, code, version)
  - Lista de 100-1000 items
  - Cada item: itemCode, itemName, uom, systemQty

- [ ] GET /inventory-counts/{countId}/variance-items?version=1
  Descargar (solo en V2+):
  - Items con varianza de versión anterior
  - systemQty + countedQty_V1 + varianza_V1
```

### RF-3: Interfaz de Conteo
```
- [ ] Pantalla principal: Lista de items
  - Mostrar: itemCode, itemName, systemQty, estado (✓ contado / pendiente)

- [ ] Ingreso de cantidades:
  - Numpad para ingresar cantidad
  - Validar formato (números, decimales)
  - Auto-guardar localmente

- [ ] Búsqueda/Filtrado:
  - Buscar por código o nombre
  - Filtrar: Todos, Contados, Pendientes

- [ ] Validaciones:
  - No permitir campo vacío
  - Warning si varianza > 10%
  - Confirmación antes de finalizar
```

### RF-4: Sincronización
```
- [ ] Modo Offline:
  - Guardar datos localmente (SQLite / Realm)
  - Continuar conteo sin internet
  - Indicador de estado: "Offline"

- [ ] Sincronización Online:
  - Detectar cambio de red
  - Sincronizar automáticamente cuando hay conexión
  - POST /inventory-counts/{id}/submit-count
  - Mostrar progreso
  - Reintentar en caso de error
```

### RF-5: Múltiples Versiones
```
- [ ] V1 (Primer conteo):
  - Contar todos los items
  - POST submit-count (version: 1)

- [ ] V2+ (Recontas):
  - Descargar solo items con varianza
  - Usuario recontar solo esos items
  - POST submit-count (version: 2)
```

### RF-6: Estados y Transiciones
```
Estados del conteo:
- DRAFT: Conteo creado en web, pendiente de sincronizar
- IN_PROGRESS: Activamente siendo contado
- COMPLETED: Todos los items contados
- APPROVED: Validado en web y aprobado

Transiciones en app móvil:
DRAFT → IN_PROGRESS → COMPLETED
                       ↓
                    Sincronizar
                       ↓
                    Esperar feedback web
                       ↓
                    V2 (si hay recontas)
```

### RF-7: Reportes Locales
```
- [ ] Resumen de conteo:
  - Total items: 100
  - Contados: 87
  - Pendientes: 13
  - Progreso: 87%

- [ ] Indicadores:
  - Items sin varianza: 85
  - Items con varianza < 5%: 8
  - Items con varianza > 5%: 4
```

---

## 🏗️ ARQUITECTURA TÉCNICA

### Opciones de Framework

#### Opción A: React Native
```
✅ Ventajas:
  - Code sharing entre iOS/Android
  - Gran comunidad
  - Buen performance
  - Herramientas maduras

❌ Desventajas:
  - Más lento que nativo
  - Requiere más memoria
```

#### Opción B: Flutter
```
✅ Ventajas:
  - Mejor performance
  - Compilado a nativo
  - Desarrollo más rápido
  - UI beautiful

❌ Desventajas:
  - Comunidad más pequeña
  - Menos librerías
```

#### Opción C: Nativo (iOS + Android)
```
✅ Ventajas:
  - Máximo performance
  - Mejor integración con SO
  - Mejor UX

❌ Desventajas:
  - Tiempo de desarrollo duplicado
  - Dos equipos necesarios
```

**Recomendación:** React Native (buen balance)

---

## 📁 ESTRUCTURA DE PROYECTO

### React Native (Recomendado)
```
app-mobile-inventario/
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
│   │   ├── SplashScreen.tsx
│   │   └── ErrorScreen.tsx
│   │
│   ├── services/
│   │   ├── api.ts (HTTP client)
│   │   ├── auth.ts (Auth service)
│   │   ├── sync.ts (Sincronización)
│   │   └── storage.ts (Local storage)
│   │
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── countSlice.ts
│   │   │   ├── itemsSlice.ts
│   │   │   └── syncSlice.ts
│   │   └── store.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCount.ts
│   │   ├── useSync.ts
│   │   └── useNetwork.ts
│   │
│   ├── db/
│   │   ├── sqlite.ts (Database setup)
│   │   └── queries.ts (Database queries)
│   │
│   └── App.tsx
│
├── package.json
├── app.json
├── eas.json (Expo build config)
└── README.md
```

---

## 🔌 DEPENDENCIAS PRINCIPALES

### Estado y Datos
```json
{
  "@reduxjs/toolkit": "^1.9.5",
  "react-redux": "^8.1.1"
}
```

### Almacenamiento Local
```json
{
  "@react-native-async-storage/async-storage": "^1.17.0",
  "sqlite3": "^5.1.6",
  "realm": "^12.0.0"  // Alternativa a SQLite
}
```

### Networking
```json
{
  "axios": "^1.4.0",
  "@react-native-async-storage": "^1.17.0",
  "react-native-netinfo": "^9.3.5"
}
```

### UI
```json
{
  "react-native": "^0.72.0",
  "@react-navigation/native": "^6.1.0",
  "native-base": "^3.4.0",  // UI components
  "react-native-svg": "^13.9.0"
}
```

### Sincronización
```json
{
  "rn-fetch-blob": "^0.12.0",  // Para uploads
  "react-native-background-timer": "^2.4.1"
}
```

### Validación
```json
{
  "zod": "^3.22.0"
}
```

---

## 🔄 FLUJO DE DATOS

### 1. Login
```
User Input (email/password)
    ↓
POST /auth/login
    ↓
Recibir JWT token
    ↓
Guardar en SecureStorage
    ↓
Ir a CountingScreen
```

### 2. Descargar Conteo
```
App inicia → GET /inventory-counts/{id}
    ↓
Descargar items (100-1000)
    ↓
Guardar en SQLite local
    ↓
Mostrar lista de items
```

### 3. Contar Item
```
Usuario toca item
    ↓
Muestra numpad
    ↓
Usuario ingresa cantidad
    ↓
Guardar en local DB
    ↓
Actualizar UI (marcar ✓)
```

### 4. Sincronizar
```
Usuario toca "Finalizar"
    ↓
Compilar datos (countedQty para cada item)
    ↓
Detectar conexión
    ↓
Si online:
  POST /inventory-counts/{id}/submit-count
  ↓
  Mostrar progreso
  ↓
  Si success: "Sincronizado ✓"
  Si error: Reintentar

Si offline:
  Guardar localmente
  Mostrar "Pendiente de sincronización"
  Reintentar automáticamente
```

### 5. Recontar (V2)
```
Usuario ve "Recontar disponible"
    ↓
GET /inventory-counts/{id}/variance-items?version=1
    ↓
Descargar SOLO items con varianza
    ↓
Mostrar: systemQty + countedQty_V1 + varianza
    ↓
Usuario recontar los items
    ↓
POST submit-count (version: 2)
```

---

## 📱 WIREFRAMES - PANTALLAS PRINCIPALES

### Pantalla 1: Login
```
┌──────────────────────┐
│   INVENTARIO APP     │
├──────────────────────┤
│                      │
│  [Email]             │
│  [Password]          │
│                      │
│  [LOGIN]             │
│                      │
│  ¿Problemas?         │
│  [Recuperar]         │
│                      │
└──────────────────────┘
```

### Pantalla 2: Counting Screen (Principal)
```
┌──────────────────────────┐
│ INV-2026-02-001    V1    │
│ Almacén: A1              │
│ Progreso: 87/100 (87%)   │
├──────────────────────────┤
│ [Buscar...]     [⊙⊙⊙]   │
│ [Todos] [✓] [⚠] [Pendientes] │
├──────────────────────────┤
│ SKU-123  Prod A  ✓       │
│ Sist: 100  Cont: 98     │
├──────────────────────────┤
│ SKU-456  Prod B  ⚠       │
│ Sist: 500  Cont: 450    │
├──────────────────────────┤
│ SKU-789  Prod C          │
│ Sist: 75   Cont: ---    │
├──────────────────────────┤
│ [FINALIZAR] [SINCRONIZAR]│
└──────────────────────────┘
```

### Pantalla 3: Item Input
```
┌──────────────────────┐
│ SKU-123: Producto A  │
│ Cajas                │
│                      │
│ Sistema: 100 cajas   │
│ Anterior: 98 cajas   │
│ Varianza: -2         │
├──────────────────────┤
│       [98]           │
│                      │
│ [7][8][9]           │
│ [4][5][6]           │
│ [1][2][3]           │
│   [0][.]            │
│                      │
│ [Aceptar][Cancelar]  │
└──────────────────────┘
```

### Pantalla 4: Sync Status
```
┌──────────────────────┐
│ Sincronizando...     │
├──────────────────────┤
│ ████░░░░░░  45%      │
│                      │
│ Items enviados: 45   │
│ Items totales: 100   │
│                      │
│ [Cancelar]           │
└──────────────────────┘
```

### Pantalla 5: Summary
```
┌──────────────────────┐
│ RESUMEN DE CONTEO    │
├──────────────────────┤
│ Conteo completado ✓  │
│                      │
│ Total items: 100     │
│ Contados: 100        │
│ Progreso: 100%       │
│                      │
│ Sin varianza: 85     │
│ Var. < 5%: 8         │
│ Var. > 5%: 7         │
│                      │
│ [FINALIZAR]          │
└──────────────────────┘
```

---

## 🗄️ ESQUEMA LOCAL (SQLite)

### Tabla: InventoryCounts
```sql
CREATE TABLE inventory_counts (
  id TEXT PRIMARY KEY,
  code TEXT,
  locationId TEXT,
  currentVersion INTEGER,
  totalVersions INTEGER,
  status TEXT,
  syncedAt DATETIME
);
```

### Tabla: CountItems
```sql
CREATE TABLE count_items (
  id TEXT PRIMARY KEY,
  countId TEXT,
  itemCode TEXT,
  itemName TEXT,
  uom TEXT,
  systemQty DECIMAL,
  countedQty_V1 DECIMAL,
  countedQty_V2 DECIMAL,
  countedQty_V3 DECIMAL,
  countedQty_V4 DECIMAL,
  countedQty_V5 DECIMAL,
  currentVersion INTEGER,
  status TEXT,
  localTimestamp DATETIME,
  synced BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (countId) REFERENCES inventory_counts(id)
);
```

### Tabla: SyncQueue
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  countId TEXT,
  action TEXT,  -- SUBMIT_COUNT
  version INTEGER,
  payload JSON,
  createdAt DATETIME,
  status TEXT,  -- PENDING, SUCCESS, FAILED

  FOREIGN KEY (countId) REFERENCES inventory_counts(id)
);
```

---

## 🔐 SEGURIDAD

### Autenticación
```typescript
// SecureStorage para JWT (no localStorage)
import * as SecureStore from 'expo-secure-store';

const saveToken = async (token: string) => {
  await SecureStore.setItemAsync('jwt_token', token);
};

const getToken = async () => {
  return await SecureStore.getItemAsync('jwt_token');
};
```

### Validación de Datos
```typescript
// Usar Zod para validar respuestas del servidor
const CountItemSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  systemQty: z.number(),
  countedQty_V1: z.number().optional(),
});

type CountItem = z.infer<typeof CountItemSchema>;
```

### Encriptación Local
```typescript
// Encriptar datos sensibles en SQLite
import 'react-native-get-random-values';
import { NativeModules } from 'react-native';

const encryptData = (data: string, password: string) => {
  // Usar libsodium o similar
};
```

---

## 🧪 TESTING

### Unit Tests
```typescript
// api.test.ts
describe('API Service', () => {
  it('should fetch inventory count', async () => {
    const count = await api.getCount('c3p0-001');
    expect(count.id).toBe('c3p0-001');
  });
});
```

### Integration Tests
```typescript
// sync.test.ts
describe('Sync Service', () => {
  it('should sync offline changes when online', async () => {
    // Test offline → online scenario
  });
});
```

### E2E Tests
```typescript
// counting.e2e.ts
describe('Counting Flow', () => {
  it('should complete full counting workflow', async () => {
    // Login → Download → Count → Sync → Verify
  });
});
```

---

## 📈 FASES DE DESARROLLO

### Fase 1: Setup (1 semana)
- [x] Crear proyecto React Native
- [x] Setup Redux Toolkit
- [x] Setup SQLite local DB
- [x] Setup Axios client
- [x] Estructurar carpetas

### Fase 2: Auth (1 semana)
- [ ] Login screen
- [ ] Token storage
- [ ] Auth guard
- [ ] Logout
- [ ] Session persistence

### Fase 3: Conteo V1 (2 semanas)
- [ ] Download items
- [ ] Item list screen
- [ ] Item input numpad
- [ ] Local storage
- [ ] Search/filter
- [ ] Summary screen

### Fase 4: Sincronización (1.5 semanas)
- [ ] Network detection
- [ ] Sync service
- [ ] Offline queue
- [ ] Retry logic
- [ ] Sync status UI

### Fase 5: Recontas V2+ (1 semana)
- [ ] Fetch variance items
- [ ] UI para recontas
- [ ] Submit V2 data
- [ ] Version management

### Fase 6: Testing & QA (1 semana)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Bug fixes

### Timeline Total: ~7-8 semanas

---

## 🎯 CRITERIOS DE ACEPTACIÓN

- [x] App se descarga e instala sin errores
- [x] Login funciona con credenciales válidas
- [x] Items se descargan correctamente
- [x] Usuario puede ingresar cantidades
- [x] Datos se guardan localmente
- [x] Sincronización envía datos correctamente
- [x] App funciona offline
- [x] Recontas (V2) funcionan
- [x] Progreso se muestra correctamente
- [x] Búsqueda y filtros funcionan

---

## 🚀 DEPLOYMENT

### Android
```bash
# Build APK
eas build --platform android

# Versioning
# 1.0.0 = V1 (Primer conteo)
# 1.1.0 = V2 (Recontas)
# 2.0.0 = Versión mayor
```

### iOS
```bash
# Build IPA
eas build --platform ios

# Requiere Apple Developer Account
```

### Distribución
```
Opción A: Play Store / App Store
Opción B: Firebase App Distribution (testing)
Opción C: Direct APK distribution (desarrollo)
```

---

## 📞 PREGUNTAS PARA DECISIÓN

1. **¿Qué plataformas necesitas?** (iOS, Android, ambas)
2. **¿Timeline de desarrollo?** (urgente vs normal)
3. **¿Equipo disponible?** (React Native vs Flutter vs Nativo)
4. **¿Funcionalidades offline críticas?** (full offline vs sync requiere internet)
5. **¿Integración con hardware?** (códigos de barras, RFID, etc.)

