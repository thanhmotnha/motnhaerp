import { PrismaClient } from '@prisma/client';
import { applySoftDelete } from '@/lib/softDelete';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
    applySoftDelete(prisma);
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
