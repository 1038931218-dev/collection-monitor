// Prisma 客户端单例
// 所有 DB 访问必须经过本模块导出的 prisma 实例或 src/lib/db/ 下的 repository，
// 禁止在业务逻辑/UI/API 层直接 import @prisma/client。

import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

// 开发/测试环境回退：若未设置 DATABASE_URL，使用项目内 SQLite dev.db
// （正式部署时必须通过 .env 提供 PostgreSQL 连接串）
function resolveDevUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // src/lib/db → 项目根：../../../prisma/dev.db
  const p = path.resolve(__dirname, '../../../prisma/dev.db');
  return `file:${p.replace(/\\/g, '/')}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDevUrl() } },
    log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
