// 多租户数据访问基类
//
// 原则：所有业务查询/写入必须携带 company_id，从数据库层强制租户隔离。
// 不经过本类的直接 prisma 调用视为违反架构约束。

import { PrismaClient } from '@prisma/client';
import { prisma } from './client';

export class CrossTenantError extends Error {
  constructor(action: string, companyId: string, foreignId: string) {
    super(
      `跨租户访问被拒绝: ${action} 目标资源不属于公司 ${companyId} (资源ID: ${foreignId})`
    );
    this.name = 'CrossTenantError';
  }
}

/** 资源不存在 */
export class NotFoundError extends Error {
  constructor(entity: string, id?: string) {
    super(`未找到 ${entity}${id ? ` (id=${id})` : ''}`);
    this.name = 'NotFoundError';
  }
}

/**
 * 带公司隔离的仓库基类。
 * 子类每次写入/读取前调用 assertCompanyOwnership 校验归属。
 */
export abstract class BaseRepository {
  protected db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * 校验某条记录确实属于指定公司，否则抛 CrossTenantError。
   * @param row 数据库行（必须含 company_id 字段）
   * @param companyId 请求方公司
   * @param action 操作描述（用于报错）
   * @param rowId 行 ID（用于报错）
   */
  protected assertCompanyOwnership(
    row: { company_id: string },
    companyId: string,
    action: string,
    rowId: string
  ): void {
    if (row.company_id !== companyId) {
      throw new CrossTenantError(action, companyId, rowId);
    }
  }

  /**
   * 只返回属于该公司的记录，不属于则视为 NotFound（绝不泄漏他司数据）。
   * @returns 记录或 null
   */
  protected async findOwnedRow<T extends { company_id: string }>(
    fetch: () => Promise<T | null>,
    companyId: string,
    action: string,
    label: string
  ): Promise<T | null> {
    const row = await fetch();
    if (!row) return null;
    this.assertCompanyOwnership(row, companyId, action, label);
    return row;
  }
}
