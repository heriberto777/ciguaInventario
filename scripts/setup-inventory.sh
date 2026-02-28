#!/bin/bash
# Script para configurar la base de datos con los nuevos módulos de inventario

echo "🚀 Iniciando setup de módulos de inventario..."
echo ""

cd apps/backend

echo "📦 Ejecutando Prisma Migration..."
npx prisma migrate dev --name add_inventory_modules

if [ $? -ne 0 ]; then
  echo "❌ Error en la migración de Prisma"
  exit 1
fi

echo ""
echo "✅ Migración completada"
echo ""
echo "📊 Generando Prisma Client..."
npx prisma generate

echo ""
echo "🎯 Setup completado exitosamente!"
echo ""
echo "Nuevos módulos disponibles:"
echo "  ✅ Warehouses (Almacenes)"
echo "  ✅ Inventory Counts (Conteos)"
echo "  ✅ Variance Reports (Varianzas)"
echo "  ✅ Adjustments (Ajustes)"
echo ""
echo "📚 Documentación:"
echo "  - docs/features/INVENTORY_FEATURES.md (Descripción completa de módulos)"
echo "  - docs/archive/IMPLEMENTATION_SUMMARY.md (Resumen de implementación)"
echo ""
echo "🚀 Para iniciar el backend:"
echo "  cd ../.. && pnpm -F @cigua-inv/backend dev"
echo ""
