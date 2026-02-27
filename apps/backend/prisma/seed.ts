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

  // Crear permisos
  const permissions = [
    // Inventario
    { name: 'inventory:view_qty', category: 'inventory', description: 'Permite ver cantidades del sistema y varianzas' },
    { name: 'inventory:sync', category: 'inventory', description: 'Permite sincronizar conteos con el ERP' },
    { name: 'inventory:edit_settings', category: 'inventory', description: 'Permite editar configuraciones de conteo' },
    { name: 'inventory:manage', category: 'inventory', description: 'Gestión completa de inventario' },

    // Sistema / Administración
    { name: 'users:manage', category: 'users', description: 'Permite gestionar usuarios y roles' },
    { name: 'audit:view', category: 'audit', description: 'Ver logs de auditoría' },
    { name: 'companies:manage', category: 'companies', description: 'Administrar empresas' },
    { name: 'erp:manage', category: 'erp', description: 'Configurar conexiones y mapeos ERP' },
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

  // Asegurar permisos en SuperAdmin
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
      .filter(p => !['companies:manage'].includes(p.name))
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
      .filter(p => ['inventory:view_qty', 'inventory:manage', 'inventory:edit_settings'].includes(p.name))
      .map(p => ({ roleId: operatorRole.id, permissionId: p.id }))
  });

  console.log('✓ Roles y permisos sincronizados:', superAdminRole.name, ',', adminRole.name, ',', operatorRole.name);

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@cigua.com' },
    update: {
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
    },
    create: {
      email: 'superadmin@cigua.com',
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
    where: { email: 'admin@cigua.com' },
    update: {
      firstName: 'Admin',
      lastName: 'System',
      password: hashedPassword,
    },
    create: {
      email: 'admin@cigua.com',
      firstName: 'Admin',
      lastName: 'System',
      password: hashedPassword,
      companyId: company.id,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id }
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operador@cigua.com' },
    update: {
      firstName: 'Operador',
      lastName: 'Pruebas',
      password: hashedPassword,
    },
    create: {
      email: 'operador@cigua.com',
      firstName: 'Operador',
      lastName: 'Pruebas',
      password: hashedPassword,
      companyId: company.id,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: operatorUser.id } });
  await prisma.userRole.create({
    data: { userId: operatorUser.id, roleId: operatorRole.id }
  });

  console.log('✓ Usuarios y asignaciones de roles sincronizadas');
  console.log('  SuperAdmin: superadmin@cigua.com / admin123456');
  console.log('  Admin: admin@cigua.com / admin123456');
  console.log('  Operador: operador@cigua.com / admin123456');

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
