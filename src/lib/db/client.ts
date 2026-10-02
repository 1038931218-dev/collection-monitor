// Prisma 客户端单例 - LAZY INITIALIZATION
// 所有 DB 访问必须经过本模块导出的 prisma 实例或 src/lib/db/ 下的 repository，
// 禁止在业务逻辑/UI/API 层直接 import @prisma/client。
//
// 重要：使用 lazy init 模式，确保在测试环境中 env 变量已设置后才初始化客户端。
// 注意：不要直接导出 prisma 实例，应使用 getPrisma() 延迟初始化。

import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

// ─── 安全闸门：禁止测试连接生产数据库 ─────────────────────────────────────────
// FAIL CLOSED: 任何异常都拒绝执行
function assertSafeDatabaseUrl(url: string, env: string): void {
  const isProductionPattern = (u: string): boolean => {
    const lower = u.toLowerCase();
    return [
      'neon.tech',
      'postgres://',
      'postgresql://',
      'aws.amazon.com',
      'render.com',
      'supabase.co',
    ].some(p => lower.includes(p));
  };

  if (env === 'test') {
    // 测试环境：禁止生产数据库 URL（FAIL CLOSED）
    if (isProductionPattern(url)) {
      throw new Error(
        `[P0-SAFETY] 测试环境检测到生产数据库连接！\n` +
        `  DATABASE_URL: ${url.substring(0, 80)}...\n` +
        `  请设置 .env.test 指向 SQLite，禁止测试连接生产库。`
      );
    }
    // 测试环境必须使用 SQLite
    const isSQLite = url.includes('sqlite') || url.endsWith('.db') || url.endsWith('/dev.db');
    if (!isSQLite) {
      throw new Error(
        `[P0-SAFETY] 测试环境必须使用 SQLite！\n` +
        `  当前 DATABASE_URL: ${url}\n` +
        `  请设置 DATABASE_URL=file:./prisma/dev.db`
      );
    }
  } else if (env === 'production') {
    // 生产环境：禁止指向测试数据库（防止误连）
    if (url.includes('sqlite') || url.endsWith('.db') || url.includes('./prisma/dev')) {
      throw new Error(
        `[P0-SAFETY] 生产环境检测到测试数据库连接！\n` +
        `  DATABASE_URL: ${url.substring(0, 80)}...\n` +
        `  请检查 NODE_ENV 设置。`
      );
    }
    // 生产环境允许合法的生产数据库 URL
  } else {
    // 未知/缺失环境：FAIL CLOSED —— 拒绝生产数据库 URL
    // 防 CI/脚本忘了设 NODE_ENV 就直接连生产库
    if (isProductionPattern(url)) {
      throw new Error(
        `[P0-SAFETY] 环境未知却检测到生产数据库 URL！\n` +
        `  NODE_ENV: ${process.env.NODE_ENV || '(未设置)'}\n` +
        `  DATABASE_URL: ${url.substring(0, 80)}...\n` +
        `  请设置 NODE_ENV=test 或 NODE_ENV=production 后再运行。`
      );
    }
  }
}

// 开发/测试环境回退：若未设置 DATABASE_URL，使用项目内 SQLite dev.db
function resolveDevUrl(): string {
  // 注意：这里读取的是运行时环境变量，可能在 jest setupFilesAfterEnv 之后才被正确设置
  const env = process.env.NODE_ENV || 'development';

  // 测试环境强制使用 SQLite
  if (env === 'test') {
    // 优先使用环境变量（如果已设置且合法）
    if (process.env.DATABASE_URL) {
      assertSafeDatabaseUrl(process.env.DATABASE_URL, env);
      return process.env.DATABASE_URL;
    }
    // 使用进程工作目录解析路径（确保路径正确）
    const sqliteUrl = `file:${path.resolve(process.cwd(), 'prisma', 'dev.db')}`;
    assertSafeDatabaseUrl(sqliteUrl, env);
    return sqliteUrl;
  }

  // 生产/开发环境
  if (process.env.DATABASE_URL) {
    assertSafeDatabaseUrl(process.env.DATABASE_URL, env);
    return process.env.DATABASE_URL;
  }

  // 回退到本地 SQLite（仅开发环境）
  const p = path.resolve(process.cwd(), 'prisma', 'dev.db');
  const fallbackUrl = `file:${p}`;
  assertSafeDatabaseUrl(fallbackUrl, env);
  return fallbackUrl;
}

// ─── Lazy Init：延迟到首次访问时创建客户端 ──────────────────────────────────────
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

// ⚠️ 不要直接导出 prisma 实例！
// 直接导出会导致模块 import 时立即初始化，此时环境变量可能未正确设置。
// 请使用 getPrisma() 延迟获取。

// 向后兼容的默认导出（已废弃，建议改用 getPrisma()）
// 注意：这会在模块 import 时立即初始化，仅在未正确设置 NODE_ENV 时工作
export const prisma = getPrisma();
