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
      description: 'Empresa principal',
      isActive: true,
    },
  });

  console.log('✓ Empresa creada:', company.name);

  // Crear roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Administrador del sistema',
      isActive: true,
      companyId: company.id,
    },
  });

  console.log('✓ Rol creado:', adminRole.name);

  // Crear permisos
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { name: 'create_company' },
      update: {},
      create: {
        name: 'create_company',
        description: 'Crear nuevas empresas',
        category: 'companies',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'read_company' },
      update: {},
      create: {
        name: 'read_company',
        description: 'Ver empresas',
        category: 'companies',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'update_company' },
      update: {},
      create: {
        name: 'update_company',
        description: 'Editar empresas',
        category: 'companies',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'delete_company' },
      update: {},
      create: {
        name: 'delete_company',
        description: 'Eliminar empresas',
        category: 'companies',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_users' },
      update: {},
      create: {
        name: 'manage_users',
        description: 'Gestionar usuarios',
        category: 'users',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'manage_roles' },
      update: {},
      create: {
        name: 'manage_roles',
        description: 'Gestionar roles',
        category: 'roles',
      },
    }),
    prisma.permission.upsert({
      where: { name: 'view_audit_logs' },
      update: {},
      create: {
        name: 'view_audit_logs',
        description: 'Ver registros de auditoría',
        category: 'audit',
      },
    }),
  ]);

  console.log('✓ Permisos creados:', permissions.length);

  // Asignar todos los permisos al rol admin
  await prisma.rolePermission.deleteMany({
    where: { roleId: adminRole.id },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✓ Permisos asignados al rol Admin');

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cigua.com' },
    update: {},
    create: {
      email: 'admin@cigua.com',
      firstName: 'Admin',
      lastName: 'System',
      password: hashedPassword,
      isActive: true,
      companyId: company.id,
      roles: {
        connect: [{ id: adminRole.id }],
      },
    },
  });

  console.log('✓ Usuario administrador creado:');
  console.log('  Email: admin@cigua.com');
  console.log('  Password: admin123456');

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
