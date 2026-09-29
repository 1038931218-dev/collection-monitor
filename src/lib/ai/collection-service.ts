/**
 * AI 收款管家业务服务（Phase 4 第 3 段）
 *
 * 把确定性 AR 计算与 AI 解释层串成完整链路：
 *   解析 → 标准化 → AR 计算 → 付款历史分析 → Priority Engine → Top N
 *   → AI 逐条分析（失败则 fallback）→ 催款消息草稿
 *
 * 核心原则：
 *   - AI 绝不修改原始 priority_score / priority_level（确定性数据不可变）
 *   - AI 只附加 ai_analysis + collection_message_draft
 *   - 任何单条 AI 失败不影响其他任务，也不阻塞整个报告
 *   - 只对 Top N（默认 5）调用 AI，控制成本
 */
import { DecimalMoney } from '../decimal';
import { NormalizedInvoice, normalizeInvoices } from '../../data-normalizer';
import {
  calculateARHealth,
  CustomerAggregation,
} from '../../ar-engine';
import {
  parseFile,
  ParsedFile,
} from '../../file-parser';
import {
  generateCollectionTasks,
  CollectionTask,
  PriorityScore,
} from '../../priority-engine';
import {
  analyzePaymentHistory,
  buildSamplesFromRecords,
  PaymentRecord,
  PaymentHistoryAnalysis,
} from '../../payment-history';
import { aiService, AICallStats } from './service';
import { getAIProvider } from './factory';
import type { AIProvider } from './provider';
import type {
  AIInvoiceContext,
  AiInvoiceAnalysis,
} from './types';

// ─── 业务输出类型 ────────────────────────────────────────────────────────────

/** 单条任务的最终输出：确定性数据 + AI 分析（可能为 fallback） */
export interface EnrichedCollectionTask {
  // 确定性部分（不可变，AI 无法修改）
  invoice: NormalizedInvoice;
  priority: PriorityScore;
  reason: string;
  recommended_action: string;
  customer_aggregation?: CustomerAggregation;

  // AI 附加部分（失败时为 fallback，仍保证有值）
  ai_analysis?: AiInvoiceAnalysis;
  ai_stats?: AICallStats;
}

/** 完整的 AR 分析报告（含 AI 增强的 Top Tasks） */
export interface AIARReport {
  generated_at: string;
  total_invoices: number;
  total_customers: number;
  total_receivables: string;
  overdue_amount: string;
  overdue_ratio: number;
  aging_distribution: Array<{ bucket: string; amount: string; percentage: number }>;
  top_tasks: EnrichedCollectionTask[];
  /** AI 调用统计（整份报告汇总） */
  ai_stats?: {
    total_calls: number;
    success: number;
    failure: number;
    provider: string;
  };
}

/** 催款消息草稿 */
export interface CollectionMessageDraft {
  invoice_number?: string;
  customer_name: string;
  outstanding_amount: string;
  days_overdue: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
  subject: string;
  message: string;
  tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM';
  /** 该草稿由真实 AI 还是 fallback 生成 */
  ai_success: boolean;
}

// ─── 辅助函数：构造 AI 输入上下文 ────────────────────────────────────────────

function buildInvoiceContext(
  task: CollectionTask
): AIInvoiceContext {
  const { invoice, priority, customer_aggregation: agg } = task;
  return {
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name,
    amount: invoice.amount.toString(),
    paid_amount: invoice.paid_amount.toString(),
    outstanding_amount: invoice.outstanding_amount.toString(),
    days_overdue: invoice.days_overdue,
    priority_score: priority.priority_score,
    priority_level: priority.priority_level,
    overdue_score: priority.overdue_score,
    amount_score: priority.amount_score,
    history_score: priority.history_score,
    trend_score: priority.trend_score,
    reason: task.reason,
    recommended_action: task.recommended_action,
    customer_history: agg?.payment_history
      ? {
          customer_name: agg.customer_name,
          total_outstanding: agg.total_outstanding.toString(),
          total_overdue: agg.total_overdue.toString(),
          invoice_count: agg.invoice_count,
          overdue_invoice_count: agg.overdue_invoice_count,
          average_payment_days: agg.average_payment_days,
          payment_trend: agg.payment_trend,
          payment_behavior: agg.payment_history.payment_behavior,
          historical_overdue_rate: agg.payment_history.historical_overdue_rate,
        }
      : undefined,
  };
}

// ─── 核心业务服务 ────────────────────────────────────────────────────────────

