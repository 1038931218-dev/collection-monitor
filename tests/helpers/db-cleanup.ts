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
 * 注意：保留 User 表最后一删，因为 Company 关联到 User
 * 
 * R3-05 修复：恢复外键约束（派工单明确禁止关闭FK）
 */
export async function cleanDatabase(): Promise<void> {
  // 按依赖顺序从叶子到根清理（外键约束保持ON）
  const tables = [
    'AIFeedback',      // 引用 Company, Task
    'CollectionTask',  // 引用 Company
    'PaymentRecord',   // 引用 Company, Customer, Invoice
    'Upload',          // 引用 Company
    'Subscription',    // 引用 User, Company
    'Invoice',         // 引用 Company, Customer
    'Customer',        // 引用 Company
    'Company',         // 引用 User
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}
