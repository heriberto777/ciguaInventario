// Seed script to initialize test data
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  // Crear empresa por defecto
  const company = await prisma.company.upsert({
    where: { name: 'Cigua Inversiones' },
    update: {},
    create: {
      name: 'Cigua Inversiones',
    },
  });

  console.log('✓ Empresa creada:', company.name);

  // --- LISTA MAESTRA DE PERMISOS (EXHAUSTIVA) ---
  const permissions = [
    // SEGURIDAD Y USUARIOS
    { name: 'users:view', category: 'seguridad', description: 'Ver lista de usuarios' },
    { name: 'users:create', category: 'seguridad', description: 'Crear nuevos usuarios' },
    { name: 'users:edit', category: 'seguridad', description: 'Editar usuarios existentes' },
    { name: 'users:delete', category: 'seguridad', description: 'Eliminar usuarios' },
    { name: 'roles:view', category: 'seguridad', description: 'Ver roles del sistema' },
    { name: 'roles:manage', category: 'seguridad', description: 'Gestionar roles y asignarles permisos' },
    { name: 'permissions:view', category: 'seguridad', description: 'Ver lista de permisos' },
    { name: 'sessions:view', category: 'seguridad', description: 'Ver sesiones activas' },
    { name: 'sessions:delete', category: 'seguridad', description: 'Cerrar sesiones de forma remota' },

    // ALMACENES Y LOGÍSTICA
    { name: 'warehouses:view', category: 'almacenes', description: 'Ver almacenes' },
    { name: 'warehouses:manage', category: 'almacenes', description: 'Crear y editar almacenes' },
    { name: 'locations:view', category: 'almacenes', description: 'Ver ubicaciones (estantes/pasillos)' },
    { name: 'locations:manage', category: 'almacenes', description: 'Gestionar ubicaciones físicas' },
    { name: 'classifications:view', category: 'almacenes', description: 'Ver categorías y marcas' },
    { name: 'classifications:manage', category: 'almacenes', description: 'Gestionar clasificaciones de artículos' },

    // INVENTARIO (PROCESOS)
    { name: 'inv_counts:view', category: 'inventario', description: 'Ver procesos de conteo' },
    { name: 'inv_counts:create', category: 'inventario', description: 'Crear nuevos conteos' },
    { name: 'inv_counts:edit', category: 'inventario', description: 'Editar cabecera de conteos' },
    { name: 'inv_counts:delete', category: 'inventario', description: 'Borrar borradores de conteo' },
    { name: 'inv_counts:execute', category: 'inventario', description: 'Registrar conteos físicos (App/Web)' },
    { name: 'inv_counts:pause', category: 'inventario', description: 'Pausar conteos activos' },
    { name: 'inv_counts:resume', category: 'inventario', description: 'Reanudar conteos pausados' },
    { name: 'inv_counts:complete', category: 'inventario', description: 'Entregar conteo para revisión' },
    { name: 'inv_counts:approve', category: 'inventario', description: 'Aprobar varianzas de conteo' },
    { name: 'inv_counts:finalize', category: 'inventario', description: 'Cerrar conteo administrativamente' },
    { name: 'inv_counts:reactivate', category: 'inventario', description: 'Reabrir un conteo cerrado' },
    { name: 'inv_counts:new_version', category: 'inventario', description: 'Crear re-conteos (Versiones)' },

    // INVENTARIO (DATOS SENSIBLES)
    { name: 'inventory:view_qty', category: 'inventario_privacidad', description: 'Ver existencia teórica (Blind Count Off)' },
    { name: 'inventory:view_costs', category: 'inventario_privacidad', description: 'Ver costos unitarios' },
    { name: 'inventory:view_prices', category: 'inventario_privacidad', description: 'Ver precios de venta' },
    { name: 'inventory:view_variances', category: 'inventario_privacidad', description: 'Ver diferencias numéricas y %' },
    { name: 'inventory:adjust', category: 'inventario_privacidad', description: 'Realizar ajustes manuales de stock' },

    // INTEGRACIÓN ERP
    { name: 'erp_conn:view', category: 'erp', description: 'Ver configuraciones de conexión ERP' },
    { name: 'erp_conn:manage', category: 'erp', description: 'Configurar conexiones BD ERP' },
    { name: 'mappings:view', category: 'erp', description: 'Ver mapeos de campos' },
    { name: 'mappings:manage', category: 'erp', description: 'Crear y editar mapeos de tablas' },
    { name: 'sync:inventory', category: 'erp', description: 'Importar datos desde ERP' },
    { name: 'sync:erp', category: 'erp', description: 'Enviar resultados finales al ERP' },

    // REPORTES Y DASHBOARDS
    { name: 'dashboards:view', category: 'reportes', description: 'Ver indicadores de gestión' },
    { name: 'reports:view', category: 'reportes', description: 'Ver listado de reportes' },
    { name: 'reports:export', category: 'reportes', description: 'Exportar reportes a Excel/PDF' },
    { name: 'audit:view', category: 'reportes', description: 'Ver logs de auditoría' },

    // INTELIGENCIA ARTIFICIAL
    { name: 'ai:chat', category: 'ai', description: 'Uso del asistente IA' },
    { name: 'ai:config', category: 'ai', description: 'Configurar Prompts y Modelos IA' },

    // SISTEMA Y EMPRESAS
    { name: 'companies:view', category: 'sistema', description: 'Ver datos de empresa' },
    { name: 'companies:manage', category: 'sistema', description: 'Configurar sedes y datos fiscales' },
    { name: 'settings:view', category: 'sistema', description: 'Ver logs y estado del sistema' },
    { name: 'settings:manage', category: 'sistema', description: 'Configuraciones críticas del servidor' },
  ];

  const dbPermissions = [];
  for (const p of permissions) {
    const dbP = await prisma.permission.upsert({
      where: { name: p.name },
      update: { category: p.category, description: p.description },
      create: p,
    });
    dbPermissions.push(dbP);
  }
  console.log('✓ Permisos creados:', dbPermissions.length);

  // Crear roles
  const superAdminRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'SuperAdmin'
      }
    },
    update: {
      description: 'Administrador con todos los privilegios',
    },
    create: {
      name: 'SuperAdmin',
      description: 'Administrador con todos los privilegios',
      companyId: company.id,
    },
  });

  // Asegurar TODOS los permisos en SuperAdmin
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: dbPermissions.map(p => ({ roleId: superAdminRole.id, permissionId: p.id }))
  });

  const adminRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Admin'
      }
    },
    update: {
      description: 'Administrador de empresa',
    },
    create: {
      name: 'Admin',
      description: 'Administrador de empresa',
      companyId: company.id,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: dbPermissions
      .filter(p => !['companies:manage', 'settings:manage'].includes(p.name))
      .map(p => ({ roleId: adminRole.id, permissionId: p.id }))
  });

  const operatorRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Operator'
      }
    },
    update: {
      description: 'Operador de conteo',
    },
    create: {
      name: 'Operator',
      description: 'Operador de conteo',
      companyId: company.id,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: operatorRole.id } });
  await prisma.rolePermission.createMany({
    data: dbPermissions
      .filter(p => [
        'inv_counts:view',
        'inv_counts:execute',
        'warehouses:view',
        'dashboards:view',
        'ai:chat'
        // NOT including inventory:view_qty, view_costs, view_prices, view_variances for "blind count"
      ].includes(p.name))
      .map(p => ({ roleId: operatorRole.id, permissionId: p.id }))
  });

  console.log('✓ Roles y permisos sincronizados:', superAdminRole.name, ',', adminRole.name, ',', operatorRole.name);

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@catellird.com' },
    update: {
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
    },
    create: {
      email: 'superadmin@catellird.com',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      companyId: company.id,
    },
  });

  // Asegurar rol SuperAdmin al usuario
  await prisma.userRole.deleteMany({ where: { userId: superAdmin.id } });
  await prisma.userRole.create({
    data: { userId: superAdmin.id, roleId: superAdminRole.id }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@catellird.com' },
    update: {
      firstName: 'Admin',
      lastName: 'Catelli',
      password: hashedPassword,
    },
    create: {
      email: 'admin@catellird.com',
      firstName: 'Admin',
      lastName: 'Catelli',
      password: hashedPassword,
      companyId: company.id,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id }
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operador@catellird.com' },
    update: {
      firstName: 'Operador',
      lastName: 'Catelli',
      password: hashedPassword,
    },
    create: {
      email: 'operador@catellird.com',
      firstName: 'Operador',
      lastName: 'Catelli',
      password: hashedPassword,
      companyId: company.id,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: operatorUser.id } });
  await prisma.userRole.create({
    data: { userId: operatorUser.id, roleId: operatorRole.id }
  });

  console.log('✓ Usuarios y asignaciones de roles sincronizadas');
  console.log('  SuperAdmin: superadmin@catellird.com / admin123456');
  console.log('  Admin: admin@catellird.com / admin123456');
  console.log('  Operador: operador@catellird.com / admin123456');

  console.log('\n✓ Seed completado exitosamente');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
