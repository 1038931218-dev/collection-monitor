/**
 * Phase 2 场景测试：验证 Priority Engine 在不同客户历史下的行为
 * 场景 A-E 对应需求文档中的验证场景
 */
import { calculatePriorityScore } from '../../src/priority-engine';
import { normalizeInvoices } from '../../src/data-normalizer';
import { generateTestInvoices } from '../test-data';
import { DecimalMoney } from '../../src/lib/decimal';
import { analyzePaymentHistory } from '../../src/payment-history';

const TODAY = new Date('2026-09-28');

describe('Phase 2 Scenarios: Priority Engine with Payment History', () => {
  // 工具：创建带历史数据的客户聚合
  function makeCustomerAgg(
    name: string,
    avgDays: number | null,
    trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'UNKNOWN',
    overdueRate: number = 0
  ) {
    return {
      customer_name: name,
      total_outstanding: new DecimalMoney(5000000), // $50,000
      total_overdue: new DecimalMoney(5000000),
      invoice_count: 1,
      overdue_invoice_count: 1,
      average_payment_days: avgDays,
      median_payment_days: avgDays,
      max_days_overdue: avgDays ?? 0,
      payment_trend: trend,
      payment_history: avgDays !== null ? {
        customer_id: name,
        customer_name: name,
        total_payments: 3,
        average_payment_days: avgDays,
        median_payment_days: avgDays,
        last_payment_days_ago: 10,
        recent_average_payment_days: avgDays,
        historical_overdue_count: Math.round(overdueRate / 100 * 3),
        historical_overdue_rate: overdueRate,
        max_historical_overdue_days: avgDays ?? 0,
        payment_trend: trend,
        payment_behavior: avgDays === null ? 'UNKNOWN' : avgDays <= 7 ? 'ON_TIME' : avgDays <= 14 ? 'LATE' : 'SEVERE_LATE',
      } : undefined,
    };
  }

  // 创建一个逾期发票
  function makeOverdueInvoice(days: number, amount: number) {
    const today = new Date('2026-09-28');
    const due_date = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      customer_name: 'Test Customer',
      invoice_number: 'TEST-001',
      invoice_date: new Date('2026-08-01'),
      due_date,
      amount: new DecimalMoney(amount * 100),
      paid_amount: new DecimalMoney(0),
      outstanding_amount: new DecimalMoney(amount * 100),
      is_overdue: days > 0,
      days_overdue: days,
      status: days > 0 ? 'OVERDUE' : 'UNPAID',
      currency: 'USD',
    };
  }

  test('场景A: 两客户金额相同，恶化客户应得分更高', () => {
    const stable = makeCustomerAgg('Stable', 5, 'STABLE', 0);
    const deteriorating = makeCustomerAgg('Deteriorating', 5, 'DETERIORATING', 100);

    const inv = makeOverdueInvoice(30, 5000); // $5,000 逾期30天
    const total = inv.outstanding_amount;

    const scoreStable = calculatePriorityScore(inv, total, stable);
    const scoreDeteriorating = calculatePriorityScore(inv, total, deteriorating);

    // 逾期评分和金额评分相同，差异来自 history_score 和 trend_score
    expect(scoreStable.priority_score).toBeLessThan(scoreDeteriorating.priority_score);
    expect(scoreDeteriorating.priority_level).toBe('MEDIUM'); // 80+ 为 HIGH
  });

  test('场景B: 历史平均+10天，当前逾期40天 → 应识别为异常', () => {
    const customer = makeCustomerAgg('Late History', 10, 'STABLE', 100);
    const inv = makeOverdueInvoice(40, 5000);
    const total = inv.outstanding_amount;

    const score = calculatePriorityScore(inv, total, customer);

    // 逾期40天 → overdue_score=60
    // 历史平均10天 → LATE=30 + 逾期率boost(100% → +20) = 50
    // 稳定趋势 → trend_score=40
    // 金额比例假设是唯一发票 → amount_score=100
    // 总分 = 60*0.35 + 100*0.25 + 50*0.20 + 40*0.20 = 21 + 25 + 10 + 8 = 64
    expect(score.overdue_score).toBe(60);
    expect(score.history_score).toBe(50);
    expect(score.trend_score).toBe(40);
    expect(score.priority_score).toBe(64);
    expect(score.priority_level).toBe('MEDIUM');
  });

  test('场景C: 大金额但从不逾期 → 不应自动评为高风险', () => {
    const customer = makeCustomerAgg('Big Reliable', -2, 'IMPROVING', 0); // 平均提前2天
    const inv = makeOverdueInvoice(5, 50000); // $50,000 逾期5天
    const total = inv.outstanding_amount;

    const score = calculatePriorityScore(inv, total, customer);

    // 逾期5天 → overdue_score=10
    // 提前付款 → history_score=10
    // 改善趋势 → trend_score=20
    // 金额大 → amount_score=100
    // 总分 = 10*0.35 + 100*0.25 + 10*0.20 + 20*0.20 = 3.5 + 25 + 2 + 4 = 34.5 ≈ 35
    expect(score.priority_score).toBeLessThan(50); // LOW
    expect(score.priority_level).toBe('LOW');
  });

  test('场景D: 小金额但长期严重逾期 → 应进入Priority列表', () => {
    const customer = makeCustomerAgg('Small Chronic', 45, 'DETERIORATING', 100);
    const inv = makeOverdueInvoice(80, 500); // $500 逾期80天
    const total = inv.outstanding_amount;

    const score = calculatePriorityScore(inv, total, customer);

    // 逾期80天 → overdue_score=80
    // 历史平均45天 → history_score=90
    // 恶化趋势 → trend_score=80
    // 金额小 → amount_score较低（假设只有一张发票则为100）
    expect(score.overdue_score).toBe(80);
    expect(score.history_score).toBe(90);
    expect(score.trend_score).toBe(80);
    // 即使金额小，高逾期+差历史+恶化趋势也应给中高风险
    expect(score.priority_score).toBeGreaterThanOrEqual(50);
  });

  test('场景E: 无历史新客户 → 保持UNKNOWN默认值', () => {
    const inv = makeOverdueInvoice(10, 1000);
    const total = inv.outstanding_amount;

    // 不传 customerAgg
    const score = calculatePriorityScore(inv, total, undefined);

    expect(score.history_score).toBe(40); // UNKNOWN default
    expect(score.trend_score).toBe(40);   // UNKNOWN default
  });

  test('确定性的：同一输入多次运行结果一致', () => {
    const customer = makeCustomerAgg('Deterministic', 15, 'STABLE', 50);
    const inv = makeOverdueInvoice(20, 3000);
    const total = inv.outstanding_amount;

    const score1 = calculatePriorityScore(inv, total, customer);
    const score2 = calculatePriorityScore(inv, total, customer);
    const score3 = calculatePriorityScore(inv, total, customer);

    expect(score1.priority_score).toBe(score2.priority_score);
    expect(score2.priority_score).toBe(score3.priority_score);
  });
});
