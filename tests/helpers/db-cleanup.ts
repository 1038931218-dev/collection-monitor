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
  try {
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
  } catch (e) {
    console.warn('cleanDatabase warning:', e);
  }
}
