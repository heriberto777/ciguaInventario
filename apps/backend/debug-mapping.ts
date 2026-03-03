import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const allMappings = await prisma.mappingConfig.findMany();
    console.log('--- ALL MAPPINGS ---');
    console.log(JSON.stringify(allMappings, null, 2));

    const count = await prisma.inventoryCount.findUnique({
        where: { id: 'cmm8bfv19000bbo0itvk3cli2' },
        include: {
            countItems: true,
            warehouse: true
        }
    });
    console.log('--- COUNT INFO ---');
    console.log(JSON.stringify(count, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
