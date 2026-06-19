FROM node:20-alpine
WORKDIR /app

# Dependencias del sistema:
#   python3/make/g++ → compilar módulos nativos (bcrypt)
#   openssl          → requerido por el query engine de Prisma en Alpine
RUN apk add --no-cache python3 make g++ openssl

# Activar pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copiar manifiestos del workspace (aprovecha cache de capas Docker)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./

# Copiar paquetes del monorepo necesarios para el backend
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Instalar todas las dependencias (node-linker=hoisted → flat node_modules)
RUN pnpm install --frozen-lockfile

# Build: prisma generate (descarga binarios para linux-musl) + tsc
RUN pnpm -F @cigua-inv/backend build

EXPOSE 3000

# 1. Aplicar migraciones pendientes contra la DB de producción
# 2. Arrancar el servidor
CMD ["sh", "-c", \
  "node_modules/.bin/prisma migrate deploy \
     --schema=apps/backend/prisma/schema.prisma \
  && node apps/backend/dist/server.js"]
