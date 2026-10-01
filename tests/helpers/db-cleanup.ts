/**
 * 数据库清理辅助工具
 * 确保在所有测试中正确使用外键约束清理顺序
 * 
 * SQLite 外键依赖关系（从叶子到根）：
 * - AIFeedback -> Company (onDelete: Cascade)
 * - CollectionTask -> Company (onDelete: Cascade)
 * - PaymentRecord -> Company/Customer (onDelete: Cascade)
 * - Upload -> Company (onDelete: Cascade)
 * - Subscription -> Company/User (onDelete: Cascade)
 * - Invoice -> Company/Customer (onDelete: Cascade)
 * - Customer -> Company (onDelete: Cascade)
 * - Company -> User (onDelete: Cascade)
 */
import { prisma } from '../../src/lib/db/client';

/**
 * 按外键依赖顺序清理所有表
 * 关键：先删直接引用用户/公司的表，再删公司，最后删用户
 */
export async function cleanDatabase(): Promise<void> {
  // 启用外键约束检查
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  
  // 第一阶段：清理不依赖其他业务表的中间表
  await prisma.$executeRawUnsafe('DELETE FROM "AIFeedback"');
  await prisma.$executeRawUnsafe('DELETE FROM "CollectionTask"');
  await prisma.$executeRawUnsafe('DELETE FROM "Upload"');
  
  // 第二阶段：清理 Subscription（依赖 Company 和 User）
  await prisma.$executeRawUnsafe('DELETE FROM "Subscription"');
  
  // 第三阶段：清理 PaymentRecord（依赖 Company 和 Customer）
  await prisma.$executeRawUnsafe('DELETE FROM "PaymentRecord"');
  
  // 第四阶段：清理 Invoice（依赖 Company 和 Customer）
  await prisma.$executeRawUnsafe('DELETE FROM "Invoice"');
  
  // 第五阶段：清理 Customer（依赖 Company）
  await prisma.$executeRawUnsafe('DELETE FROM "Customer"');
  
  // 第六阶段：清理 Company（会 cascade 删除关联的 Customer, Invoice 等）
  await prisma.$executeRawUnsafe('DELETE FROM "Company"');
  
  // 第七阶段：清理 User（所有 Company 和 Subscription 已删除）
  await prisma.$executeRawUnsafe('DELETE FROM "User"');
}

/**
 * 验证数据库是否为空
 */
export async function verifyEmptyDatabase(): Promise<void> {
  const tables = [
    'User', 'Company', 'Customer', 'Invoice', 
    'PaymentRecord', 'Upload', 'CollectionTask', 'AIFeedback', 'Subscription'
  ];
  
  const results = await Promise.all(
    tables.map(async (table) => {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`) as Array<{ count: number }>;
      return { table, count: Number(result[0].count) };
    })
  );
  
  const total = results.reduce((sum, r) => sum + r.count, 0);
  if (total > 0) {
    const details = results.filter(r => r.count > 0).map(r => `${r.table}:${r.count}`).join(', ');
    throw new Error(`数据库未清空！剩余 ${total} 条: ${details}`);
  }
}

/**
 * 强制清理（禁用外键检查）
 * 仅用于紧急清理，不建议常规使用
 */
export async function forceCleanDatabase(): Promise<void> {
  // 临时禁用外键检查
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
  
  const tables = [
    'AIFeedback', 'CollectionTask', 'PaymentRecord', 'Upload', 'Subscription',
    'Invoice', 'Customer', 'Company', 'User'
  ];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`).catch(() => {});
  }
  
  // 重新启用外键检查
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
}
