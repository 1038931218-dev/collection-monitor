// Prisma 客户端单例
// 所有 DB 访问必须经过本模块导出的 prisma 实例或 src/lib/db/ 下的 repository，
// 禁止在业务逻辑/UI/API 层直接 import @prisma/client。

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
