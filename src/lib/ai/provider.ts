/**
 * AI Provider 接口定义
 *
 * 所有实现必须遵循此接口。
 * 切换 Provider 只需替换 src/lib/ai/providers/ 下的文件并修改 factory。
 */
import {
  AiInvoiceAnalysis,
  AiReportAnalysis,
  AIInvoiceContext,
  AIReportContext,
} from './types';

export interface AIProvider {
  /** 分析整份 AR 报告，返回结构化摘要 */
  analyzeReport(data: AIReportContext): Promise<AiReportAnalysis>;

  /** 分析单条发票的优先级和建议 */
  analyzeInvoice(data: AIInvoiceContext): Promise<AiInvoiceAnalysis>;

  /** 生成催款消息草稿 */
  generateCollectionMessage(data: AIInvoiceContext, tone?: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM'): Promise<{ subject: string; message: string }>;

  /** 返回 provider 名称（用于日志和监控） */
  getName(): string;
}

/**
 * 错误类型标识
 */
export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly cause: unknown,
    message?: string
  ) {
    super(message ?? `AI Provider [${provider}] 调用失败: ${cause}`);
    this.name = 'AIProviderError';
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(provider: string) {
    super(provider, 'timeout', `AI Provider [${provider}] 请求超时`);
    this.name = 'AITimeoutError';
  }
}

export class AIParseError extends AIProviderError {
  constructor(provider: string, raw: string, cause: unknown) {
    super(provider, cause, `AI Provider [${provider}] JSON 解析失败`);
    this.raw = raw;
  }
  raw: string;
}
