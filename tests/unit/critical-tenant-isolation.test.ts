/**
 * CRITICAL: 多租户隔离安全测试 - getById 必须绑定 company_id
 *
 * 攻击场景：
 *   B 知道 A 的 customer/invoice/payment ID
 *   B 调用 getById(id) 直接读取 A 的数据
 *   这是 CRITICAL 漏洞
 */
import { prisma } from '../../src/lib/db/client';
import {
  CompanyRepository,
  CustomerRepository,
  InvoiceRepository,
  PaymentRecordRepository,
  CrossTenantError,
} from '../../src/lib/db';
import { DecimalMoney } from '../../src/lib/decimal';

describe('CRITICAL: Multi-tenant isolation - getById must check company_id', () => {
  let repoCustomer: CustomerRepository;
  let repoInvoice: InvoiceRepository;
  let repoPayment: PaymentRecordRepository;
  let companyA_id: string, companyB_id: string;
  let customerA_id: string, customerB_id: string;
  let invoiceA_id: string, invoiceB_id: string;

  beforeEach(async () => {
    await prisma.paymentRecord.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();

    repoCustomer = new CustomerRepository(prisma);
    repoInvoice = new InvoiceRepository(prisma);
    repoPayment = new PaymentRecordRepository(prisma);

    const userA = await prisma.user.create({ data: { email: 'a@test.com', name: 'A' } });
    const userB = await prisma.user.create({ data: { email: 'b@test.com', name: 'B' } });
    companyA_id = (await new CompanyRepository(prisma).create({ name: 'A', owner_id: userA.id })).id;
    companyB_id = (await new CompanyRepository(prisma).create({ name: 'B', owner_id: userB.id })).id;
    customerA_id = (await repoCustomer.create(companyA_id, { name: 'A Cust', slug: 'ac' })).id;
    customerB_id = (await repoCustomer.create(companyB_id, { name: 'B Cust', slug: 'bc' })).id;
    invoiceA_id = (await repoInvoice.create(companyA_id, customerA_id, {
      invoice_number: 'INV-A', invoice_date: new Date(), due_date: new Date('2026-12-01'), amount_cents: 100000,
    })).id;
    invoiceB_id = (await repoInvoice.create(companyB_id, customerB_id, {
      invoice_number: 'INV-B', invoice_date: new Date(), due_date: new Date('2026-12-01'), amount_cents: 200000,
    })).id;
  });

  afterEach(async () => {
    await prisma.paymentRecord.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
  });

  // ─── Customer Repository ────────────────────────────────────────────────
  describe('CustomerRepository.getById', () => {
    test('B 用 A 的 customer ID 查询 → 应抛 CrossTenantError（不泄露数据）', async () => {
      // 现在 getById 需要 companyId，B 没有权限访问 A 的数据
      await expect(repoCustomer.getById(customerA_id, companyB_id)).rejects.toThrow(CrossTenantError);
    });

    test('B 用 A 的 customer ID 更新 → CrossTenantError', async () => {
      await expect(repoCustomer.update(companyB_id, customerA_id, { name: 'HACKED' }))
        .rejects.toThrow(CrossTenantError);
    });
  });

  // ─── Invoice Repository ─────────────────────────────────────────────────
  describe('InvoiceRepository.getById', () => {
    test('B 用 A 的 invoice ID 查询 → 应抛 CrossTenantError（不泄露数据）', async () => {
      await expect(repoInvoice.getById(invoiceA_id, companyB_id)).rejects.toThrow(CrossTenantError);
    });

    test('B 用 A 的 invoice ID 更新 → CrossTenantError', async () => {
      await expect(repoInvoice.update(companyB_id, invoiceA_id, { status: 'PAID' }))
        .rejects.toThrow(CrossTenantError);
    });
  });

  // ─── PaymentRecord Repository ───────────────────────────────────────────
  describe('PaymentRecordRepository.getById', () => {
    test('B 用 A 的 payment ID 查询 → 应抛 CrossTenantError', async () => {
      // 先由 A 创建一条付款记录
      const recA = await repoPayment.create(companyA_id, customerA_id, invoiceA_id, {
        payment_date: new Date(), amount_cents: 50000,
      });
      // B 尝试读取（带自己的 companyId）
      await expect(repoPayment.getById(recA.id, companyB_id)).rejects.toThrow(CrossTenantError);
    });
  });
});
