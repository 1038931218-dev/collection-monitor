import { DecimalMoney } from '../lib/decimal';
import { NormalizedInvoice } from '../data-normalizer';
import { CustomerAggregation, PaymentTrend } from '../ar-engine';

// 优先级评分
export interface PriorityScore {
  priority_score: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
  overdue_score: number;
  amount_score: number;
  history_score: number;
  trend_score: number;
}

// 收款任务
export interface CollectionTask {
  invoice: NormalizedInvoice;
  priority: PriorityScore;
  reason: string;
  recommended_action: string;
  customer_aggregation?: CustomerAggregation;
}

// 逾期评分
function calculateOverdueScore(daysOverdue: number): number {
  if (daysOverdue === 0) return 0;
  if (daysOverdue <= 7) return 10;
  if (daysOverdue <= 30) return 30;
  if (daysOverdue <= 60) return 60;
  if (daysOverdue <= 90) return 80;
  return 100;
}

// 金额评分
function calculateAmountScore(outstanding: DecimalMoney, totalOutstanding: DecimalMoney): number {
  if (totalOutstanding.cents === 0) return 0;
  
  // 计算占比并归一化到0-100
  const ratio = outstanding.cents / totalOutstanding.cents;
  return Math.round(ratio * 100);
}

// 历史评分
// 语义：history_score 反映该客户「过去是否可靠付款」，分数越高=越不可靠=越该重点催。
//   - 无历史数据（新客户）：固定 40（中性），绝不虚构行为。
//   - 有历史数据：按平均付款天数分档 + 逾期率修正。
// 权重不在这里改——本函数只产出 0-100 的原始分，公式里的 0.20 保持不变。
function calculateHistoryScore(
  avgPaymentDays: number | null,
  historicalOverdueRate: number, // 0-100，无数据时为 0
  hasHistory: boolean
): number {
  // 没有历史数据 → 中性 40（UNKNOWN）
  if (!hasHistory || avgPaymentDays === null) {
    return 40;
  }

  let score: number;

  // 负数或很小 → 提前/准时付款，最可靠 → 最低历史风险分
  if (avgPaymentDays <= 0) {
    score = 10;
  } else if (avgPaymentDays <= 7) {
    score = 20;
  } else if (avgPaymentDays <= 14) {
    score = 30;
  } else if (avgPaymentDays <= 30) {
    score = 50;
  } else if (avgPaymentDays <= 60) {
    score = 70;
  } else {
    score = 90;
  }

  // 逾期率修正：历史逾期率高说明不稳定，适度上调（封顶 100）
  if (historicalOverdueRate > 0) {
    const overdueBoost = Math.min(20, Math.round(historicalOverdueRate / 5)); // 每逾期率5%加1，最多加20
    score = Math.min(100, score + overdueBoost);
  }

  return score;
}

// 趋势评分
function calculateTrendScore(trend: PaymentTrend): number {
  switch (trend) {
    case 'IMPROVING': return 20;
    case 'STABLE': return 40;
    case 'DETERIORATING': return 80;
    default: return 40; // UNKNOWN
  }
}

// 计算优先级评分
export function calculatePriorityScore(
  invoice: NormalizedInvoice,
  totalOutstanding: DecimalMoney,
  customerAgg?: CustomerAggregation
): PriorityScore {
  // 逾期评分
  const overdueScore = calculateOverdueScore(invoice.days_overdue);

  // 金额评分
  const amountScore = calculateAmountScore(invoice.outstanding_amount, totalOutstanding);

  // 历史评分（从 payment_history 读取真实数据，没有则保持 UNKNOWN 默认）
  let historyScore = 40; // UNKNOWN default
  let trendScore = 40;   // UNKNOWN default
  if (customerAgg?.payment_history) {
    historyScore = calculateHistoryScore(
      customerAgg.payment_history.average_payment_days,
      customerAgg.payment_history.historical_overdue_rate,
      customerAgg.payment_history.total_payments > 0
    );
    trendScore = calculateTrendScore(customerAgg.payment_history.payment_trend);
  }

  // 最终评分（加权）—— 公式严格保持不变：
  // priority_score = overdue_score × 0.35 + amount_score × 0.25 + history_score × 0.20 + trend_score × 0.20
  const priorityScore = Math.round(
    overdueScore * 0.35 +
    amountScore * 0.25 +
    historyScore * 0.20 +
    trendScore * 0.20
  );

  // 确定优先级等级
  let priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (priorityScore >= 80) {
    priorityLevel = 'HIGH';
  } else if (priorityScore >= 50) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  return {
    priority_score: priorityScore,
    priority_level: priorityLevel,
    overdue_score: overdueScore,
    amount_score: amountScore,
    history_score: historyScore,
    trend_score: trendScore,
  };
}

// 生成收款任务列表
export function generateCollectionTasks(
  invoices: NormalizedInvoice[],
  customerAggregations: CustomerAggregation[],
  topN: number = 5
): CollectionTask[] {
  // 计算每个公司的总未收金额
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum.add(inv.outstanding_amount),
    DecimalMoney.fromString('0')
  );

  // 构建客户聚合Map
  const customerMap = new Map<string, CustomerAggregation>();
  customerAggregations.forEach(agg => {
    customerMap.set(agg.customer_name, agg);
  });

  // 计算每个发票的优先级
  const tasks = invoices.map(invoice => {
    const customerAgg = customerMap.get(invoice.customer_name);
    const priority = calculatePriorityScore(invoice, totalOutstanding, customerAgg);

    return {
      invoice,
      priority,
      reason: generateReason(invoice, priority, customerAgg),
      recommended_action: generateRecommendedAction(invoice, priority),
      customer_aggregation: customerAgg,
    };
  });

  // 按优先级评分降序排序
  tasks.sort((a, b) => b.priority.priority_score - a.priority.priority_score);

  // 返回Top N
  return tasks.slice(0, topN);
}

// 生成优先级原因
function generateReason(
  invoice: NormalizedInvoice,
  priority: PriorityScore,
  customerAgg?: CustomerAggregation
): string {
  const reasons: string[] = [];

  if (invoice.days_overdue > 0) {
    reasons.push(`逾期 ${invoice.days_overdue} 天`);
  }

  if (invoice.outstanding_amount.cents > 0) {
    reasons.push(`未收金额 ${invoice.outstanding_amount.toString()}`);
  }

  if (customerAgg) {
    if (customerAgg.payment_trend === 'DETERIORATING') {
      reasons.push('付款趋势恶化');
    } else if (customerAgg.payment_trend === 'IMPROVING') {
      reasons.push('付款趋势改善');
    }
  }

  return reasons.length > 0 ? reasons.join('，') : '常规跟进';
}

// 生成建议行动
function generateRecommendedAction(
  invoice: NormalizedInvoice,
  priority: PriorityScore
): string {
  if (priority.priority_level === 'HIGH') {
    return '立即跟进，今天必须联系客户';
  } else if (priority.priority_level === 'MEDIUM') {
    return '尽快跟进，建议24小时内联系';
  } else {
    return '常规跟进，可在本周内处理';
  }
}
