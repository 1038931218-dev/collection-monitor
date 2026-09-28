/**
 * AI 服务层
 *
 * 职责：
 *   1. 调用 AI Provider 分析 AR 数据
 *   2. 失败时使用程序 fallback
 *   3. 记录 AI 调用状态（用于监控和调试）
 *   4. 统一入口，业务层不感知具体 Provider
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
import { getAIProvider, resetAIProvider, setTestProvider, resetTestProvider } from './factory';
import { AIProvider } from './provider';

export interface AICallStats {
  success: boolean;
  provider: string;
  model?: string;
  latencyMs: number;
  error?: string;
  timestamp: string;
}

export class AIService {
  /**
   * 分析整份 AR 报告（只分析 Top 5 priority tasks）
   */
  async analyzeReport(data: AIReportContext, provider?: AIProvider): Promise<AiReportAnalysis & AICallStats> {
    const start = Date.now();
    const p = provider ?? getAIProvider();
    const providerName = p.getName();

    try {
      const result = await p.analyzeReport(data);
      return {
        ...result,
        success: true,
        provider: providerName,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 分析单条发票
   */
  async analyzeInvoice(data: AIInvoiceContext, provider?: AIProvider): Promise<AiInvoiceAnalysis & AICallStats> {
    const start = Date.now();
    const p = provider ?? getAIProvider();
    const providerName = p.getName();

    try {
      const result = await p.analyzeInvoice(data);
      return {
        ...result,
        success: true,
        provider: providerName,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 生成催款消息草稿
   *
   * 注意：AI 只负责生成草稿，必须经过用户确认后才能进入发送流程。
   */
  async generateCollectionMessage(
    data: AIInvoiceContext,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL',
    provider?: AIProvider
  ): Promise<{ subject: string; message: string } & AICallStats> {
    const start = Date.now();
    const p = provider ?? getAIProvider();
    const providerName = p.getName();

    try {
      const result = await p.generateCollectionMessage(data, tone);
      return {
        ...result,
        success: true,
        provider: providerName,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[AIService] generateCollectionMessage 失败:', err);
      // Fallback 使用程序生成的消息（已在 Provider 内部实现）
      return {
        subject: `账款提醒：${data.customer_name}`,
        message: `您好！${data.invoice_number ?? '相关发票'}（${data.outstanding_amount}）已逾期${data.days_overdue}天，请尽快安排付款。`,
        success: false,
        provider: providerName,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : '未知错误',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 强制切换 Provider（用于测试）
   */
  static setTestProvider(provider: AIProvider): void {
    resetAIProvider();
    // 注入到工厂的单例（通过临时环境变量绕过缓存）
    (globalThis as any).__test_ai_provider__ = provider;
  }

  static clearTestProvider(): void {
    resetAIProvider();
    delete (globalThis as any).__test_ai_provider__;
  }
}

// 导出单例
export const aiService = new AIService();
