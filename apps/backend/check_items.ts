
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.inventoryCount_Item.findMany({
        where: {
            brand: 'M15'
        },
        take: 5
    });
    console.log('Items with brand M15:', JSON.stringify(items, null, 2));

    const count = await prisma.inventoryCount_Item.count({
        where: { brand: 'M15' }
    });
    console.log('Total count for M15:', count);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
