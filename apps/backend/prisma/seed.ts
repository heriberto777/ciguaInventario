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

  // Crear roles
  const adminRole = await prisma.role.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Admin'
      }
    },
    update: {},
    create: {
      name: 'Admin',
      companyId: company.id,
    },
  });

  console.log('✓ Rol creado:', adminRole.name);

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
      companyId: company.id,
      userRoles: {
        create: [
          {
            roleId: adminRole.id,
          },
        ],
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
