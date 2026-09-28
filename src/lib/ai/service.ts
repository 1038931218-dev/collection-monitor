/**
 * AI 服务层
 *
 * 职责：
 *   1. 调用 AI Provider 分析 AR 数据
 *   2. 失败时使用程序 fallback
 *   3. 记录 AI 调用状态（用于监控和调试）
 *
 * 注意：
 *   - AI 只做解释，不做计算
 *   - 所有输入数据来自程序已验证的结果
 */
import {
  AIInvoiceContext,
  AIReportContext,
  AiInvoiceAnalysis,
  AiReportAnalysis,
} from './types';
import { getAIProvider, AIProvider } from './factory';

export interface AICallStats {
  success: boolean;
  provider: string;
  latencyMs: number;
  error?: string;
}

export class AIService {
  /**
   * 分析整份 AR 报告（只分析 Top 5 priority tasks）
   */
  async analyzeReport(data: AIReportContext, provider?: AIProvider): Promise<AiReportAnalysis & AICallStats> {
    const start = Date.now();
    const p = provider ?? getAIProvider();
    const providerName = this.getProviderName(p);

    try {
      const result = await p.analyzeReport(data);
      return {
        ...result,
        success: true,
        provider: providerName,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      console.error('[AIService] analyzeReport 失败:', err);
      const fallback: AiReportAnalysis = {
        summary: `应收账款总额 ${data.total_receivables}，逾期 ${data.overdue_ratio}%`,
        risk_assessment: data.overdue_ratio > 30 ? '高风险' : data.overdue_ratio > 15 ? '中风险' : '低风险',
        key_findings: ['数据已计算，建议人工复核'],
        recommendations: ['定期检查应收账款账龄分布'],
      };
      return {
        ...fallback,
        success: false,
        provider: providerName,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  /**
   * 分析单条发票
   */
  async analyzeInvoice(data: AIInvoiceContext, provider?: AIProvider): Promise<AiInvoiceAnalysis & AICallStats> {
    const start = Date.now();
    const p = provider ?? getAIProvider();
    const providerName = this.getProviderName(p);

    try {
      const result = await p.analyzeInvoice(data);
      return {
        ...result,
        success: true,
        provider: providerName,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      console.error('[AIService] analyzeInvoice 失败:', err);
      const fallback = {
        summary: `账款分析：${data.customer_name}，逾期${data.days_overdue}天`,
        reason: data.reason || '程序判定优先级',
        recommended_action: data.days_overdue >= 60 ? 'follow_up_now' as const : 'follow_up_later' as const,
        recommended_timing: data.days_overdue >= 60 ? 'today' as const : 'within_3_days' as const,
        message_tone: 'PROFESSIONAL' as const,
      };
      return {
        ...fallback,
        success: false,
        provider: providerName,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  private getProviderName(provider: any): string {
    if (provider.constructor?.name === 'OpenRouterProvider') return 'openrouter';
    if (provider.constructor?.name === 'MockAIProvider') return 'mock';
    return 'unknown';
  }
}

// 导出单例
export const aiService = new AIService();
