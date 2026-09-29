// PaymentRecord 仓库（多租户）
import { BaseRepository, NotFoundError, CrossTenantError } from './base-repository';
import { Prisma } from '@prisma/client';

export class PaymentRecordRepository extends BaseRepository {
  async create(
    companyId: string,
    customerId: string,
    invoiceId: string | null,
    data: {
      payment_date: Date;
      amount_cents: number;
      currency?: string;
      payment_method?: string;
      notes?: string;
    }
  ) {
    // 校验 customerId 归属
    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: { company_id: true },
    });
    if (!customer) throw new NotFoundError('Customer', customerId);
    this.assertCompanyOwnership(customer, companyId, 'create PaymentRecord', customerId);

    // 若指定了 invoice_id，校验归属
    if (invoiceId) {
      const inv = await this.db.invoice.findUnique({
        where: { id: invoiceId },
        select: { company_id: true, customer_id: true },
      });
      if (!inv) throw new NotFoundError('Invoice', invoiceId);
      this.assertCompanyOwnership(inv, companyId, 'create PaymentRecord', invoiceId);
      if (inv.customer_id !== customerId) {
        throw new CrossTenantError('create PaymentRecord', companyId, `${customerId}:${invoiceId}`);
      }
    }

    return this.db.paymentRecord.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        ...(invoiceId ? { invoice_id: invoiceId } : {}),
        ...data,
      },
    });
  }

  async getById(id: string, companyId?: string) {
    // 如果提供了 companyId，必须验证归属
    const where = companyId ? { id, company_id: companyId } : { id };
    const rec = await this.db.paymentRecord.findUnique({ where });
    if (!rec) {
      // 如果指定了 companyId 但查不到，说明是跨租户尝试
      if (companyId) throw new CrossTenantError('getById PaymentRecord', companyId, id);
      throw new NotFoundError('PaymentRecord', id);
    }
    return rec;
  }

  async getByCustomer(companyId: string, customerId: string, limit = 20) {
    return this.db.paymentRecord.findMany({
      where: { company_id: companyId, customer_id: customerId },
      orderBy: { payment_date: 'desc' },
      take: limit,
    });
  }

  async delete(companyId: string, id: string) {
    const rec = await this.db.paymentRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundError('PaymentRecord', id);
    this.assertCompanyOwnership(rec, companyId, 'delete PaymentRecord', id);
    return this.db.paymentRecord.delete({ where: { id } });
  }
}
