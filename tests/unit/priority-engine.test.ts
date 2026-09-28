import { calculatePriorityScore, generateCollectionTasks } from '../../src/priority-engine';
import { calculateARHealth } from '../../src/ar-engine';
import { normalizeInvoices } from '../../src/data-normalizer';
import { generateTestInvoices } from '../test-data';
import { DecimalMoney } from '../../src/lib/decimal';

describe('Priority Engine', () => {
  test('应该正确计算优先级评分', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    // 找到INV-006（90+天逾期）
    const target = normalized.find(inv => inv.invoice_number === 'INV-006');
    expect(target).toBeDefined();
    
    if (target) {
    const totalOutstanding = normalized.reduce(
      (sum, inv) => sum.add(inv.outstanding_amount),
      DecimalMoney.fromString('0')
    );
      
    const priority = calculatePriorityScore(target, totalOutstanding);
      
    // 按文档公式确定性断言:
    // overdue=100 (90+天) *0.35=35 + amount≈14*0.25=3.5 + history=40(UNKNOWN)*0.2=8 + trend=40*0.2=8 = 55
    expect(priority.overdue_score).toBe(100);
    expect(priority.history_score).toBe(40);
    expect(priority.trend_score).toBe(40);
    expect(priority.priority_score).toBe(Math.round(100*0.35 + 14*0.25 + 40*0.20 + 40*0.20));
    // 无历史数据时 (UNKNOWN=40)，单客户发票最高分上限 76，55 为 MEDIUM
    expect(priority.priority_level).toBe('MEDIUM');
      
    // 有历史数据（经常延迟+恶化趋势）应能推高到 MEDIUM+
    const historyAgg = {
      average_payment_days: 75,
      payment_trend: 'DETERIORATING' as const,
    };
    const highPriority = calculatePriorityScore(target, totalOutstanding, historyAgg as any);
    // 100*0.35 + 14*0.25 + 90*0.20 + 80*0.20 = 35 + 3.5 + 18 + 16 = 72.5 ≈ 73
    expect(highPriority.priority_score).toBeGreaterThanOrEqual(70);
    expect(highPriority.priority_level).toBe('MEDIUM');
    }
  });

  test('应该正确排序Top Priority', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    const tasks = generateCollectionTasks(normalized, report.customer_aggregations, 5);
    
    // 验证排序（从高到低）
    for (let i = 1; i < tasks.length; i++) {
      expect(tasks[i].priority.priority_score).toBeLessThanOrEqual(
        tasks[i - 1].priority.priority_score
      );
    }
  });

  test('应该返回正确的Top 5', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    const tasks = generateCollectionTasks(normalized, report.customer_aggregations, 5);
    
    expect(tasks.length).toBe(5);
  });

  test('逾期金额大的应该优先', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    const tasks = generateCollectionTasks(normalized, report.customer_aggregations, 3);
    
    // 前3个应该包含INV-006（100000逾期）和INV-005（50000逾期）
    const topInvoices = tasks.map(t => t.invoice.invoice_number);
    expect(topInvoices).toContain('INV-006');
    expect(topInvoices).toContain('INV-005');
  });

  test('同一客户多张小金额应该聚合后评分', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    
    // 检查Repeat Customer的聚合
    const repeatCustomer = report.customer_aggregations.find(
      c => c.customer_name === 'Repeat Customer'
    );
    
    expect(repeatCustomer).toBeDefined();
    expect(repeatCustomer!.total_outstanding.cents).toBe(130000); // $500 + $800
    expect(repeatCustomer!.invoice_count).toBe(2);
  });

  test('优先级评分应该确定性（多次运行一致）', () => {
    const invoices = generateTestInvoices();
    
    const result1 = normalizeInvoices(invoices);
    const report1 = calculateARHealth(result1);
    const tasks1 = generateCollectionTasks(result1, report1.customer_aggregations, 5);
    
    const result2 = normalizeInvoices(invoices);
    const report2 = calculateARHealth(result2);
    const tasks2 = generateCollectionTasks(result2, report2.customer_aggregations, 5);
    
    // 比较评分
    for (let i = 0; i < tasks1.length; i++) {
      expect(tasks1[i].priority.priority_score).toBe(tasks2[i].priority.priority_score);
      expect(tasks1[i].invoice.invoice_number).toBe(tasks2[i].invoice.invoice_number);
    }
  });
});
