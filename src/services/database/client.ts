import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton instance
 * Uses connection pooling for optimal performance
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed
 */
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
