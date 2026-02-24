#!/usr/bin/env bash
# Cigua Inventory - Project Integrity Verification Script

echo ""
echo "🔍 CIGUA INVENTORY - VERIFICACIÓN DE INTEGRIDAD"
echo "=================================================="
echo ""

TOTAL_FILES=0
TOTAL_DIRS=0
ERRORS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check directories
echo "📁 Verificando directorios..."
REQUIRED_DIRS=(
  "apps/backend/src"
  "apps/backend/prisma"
  "apps/web/src"
  "apps/mobile/src"
  "packages/shared/src"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $dir"
    ((TOTAL_DIRS++))
  else
    echo -e "${RED}✗${NC} $dir"
    ((ERRORS++))
  fi
done

echo ""
echo "📄 Verificando archivos críticos..."
REQUIRED_FILES=(
  "README.md"
  "ARCHITECTURE.md"
  "API_EXAMPLES.md"
  "DELIVERABLES.md"
  "CHECKLIST_FINAL.md"
  "docker-compose.yml"
  ".env.example"
  "pnpm-workspace.yaml"
  "tsconfig.base.json"
  "apps/backend/package.json"
  "apps/backend/src/app.ts"
  "apps/backend/src/server.ts"
  "apps/backend/prisma/schema.prisma"
  "apps/web/package.json"
  "apps/web/src/App.tsx"
  "packages/shared/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "${RED}✗${NC} $file"
    ((ERRORS++))
  fi
done

echo ""
echo "📦 Verificando módulos backend..."
BACKEND_MODULES=(
  "apps/backend/src/modules/auth/controller.ts"
  "apps/backend/src/modules/auth/routes.ts"
  "apps/backend/src/modules/config-mapping/controller.ts"
  "apps/backend/src/modules/config-mapping/service.ts"
  "apps/backend/src/modules/config-mapping/repository.ts"
  "apps/backend/src/modules/config-mapping/schemas.ts"
  "apps/backend/src/modules/config-mapping/erp-connector.ts"
  "apps/backend/src/modules/config-mapping/sql-builder.ts"
)

for module in "${BACKEND_MODULES[@]}"; do
  if [ -f "$module" ]; then
    echo -e "${GREEN}✓${NC} $module"
  else
    echo -e "${RED}✗${NC} $module"
    ((ERRORS++))
  fi
done

echo ""
echo "🎨 Verificando componentes frontend..."
FRONTEND_COMPONENTS=(
  "apps/web/src/components/atoms/Button.tsx"
  "apps/web/src/components/molecules/Card.tsx"
  "apps/web/src/components/organisms/MappingEditor.tsx"
  "apps/web/src/pages/LoginPage.tsx"
  "apps/web/src/pages/MappingPage.tsx"
  "apps/web/src/store/auth.ts"
  "apps/web/src/hooks/useApi.ts"
  "apps/web/src/services/api.ts"
)

for component in "${FRONTEND_COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    echo -e "${GREEN}✓${NC} $component"
  else
    echo -e "${RED}✗${NC} $component"
    ((ERRORS++))
  fi
done

echo ""
echo "🔐 Verificando seguridad..."
SECURITY_FILES=(
  "apps/backend/src/guards/tenant.ts"
  "apps/backend/src/plugins/auth.ts"
  "apps/backend/src/plugins/audit.ts"
  "apps/backend/src/utils/errors.ts"
)

for file in "${SECURITY_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file"
    ((ERRORS++))
  fi
done

echo ""
echo "=================================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ VERIFICACIÓN COMPLETADA - TODO CORRECTO${NC}"
  echo ""
  echo "📊 Estadísticas:"
  echo "   • Directorios: $TOTAL_DIRS"
  echo "   • Archivos críticos: $TOTAL_FILES"
  echo "   • Errores: 0"
  echo ""
  echo "🚀 El proyecto está listo para usar:"
  echo "   1. cd ciguaInv"
  echo "   2. pnpm install"
  echo "   3. cp .env.example .env"
  echo "   4. docker-compose up -d"
  echo "   5. pnpm -F @cigua-inv/backend prisma:migrate"
  echo "   6. pnpm dev"
else
  echo -e "${RED}❌ VERIFICACIÓN FALLIDA${NC}"
  echo "   Errores encontrados: $ERRORS"
  exit 1
fi

echo ""
