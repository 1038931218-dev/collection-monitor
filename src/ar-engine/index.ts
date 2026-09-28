import { DecimalMoney } from '../lib/decimal';
import { NormalizedInvoice } from '../data-normalizer';
import {
  PaymentHistoryAnalysis,
  PaymentTrend,
  PaymentDaySample,
  analyzePaymentHistory,
} from '../payment-history';

// 账龄区间
export type AgingBucket = 'CURRENT' | '1-7' | '8-30' | '31-60' | '61-90' | '90+';

// 支付趋势（重新导出以保持 Phase 1 下游导入兼容）
export type { PaymentTrend };

// 客户支付历史（key = 客户名称）
export type CustomerPaymentHistory = Record<string, PaymentHistoryAnalysis>;

// 客户聚合数据
export interface CustomerAggregation {
  customer_name: string;
  total_outstanding: DecimalMoney;
  total_overdue: DecimalMoney;
  invoice_count: number;
  overdue_invoice_count: number;
  // null = 无历史付款数据（Phase 2 接入 payment_records 后填充真实值）
  average_payment_days: number | null;
  median_payment_days: number | null;
  max_days_overdue: number;
  payment_trend: PaymentTrend;
  // Phase 2 新增：完整支付历史分析
  payment_history?: PaymentHistoryAnalysis;
}

// 账龄分布
export interface AgingDistribution {
  bucket: AgingBucket;
  amount: DecimalMoney;
  count: number;
  percentage: number;
}

// AR健康报告
export interface ARHealthReport {
  total_receivables: DecimalMoney;
  overdue_amount: DecimalMoney;
  overdue_ratio: number;
  aging_distribution: AgingDistribution[];
  high_priority_count: number;
  customer_aggregations: CustomerAggregation[];
}

// 获取账龄区间
export function getAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue === 0) return 'CURRENT';
  if (daysOverdue <= 7) return '1-7';
  if (daysOverdue <= 30) return '8-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

// 计算AR健康报告
export function calculateARHealth(
  invoices: NormalizedInvoice[],
  paymentHistory: CustomerPaymentHistory = {} // Phase 2: 可选，传入客户支付历史
): ARHealthReport {
  const totalReceivables = invoices.reduce(
    (sum, inv) => sum.add(inv.outstanding_amount),
    DecimalMoney.fromString('0')
  );

  const overdueAmount = invoices
    .filter(inv => inv.is_overdue)
    .reduce((sum, inv) => sum.add(inv.outstanding_amount), DecimalMoney.fromString('0'));

  // 账龄分布
  const buckets: Record<AgingBucket, DecimalMoney> = {
    'CURRENT': DecimalMoney.fromString('0'),
    '1-7': DecimalMoney.fromString('0'),
    '8-30': DecimalMoney.fromString('0'),
    '31-60': DecimalMoney.fromString('0'),
    '61-90': DecimalMoney.fromString('0'),
    '90+': DecimalMoney.fromString('0'),
  };

  const bucketCounts: Record<AgingBucket, number> = {
    'CURRENT': 0,
    '1-7': 0,
    '8-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };

  invoices.forEach(inv => {
    const bucket = getAgingBucket(inv.days_overdue);
    buckets[bucket] = buckets[bucket].add(inv.outstanding_amount);
    bucketCounts[bucket]++;
  });

  const agingDistribution: AgingDistribution[] = (Object.keys(buckets) as AgingBucket[]).map(bucket => ({
    bucket,
    amount: buckets[bucket],
    count: bucketCounts[bucket],
    percentage: totalReceivables.cents > 0 
      ? (buckets[bucket].cents / totalReceivables.cents) * 100 
      : 0,
  }));

  // 高优先级账户数（预计算，实际优先级由PriorityEngine计算）
  const highPriorityCount = invoices.filter(inv => inv.is_overdue && inv.outstanding_amount.cents > 0).length;

  // 客户聚合
  const customerMap = new Map<string, NormalizedInvoice[]>();
  invoices.forEach(inv => {
    const existing = customerMap.get(inv.customer_name) || [];
    existing.push(inv);
    customerMap.set(inv.customer_name, existing);
  });

  const customerAggregations: CustomerAggregation[] = Array.from(customerMap.entries()).map(([name, custInvoices]) => {
    const totalOutstanding = custInvoices.reduce((sum, inv) => sum.add(inv.outstanding_amount), DecimalMoney.fromString('0'));
    const totalOverdue = custInvoices
      .filter(inv => inv.is_overdue)
      .reduce((sum, inv) => sum.add(inv.outstanding_amount), DecimalMoney.fromString('0'));

    const maxDaysOverdue = Math.max(...custInvoices.map(inv => inv.days_overdue), 0);

    // Phase 2: 从支付历史填充真实数据
    const hist = paymentHistory[name];
    return {
      customer_name: name,
      total_outstanding: totalOutstanding,
      total_overdue: totalOverdue,
      invoice_count: custInvoices.length,
      overdue_invoice_count: custInvoices.filter(inv => inv.is_overdue).length,
      average_payment_days: hist?.average_payment_days ?? null,
      median_payment_days: hist?.median_payment_days ?? null,
      max_days_overdue: maxDaysOverdue,
      payment_trend: hist?.payment_trend ?? 'UNKNOWN',
      payment_history: hist ?? null,
    };
  });

  return {
    total_receivables: totalReceivables,
    overdue_amount: overdueAmount,
    overdue_ratio: totalReceivables.cents > 0 
      ? (overdueAmount.cents / totalReceivables.cents) * 100 
      : 0,
    aging_distribution: agingDistribution,
    high_priority_count: highPriorityCount,
    customer_aggregations: customerAggregations,
  };
}
