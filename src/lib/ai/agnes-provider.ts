/**
 * Agnes AI Provider（Sapiens AI）
 *
 * API Key 从环境变量 AGNES_API_KEY 读取。
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

const DEFAULT_MODEL = process.env.AI_MODEL || 'agnes-2.5-flash';
const MAX_TOKENS = 1000;
const TIMEOUT_MS = 15000;

// 原来的本地实现已移到 prompt-builder.ts，供两个 provider 共用
// 删除重复代码，避免未来再次出现分叉

export class AgnesProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.AGNES_API_KEY || '';
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://apihub.agnes-ai.com/v1',
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
    this.model = DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return !!process.env.AGNES_API_KEY;
  }

  getName(): string {
    return 'agnes';
  }

  async analyzeReport(data: AIReportContext): Promise<AiReportAnalysis> {
    if (!this.isConfigured()) {
      console.warn('[AI] AGNES_API_KEY not configured, using fallback');
      return getFallbackReportAnalysis(data);
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
      console.error('[AI] analyzeReport failed:', err);
      return getFallbackReportAnalysis(data);
    }
  }

  async analyzeInvoice(data: AIInvoiceContext): Promise<AiInvoiceAnalysis> {
    if (!this.isConfigured()) {
      console.warn('[AI] AGNES_API_KEY not configured, using fallback');
      return getFallbackInvoiceAnalysis(data);
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
      console.error('[AI] analyzeInvoice failed:', err);
      return getFallbackInvoiceAnalysis(data);
    }
  }

  async generateCollectionMessage(
    data: AIInvoiceContext,
    tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' = 'PROFESSIONAL'
  ): Promise<{ subject: string; message: string }> {
    if (!this.isConfigured()) {
      console.warn('[AI] AGNES_API_KEY not configured, using fallback');
      return getFallbackCollectionMessage(data, tone);
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
      console.error('[AI] generateCollectionMessage failed:', err);
      return getFallbackCollectionMessage(data, tone);
    }
  }

  private parseResponse(raw: string, schema: any, fnName: string): any {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new AIProviderError('agnes', e as Error, `${fnName} JSON parse failed: ${jsonStr.slice(0, 200)}`);
    }

    return schema.parse(parsed);
  }

  private parseMessageResponse(raw: string): { subject: string; message: string } {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new AIProviderError('agnes', e as Error, `generateCollectionMessage JSON parse failed: ${jsonStr.slice(0, 200)}`);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new AIProviderError('agnes', 'invalid response', 'Response is not an object');
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.subject !== 'string' || typeof p.message !== 'string') {
      throw new AIProviderError('agnes', 'invalid fields', 'Missing subject or message field');
    }

    return {
      subject: p.subject as string,
      message: p.message as string,
    };
  }
}

// ─── Collection Message Fallback ────────────────────────────────────────────────

function getFallbackCollectionMessage(
  data: AIInvoiceContext,
  tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM'
): { subject: string; message: string } {
  const amount = data.outstanding_amount;
  const days = data.days_overdue;
  const customer = data.customer_name;
  const invoice = data.invoice_number || 'related invoice';

  if (tone === 'FRIENDLY') {
    return {
      subject: `Friendly Reminder: ${customer} Payment`,
      message: `Dear ${customer}, we noticed that invoice ${invoice} (amount: ${amount}) is ${days} days overdue. If you have already made the payment, please disregard this message. If you have any questions, feel free to contact us.`,
    };
  }

  if (tone === 'FIRM') {
    return {
      subject: `URGENT: ${customer} Payment Overdue ${days} Days`,
      message: `Dear ${customer}, invoice ${invoice} (amount: ${amount}) is now ${days} days overdue, significantly beyond our standard terms. Please arrange payment immediately to avoid additional charges. If payment has been arranged, please provide proof.`,
    };
  }

  // PROFESSIONAL (default)
  return {
    subject: `Payment Reminder: ${customer}`,
    message: `Dear ${customer}, this is a reminder that invoice ${invoice} (amount: ${amount}) remains outstanding and is ${days} days past due. Please arrange payment at your earliest convenience or contact us to discuss payment options. Thank you for your prompt attention to this matter.`,
  };
}
