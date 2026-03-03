
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const configCount = await prisma.aIConfig.count();
    console.log(`AI_CONFIG_COUNT: ${configCount}`);
    const companyCount = await prisma.company.count();
    console.log(`COMPANY_COUNT: ${companyCount}`);
}
run().finally(() => process.exit(0));
