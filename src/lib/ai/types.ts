/**
 * AI Provider 接口
 *
 * 原则：
 *   1. LLM 绝不负责计算，只负责解读结构化数据
 *   2. 输出必须通过 Zod schema 校验
 *   3. 任何失败都有程序 fallback，不阻塞核心链路
 *   4. API Key 只存服务端环境变量，不暴露给前端
 */
import { z } from 'zod';
import { DecimalMoney } from '../lib/decimal';

// ─── AI 输入：结构化数据（由程序计算，LLM 只读不解） ───────────────────────

export interface AICustomerContext {
  customer_name: string;
  total_outstanding: string;        // 格式化金额
  total_overdue: string;            // 格式化金额
  invoice_count: number;
  overdue_invoice_count: number;
  average_payment_days: number | null;
  payment_trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'UNKNOWN';
  payment_behavior: string;         // EARLY | ON_TIME | LATE | SEVERE_LATE
  historical_overdue_rate: number;  // 0-100
}

export interface AIInvoiceContext {
  invoice_number?: string;
  customer_name: string;
  amount: string;
  paid_amount: string;
  outstanding_amount: string;
  days_overdue: number;
  priority_score: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
  overdue_score: number;
  amount_score: number;
  history_score: number;
  trend_score: number;
  reason: string;
  recommended_action: string;
  // 可选：客户历史上下文
  customer_history?: AICustomerContext;
}

export interface AIReportContext {
  total_receivables: string;
  overdue_amount: string;
  overdue_ratio: number;
  total_invoices: number;
  total_customers: number;
  high_priority_count: number;
  medium_priority_count: number;
  aging_buckets: Array<{ bucket: string; amount: string; percentage: number }>;
  top_tasks: AIInvoiceContext[];
  // 所有发票（供 AI 分析）
  all_invoices_summary: Array<{
    customer_name: string;
    invoice_number?: string;
    outstanding_amount: string;
    days_overdue: number;
    priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
    priority_score: number;
  }>;
}

// ─── AI 输出：Zod schema 校验 ─────────────────────────────────────────────

export const AiToneSchema = z.enum(['FRIENDLY', 'PROFESSIONAL', 'FIRM']).default('PROFESSIONAL');

export const AiActionSchema = z.enum([
  'follow_up_now',
  'follow_up_later',
  'monitor',
  'review_account',
]).default('follow_up_later');

export const AiTimingSchema = z.enum([
  'today',
  'within_3_days',
  'next_week',
  'monitor',
]).default('monitor');

export const AiInvoiceAnalysisSchema = z.object({
  summary: z.string().min(1),
  reason: z.string().min(1),
  recommended_action: AiActionSchema,
  recommended_timing: AiTimingSchema,
  message_tone: AiToneSchema,
});

export const AiReportAnalysisSchema = z.object({
  summary: z.string().min(1),
  risk_assessment: z.string().min(1),
  key_findings: z.array(z.string().min(1)).min(1).max(10),
  recommendations: z.array(z.string().min(1)).min(1).max(10),
});

export type AiInvoiceAnalysis = z.infer<typeof AiInvoiceAnalysisSchema>;
export type AiReportAnalysis = z.infer<typeof AiReportAnalysisSchema>;

// ─── Fallback（AI 失败时的程序默认值）────────────────────────────────────────

export function getFallbackInvoiceAnalysis(invoice: AIInvoiceContext): AiInvoiceAnalysis {
  const timing = invoice.days_overdue >= 90 ? 'today'
    : invoice.days_overdue >= 30 ? 'within_3_days'
    : invoice.priority_level === 'HIGH' ? 'today'
    : 'monitor';
  const action = invoice.priority_level === 'HIGH' ? 'follow_up_now'
    : invoice.priority_level === 'MEDIUM' ? 'follow_up_later'
    : 'monitor';

  return {
    summary: `该账款逾期 ${invoice.days_overdue} 天，未收金额 ${invoice.outstanding_amount}，优先级 ${invoice.priority_level}。`,
    reason: invoice.reason || '程序判定优先级',
    recommended_action: action,
    recommended_timing: timing,
    message_tone: invoice.days_overdue >= 60 ? 'FIRM' : 'PROFESSIONAL',
  };
}

export function getFallbackReportAnalysis(report: AIReportContext): AiReportAnalysis {
  return {
    summary: `当前应收账款 ${report.total_receivables}，逾期金额 ${report.overdue_amount}，逾期比例 ${report.overdue_ratio}%。`,
    risk_assessment: report.overdue_ratio > 30 ? '高风险：逾期比例超过30%'
      : report.overdue_ratio > 15 ? '中风险：逾期比例超过15%'
      : report.overdue_ratio > 5 ? '低风险：逾期比例在5-15%之间'
      : '健康：逾期比例低于5%',
    key_findings: [
      `逾期金额: ${report.overdue_amount}`,
      `应收账款总额: ${report.total_receivables}`,
      `待处理高优先级账户: ${report.high_priority_count}个`,
    ],
    recommendations: [
      `优先处理${report.high_priority_count}个高风险账户`,
      '定期检查应收账款账龄分布',
      '与客户建立良好的沟通机制',
    ],
  };
}
