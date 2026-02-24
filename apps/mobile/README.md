# Cigua Inventory Mobile

Aplicación móvil para conteo físico de inventario usando React Native + Expo.

## 🚀 Requisitos

- Node.js 16+
- pnpm (para monorepo)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app en tu dispositivo móvil (iOS/Android)

## 📦 Instalación

```bash
# Instalar dependencias
pnpm install

# En la carpeta mobile
cd apps/mobile
pnpm install
```

## 🎯 Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm dev

# O especificar plataforma
pnpm android  # Android
pnpm ios      # iOS
pnpm web      # Web
```

Abre **Expo Go** en tu dispositivo y escanea el código QR que aparecerá en la terminal.

## 📁 Estructura

```
src/
├── app/                    # Rutas principales (expo-router)
│   ├── _layout.tsx        # Layout raíz
│   ├── index.tsx          # Splash screen
│   ├── auth/
│   │   └── login.tsx      # Pantalla de login
│   └── (tabs)/            # Navegación por tabs
│       ├── _layout.tsx    # Layout de tabs
│       ├── inventory-counts.tsx
│       └── settings.tsx
├── auth/                  # Autenticación
├── db/                    # Base de datos local (SQLite)
├── sync/                  # Sincronización con API
└── services/              # Servicios (API client, etc)
```

## 🔌 API Configuration

Configura la URL del servidor en **Configuración**:

```
Desarrollo: http://192.168.1.XXX:3000/api (tu IP local)
Producción: https://tu-servidor.com/api
```

## 📱 Funcionalidades

- ✅ Autenticación
- 📦 Listado de conteos
- 📝 Edición de conteos
- 🔄 Sincronización automática
- ⚙️ Configuración

## 🛠️ Proximas Features

- Detalle de conteo con tabla de items
- Escaneo de códigos de barras
- Sync offline-first
- Reportes

## 📝 Notas

- La app se ejecuta en desarrollo sin problemas
- En producción necesita compilación nativa (EAS Build)
- Compatible con iOS 12.4+ y Android 5.1+
