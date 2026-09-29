// Invoice 仓库（多租户）
import { DecimalMoney } from '../decimal';
import { BaseRepository, NotFoundError, CrossTenantError } from './base-repository';
import { Prisma } from '@prisma/client';

export class InvoiceRepository extends BaseRepository {
  async create(
    companyId: string,
    customerId: string,
    data: {
      invoice_number?: string;
      invoice_date: Date;
      due_date: Date;
      amount_cents: number; // 分
      paid_amount_cents?: number;
      currency?: string;
    }
  ) {
    // 校验 customerId 归属
    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
      select: { company_id: true },
    });
    if (!customer) throw new NotFoundError('Customer', customerId);
    this.assertCompanyOwnership(customer, companyId, 'create Invoice', customerId);

    return this.db.invoice.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        ...data,
      },
    });
  }

  async getById(id: string, companyId?: string) {
    // 如果提供了 companyId，必须验证归属
    const where = companyId ? { id, company_id: companyId } : { id };
    const inv = await this.db.invoice.findUnique({ where });
    if (!inv) {
      // 如果指定了 companyId 但查不到，说明是跨租户尝试
      if (companyId) throw new CrossTenantError('getById Invoice', companyId, id);
      throw new NotFoundError('Invoice', id);
    }
    return inv;
  }

  /** 仅返回指定公司的发票 */
  async listByCompany(companyId: string, opts?: { customerId?: string }) {
    const where: Prisma.InvoiceWhereInput = { company_id: companyId };
    if (opts?.customerId) where.customer_id = opts.customerId;
    return this.db.invoice.findMany({ where, orderBy: { due_date: 'asc' } });
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<Pick<Prisma.InvoiceCreateInput, 'invoice_number' | 'status' | 'paid_date'>>
  ) {
    const existing = await this.getById(id, companyId);
    if (!existing) throw new NotFoundError('Invoice', id);
    this.assertCompanyOwnership(existing, companyId, 'update Invoice', id);
    return this.db.invoice.update({ where: { id }, data });
  }

  async markPaid(
    companyId: string,
    invoiceId: string,
    paidAmountCents: number,
    paidDate: Date
  ) {
    const inv = await this.getById(invoiceId, companyId);
    if (!inv) throw new NotFoundError('Invoice', invoiceId);
    this.assertCompanyOwnership(inv, companyId, 'markPaid Invoice', invoiceId);

    const newPaidCents = Math.min(inv.paid_amount_cents + paidAmountCents, inv.amount_cents);
    const remaining = newPaidCents - inv.paid_amount_cents;
    const newStatus = newPaidCents >= inv.amount_cents ? 'PAID' : 'PARTIALLY_PAID';

    return this.db.invoice.update({
      where: { id: invoiceId },
      data: {
        paid_amount_cents: newPaidCents,
        paid_date: paidDate,
        status: newStatus,
      },
    });
  }
}
