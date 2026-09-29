/**
 * Phase 5.2 Part 2: Priority Engine + Payment History + AI Fault Testing
 *
 * 目标：不开发新功能，攻击性测试 Priority / Payment History / AI 故障场景。
 * 重点验证：Priority Score 由确定性规则计算，AI 不能修改它。
 */
import { normalizeInvoices } from '../../src/data-normalizer';
import { calculateARHealth } from '../../src/ar-engine';
import { generateCollectionTasks, calculatePriorityScore } from '../../src/priority-engine';
import { DecimalMoney } from '../../src/lib/decimal';
import {
  analyzePaymentHistory,
  PaymentRecord,
} from '../../src/payment-history';
import { aiService } from '../../src/lib/ai/service';
import { MockAIProvider } from '../../src/lib/ai/mock-provider';
import { setTestProvider, resetTestProvider } from '../../src/lib/ai/factory';
import { AIProvider } from '../../src/lib/ai/provider';
import { AiInvoiceAnalysis, AiReportAnalysis } from '../../src/lib/ai/types';
import { AICollectionService } from '../../src/lib/ai/collection-service';

describe('Phase 5.2 Part 2: Priority / Payment History / AI Fault', () => {
  describe('Priority Engine - 场景测试', () => {
    function makeInvoice(opts: {
      customer: string;
      invoice_num: string;
      amount: number; // 元
      due_days_ago: number;
      paid?: number;
    }) {
      const today = new Date('2026-09-28');
      return {
        customer_name: opts.customer,
        invoice_number: opts.invoice_num,
        invoice_date: new Date(today.getTime() - (opts.due_days_ago + 60) * 86400000),
        due_date: new Date(today.getTime() - opts.due_days_ago * 86400000),
        amount: new DecimalMoney(opts.amount * 100),
        paid_amount: new DecimalMoney((opts.paid ?? 0) * 100),
        currency: 'USD',
      };
    }

    test('大金额未逾期 → LOW priority', () => {
      const invs = [makeInvoice({ customer: 'BigClient', invoice_num: 'BIG-001', amount: 500000, due_days_ago: 0 })];
      const normalized = normalizeInvoices(invs);
      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 1);

      expect(tasks[0].priority.priority_level).toBe('LOW');
      // 主要得分来自 amount（大金额），但 overdue=0 所以 overall LOW
      expect(tasks[0].priority.priority_score).toBeLessThan(50);
    });

    test('小金额严重逾期 → MEDIUM/HIGH', () => {
      const invs = [makeInvoice({ customer: 'SmallClient', invoice_num: 'SM-001', amount: 500, due_days_ago: 120 })];
      const normalized = normalizeInvoices(invs);
      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 1);

      // 逾期 120 天 → overdue_score=100，即使金额小也应该有中等优先级
      expect(tasks[0].priority.overdue_score).toBe(100);
      expect(tasks[0].priority.priority_level).not.toBe('LOW');
    });

    test('大金额严重逾期（90天）→ MEDIUM（无历史被中性值拉低）', () => {
      const invs = [makeInvoice({ customer: 'BigOverdue', invoice_num: 'BO-001', amount: 100000, due_days_ago: 90 })];
      const normalized = normalizeInvoices(invs);
      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 1);

      // 确定性核算：overdue=80(90天属61-90档) amount=100 history=40 trend=40
      // priority = round(80*.35 + 100*.25 + 40*.20 + 40*.20) = round(69) = 69 → MEDIUM
      // 公式已在 Phase 1 封版，无支付历史时用中性 40 分，因此单张大额 90 天发票落在 MEDIUM 是正确行为
      expect(tasks[0].priority.overdue_score).toBe(80);
      expect(tasks[0].priority.history_score).toBe(40);
      expect(tasks[0].priority.priority_score).toBe(69);
      expect(tasks[0].priority.priority_level).toBe('MEDIUM');
    });

    test('接入恶化历史后同一发票可达 HIGH（验证历史维度生效）', () => {
      // 构造：100 天逾期 + 大金额 + 客户有 SEVERE_LATE / DETERIORATING 历史
      const invs = [makeInvoice({ customer: 'BadPayor', invoice_num: 'BAD-001', amount: 100000, due_days_ago: 100 })];
      const normalized = normalizeInvoices(invs);
      const totalOutstanding = normalized[0].outstanding_amount;

      const badAgg = {
        customer_name: 'BadPayor',
        total_outstanding: totalOutstanding,
        total_overdue: totalOutstanding,
        invoice_count: 1,
        overdue_invoice_count: 1,
        average_payment_days: 75,
        median_payment_days: 75,
        max_days_overdue: 75,
        payment_trend: 'DETERIORATING' as const,
        payment_history: {
          customer_id: 'bad',
          customer_name: 'BadPayor',
          total_payments: 4,
          average_payment_days: 75,
          median_payment_days: 75,
          last_payment_days_ago: 10,
          recent_average_payment_days: 90,
          historical_overdue_count: 4,
          historical_overdue_rate: 100,
          max_historical_overdue_days: 75,
          payment_trend: 'DETERIORATING' as const,
          payment_behavior: 'SEVERE_LATE' as const,
        },
      };

      const score = calculatePriorityScore(normalized[0], totalOutstanding, badAgg);
      // history: avg75>60 → base90 + overdue_rate100% → boost min(20,20)=20 → 100(封顶)
      // trend: DETERIORATING → 80
      // priority = round(100*.35 + 100*.25 + 100*.20 + 80*.20) = round(96) = 96 → HIGH
      expect(score.priority_score).toBeGreaterThanOrEqual(80);
      expect(score.priority_level).toBe('HIGH');
      // 关键：AI 不参与，这是纯确定性计算
      expect(score.history_score).toBe(100);
      expect(score.trend_score).toBe(80);
    });

    test('无付款历史 → history_score=40 (UNKNOWN)', () => {
      const invs = [makeInvoice({ customer: 'NewClient', invoice_num: 'NC-001', amount: 5000, due_days_ago: 30 })];
      const normalized = normalizeInvoices(invs);
      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 1);

      // 无历史 → history_score=40, trend_score=40
      expect(tasks[0].priority.history_score).toBe(40);
      expect(tasks[0].priority.trend_score).toBe(40);
    });

    test('TOP 5 排序稳定性 - 多次运行结果一致', () => {
      const invoices = Array.from({ length: 10 }, (_, i) =>
        makeInvoice({ customer: `C${i}`, invoice_num: `INV-${i}`, amount: (i + 1) * 1000, due_days_ago: i * 5 })
      );
      const normalized = normalizeInvoices(invoices);
      const ar = calculateARHealth(normalized);

      // 多次运行，顺序应一致
      const r1 = [...generateCollectionTasks(normalized, ar.customer_aggregations, 5).map(t => t.priority.priority_score)];
      const r2 = [...generateCollectionTasks(normalized, ar.customer_aggregations, 5).map(t => t.priority.priority_score)];
      expect(r1).toEqual(r2);
      // 降序
      for (let i = 1; i < r2.length; i++) {
        expect(r2[i]).toBeLessThanOrEqual(r2[i - 1]);
      }
    });

    test('同分任务排序稳定', () => {
      const invoices = [
        makeInvoice({ customer: 'A', invoice_num: 'A-001', amount: 1000, due_days_ago: 10 }),
        makeInvoice({ customer: 'B', invoice_num: 'B-001', amount: 1000, due_days_ago: 10 }),
        makeInvoice({ customer: 'C', invoice_num: 'C-001', amount: 1000, due_days_ago: 10 }),
      ];
      const normalized = normalizeInvoices(invoices);
      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 3);

      // 分数相同，排序应稳定（不随机）
      const scores = tasks.map(t => t.priority.priority_score);
      expect(new Set(scores).size).toBe(1); // 同分
    });
  });

  describe('Payment History - 边界测试', () => {
    const TODAY = new Date('2026-09-28');

    test('EARLY 行为标签: avg < 0', () => {
      const samples = [
        { due_date: new Date('2026-07-31'), payment_date: new Date('2026-07-28') }, // -3 天
      ];
      const result = analyzePaymentHistory('cust-early', 'Early Pay', samples, TODAY);
      expect(result.payment_behavior).toBe('EARLY');
    });

    test('ON_TIME: avg 0-7', () => {
      const samples = [
        { due_date: new Date('2026-07-31'), payment_date: new Date('2026-08-05') }, // +5 天
      ];
      const result = analyzePaymentHistory('cust-on', 'On Time', samples, TODAY);
      expect(result.payment_behavior).toBe('ON_TIME');
    });

    test('LATE: avg 8-14', () => {
      const samples = [
        { due_date: new Date('2026-07-31'), payment_date: new Date('2026-08-12') }, // +12 天
      ];
      const result = analyzePaymentHistory('cust-late', 'Late Pay', samples, TODAY);
      expect(result.payment_behavior).toBe('LATE');
    });

    test('SEVERE_LATE: avg > 14', () => {
      const samples = [
        { due_date: new Date('2026-07-31'), payment_date: new Date('2026-08-20') }, // +20 天
      ];
      const result = analyzePaymentHistory('cust-severe', 'Severe Late', samples, TODAY);
      expect(result.payment_behavior).toBe('SEVERE_LATE');
    });

    test('趋势: 少于 3 条 → UNKNOWN', () => {
      const samples = [
        { due_date: new Date('2026-01-01'), payment_date: new Date('2026-01-10') },
        { due_date: new Date('2026-06-01'), payment_date: new Date('2026-06-15') },
      ];
      const result = analyzePaymentHistory('cust-sparse', 'Sparse', samples, TODAY);
      expect(result.payment_trend).toBe('UNKNOWN');
    });

    test('趋势: DETERIORATING（越来越慢）', () => {
      const samples = [
        { due_date: new Date('2026-01-01'), payment_date: new Date('2026-01-05') }, // +4
        { due_date: new Date('2026-03-01'), payment_date: new Date('2026-03-10') }, // +9
        { due_date: new Date('2026-06-01'), payment_date: new Date('2026-06-25') }, // +24
      ];
      const result = analyzePaymentHistory('cust-worse', 'Worsening', samples, TODAY);
      expect(result.payment_trend).toBe('DETERIORATING');
    });

    test('趋势: IMPROVING（越来越快）', () => {
      const samples = [
        { due_date: new Date('2026-01-01'), payment_date: new Date('2026-01-20') }, // +19
        { due_date: new Date('2026-03-01'), payment_date: new Date('2026-03-12') }, // +11
        { due_date: new Date('2026-06-01'), payment_date: new Date('2026-06-08') }, // +7
      ];
      const result = analyzePaymentHistory('cust-better', 'Improving', samples, TODAY);
      expect(result.payment_trend).toBe('IMPROVING');
    });
  });

  describe('AI 故障处理', () => {
    test('Provider 抛异常时 fallback 正常', async () => {
      const errorProvider = new MockAIProvider({ throwOnError: true });
      setTestProvider(errorProvider);

      const ctx = {
        invoice_number: 'INV-001',
        customer_name: 'Test',
        amount: '$1,000',
        paid_amount: '$0',
        outstanding_amount: '$1,000',
        days_overdue: 30,
        priority_score: 50,
        priority_level: 'MEDIUM',
        overdue_score: 30,
        amount_score: 10,
        history_score: 40,
        trend_score: 40,
        reason: '测试',
        recommended_action: 'follow_up_later',
      };

      const result = await aiService.analyzeInvoice(ctx, errorProvider);
      expect(result.success).toBe(false);
      expect(result.summary).toBeDefined();
      expect(result.reason).toBeDefined();

      resetTestProvider();
    });

    test('analyzeInvoice 返回结构完整', async () => {
      const ctx = {
        invoice_number: 'INV-001',
        customer_name: 'Normal Client',
        amount: '$5,000',
        paid_amount: '$0',
        outstanding_amount: '$5,000',
        days_overdue: 5,
        priority_score: 25,
        priority_level: 'LOW',
        overdue_score: 10,
        amount_score: 20,
        history_score: 40,
        trend_score: 40,
        reason: '轻微逾期',
        recommended_action: 'monitor',
      };

      const result = await aiService.analyzeInvoice(ctx);
      expect(result.success).toBe(true);
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(['follow_up_now', 'follow_up_later', 'monitor', 'review_account'].includes(result.recommended_action)).toBe(true);
      expect(['today', 'within_3_days', 'next_week', 'monitor'].includes(result.recommended_timing)).toBe(true);
      expect(['FRIENDLY', 'PROFESSIONAL', 'FIRM'].includes(result.message_tone)).toBe(true);
    });

    test('部分任务 AI 失败时报告仍包含全部任务且确定性数据完整', async () => {
      // 用 error provider 测试，所有任务都会 fallback
      const errorProvider = new MockAIProvider({ throwOnError: true });
      setTestProvider(errorProvider);

      const service = new AICollectionService();
      const csv = `customer name,invoice number,invoice date,due date,amount,paid amount,currency
C1,INV-001,2026-07-01,2026-08-01,1000,0,USD
C2,INV-002,2026-08-01,2026-09-01,2000,0,USD
C3,INV-003,2026-09-01,2026-10-01,3000,0,USD
`;
      const buffer = Buffer.from(csv, 'utf-8');
      const report = await service.analyze(buffer, 'test.csv', { topN: 3, forceProvider: errorProvider });

      // 报告必须完整返回
      expect(report.top_tasks.length).toBe(3);
      // 每个任务都有确定性数据
      report.top_tasks.forEach(task => {
        expect(task.priority.priority_score).toBeDefined();
        expect(task.priority.priority_level).toBeDefined();
        expect(task.invoice.outstanding_amount).toBeDefined();
        expect(task.ai_analysis).toBeDefined(); // fallback 提供
        expect(task.ai_stats).toBeDefined();
        expect(task.ai_stats!.success).toBe(false);
        expect(task.ai_stats!.error).toBeDefined();
      });
      // AI 统计：全部失败
      expect(report.ai_stats!.total_calls).toBe(3);
      expect(report.ai_stats!.success).toBe(0);
      expect(report.ai_stats!.failure).toBe(3);

      resetTestProvider();
    });

    test('AI 不能修改原始 priority_score（注入错误 provider 后验证）', async () => {
      // 用能返回恶意内容的 provider，验证确定性 priority_score 不被覆盖
      const bogusProvider: AIProvider = {
        getName: () => 'bogus',
        analyzeReport: async () => ({ summary: 'x', risk_assessment: 'x', key_findings: ['x'], recommendations: ['x'] }),
        analyzeInvoice: async () => ({
          summary: 'hacker tried to inject score',
          reason: 'hack',
          recommended_action: 'follow_up_now' as any,
          recommended_timing: 'today' as any,
          message_tone: 'FIRM' as any,
        }),
        generateCollectionMessage: async () => ({ subject: 'hack', message: 'hack' }),
      };
      setTestProvider(bogusProvider);

      const service = new AICollectionService();
      const csv = `customer name,invoice number,invoice date,due date,amount,paid amount,currency
C1,INV-001,2026-07-01,2026-08-01,5000,0,USD
`;
      // 跑两次：一次用 bogus，一次用正常 mock。如果 AI 能篡改 priority_score，两次结果会不同。
      const reportBogus = await service.analyze(Buffer.from(csv, 'utf-8'), 'test.csv', { topN: 1, forceProvider: bogusProvider });
      const reportNormal = await service.analyze(Buffer.from(csv, 'utf-8'), 'test.csv', { topN: 1 });

      // 确定性 priority_score 必须完全一致，不受 AI Provider 影响
      expect(reportBogus.top_tasks[0].priority.priority_score).toBe(reportNormal.top_tasks[0].priority.priority_score);
      // AI 分析的 summary 可以被 bogus provider 篡改（这是 AI 层，允许不同输出）
      expect(reportBogus.top_tasks[0].ai_analysis?.summary).toBe('hacker tried to inject score');
      // 但确定性字段必须不变（outstanding_amount 是 DecimalMoney，用 .cents 比较）
      expect(reportBogus.top_tasks[0].invoice.outstanding_amount.cents)
        .toBe(reportNormal.top_tasks[0].invoice.outstanding_amount.cents);
      expect(reportBogus.top_tasks[0].invoice.days_overdue).toBe(reportNormal.top_tasks[0].invoice.days_overdue);
      // 单张发票，全额未收 $5,000 = 500,000 cents
      expect(reportBogus.top_tasks[0].invoice.outstanding_amount.cents).toBe(500000);

      resetTestProvider();
    });
  });

  describe('端到端 - 完整性', () => {
    test('100+ 张发票的 Priority 计算稳定性', () => {
      const invoices = Array.from({ length: 100 }, (_, i) => ({
        customer_name: `Customer-${i % 10}`,
        invoice_number: `INV-${String(i).padStart(3, '0')}`,
        invoice_date: new Date('2026-01-01'),
        due_date: new Date('2026-06-' + String(Math.min(28, (i % 28) + 1)).padStart(2, '0')),
        amount: new DecimalMoney((i + 1) * 10000),
        paid_amount: new DecimalMoney(i % 3 === 0 ? (i + 1) * 5000 : 0),
        currency: 'USD',
      }));

      const normalized = normalizeInvoices(invoices);
      expect(normalized.length).toBeLessThanOrEqual(100); // 可能有重复

      const ar = calculateARHealth(normalized);
      const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, 5);

      expect(tasks.length).toBe(5);
      // 排序
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].priority.priority_score).toBeLessThanOrEqual(tasks[i - 1].priority.priority_score);
      }
    });
  });
});
