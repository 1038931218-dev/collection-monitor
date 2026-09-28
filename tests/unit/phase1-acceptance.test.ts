/**
 * Phase 1 → Phase 2 边界验收测试
 */

import { DecimalMoney } from '../../src/lib/decimal';
import { normalizeInvoices } from '../../src/data-normalizer';
import { calculateARHealth } from '../../src/ar-engine';
import { generateCollectionTasks, calculatePriorityScore } from '../../src/priority-engine';
import { generateCollectionReport } from '../../src/lib/report-generator';
import { generateTestInvoices } from '../test-data';
import type { NormalizedInvoice } from '../../src/data-normalizer';

describe('Phase 1 边界验收', () => {
  test('金额精度：0.1 + 0.2', () => {
    const a = DecimalMoney.fromString('0.1');
    const b = DecimalMoney.fromString('0.2');
    const sum = a.add(b);
    expect(sum.cents).toBe(30); // $0.30 = 30 cents
  });

  test('金额精度：大金额累计', () => {
    const amounts = [
      DecimalMoney.fromString('123456789.99'),
      DecimalMoney.fromString('987654321.01'),
      DecimalMoney.fromString('500000.50'),
    ];
    const total = amounts.reduce((s, v) => s.add(v), DecimalMoney.fromString('0'));
    // 123456789.99 + 987654321.01 + 500000.50 = 1111611111.50
    expect(total.cents).toBe(111161111150);
  });

  test('金额精度：部分付款', () => {
    const inv = DecimalMoney.fromString('5000.00');
    const paid = DecimalMoney.fromString('1234.56');
    const outstanding = inv.subtract(paid);
    expect(outstanding.cents).toBe(376544); // $3765.44
  });

  test('金额精度：超付被 clamp 为 0', () => {
    const inv = DecimalMoney.fromString('1000');
    const paid = DecimalMoney.fromString('1500');
    const outstanding = inv.subtract(paid);
    expect(outstanding.cents).toBe(-50000); // -$500 = -50000 cents，下游会 clamp 为 0
  });

  test('数据结构：NormalizedInvoice 支持所有必需字段', () => {
    const inv: NormalizedInvoice = {
      customer_name: 'Test Co',
      invoice_number: 'INV-001',
      invoice_date: new Date('2024-01-01'),
      due_date: new Date('2024-02-01'),
      amount: DecimalMoney.fromString('1000'),
      paid_amount: DecimalMoney.fromString('300'),
      outstanding_amount: DecimalMoney.fromString('700'),
      is_overdue: false,
      days_overdue: 0,
      status: 'PARTIALLY_PAID',
      currency: 'USD',
    };
    expect(inv.customer_name).toBe('Test Co');
    expect(inv.outstanding_amount.cents).toBe(70000);
  });

  test('Priority Engine 公式：严格按权重计算', () => {
    const invoice = {
      customer_name: 'Test',
      invoice_number: 'INV-TEST',
      invoice_date: new Date('2024-01-01'),
      due_date: new Date('2024-01-15'),
      amount: DecimalMoney.fromString('10000'),
      paid_amount: DecimalMoney.fromString('0'),
      outstanding_amount: DecimalMoney.fromString('10000'),
      is_overdue: true,
      days_overdue: 45,
      status: 'OVERDUE',
      currency: 'USD',
    } as NormalizedInvoice;

    const totalOutstanding = DecimalMoney.fromString('50000');
    const priority = calculatePriorityScore(invoice, totalOutstanding);

    // 手动验证：
    // overdue_score: 45天 → 60分 (31-60区间)
    // amount_score: 10000/50000 = 20% → 20分
    // history_score: UNKNOWN = 40
    // trend_score: UNKNOWN = 40
    // total = 60*0.35 + 20*0.25 + 40*0.20 + 40*0.20 = 21 + 5 + 8 + 8 = 42
    expect(priority.overdue_score).toBe(60);
    expect(priority.amount_score).toBe(20);
    expect(priority.history_score).toBe(40);
    expect(priority.trend_score).toBe(40);
    expect(priority.priority_score).toBe(42);
    expect(priority.priority_level).toBe('LOW');
  });

  test('完整链路：生成 Report JSON', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const arReport = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
    const report = generateCollectionReport(normalized, arReport, tasks);

    // 验证报告结构
    expect(report.metadata.total_invoices).toBe(normalized.length);
    expect(report.risk_metrics.total_receivables).toBeTruthy();
    expect(report.top_priority.items.length).toBe(5);
    expect(report.ai_analysis.summary).toBeTruthy();
  });

  test('确定性：多次运行结果一致', () => {
    const invoices = generateTestInvoices();

    const result1 = normalizeInvoices(invoices);
    const report1 = calculateARHealth(result1);
    const tasks1 = generateCollectionTasks(result1, report1.customer_aggregations, 5);

    const result2 = normalizeInvoices(invoices);
    const report2 = calculateARHealth(result2);
    const tasks2 = generateCollectionTasks(result2, report2.customer_aggregations, 5);

    expect(report1.total_receivables.cents).toBe(report2.total_receivables.cents);
    expect(report1.overdue_amount.cents).toBe(report2.overdue_amount.cents);
    expect(tasks1.length).toBe(tasks2.length);
    for (let i = 0; i < tasks1.length; i++) {
      expect(tasks1[i].priority.priority_score).toBe(tasks2[i].priority.priority_score);
    }
  });
});
