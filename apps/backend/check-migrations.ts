
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const migrations = await prisma.$queryRaw`
      SELECT migration_name, applied_steps_count, finished_at 
      FROM _prisma_migrations 
      ORDER BY applied_steps_count DESC;
    `;
        console.log('Migrations in DB:', JSON.stringify(migrations, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
