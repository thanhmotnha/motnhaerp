import { PrismaClient } from '@prisma/client';
import { withSoftDelete } from '@/lib/softDelete';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? withSoftDelete(new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
