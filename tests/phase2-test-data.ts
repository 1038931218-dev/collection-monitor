/**
 * Phase 2 测试数据
 * 包含6个不同付款行为的客户：
 * - Customer A: 长期按时付款（平均7天，稳定）
 * - Customer B: 通常晚5-10天付款（平均10天，稳定）
 * - Customer C: 最近明显越来越晚付款（从7天恶化到30天）
 * - Customer D: 新建立，无任何历史
 * - Customer E: 金额大，付款记录良好（平均5天，改善中）
 * - Customer F: 金额不大，但长期严重逾期（平均45天，恶化）
 */

import { DecimalMoney } from '../src/lib/decimal';
import { PaymentRecord, PaymentHistoryAnalysis, PaymentTrend } from '../src/payment-history';

const TODAY = new Date('2026-09-28');

// ─── Customer A: 长期按时付款 ───
export const customerA: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer A - Reliable',
  payments: [
    { id: 'pa-1', invoice_id: 'inv-a1', customer_id: 'cust-a', customer_name: 'Customer A', payment_date: new Date('2026-08-05'), amount: new DecimalMoney(500000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-08-05') },
    { id: 'pa-2', invoice_id: 'inv-a2', customer_id: 'cust-a', customer_name: 'Customer A', payment_date: new Date('2026-07-10'), amount: new DecimalMoney(300000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-07-10') },
    { id: 'pa-3', invoice_id: 'inv-a3', customer_id: 'cust-a', customer_name: 'Customer A', payment_date: new Date('2026-06-03'), amount: new DecimalMoney(400000), currency: 'USD', payment_method: 'cash', notes: undefined, created_at: new Date('2026-06-03') },
    { id: 'pa-4', invoice_id: 'inv-a4', customer_id: 'cust-a', customer_name: 'Customer A', payment_date: new Date('2026-05-02'), amount: new DecimalMoney(200000), currency: 'USD', payment_method: 'check', notes: undefined, created_at: new Date('2026-05-02') },
  ],
  invoices: [
    { due_date: new Date('2026-07-31'), paid_amount: new DecimalMoney(500000) },
    { due_date: new Date('2026-06-30'), paid_amount: new DecimalMoney(300000) },
    { due_date: new Date('2026-05-28'), paid_amount: new DecimalMoney(400000) },
    { due_date: new Date('2026-04-27'), paid_amount: new DecimalMoney(200000) },
  ]
};

// ─── Customer B: 通常晚5-10天付款 ───
export const customerB: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer B - Slightly Late',
  payments: [
    { id: 'pb-1', invoice_id: 'inv-b1', customer_id: 'cust-b', customer_name: 'Customer B', payment_date: new Date('2026-08-12'), amount: new DecimalMoney(80000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-08-12') },
    { id: 'pb-2', invoice_id: 'inv-b2', customer_id: 'cust-b', customer_name: 'Customer B', payment_date: new Date('2026-07-15'), amount: new DecimalMoney(60000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-07-15') },
    { id: 'pb-3', invoice_id: 'inv-b3', customer_id: 'cust-b', customer_name: 'Customer B', payment_date: new Date('2026-06-10'), amount: new DecimalMoney(70000), currency: 'USD', payment_method: 'credit_card', notes: undefined, created_at: new Date('2026-06-10') },
  ],
  invoices: [
    { due_date: new Date('2026-08-05'), paid_amount: new DecimalMoney(80000) },
    { due_date: new Date('2026-07-08'), paid_amount: new DecimalMoney(60000) },
    { due_date: new Date('2026-06-03'), paid_amount: new DecimalMoney(70000) },
  ]
};

// ─── Customer C: 最近明显越来越晚付款 ───
export const customerC: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer C - Deteriorating',
  payments: [
    { id: 'pc-1', invoice_id: 'inv-c1', customer_id: 'cust-c', customer_name: 'Customer C', payment_date: new Date('2026-08-05'), amount: new DecimalMoney(120000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-08-05') },
    { id: 'pc-2', invoice_id: 'inv-c2', customer_id: 'cust-c', customer_name: 'Customer C', payment_date: new Date('2026-07-02'), amount: new DecimalMoney(90000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-07-02') },
    { id: 'pc-3', invoice_id: 'inv-c3', customer_id: 'cust-c', customer_name: 'Customer C', payment_date: new Date('2026-05-18'), amount: new DecimalMoney(100000), currency: 'USD', payment_method: 'check', notes: undefined, created_at: new Date('2026-05-18') },
  ],
  invoices: [
    { due_date: new Date('2026-07-31'), paid_amount: new DecimalMoney(120000) },  // 4天
    { due_date: new Date('2026-06-30'), paid_amount: new DecimalMoney(90000) },    // 2天
    { due_date: new Date('2026-04-30'), paid_amount: new DecimalMoney(100000) },   // 18天！
  ]
};

// ─── Customer D: 新建立，无任何历史 ───
export const customerD: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer D - New Customer',
  payments: [],
  invoices: []
};

// ─── Customer E: 金额大，付款记录良好 ───
export const customerE: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer E - Big & Reliable',
  payments: [
    { id: 'pe-1', invoice_id: 'inv-e1', customer_id: 'cust-e', customer_name: 'Customer E', payment_date: new Date('2026-08-03'), amount: new DecimalMoney(5000000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-08-03') },
    { id: 'pe-2', invoice_id: 'inv-e2', customer_id: 'cust-e', customer_name: 'Customer E', payment_date: new Date('2026-06-28'), amount: new DecimalMoney(4800000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-06-28') },
    { id: 'pe-3', invoice_id: 'inv-e3', customer_id: 'cust-e', customer_name: 'Customer E', payment_date: new Date('2026-05-25'), amount: new DecimalMoney(5200000), currency: 'USD', payment_method: 'wire', notes: undefined, created_at: new Date('2026-05-25') },
    { id: 'pe-4', invoice_id: 'inv-e4', customer_id: 'cust-e', customer_name: 'Customer E', payment_date: new Date('2026-04-20'), amount: new DecimalMoney(4900000), currency: 'USD', payment_method: 'bank_transfer', notes: undefined, created_at: new Date('2026-04-20') },
  ],
  invoices: [
    { due_date: new Date('2026-07-30'), paid_amount: new DecimalMoney(5000000) },  // 4天
    { due_date: new Date('2026-06-25'), paid_amount: new DecimalMoney(4800000) },  // 3天
    { due_date: new Date('2026-05-20'), paid_amount: new DecimalMoney(5200000) },  // 5天
    { due_date: new Date('2026-04-15'), paid_amount: new DecimalMoney(4900000) },  // 5天
  ]
};

// ─── Customer F: 金额不大，但长期严重逾期 ───
export const customerF: { name: string; payments: PaymentRecord[]; invoices: Array<{ due_date: Date; paid_amount: DecimalMoney }> } = {
  name: 'Customer F - Chronic Late',
  payments: [
    { id: 'pf-1', invoice_id: 'inv-f1', customer_id: 'cust-f', customer_name: 'Customer F', payment_date: new Date('2026-08-20'), amount: new DecimalMoney(15000), currency: 'USD', payment_method: 'cash', notes: undefined, created_at: new Date('2026-08-20') },
    { id: 'pf-2', invoice_id: 'inv-f2', customer_id: 'cust-f', customer_name: 'Customer F', payment_date: new Date('2026-06-15'), amount: new DecimalMoney(12000), currency: 'USD', payment_method: 'cash', notes: undefined, created_at: new Date('2026-06-15') },
    { id: 'pf-3', invoice_id: 'inv-f3', customer_id: 'cust-f', customer_name: 'Customer F', payment_date: new Date('2026-03-10'), amount: new DecimalMoney(18000), currency: 'USD', payment_method: 'check', notes: undefined, created_at: new Date('2026-03-10') },
  ],
  invoices: [
    { due_date: new Date('2026-07-15'), paid_amount: new DecimalMoney(15000) },   // 36天！
    { due_date: new Date('2026-05-10'), paid_amount: new DecimalMoney(12000) },   // 36天！
    { due_date: new Date('2026-01-30'), paid_amount: new DecimalMoney(18000) },   // 70天！
  ]
};

// ─── Phase 2 综合测试场景 ───

// 场景A: 两个客户欠款相同，付款历史明显恶化的应得分更高
export const scenarioA = {
  description: '欠款金额相同（各$50,000），Customer C 恶化 vs Customer A 可靠',
  customerReceivables: {
    'Customer A - Reliable': new DecimalMoney(5000000),
    'Customer C - Deteriorating': new DecimalMoney(5000000),
  }
};

// 场景B: 同一个客户，历史平均付款时间10天，当前逾期40天 → 应识别为异常
export const scenarioB = {
  description: 'Customer B 平均付款+7天，当前有发票逾期40天 → 异常信号',
  customerName: 'Customer B - Slightly Late',
  historicalAvgPaymentDays: 7,
  currentOverdueDays: 40,
};

// 场景C: 大金额但从不逾期的客户 → 不应自动评为高风险
export const scenarioC = {
  description: 'Customer E $500,000 outstanding，但历史平均+4天，趋势改善 → 低风险',
  customerName: 'Customer E - Big & Reliable',
  outstandingAmount: new DecimalMoney(50000000),
  historicalAvgPaymentDays: 4,
  trend: 'IMPROVING',
};

// 场景D: 小金额但长期严重逾期 → 应进入Priority列表
export const scenarioD = {
  description: 'Customer F $15,000 逾期80天，历史平均+45天 → 高优先级',
  customerName: 'Customer F - Chronic Late',
  outstandingAmount: new DecimalMoney(1500000),
  daysOverdue: 80,
  historicalAvgPaymentDays: 45,
};

// 场景E: 无历史的新客户 → 必须保持UNKNOWN，不得虚构
export const scenarioE = {
  description: 'Customer D 无任何付款记录 → history_score=40, trend_score=40',
  customerName: 'Customer D - New Customer',
  expectedHistoryScore: 40,
  expectedTrendScore: 40,
};
