import { calculateARHealth } from '../../src/ar-engine';
import { normalizeInvoices } from '../../src/data-normalizer';
import { generateTestInvoices } from '../test-data';
import { DecimalMoney } from '../../src/lib/decimal';

describe('AR Engine', () => {
  test('应该正确计算总应收金额', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    // 手动计算期望值（扣除INV-008已付款和空客户名称的记录）
    const expectedTotal = DecimalMoney.fromString('718300');
    
    expect(report.total_receivables.cents).toBe(expectedTotal.cents);
  });

  test('应该正确计算逾期金额', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    // 逾期发票：INV-002(5000), INV-003(25000), INV-004(15000), INV-005(50000), INV-006(100000), INV-007(12000), INV-009(500), INV-010(800)
    const expectedOverdue = DecimalMoney.fromString('208300');
    
    expect(report.overdue_amount.cents).toBe(expectedOverdue.cents);
  });

  test('应该正确计算逾期比例', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    // 逾期比例 = 208300 / 718300 ≈ 29.0%
    expect(report.overdue_ratio).toBeCloseTo(29.0, 1);
  });

  test('账龄分布应该完整', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    const buckets = ['CURRENT', '1-7', '8-30', '31-60', '61-90', '90+'];
    buckets.forEach(bucket => {
      expect(report.aging_distribution.some(d => d.bucket === bucket)).toBe(true);
    });
  });

  test('账龄分布百分比总和应该接近100%', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    const totalPercentage = report.aging_distribution.reduce(
      (sum, d) => sum + d.percentage,
      0
    );
    
    expect(totalPercentage).toBeCloseTo(100, 1);
  });

  test('客户聚合应该正确', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    expect(report.customer_aggregations.length).toBeGreaterThan(0);
    
    // 检查Repeat Customer（有2张发票）
    const repeatCustomer = report.customer_aggregations.find(
      c => c.customer_name === 'Repeat Customer'
    );
    expect(repeatCustomer).toBeDefined();
    expect(repeatCustomer!.invoice_count).toBe(2);
  });

  test('多次运行结果应该一致', () => {
    const invoices = generateTestInvoices();

    const result1 = calculateARHealth(normalizeInvoices(invoices));
    const result2 = calculateARHealth(normalizeInvoices(invoices));

    expect(result1.total_receivables.cents).toBe(result2.total_receivables.cents);
    expect(result1.overdue_amount.cents).toBe(result2.overdue_amount.cents);
    expect(result1.overdue_ratio).toBe(result2.overdue_ratio);
  });
});

describe('Aging Boundary Tests', () => {
  function makeInvoice(opts: { customer_name: string; amount: number; due_days_ago: number }): import('../../src/data-normalizer').NormalizedInvoice {
    const today = new Date('2026-09-28');
    const invoice_date = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const due_date = new Date(today.getTime() - opts.due_days_ago * 24 * 60 * 60 * 1000);
    return {
      customer_name: opts.customer_name,
      invoice_number: 'TEST-001',
      invoice_date,
      due_date,
      amount: new (require('../../src/lib/decimal').DecimalMoney)(opts.amount * 100),
      paid_amount: new (require('../../src/lib/decimal').DecimalMoney)(0),
      outstanding_amount: new (require('../../src/lib/decimal').DecimalMoney)(opts.amount * 100),
      is_overdue: opts.due_days_ago > 0,
      days_overdue: opts.due_days_ago,
      status: opts.due_days_ago > 0 ? 'OVERDUE' : 'UNPAID',
      currency: 'USD',
    };
  }

  const boundaryCases = [
    { days: 0,    expected: 'CURRENT' },
    { days: 1,    expected: '1-7' },
    { days: 7,    expected: '1-7' },
    { days: 8,    expected: '8-30' },
    { days: 30,   expected: '8-30' },
    { days: 31,   expected: '31-60' },
    { days: 60,   expected: '31-60' },
    { days: 61,   expected: '61-90' },
    { days: 90,   expected: '61-90' },
    { days: 91,   expected: '90+' },
    { days: 120,  expected: '90+' },
  ];

  for (const c of boundaryCases) {
    test(`days_overdue=${c.days} → bucket=${c.expected}`, () => {
      const inv = makeInvoice({ customer_name: 'Boundary', amount: 1000, due_days_ago: c.days });
      const report = calculateARHealth([inv]);
      const bucket = report.aging_distribution.find(b => b.amount.cents > 0);
      expect(bucket!.bucket).toBe(c.expected);
    });
  }
});
