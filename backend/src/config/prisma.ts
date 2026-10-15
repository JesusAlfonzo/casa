import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// En Prisma 6 no necesitas 'pg' ni '@prisma/adapter-pg'
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

// Prevenir múltiples instancias durante el hot-reloading en desarrollo
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
