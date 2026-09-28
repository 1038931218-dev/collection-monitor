// 支付历史分析模块（Phase 2）
//
// 核心原则：
//   1. 所有指标（平均/中位/趋势/逾期统计）由程序确定性计算，禁止 LLM 参与。
//   2. 没有足够历史数据时返回 null 或 'UNKNOWN'，绝不虚构客户行为。
//   3. 输入是一个"已解析"的 (到期日, 付款日) 配对列表 —— 真正的分析单元。
//      数据库层用 payment_records.invoice_id 关联发票后可构造出这些配对；
//      这里不关心来源，保证可测试、可复现。

import { DecimalMoney, DateUtils } from '../lib/decimal';

export type PaymentTrend = 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'UNKNOWN';
export type PaymentBehavior = 'EARLY' | 'ON_TIME' | 'LATE' | 'SEVERE_LATE' | 'UNKNOWN';

// 数据库模型（对应 prisma/schema.prisma 的 PaymentRecord）
export interface PaymentRecord {
  id: string;
  invoice_id?: string;
  customer_id: string;
  customer_name: string;
  payment_date: Date;
  amount: DecimalMoney;
  currency: string;
  payment_method?: string;
  notes?: string;
  created_at: Date;
}

// 分析单元：某张发票从到期到实际付款的天数
export interface PaymentDaySample {
  due_date: Date;
  payment_date: Date;
}

// 每个客户的支付历史分析结果
export interface PaymentHistoryAnalysis {
  customer_id: string;
  customer_name: string;
  total_payments: number;

  // 历史平均付款天数（负数=提前，正数=逾期）
  average_payment_days: number | null;
  // 历史中位付款天数
  median_payment_days: number | null;
  // 最近一次付款距今天数
  last_payment_days_ago: number | null;
  // 最近 3 笔付款的平均付款天数
  recent_average_payment_days: number | null;

  // 历史逾期行为
  historical_overdue_count: number;    // 逾期笔数
  historical_overdue_rate: number;     // 逾期率 0-100
  max_historical_overdue_days: number; // 最大逾期天数

  // 趋势 + 行为标签
  payment_trend: PaymentTrend;
  payment_behavior: PaymentBehavior;
}

/**
 * 从 (到期日, 付款日) 配对计算 days_to_pay（负=提前，正=逾期）
 */
export function daysToPayFromSample(sample: PaymentDaySample): number {
  return DateUtils.daysBetween(sample.due_date, sample.payment_date);
}

/**
 * 核心：给定一组已解析的 (due_date, payment_date) 配对，
 * 计算某个客户的完整支付历史分析。
 *
 * 若样本不足（< 1），平均值/中位数/趋势返回 null/'UNKNOWN'。
 * 若样本 < 3，趋势无法可靠判定 → 'UNKNOWN'。
 */
export function analyzePaymentHistory(
  customerId: string,
  customerName: string,
  samples: PaymentDaySample[],
  today: Date
): PaymentHistoryAnalysis {
  const n = samples.length;

  // 按付款日期排序（早→晚），用于趋势和"最近N笔"
  const sorted = [...samples].sort((a, b) => a.payment_date.getTime() - b.payment_date.getTime());
  const daysToPayValues = sorted.map(daysToPayFromSample);

  // ── 平均 / 中位 ──
  const averagePaymentDays = n > 0 ? round1(daysToPayValues.reduce((a, b) => a + b, 0) / n) : null;
  const medianPaymentDays = n > 0 ? round1(calculateMedian(daysToPayValues)) : null;

  // ── 最近付款 ──
  const lastPayment = sorted[n - 1];
  const lastPaymentDaysAgo = lastPayment
    ? Math.max(0, DateUtils.daysBetween(lastPayment.payment_date, today))
    : null;

  // ── 最近 3 笔平均 ──
  const recent3 = sorted.slice(-3);
  const recentAveragePaymentDays = recent3.length > 0
    ? round1(recent3.map(daysToPayFromSample).reduce((a, b) => a + b, 0) / recent3.length)
    : null;

  // ── 逾期统计 ──
  const overdueValues = daysToPayValues.filter(d => d > 0);
  const historicalOverdueCount = overdueValues.length;
  const historicalOverdueRate = n > 0 ? Math.round((overdueValues.length / n) * 100) : 0;
  const maxHistoricalOverdueDays = overdueValues.length > 0 ? Math.max(...overdueValues) : 0;

  // ── 趋势 + 行为标签 ──
  const trend = calculateTrend(sorted);
  const behavior = determineBehavior(averagePaymentDays);

  return {
    customer_id: customerId,
    customer_name: customerName,
    total_payments: n,
    average_payment_days: averagePaymentDays,
    median_payment_days: medianPaymentDays,
    last_payment_days_ago: lastPaymentDaysAgo,
    recent_average_payment_days: recentAveragePaymentDays,
    historical_overdue_count: historicalOverdueCount,
    historical_overdue_rate: historicalOverdueRate,
    max_historical_overdue_days: maxHistoricalOverdueDays,
    payment_trend: trend,
    payment_behavior: behavior,
  };
}

// 中位数
function calculateMedian(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * 趋势判定：把付款记录按时间分为前后两半，比较平均付款天数。
 *   后一半比前一半平均晚了 ≥5 天  → DETERIORATING（越来越慢/越拖越久）
 *   后一半比前一半平均快了 ≥5 天  → IMPROVING
 *   其它                          → STABLE
 *   样本 < 3                     → UNKNOWN（不足以判定趋势）
 */
function calculateTrend(sorted: PaymentDaySample[]): PaymentTrend {
  if (sorted.length < 3) return 'UNKNOWN';

  const mid = Math.floor(sorted.length / 2);
  let firstHalf = sorted.slice(0, mid);
  let secondHalf = sorted.slice(mid);
  // 奇数样本：两段长度不齐，去掉最旧一笔使两段可比
  if (firstHalf.length !== secondHalf.length && secondHalf.length > 0) {
    secondHalf = secondHalf.slice(1);
  }
  if (firstHalf.length === 0 || secondHalf.length === 0) return 'UNKNOWN';

  const avg = (arr: PaymentDaySample[]) =>
    arr.map(daysToPayFromSample).reduce((a, b) => a + b, 0) / arr.length;

  const diff = avg(secondHalf) - avg(firstHalf); // 正=变慢（恶化），负=变快（改善）

  if (diff >= 5) return 'DETERIORATING';
  if (diff <= -5) return 'IMPROVING';
  return 'STABLE';
}

// 行为标签：基于平均付款天数
function determineBehavior(avgDays: number | null): PaymentBehavior {
  if (avgDays === null) return 'UNKNOWN';
  if (avgDays < 0) return 'EARLY';       // 平均提前付款
  if (avgDays <= 7) return 'ON_TIME';     // 基本准时
  if (avgDays <= 14) return 'LATE';       // 轻微逾期
  return 'SEVERE_LATE';                   // 严重逾期
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * 便捷工厂：从付款记录 + 对应发票到期日 构造 samples。
 * 用法：为每个 payment record 找到它对应的 invoice.due_date。
 */
export function buildSamplesFromRecords(
  payments: PaymentRecord[],
  dueDateByInvoiceId: Record<string, Date>
): PaymentDaySample[] {
  return payments
    .filter(p => p.invoice_id && dueDateByInvoiceId[p.invoice_id])
    .map(p => ({
      due_date: dueDateByInvoiceId[p.invoice_id!],
      payment_date: p.payment_date,
    }));
}
