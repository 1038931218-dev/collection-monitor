// Prisma 客户端单例 - LAZY INITIALIZATION
// 所有 DB 访问必须经过本模块导出的 prisma 实例或 src/lib/db/ 下的 repository，
// 禁止在业务逻辑/UI/API 层直接 import @prisma/client。
//
// 重要：使用 lazy init 模式，确保在测试环境中 env 变量已设置后才初始化客户端。

import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

// ─── 安全闸门：禁止测试连接生产数据库 ─────────────────────────────────────────
// FAIL CLOSED: 任何异常都拒绝执行
function assertSafeDatabaseUrl(url: string): void {
  // 强制要求 NODE_ENV=test 时才能使用测试数据库
  if (process.env.NODE_ENV !== 'test') {
    const productionPatterns = [
      'neon.tech',
      'postgres://',
      'postgresql://',
      'aws.amazon.com',
      'render.com',
      'supabase.co',
    ];
    for (const pattern of productionPatterns) {
      if (url.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error(
          `[P0-SAFETY] 生产环境检测到生产数据库连接！\n` +
          `  DATABASE_URL: ${url.substring(0, 80)}...\n` +
          `  请检查 NODE_ENV 设置。`
        );
      }
    }
    return;
  }
  
  // 测试环境：禁止连接生产数据库（FAIL CLOSED）
  const productionPatterns = [
    'neon.tech',
    'postgres://',
    'postgresql://',
    'aws.amazon.com',
    'render.com',
    'supabase.co',
  ];
  for (const pattern of productionPatterns) {
    if (url.toLowerCase().includes(pattern.toLowerCase())) {
      throw new Error(
        `[P0-SAFETY] 测试环境检测到生产数据库连接！\n` +
        `  DATABASE_URL: ${url.substring(0, 80)}...\n` +
        `  请设置 .env.test 指向 SQLite，禁止测试连接生产库。`
      );
    }
  }
  
  // 测试环境必须使用 SQLite（检查文件扩展名或 sqlite 关键字）
  const isSQLite = url.includes('sqlite') || url.endsWith('.db') || url.endsWith('/dev.db');
  if (!isSQLite) {
    throw new Error(
      `[P0-SAFETY] 测试环境必须使用 SQLite！\n` +
      `  当前 DATABASE_URL: ${url}\n` +
      `  请设置 DATABASE_URL=file:./prisma/dev.db`
    );
  }
}

// 开发/测试环境回退：若未设置 DATABASE_URL，使用项目内 SQLite dev.db
function resolveDevUrl(): string {
  // 测试环境强制使用 SQLite
  if (process.env.NODE_ENV === 'test') {
    // Windows 路径如 file:F:\... 或 file:./...
    const sqliteUrl = `file:${path.resolve(__dirname, '../../../prisma/dev.db')}`;
    assertSafeDatabaseUrl(sqliteUrl);
    return sqliteUrl;
  }
  // 生产/开发环境使用 DATABASE_URL 或回退到 SQLite
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const p = path.resolve(__dirname, '../../../prisma/dev.db');
  return `file:${p}`;
}

// ─── Lazy Init：延迟到首次访问时创建客户端 ──────────────────────────────────────
// 这确保 jest setupFilesAfterEnv 已设置好环境变量
let _prisma: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
  if (!_prisma) {
    _prisma = new PrismaClient({
      datasources: { db: { url: resolveDevUrl() } },
      log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
    });
  }
  return _prisma;
};

// 向后兼容：导出 getPrisma 作为默认访问方式
export const prisma = getPrisma();
