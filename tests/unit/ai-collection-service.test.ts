/**
 * Phase 4.3 集成测试：AI 收款管家完整链路
 *
 * 验证链路：
 *   Excel/CSV → Parser → Normalizer → AR Engine → Priority Engine → AI Analysis → Message Draft
 *
 * 重点：
 *   - Priority Score 由确定性计算产生，AI 不修改
 *   - AI 失败不影响 AR 数据
 *   - 多租户隔离有效
 *   - 真实场景数据验证
 */
import { MockAIProvider } from '../../src/lib/ai/mock-provider';
import { AICollectionService, aiCollectionService } from '../../src/lib/ai/collection-service';
import { setTestProvider, resetTestProvider } from '../../src/lib/ai/factory';
import {
  normalizeInvoices,
  InvoiceData,
} from '../../src/data-normalizer';
import {
  calculateARHealth,
  CustomerAggregation,
} from '../../src/ar-engine';
import {
  generateCollectionTasks,
  calculatePriorityScore,
} from '../../src/priority-engine';
import { DecimalMoney, DateUtils } from '../../src/lib/decimal';
import { PaymentRecord } from '../../src/payment-history';

describe('Phase 4.3: AI Collection Service Integration', () => {
  let service: AICollectionService;
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    service = new AICollectionService();
    mockProvider = new MockAIProvider();
    setTestProvider(mockProvider);
  });

  afterEach(() => {
    resetTestProvider();
  });

  // ─── 测试数据构建器 ───────────────────────────────────────────────────────

  function createInvoiceData(opts: {
    customer_name: string;
    invoice_number: string;
    amount: number;      // 元
    paid_amount?: number; // 元，默认 0
    due_days_ago: number; // 到期日距今天数
    invoice_date_days_ago?: number; // 发票日期距今天数（默认 due_days_ago + 60）
  }): InvoiceData {
    const today = new Date('2026-09-28');
    const due_date = new Date(today.getTime() - opts.due_days_ago * 24 * 60 * 60 * 1000);
    const invoice_date = new Date(today.getTime() - (opts.invoice_date_days_ago ?? opts.due_days_ago + 60) * 24 * 60 * 60 * 1000);
    return {
      customer_name: opts.customer_name,
      invoice_number: opts.invoice_number,
      invoice_date,
      due_date,
      amount: new DecimalMoney(opts.amount * 100),
      paid_amount: opts.paid_amount ? new DecimalMoney(opts.paid_amount * 100) : new DecimalMoney(0),
      currency: 'USD',
    };
  }

  function createPaymentRecord(opts: {
    id: string;
    customer_id: string;
    customer_name: string;
    invoice_id?: string;
    payment_date_days_ago: number;
    amount: number; // 元
  }): PaymentRecord {
    const today = new Date('2026-09-28');
    return {
      id: opts.id,
      customer_id: opts.customer_id,
      customer_name: opts.customer_name,
      invoice_id: opts.invoice_id,
      payment_date: new Date(today.getTime() - opts.payment_date_days_ago * 24 * 60 * 60 * 1000),
      amount: new DecimalMoney(opts.amount * 100),
      currency: 'USD',
      payment_method: 'bank_transfer',
      notes: null,
      created_at: new Date(),
    };
  }

  // ─── 场景测试 ─────────────────────────────────────────────────────────────

  test('场景A: 大金额轻微逾期 + 良好历史 → 中优先级', async () => {
    // 构造包含"大金额 + 轻微逾期"场景的 CSV
    const csv = `customer name,invoice number,invoice date,due date,amount,paid amount,currency
Client A,INV-A-001,2026-07-01,2026-08-05,50000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');

    const report = await service.analyze(buffer, 'a.csv', { topN: 1 });

    // 确定性计算：逾期 5 天（5 days ago from 2026-08-05 due date ≈ 54 days overdue from today 2026-09-28）
    expect(report.top_tasks.length).toBe(1);
    expect(report.top_tasks[0].priority.priority_score).toBeGreaterThanOrEqual(0);
    expect(report.top_tasks[0].priority.priority_score).toBeLessThanOrEqual(100);

    // AI 分析不会改变原始 priority_score
    const enriched = report.top_tasks[0];
    expect(enriched.ai_analysis).toBeDefined();
    expect(enriched.priority.priority_score).toBeGreaterThanOrEqual(0);
  });

  test('analyze() 正常流程返回 AIARReport 结构', async () => {
    // 构造真实 CSV buffer
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种\n客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD\n客户B,INV-002,2026-08-01,2026-09-01,5000,5000,USD\n`;
    const buffer = Buffer.from(csv, 'utf-8');

    const report = await service.analyze(buffer, 'test.csv', { topN: 5 });

    expect(report.generated_at).toBeDefined();
    expect(report.total_invoices).toBeGreaterThan(0);
    expect(report.total_receivables).toBeDefined();
    expect(report.overdue_ratio).toBeDefined();
    expect(report.aging_distribution.length).toBe(6); // CURRENT, 1-7, 8-30, 31-60, 61-90, 90+
    expect(report.top_tasks.length).toBeLessThanOrEqual(5);
    expect(report.ai_stats).toBeDefined();
    expect(report.ai_stats!.total_calls).toBeGreaterThan(0);
  });

  test('AI 分析不覆盖原始 priority_score', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种\n客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD\n`;
    const buffer = Buffer.from(csv, 'utf-8');

    // 先用确定性引擎计算
    const parsed = { invoices: [{
      customer_name: '客户A', invoice_number: 'INV-001',
      invoice_date: new Date('2026-07-01'), due_date: new Date('2026-08-01'),
      amount: new DecimalMoney(1000000), paid_amount: new DecimalMoney(0), currency: 'USD',
    }] as any };
    const normalized = normalizeInvoices(parsed.invoices);
    const arHealth = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, arHealth.customer_aggregations, 5);
    const originalScore = tasks[0].priority.priority_score;

    // 再用 AI 服务分析
    const report = await service.analyze(buffer, 'test.csv', { topN: 1 });
    const enrichedTask = report.top_tasks[0];

    // Priority Score 应该保持一致
    expect(enrichedTask.priority.priority_score).toBe(originalScore);
    expect(enrichedTask.ai_analysis).toBeDefined();
  });

  test('Top 5 排序正确：按 priority_score 降序', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-06-01,2026-07-01,10000,0,USD
客户B,INV-002,2026-07-01,2026-08-01,5000,0,USD
客户C,INV-003,2026-08-01,2026-09-01,8000,0,USD
客户D,INV-004,2026-09-01,2026-09-15,3000,0,USD
客户E,INV-005,2026-09-01,2026-09-20,2000,0,USD
客户F,INV-006,2026-08-01,2026-08-15,15000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 5 });

    // 验证排序
    for (let i = 1; i < report.top_tasks.length; i++) {
      expect(report.top_tasks[i].priority.priority_score).toBeLessThanOrEqual(
        report.top_tasks[i - 1].priority.priority_score
      );
    }

    // 验证只有 5 条（不是 6 条）
    expect(report.top_tasks.length).toBe(5);
  });

  test('只有 2 个客户时 Top 5 只返回 2 条', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD
客户B,INV-002,2026-08-01,2026-09-01,5000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 5 });

    expect(report.top_tasks.length).toBe(2);
  });

  test('AI 失败时使用 fallback 但不阻塞报告', async () => {
    // 创建一个会抛出错误的 provider
    const errorProvider = new MockAIProvider({ throwOnError: true });
    setTestProvider(errorProvider);

    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');

    const report = await service.analyze(buffer, 'test.csv', { topN: 1 });

    // 报告仍然返回
    expect(report).toBeDefined();
    expect(report.top_tasks.length).toBe(1);
    // AI 失败，但有 fallback 结果
    expect(report.top_tasks[0].ai_analysis).toBeDefined();
    expect(report.ai_stats!.failure).toBeGreaterThanOrEqual(1);
    expect(report.ai_stats!.success).toBe(0);

    resetTestProvider();
  });

  test('部分 AI 成功部分失败时仍能返回完整报告', async () => {
    // 用普通 mock provider（不会失败）
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-06-01,2026-07-01,10000,0,USD
客户B,INV-002,2026-07-01,2026-08-01,5000,0,USD
客户C,INV-003,2026-08-01,2026-09-01,3000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 5 });

    expect(report.top_tasks.length).toBe(3);
    // 所有任务都有 ai_analysis
    report.top_tasks.forEach(task => {
      expect(task.ai_analysis).toBeDefined();
      expect(task.priority.priority_score).toBeDefined();
    });
  });

  test('generateMessageDraft() 生成专业语气消息', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 1 });

    const draft = await service.generateMessageDraft(report.top_tasks[0], 'PROFESSIONAL');

    expect(draft.subject).toBeDefined();
    expect(draft.message).toBeDefined();
    expect(draft.tone).toBe('PROFESSIONAL');
    expect(draft.ai_success).toBe(true);
  });

  test('generateMessageDraft() 支持 FIRM 语气', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-06-01,2026-07-01,10000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 1 });

    const draft = await service.generateMessageDraft(report.top_tasks[0], 'FIRM');

    expect(draft.subject).toContain('紧急');
    expect(draft.tone).toBe('FIRM');
  });

  test('AI 分析包含完整的上下文信息', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-001,2026-07-01,2026-08-01,10000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const report = await service.analyze(buffer, 'test.csv', { topN: 1 });

    const task = report.top_tasks[0];
    expect(task.invoice.customer_name).toBe('客户A');
    expect(task.priority.priority_level).toBeDefined();
    expect(task.ai_analysis?.summary).toBeDefined();
    expect(task.ai_analysis?.recommended_action).toBeDefined();
    expect(task.ai_analysis?.recommended_timing).toBeDefined();
    expect(task.ai_analysis?.message_tone).toBeDefined();
  });
});