export class AICollectionService {
  /**
   * 分析文件中的发票，返回带 AI 增强的 Top N 任务
   *
   * @param fileBuffer Excel/CSV buffer
   * @param filename 文件名
   * @param options.topN 取前 N 个（默认 5）
   * @param options.paymentRecords 可选：客户历史付款记录（喂入支付历史分析）
   * @param options.forceProvider 测试时强制指定 provider
   */
  async analyze(
    fileBuffer: Buffer,
    filename: string,
    options: {
      topN?: number;
      paymentRecords?: PaymentRecord[];
      forceProvider?: AIProvider;
    } = {}
  ): Promise<AIARReport> {
    const topN = options.topN ?? 5;
    const provider = options.forceProvider ?? getAIProvider();
    const providerName = provider.getName();

    // Step 1: 解析文件
    const parsed: ParsedFile = await parseFile(fileBuffer, filename);
    if (parsed.invoices.length === 0 && parsed.errors.length > 0) {
      throw new Error(`文件解析失败: ${parsed.errors.join('; ')}`);
    }

    // Step 2: 标准化（去重、过滤空客户）
    const normalized = normalizeInvoices(parsed.invoices);

    // Step 3: AR 健康计算（账龄、逾期比例、客户聚合）
    const arHealth = calculateARHealth(normalized);

    // Step 4: 把付款历史分析挂到对应客户的聚合上（如果提供了 records）
    if (options.paymentRecords && options.paymentRecords.length > 0) {
      const historyMap = AICollectionService.buildPaymentHistoryMap(normalized, options.paymentRecords);
      arHealth.customer_aggregations.forEach(agg => {
        const hist = historyMap.get(agg.customer_name);
        if (hist) {
          agg.payment_history = hist;
          agg.average_payment_days = hist.average_payment_days;
          agg.median_payment_days = hist.median_payment_days;
          agg.payment_trend = hist.payment_trend;
        }
      });
    }

    // Step 5: Priority Engine 生成任务（按 priority_score 降序排序）
    const allTasks = generateCollectionTasks(normalized, arHealth.customer_aggregations, Infinity);

    // Step 6: 只取 Top N 调用 AI（成本控制）
    const topTasks = allTasks.slice(0, topN);

    const enriched: EnrichedCollectionTask[] = [];
    let aiSuccess = 0;
    let aiFailure = 0;

    for (const task of topTasks) {
      const ctx = buildInvoiceContext(task);

      // aiService.analyzeInvoice 内部已处理 fallback（永不抛异常），
      // 返回 { ...analysis, success, provider, latencyMs, error?, timestamp }
      const result = await aiService.analyzeInvoice(ctx, provider);

      const analysis: AiInvoiceAnalysis = {
        summary: result.summary,
        reason: result.reason,
        recommended_action: result.recommended_action,
        recommended_timing: result.recommended_timing,
        message_tone: result.message_tone,
      };
      const stats: AICallStats = {
        success: result.success,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        error: result.error,
        timestamp: result.timestamp,
      };

      if (result.success) aiSuccess++;
      else aiFailure++;

      enriched.push({
        invoice: task.invoice,
        priority: task.priority,
        reason: task.reason,
        recommended_action: task.recommended_action,
        customer_aggregation: task.customer_aggregation,
        ai_analysis: analysis,
        ai_stats: stats,
      });
    }

    // Step 7: 组装报告
    return {
      generated_at: new Date().toISOString(),
      total_invoices: normalized.length,
      total_customers: new Set(normalized.map(i => i.customer_name)).size,
      total_receivables: arHealth.total_receivables.toString(),
      overdue_amount: arHealth.overdue_amount.toString(),
      overdue_ratio: Math.round(arHealth.overdue_ratio * 10) / 10,
      aging_distribution: arHealth.aging_distribution.map(d => ({
        bucket: d.bucket,
        amount: d.amount.toString(),
        percentage: Math.round(d.percentage * 10) / 10,
      })),
      top_tasks: enriched,
      ai_stats: {
        total_calls: topTasks.length,
        success: aiSuccess,
        failure: aiFailure,
        provider: providerName,
      },
    };
  }

  /**
   * 为指定任务生成催款消息草稿（用户确认后才会发送，此处不发送）
   */
  async generateMessageDraft(
    task: CollectionTask | EnrichedCollectionTask,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL',
    options: { forceProvider?: AIProvider } = {}
  ): Promise<CollectionMessageDraft> {
    const provider = options.forceProvider ?? getAIProvider();
    const ctx = buildInvoiceContext(task as CollectionTask);
    const result = await aiService.generateCollectionMessage(ctx, tone, provider);

    return {
      invoice_number: (task as EnrichedCollectionTask).invoice?.invoice_number ?? ctx.invoice_number,
      customer_name: ctx.customer_name,
      outstanding_amount: ctx.outstanding_amount,
      days_overdue: ctx.days_overdue,
      priority_level: ctx.priority_level,
      subject: result.subject,
      message: result.message,
      tone,
      ai_success: result.success,
    };
  }

  /**
   * 从 PaymentRecord 构建「客户名 → 历史分析」映射。
   * 用付款记录 + 对应发票到期日推导 (due_date, payment_date) 配对。
   */
  static buildPaymentHistoryMap(
    invoices: NormalizedInvoice[],
    paymentRecords: PaymentRecord[]
  ): Map<string, PaymentHistoryAnalysis> {
    const map = new Map<string, PaymentHistoryAnalysis>();

    const recordsByCustomer = new Map<string, PaymentRecord[]>();
    paymentRecords.forEach(p => {
      const arr = recordsByCustomer.get(p.customer_name) || [];
      arr.push(p);
      recordsByCustomer.set(p.customer_name, arr);
    });

    recordsByCustomer.forEach((records, name) => {
      const custInvoices = invoices.filter(inv => inv.customer_name === name);
      // invoice_number → due_date 映射，供 buildSamplesFromRecords 关联
      const dueDateByInvoiceId: Record<string, Date> = {};
      custInvoices.forEach(inv => {
        if (inv.invoice_number) dueDateByInvoiceId[inv.invoice_number] = inv.due_date;
      });
      const samples = buildSamplesFromRecords(records, dueDateByInvoiceId);
      const analysis = analyzePaymentHistory(name, name, samples, new Date());
      if (analysis.total_payments > 0) {
        map.set(name, analysis);
      }
    });

    return map;
  }
}

// 导出单例
export const aiCollectionService = new AICollectionService();
