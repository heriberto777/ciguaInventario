
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const fabulosos = await prisma.itemClassification.findMany({
        where: {
            description: {
                contains: 'Fabuloso',
                mode: 'insensitive'
            }
        }
    });
    console.log('Fabulosos found:', JSON.stringify(fabulosos, null, 2));

    const sampled = await prisma.itemClassification.findMany({
        take: 10,
        select: { code: true, description: true }
    });
    console.log('Sampled first 10:', JSON.stringify(sampled, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
