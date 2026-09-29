/**
 * MockAIProvider — 完全脱离真实 API 的模拟实现
 *
 * 用于：
 *   - 测试环境（不需要 API Key）
 *   - 本地开发调试
 *   - 生产环境 AI 不可用时的 fallback
 *
 * 此 Provider 永不执行网络请求，行为完全确定。
 */
import { AIProvider } from './provider';
import { AiInvoiceAnalysis, AiReportAnalysis, AIInvoiceContext, AIReportContext } from './types';

export class MockAIProvider implements AIProvider {
  constructor(
    private options: {
      /** 自定义报告分析结果（覆盖默认值） */
      reportOverride?: Partial<AiReportAnalysis>;
      /** 自定义发票分析结果（覆盖默认值） */
      invoiceOverride?: Partial<AiInvoiceAnalysis>;
      /** 是否抛出错误（用于测试 fallback） */
      throwOnError?: boolean;
    } = {}
  ) {}

  getName(): string {
    return 'mock';
  }

  async analyzeReport(data: AIReportContext): Promise<AiReportAnalysis> {
    if (this.options.throwOnError) {
      throw new Error('[Mock] Simulated AI failure');
    }

    return {
      summary: `[模拟] 应收账款总额 ${data.total_receivables}，逾期 ${data.overdue_ratio}%。高优先级 ${data.high_priority_count} 个，中优先级 ${data.medium_priority_count} 个。`,
      risk_assessment: data.overdue_ratio > 30 ? '高风险：逾期比例超过30%，需立即行动'
        : data.overdue_ratio > 15 ? '中风险：逾期比例超过15%，建议加强催收'
        : data.overdue_ratio > 5 ? '低风险：逾期比例在5-15%之间'
        : '健康：逾期比例低于5%，财务状况良好',
      key_findings: [
        `逾期金额: ${data.overdue_amount}`,
        `应收账款总额: ${data.total_receivables}`,
        `90天以上逾期: ${data.aging_buckets.find(b => b.bucket === '90+')?.amount ?? '$0'}`,
      ].filter(f => !f.includes('$0')),
      recommendations: [
        data.high_priority_count > 0 ? `立即跟进 ${data.high_priority_count} 个高风险账户` : '',
        data.medium_priority_count > 0 ? `本周内处理 ${data.medium_priority_count} 个中风险账户` : '',
        '定期检查应收账款账龄分布',
        '与客户建立良好的沟通机制',
      ].filter(Boolean),
      ...this.options.reportOverride,
    };
  }

  async analyzeInvoice(_data: AIInvoiceContext): Promise<AiInvoiceAnalysis> {
    if (this.options.throwOnError) {
      throw new Error('[Mock] Simulated AI failure');
    }

    // 模拟 AI 分析，添加固定前缀以区分 Mock 输出
    const prefix = '[MockAI] ';
    return {
      summary: `${prefix}客户 ${_data.customer_name} 的账款状态：逾期 ${_data.days_overdue} 天，未收 ${_data.outstanding_amount}，优先级 ${_data.priority_level}。根据历史行为分析，建议采取相应措施。`,
      reason: _data.reason,
      recommended_action: _data.days_overdue >= 60 ? 'follow_up_now'
        : _data.days_overdue >= 30 ? 'follow_up_later'
        : _data.priority_level === 'HIGH' ? 'follow_up_now'
        : 'monitor',
      recommended_timing: _data.days_overdue >= 90 ? 'today'
        : _data.days_overdue >= 30 ? 'within_3_days'
        : _data.days_overdue > 0 ? 'next_week'
        : 'monitor',
      message_tone: _data.days_overdue >= 60 ? 'FIRM'
        : _data.days_overdue >= 30 ? 'PROFESSIONAL'
        : 'FRIENDLY',
      ...this.options.invoiceOverride,
    };
  }

  async generateCollectionMessage(
    data: AIInvoiceContext,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL'
  ): Promise<{ subject: string; message: string }> {
    if (this.options.throwOnError) {
      throw new Error('[Mock] Simulated AI failure');
    }

    const amount = data.outstanding_amount;
    const days = data.days_overdue;
    const customer = data.customer_name;
    const invoice = data.invoice_number || '相关发票';

    if (tone === 'FRIENDLY') {
      return {
        subject: `温馨提醒：${customer}账款`,
        message: `您好！我们注意到${invoice}（${amount}）尚未收到付款，已逾期${days}天。如您已付款，请忽略此消息。如有任何问题，欢迎随时联系我们。`,
      };
    }

    if (tone === 'FIRM') {
      return {
        subject: `紧急：${customer}账款逾期${days}天`,
        message: `您好，${invoice}（${amount}）已逾期${days}天，远超正常账期。请尽快安排付款，以免产生额外费用。如已安排，请提供付款凭证。`,
      };
    }

    // PROFESSIONAL（默认）
    return {
      subject: `账款提醒：${customer}`,
      message: `您好！我们提醒一下，${invoice}（${amount}）目前尚未结清，已逾期${days}天。请您尽快安排付款，或与我们联系确认付款进度。感谢您的配合。`,
    };
  }
}
