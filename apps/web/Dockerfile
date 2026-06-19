# ── Stage 1: Build React ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copiar manifiestos del workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./

# Copiar paquetes necesarios para el web
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Build: tsc + vite build → genera apps/web/dist/
RUN pnpm -F @cigua-inv/web build

# ── Stage 2: Servir con nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

# Copiar el build estático
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copiar la configuración de nginx del contenedor
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
