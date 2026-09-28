/**
 * AI 层统一入口
 *
 * 业务代码从这里 import，不直接依赖具体 Provider 或 openai SDK：
 *
 *   import { aiService } from '@/lib/ai';
 *   const result = await aiService.analyzeInvoice(ctx);
 */

// Provider 接口 + 错误
export {
  AIProvider,
  AIProviderError,
  AITimeoutError,
  AIParseError,
} from './provider';

// 类型 + Schema + Fallback
export {
  AICustomerContext,
  AIInvoiceContext,
  AIReportContext,
  AiInvoiceAnalysisSchema,
  AiReportAnalysisSchema,
  AiToneSchema,
  AiActionSchema,
  AiTimingSchema,
  getFallbackInvoiceAnalysis,
  getFallbackReportAnalysis,
} from './types';
export type { AiInvoiceAnalysis, AiReportAnalysis } from './types';

// 工厂（配置化选择 Provider）
export { getAIProvider, setTestProvider, resetTestProvider, resetAIProvider } from './factory';

// 服务层（统一调用入口）
export { AIService, aiService } from './service';
export type { AICallStats } from './service';
