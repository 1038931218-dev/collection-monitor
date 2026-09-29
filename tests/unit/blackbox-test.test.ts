/**
 * Phase 5.2: 黑盒/对抗测试
 *
 * 目标：不开发新功能，主动攻击当前系统找真实 Bug。
 * 重点：文件解析、字段识别、AR 边界计算。
 * 原则：发现 Bug → 复现 → 写回归测试 → 修复 → 全量测试。
 */
import { parseFile } from '../../src/file-parser';
import { normalizeInvoices } from '../../src/data-normalizer';
import { calculateARHealth } from '../../src/ar-engine';
import { DecimalMoney } from '../../src/lib/decimal';

describe('Phase 5.2: Black-box / Adversarial Testing', () => {
  describe('文件解析 - 异常场景', () => {
    test('空文件', async () => {
      const buffer = Buffer.from('', 'utf-8');
      const result = await parseFile(buffer, 'empty.csv');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.invoices.length).toBe(0);
    });

    test('只有表头', async () => {
      const csv = `customer name,invoice number,amount`;
      const buffer = Buffer.from(csv, 'utf-8');
      const result = await parseFile(buffer, 'header-only.csv');
      expect(result.invoices.length).toBe(0);
    });

    test('错误扩展名', async () => {
      const buffer = Buffer.from('test', 'utf-8');
      const result = await parseFile(buffer, 'document.txt');
      expect(result.errors.some(e => e.includes('不支持'))).toBe(true);
    });

    test('损坏的 CSV（列数不一致）', async () => {
      const csv = `customer name,invoice number,amount\nAlice,INV-001\nBob,INV-002,1000,extra`;
      const buffer = Buffer.from(csv, 'utf-8');
      const result = await parseFile(buffer, 'bad-csv.csv');
      // 应跳过错误行，不崩溃
      expect(result).toBeDefined();
    });
  });

  describe('字段识别 - 边界情况', () => {
    test('中文「已付金额」必须识别为 paid_amount（Bug 2 回归）', async () => {
      const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种\nAlice,INV-001,2026-07-01,2026-08-01,10000,3000,USD`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'test.csv');

      expect(parsed.invoices.length).toBe(1);
      expect(parsed.invoices[0].paid_amount?.cents).toBe(300000); // $3,000
      expect(parsed.invoices[0].amount.cents).toBe(1000000); // $10,000
    });

    test('「总金额」必须识别为 amount（非 paid_amount）', async () => {
      const csv = `客户名称,发票号,发票日期,到期日,总金额,已付,币种\nAlice,INV-001,2026-07-01,2026-08-01,5000,0,USD`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'test.csv');

      expect(parsed.invoices[0].amount.cents).toBe(500000); // $5,000
      expect(parsed.invoices[0].paid_amount?.cents).toBe(0);
    });

    test('「invoice number」必须识别为 invoice_number（非 invoice）', async () => {
      const csv = `customer name,invoice number,amount,due date\nAlice,INV-001,1000,2026-08-01`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'test.csv');

      expect(parsed.invoices[0].invoice_number).toBe('INV-001');
    });

    test('英文「paid」应识别为 paid_amount', async () => {
      const csv = `customer,paid,amount\nAlice,500,1000`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'test.csv');

      expect(parsed.invoices[0].paid_amount?.cents).toBe(50000);
      expect(parsed.invoices[0].amount.cents).toBe(100000);
    });

    test('emoji 客户名称', async () => {
      const csv = `customer name,amount\n🎉 Company Inc.,1000`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'emoji.csv');

      expect(parsed.invoices[0].customer_name).toContain('Company Inc.');
    });

    test('特殊字符客户名称', async () => {
      const csv = `customer name,amount\nCompany & Co. (Ltd.),5000`;
      const buffer = Buffer.from(csv, 'utf-8');
      const parsed = await parseFile(buffer, 'special.csv');

      expect(parsed.invoices[0].customer_name).toContain('Company');
    });
  });

  describe('数据标准化 - 边界情况', () => {
    test('Paid > Amount → clamp to 0 outstanding', () => {
      const invoices = [{
        customer_name: 'Test',
        invoice_number: 'INV-001',
        invoice_date: new Date('2026-07-01'),
        due_date: new Date('2026-08-01'),
        amount: new DecimalMoney(100000), // $1,000
        paid_amount: new DecimalMoney(150000), // $1,500 (paid > amount)
        currency: 'USD',
      }];
      const normalized = normalizeInvoices(invoices);

      expect(normalized[0].outstanding_amount.cents).toBe(0);
      expect(normalized[0].status).toBe('PAID');
    });

    test('Paid = Amount → fully paid', () => {
      const invoices = [{
        customer_name: 'Test',
        invoice_number: 'INV-001',
        invoice_date: new Date('2026-07-01'),
        due_date: new Date('2026-08-01'),
        amount: new DecimalMoney(100000),
        paid_amount: new DecimalMoney(100000),
        currency: 'USD',
      }];
      const normalized = normalizeInvoices(invoices);

      expect(normalized[0].outstanding_amount.cents).toBe(0);
      expect(normalized[0].status).toBe('PAID');
    });

    test('重复发票（相同客户+发票号）去重', () => {
      const invoices = [
        { customer_name: 'Alice', invoice_number: 'INV-001', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-09-01'), currency: 'USD' },
        { customer_name: 'Alice', invoice_number: 'INV-001', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-09-01'), currency: 'USD' },
      ];
      const normalized = normalizeInvoices(invoices);
      expect(normalized.length).toBe(1);
    });

    test('空客户名称被过滤', () => {
      const invoices = [
        { customer_name: '', invoice_number: 'INV-001', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-09-01'), currency: 'USD' },
      ];
      const normalized = normalizeInvoices(invoices);
      expect(normalized.length).toBe(0);
    });
  });

  describe('AR 边界 - Aging 区间', () => {
    function makeInvoice(daysOverdue: number) {
      const today = new Date('2026-09-28');
      const due_date = new Date(today.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
      return {
        customer_name: 'Boundary Test',
        invoice_number: `INV-${daysOverdue}`,
        invoice_date: new Date(due_date.getTime() - 60 * 24 * 60 * 60 * 1000),
        due_date,
        amount: new DecimalMoney(100000),
        paid_amount: new DecimalMoney(0),
        currency: 'USD',
      };
    }

    const boundaryCases = [
      { days: 0, expectedBucket: 'CURRENT' as const },
      { days: 1, expectedBucket: '1-7' as const },
      { days: 7, expectedBucket: '1-7' as const },
      { days: 8, expectedBucket: '8-30' as const },
      { days: 30, expectedBucket: '8-30' as const },
      { days: 31, expectedBucket: '31-60' as const },
      { days: 60, expectedBucket: '31-60' as const },
      { days: 61, expectedBucket: '61-90' as const },
      { days: 90, expectedBucket: '61-90' as const },
      { days: 91, expectedBucket: '90+' as const },
      { days: 120, expectedBucket: '90+' as const },
    ];

    for (const c of boundaryCases) {
      test(`逾期 ${c.days} 天 → ${c.expectedBucket}`, () => {
        const normalized = normalizeInvoices([makeInvoice(c.days)]);
        const report = calculateARHealth(normalized);

        const bucket = report.aging_distribution.find(d => d.amount.cents > 0);
        expect(bucket!.bucket).toBe(c.expectedBucket);
      });
    }
  });

  describe('AR 计算准确性', () => {
    test('总金额计算正确', () => {
      const invoices = [
        makeInvoiceWithAmount(1000),
        makeInvoiceWithAmount(2000),
        makeInvoiceWithAmount(3000),
      ];
      const normalized = normalizeInvoices(invoices);
      const report = calculateARHealth(normalized);

      expect(report.total_receivables.cents).toBe(600000); // $6,000
    });

    test('逾期比例计算正确', () => {
      // 两张逾期 $1000 + 一张未逾期 $2000 = 总 $4000，逾期 $2000 → 50%
      // 注意：invoice_number 必须不同，否则会被去重逻辑合并
      const invoices = [
        { customer_name: 'A', invoice_number: 'INV-A', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date('2026-06-01'), due_date: new Date('2026-08-01'), currency: 'USD' },
        { customer_name: 'B', invoice_number: 'INV-B', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date('2026-06-01'), due_date: new Date('2026-08-01'), currency: 'USD' },
        { customer_name: 'C', invoice_number: 'INV-C', amount: new DecimalMoney(200000), paid_amount: new DecimalMoney(0), invoice_date: new Date('2026-09-01'), due_date: new Date('2026-10-01'), currency: 'USD' },
      ];
      const normalized = normalizeInvoices(invoices);
      expect(normalized.length).toBe(3); // 去重后仍为 3 张
      const report = calculateARHealth(normalized);

      // totalReceivables = $4000, overdue = $2000 → 50%
      expect(report.total_receivables.cents).toBe(400000);
      expect(report.overdue_ratio).toBeCloseTo(50, 0.1);
    });

    test('客户聚合正确', () => {
      const invoices = [
        { customer_name: 'A', invoice_number: 'INV-1', amount: new DecimalMoney(100000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-08-01'), currency: 'USD' },
        { customer_name: 'A', invoice_number: 'INV-2', amount: new DecimalMoney(200000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-08-01'), currency: 'USD' },
        { customer_name: 'B', invoice_number: 'INV-3', amount: new DecimalMoney(300000), paid_amount: new DecimalMoney(0), invoice_date: new Date(), due_date: new Date('2026-08-01'), currency: 'USD' },
      ];
      const normalized = normalizeInvoices(invoices);
      const report = calculateARHealth(normalized);

      expect(report.customer_aggregations.length).toBe(2); // A 和 B
      const custA = report.customer_aggregations.find(c => c.customer_name === 'A');
      expect(custA!.total_outstanding.cents).toBe(300000); // $3,000
    });
  });

  // 辅助函数
  function makeInvoiceWithAmount(amount: number) {
    return {
      customer_name: 'Test',
      invoice_number: `INV-${amount}`,
      invoice_date: new Date('2026-07-01'),
      due_date: new Date('2026-09-01'),
      amount: new DecimalMoney(amount * 100),
      paid_amount: new DecimalMoney(0),
      currency: 'USD',
    };
  }
});
