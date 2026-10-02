/**
 * OpenRouter AI Provider（OpenAI-compatible）
 *
 * API Key 从环境变量 OPENROUTER_API_KEY 读取。
 * 如果环境变量不存在，调用时自动 fallback 到程序默认值。
 */
import OpenAI from 'openai';
import { AIProvider, AIProviderError } from './provider';
import {
  AiInvoiceAnalysis,
  AiReportAnalysis,
  AIInvoiceContext,
  AIReportContext,
  AiInvoiceAnalysisSchema,
  AiReportAnalysisSchema,
  getFallbackInvoiceAnalysis,
  getFallbackReportAnalysis,
} from './types';
import {
  buildSystemPrompt,
  buildReportPrompt,
  buildInvoicePrompt,
  buildMessagePrompt,
} from './prompt-builder';

// 最大输入长度限制（防止超长注入）—— 统一定义在 prompt-builder.ts
import {
  MAX_CUSTOMER_NAME_LEN,
  MAX_INVOICE_NUMBER_LEN,
  MAX_REASON_LEN,
} from './prompt-builder';

const DEFAULT_MODEL = process.env.AI_MODEL || 'openrouter/anthropic/claude-3.5-sonnet';
const MAX_TOKENS = 1000;
const TIMEOUT_MS = 15000;

// Tone 白名单
const VALID_TONES = ['FRIENDLY', 'PROFESSIONAL', 'FIRM'] as const;
type ValidTone = typeof VALID_TONES[number];

export class OpenRouterProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
    this.model = DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  getName(): string {
    return 'openrouter';
  }

  async analyzeReport(data: AIReportContext): Promise<AiReportAnalysis> {
    if (!this.isConfigured()) {
      console.warn('[AI] OPENROUTER_API_KEY 未配置，使用 fallback');
      // 显式抛出错误，让 Service 层区分 Fallback 和 Success
      throw new AIProviderError('openrouter', 'not_configured', 'OPENROUTER_API_KEY 未配置');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildReportPrompt(data) },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? '';
      return this.parseResponse(raw, AiReportAnalysisSchema, 'analyzeReport');
    } catch (err) {
      console.error('[AI] analyzeReport 失败:', err);
      // 重新抛出错误，让 Service 层处理 fallback
      throw err;
    }
  }

  async analyzeInvoice(data: AIInvoiceContext): Promise<AiInvoiceAnalysis> {
    if (!this.isConfigured()) {
      console.warn('[AI] OPENROUTER_API_KEY 未配置，使用 fallback');
      throw new AIProviderError('openrouter', 'not_configured', 'OPENROUTER_API_KEY 未配置');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildInvoicePrompt(data) },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? '';
      return this.parseResponse(raw, AiInvoiceAnalysisSchema, 'analyzeInvoice');
    } catch (err) {
      console.error('[AI] analyzeInvoice 失败:', err);
      // 重新抛出错误，让 Service 层处理 fallback
      throw err;
    }
  }

  async generateCollectionMessage(
    data: AIInvoiceContext,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL'
  ): Promise<{ subject: string; message: string }> {
    if (!this.isConfigured()) {
      console.warn('[AI] OPENROUTER_API_KEY 未配置，使用 fallback 消息');
      throw new AIProviderError('openrouter', 'not_configured', 'OPENROUTER_API_KEY 未配置');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildMessagePrompt(data, tone) },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? '';
      return this.parseMessageResponse(raw);
    } catch (err) {
      console.error('[AI] generateCollectionMessage 失败:', err);
      // 重新抛出错误，让 Service 层处理 fallback
      throw err;
    }
  }

  private parseResponse(raw: string, schema: any, fnName: string): any {
    // 尝试提取 JSON（有些模型可能包在 ```json ... ``` 里）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new AIProviderError('openrouter', e, `${fnName} JSON 解析失败: ${jsonStr.slice(0, 200)}`);
    }

    const result = schema.parse(parsed);
    return result;
  }

  private parseMessageResponse(raw: string): { subject: string; message: string } {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new AIProviderError('openrouter', e, `generateCollectionMessage JSON 解析失败: ${jsonStr.slice(0, 200)}`);
    }

    // Zod-like validation (manual for this structure)
    if (typeof parsed !== 'object' || parsed === null) {
      throw new AIProviderError('openrouter', 'invalid response', '返回数据不是对象');
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.subject !== 'string' || typeof p.message !== 'string') {
      throw new AIProviderError('openrouter', 'invalid fields', '缺少 subject 或 message 字段');
    }

    return {
      subject: p.subject as string,
      message: p.message as string,
    };
  }
}

// ─── 催款消息 Fallback ────────────────────────────────────────────────────────

function getFallbackCollectionMessage(
  data: AIInvoiceContext,
  tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM'
): { subject: string; message: string } {
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

// ─── 模拟 Provider（测试用）─────────────────────────────────────────────────

export class MockAIProvider implements AIProvider {
  constructor(
    private options: {
      invoice?: Partial<AiInvoiceAnalysis>;
      report?: Partial<AiReportAnalysis>;
      throwErr?: Error;
    } = {}
  ) {}

  getName(): string {
    return 'mock';
  }

  async analyzeReport(_data: AIReportContext): Promise<AiReportAnalysis> {
    if (this.options.throwErr) throw this.options.throwErr;
    return {
      summary: '[模拟] 整体应收账款分析完成',
      risk_assessment: '[模拟] 中风险',
      key_findings: ['逾期金额: $208,300.00', '90天以上逾期: $100,000.00'],
      recommendations: ['本周内处理高风险账户', '定期检查账龄分布'],
      ...this.options.report,
    };
  }

  async analyzeInvoice(_data: AIInvoiceContext): Promise<AiInvoiceAnalysis> {
    if (this.options.throwErr) throw this.options.throwErr;
    return {
      summary: `[模拟] ${_data.customer_name} 的账款分析`,
      reason: _data.reason,
      recommended_action: _data.days_overdue >= 60 ? 'follow_up_now' as const : 'follow_up_later' as const,
      recommended_timing: _data.days_overdue >= 60 ? 'today' as const : 'within_3_days' as const,
      message_tone: 'PROFESSIONAL' as const,
      ...this.options.invoice,
    };
  }

  async generateCollectionMessage(
    _data: AIInvoiceContext,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL'
  ): Promise<{ subject: string; message: string }> {
    if (this.options.throwErr) throw this.options.throwErr;
    return getFallbackCollectionMessage(_data, tone);
  }
}
