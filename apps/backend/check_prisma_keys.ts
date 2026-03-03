
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
fs.writeFileSync('prisma_keys.json', JSON.stringify(keys, null, 2));
process.exit(0);
