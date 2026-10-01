// 端到端测试辅助函数 - 直接调用业务逻辑，不走 HTTP
import { normalizeInvoices } from '../../../src/data-normalizer';
import { calculateARHealth } from '../../../src/ar-engine';
import { generateCollectionTasks } from '../../../src/priority-engine';
import { DecimalMoney, DateUtils } from '../../../src/lib/decimal';
import { InvoiceData } from '../../../src/file-parser';
import { NormalizedInvoice } from '../../../src/data-normalizer';

export interface E2EResult {
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
  severity: 'P0' | 'P1' | 'P2';
}

/**
 * 运行完整的 AR 分析链路
 * @param invoices 原始发票数据
 * @param fixedToday 固定"今天"日期（用于测试可重复性）
 */
export function runAnalyzeChain(
  invoices: InvoiceData[],
  fixedToday?: Date
): {
  normalized: NormalizedInvoice[];
  arHealth: any;
  tasks: any[];
  errors: string[];
} {
  const errors: string[] = [];
  
  // 步骤1: 标准化
  let normalized: NormalizedInvoice[];
  try {
    normalized = normalizeInvoices(invoices);
  } catch (e) {
    errors.push(`标准化失败: ${e instanceof Error ? e.message : String(e)}`);
    return { normalized: [], arHealth: null, tasks: [], errors };
  }
  
  // 步骤2: AR健康计算
  let arHealth: any;
  try {
    arHealth = calculateARHealth(normalized);
  } catch (e) {
    errors.push(`AR健康计算失败: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // 步骤3: 生成催收任务
  let tasks: any[] = [];
  try {
    if (arHealth) {
      tasks = generateCollectionTasks(normalized, arHealth.customer_aggregations, 5);
    }
  } catch (e) {
    errors.push(`催收任务生成失败: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  return { normalized, arHealth, tasks, errors };
}

/**
 * 验证单条发票处理结果
 */
export function validateInvoice(
  invoice: InvoiceData,
  expectedDaysOverdue: number,
  expectedBucket: string
): E2EResult {
  const result = runAnalyzeChain([invoice]);
  
  if (result.errors.length > 0) {
    return {
      input: invoice,
      expected: { days_overdue: expectedDaysOverdue, bucket: expectedBucket },
      actual: { normalized: result.normalized, errors: result.errors },
      passed: false,
      error: `处理异常: ${result.errors.join(', ')}`,
      severity: 'P1'
    };
  }
  
  if (result.normalized.length === 0) {
    return {
      input: invoice,
      expected: { days_overdue: expectedDaysOverdue, bucket: expectedBucket },
      actual: { normalized: result.normalized, errors: ['无输出'] },
      passed: false,
      error: '发票被过滤（可能是空客户名或日期无效）',
      severity: 'P2'
    };
  }
  
  const norm = result.normalized[0];
  const passed = 
    norm.days_overdue === expectedDaysOverdue &&
    norm.status !== 'PAID'; // 排除已付款情况
  
  return {
    input: invoice,
    expected: { days_overdue: expectedDaysOverdue, bucket: expectedBucket },
    actual: {
      days_overdue: norm.days_overdue,
      bucket: norm.status,
      outstanding: norm.outstanding_amount.toString()
    },
    passed,
    error: passed ? undefined : `账龄=${norm.days_overdue}(期望${expectedDaysOverdue}), 状态=${norm.status}`,
    severity: !passed ? 'P0' : 'P2'
  };
}

/**
 * 验证批量数据的聚合结果
 */
export function validateAggregation(
  invoices: InvoiceData[],
  expectedTotal: DecimalMoney,
  expectedOverdueCount: number
): E2EResult {
  const result = runAnalyzeChain(invoices);
  
  if (!result.arHealth) {
    return {
      input: invoices,
      expected: { total: expectedTotal.toString(), overdue_count: expectedOverdueCount },
      actual: { result: 'AR健康计算失败' },
      passed: false,
      error: 'AR健康报告生成失败',
      severity: 'P0'
    };
  }
  
  const totalCents = result.arHealth.total_receivables.cents;
  const overdueCents = result.arHealth.overdue_amount.cents;
  const overdueCount = result.arHealth.high_priority_count;
  
  const totalPassed = totalCents === expectedTotal.cents;
  const countPassed = overdueCount === expectedOverdueCount;
  
  return {
    input: invoices,
    expected: { total: expectedTotal.toString(), overdue_count: expectedOverdueCount },
    actual: {
      total: result.arHealth.total_receivables.toString(),
      overdue: result.arHealth.overdue_amount.toString(),
      overdue_count: overdueCount
    },
    passed: totalPassed && countPassed,
    error: !totalPassed ? `总金额不匹配: 实际${totalCents} vs 期望${expectedTotal.cents}` :
           !countPassed ? `逾期数不匹配: 实际${overdueCount} vs 期望${expectedOverdueCount}` : undefined,
    severity: 'P0'
  };
}
