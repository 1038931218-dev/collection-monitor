// Customer 仓库（多租户）
import { Prisma } from '@prisma/client';
import { BaseRepository, NotFoundError, CrossTenantError } from './base-repository';

export class CustomerRepository extends BaseRepository {
  async create(
    companyId: string,
    data: {
      name: string;
      slug: string;
      contact_email?: string;
      contact_phone?: string;
      notes?: string;
    }
  ) {
    return this.db.customer.create({
      data: {
        company_id: companyId,
        ...data,
      },
    });
  }

  async getById(id: string, companyId?: string) {
    // 如果提供了 companyId，必须验证归属
    const where = companyId ? { id, company_id: companyId } : { id };
    const c = await this.db.customer.findUnique({ where });
    if (!c) {
      // 如果指定了 companyId 但查不到，说明是跨租户尝试
      if (companyId) throw new CrossTenantError('getById Customer', companyId, id);
      throw new NotFoundError('Customer', id);
    }
    return c;
  }

  /** 仅返回指定公司的客户 */
  async listByCompany(companyId: string) {
    return this.db.customer.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<Pick<Prisma.CustomerCreateInput, 'name' | 'slug' | 'contact_email' | 'contact_phone' | 'notes'>>
  ) {
    const existing = await this.db.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Customer', id);
    this.assertCompanyOwnership(existing, companyId, 'update Customer', id);
    return this.db.customer.update({ where: { id }, data });
  }

  async upsert(
    companyId: string,
    slug: string,
    name: string
  ) {
    // 按复合唯一键 (company_id, slug) 查询
    const existing = await this.db.customer.findFirst({
      where: { company_id: companyId, slug },
    });
    if (existing) {
      return this.db.customer.update({
        where: { id: existing.id },
        data: { name },
      });
    }
    return this.db.customer.create({
      data: { company_id: companyId, slug, name },
    });
  }
}
