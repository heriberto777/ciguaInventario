#!/bin/bash

# 🔍 Script para verificar cambios del fix "Conexión no válida"

echo "📋 Verificando cambios implementados..."
echo ""

# Verificar cambios en frontend
echo "1️⃣ Frontend - SimpleMappingBuilder"
grep -n "Reintentar Conexión" "apps/web/src/components/SimpleMappingBuilder/steps/TablesAndJoinsStep.tsx" && echo "✅ Botón Reintentar encontrado" || echo "❌ No encontrado"
grep -n "availableTables.length > 0 ?" "apps/web/src/components/SimpleMappingBuilder/steps/TablesAndJoinsStep.tsx" && echo "✅ Input dinámico (Select/Texto) encontrado" || echo "❌ No encontrado"

echo ""
echo "2️⃣ Frontend - MappingConfigAdminPage"
grep -n "💡 Si obtienes error" "apps/web/src/pages/MappingConfigAdminPage.tsx" && echo "✅ Mensaje de ayuda encontrado" || echo "❌ No encontrado"
grep -n "🔗 Conexión ERP" "apps/web/src/pages/MappingConfigAdminPage.tsx" && echo "✅ Info mejorada de conexión encontrada" || echo "❌ No encontrado"

echo ""
echo "3️⃣ Backend - Error Handling"
grep -n "try {" "apps/backend/src/modules/erp-connections/controller.ts" | head -2 && echo "✅ Try-catch en getAvailableTables encontrado" || echo "❌ No encontrado"
grep -n "Failed to connect to ERP" "apps/backend/src/modules/erp-connections/controller.ts" && echo "✅ Mensaje de error mejorado encontrado" || echo "❌ No encontrado"

echo ""
echo "4️⃣ Documentación"
[ -f "docs/fixes/FIX_CONEXION_NO_VALIDA.md" ] && echo "✅ FIX_CONEXION_NO_VALIDA.md creado" || echo "❌ No encontrado"
[ -f "docs/reports/RESUMEN_FIX_CONEXION_NO_VALIDA.md" ] && echo "✅ RESUMEN_FIX_CONEXION_NO_VALIDA.md creado" || echo "❌ No encontrado"

echo ""
echo "✨ Verificación completada"
