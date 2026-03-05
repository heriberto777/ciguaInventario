const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mappings = await prisma.mappingConfig.findMany({
        include: { company: true }
    });
    console.log(JSON.stringify(mappings, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
