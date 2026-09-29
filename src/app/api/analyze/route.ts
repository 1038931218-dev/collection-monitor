// POST /api/analyze
// 接收原始发票数据，执行完整 AR 计算 + AI 分析链路
import { NextRequest, NextResponse } from 'next/server';
import { NormalizedInvoice } from '@/data-normalizer';
import { calculateARHealth } from '@/ar-engine';
import { generateCollectionTasks } from '@/priority-engine';
import { analyzePaymentHistory, PaymentRecord } from '@/payment-history';
import { aiService } from '@/lib/ai/service';
import { DecimalMoney } from '@/lib/decimal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoices, topN = 5 } = body as {
      invoices: Array<{
        customer_name: string;
        invoice_number?: string;
        invoice_date: string;
        due_date: string;
        amount: number;
        paid_amount?: number;
        currency?: string;
        status?: string;
      }>;
      topN?: number;
    };

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ error: '没有发票数据' }, { status: 400 });
    }

    // 转换为内部格式
    const normalized = invoices.map(inv => ({
      customer_name: inv.customer_name,
      invoice_number: inv.invoice_number,
      invoice_date: new Date(inv.invoice_date),
      due_date: new Date(inv.due_date),
      amount: new DecimalMoney(inv.amount * 100),
      paid_amount: inv.paid_amount ? new DecimalMoney(inv.paid_amount * 100) : new DecimalMoney(0),
      currency: inv.currency || 'USD',
    }));

    // AR 健康计算
    const arHealth = calculateARHealth(normalized);

    // 生成 Collection Tasks
    const allTasks = generateCollectionTasks(normalized, arHealth.customer_aggregations, Infinity);
    const topTasks = allTasks.slice(0, topN);

    // AI 逐条分析
    const enriched = [];
    let aiSuccess = 0;
    let aiFailure = 0;

    for (const task of topTasks) {
      const ctx = {
        invoice_number: task.invoice.invoice_number,
        customer_name: task.invoice.customer_name,
        amount: task.invoice.amount.toString(),
        paid_amount: task.invoice.paid_amount.toString(),
        outstanding_amount: task.invoice.outstanding_amount.toString(),
        days_overdue: task.invoice.days_overdue,
        priority_score: task.priority.priority_score,
        priority_level: task.priority.priority_level,
        overdue_score: task.priority.overdue_score,
        amount_score: task.priority.amount_score,
        history_score: task.priority.history_score,
        trend_score: task.priority.trend_score,
        reason: task.reason,
        recommended_action: task.recommended_action,
        customer_history: task.customer_aggregation?.payment_history
          ? {
              customer_name: task.customer_aggregation.customer_name,
              total_outstanding: task.customer_aggregation.total_outstanding.toString(),
              total_overdue: task.customer_aggregation.total_overdue.toString(),
              invoice_count: task.customer_aggregation.invoice_count,
              overdue_invoice_count: task.customer_aggregation.overdue_invoice_count,
              average_payment_days: task.customer_aggregation.payment_history?.average_payment_days ?? null,
              payment_trend: task.customer_aggregation.payment_trend,
              payment_behavior: task.customer_aggregation.payment_history?.payment_behavior ?? 'UNKNOWN',
              historical_overdue_rate: task.customer_aggregation.payment_history?.historical_overdue_rate ?? 0,
            }
          : undefined,
      };

      let result;
      try {
        result = await aiService.analyzeInvoice(ctx);
        if (result.success) aiSuccess++;
        else aiFailure++;
      } catch {
        aiFailure++;
        result = {
          summary: `账款分析：${task.invoice.customer_name}，逾期 ${task.invoice.days_overdue} 天`,
          reason: task.reason || '程序判定优先级',
          recommended_action: task.invoice.days_overdue >= 60 ? 'follow_up_now' as const : 'follow_up_later' as const,
          recommended_timing: task.invoice.days_overdue >= 60 ? 'today' as const : 'within_3_days' as const,
          message_tone: 'PROFESSIONAL' as const,
          success: false,
          provider: 'unknown',
          latencyMs: 0,
          timestamp: new Date().toISOString(),
        };
      }

      enriched.push({
        invoice: {
          invoice_number: task.invoice.invoice_number,
          customer_name: task.invoice.customer_name,
          amount: task.invoice.amount.toString(),
          paid_amount: task.invoice.paid_amount.toString(),
          outstanding_amount: task.invoice.outstanding_amount.toString(),
          days_overdue: task.invoice.days_overdue,
          status: task.invoice.status,
        },
        priority: {
          priority_score: task.priority.priority_score,
          priority_level: task.priority.priority_level,
          overdue_score: task.priority.overdue_score,
          amount_score: task.priority.amount_score,
          history_score: task.priority.history_score,
          trend_score: task.priority.trend_score,
        },
        reason: task.reason,
        recommended_action: task.recommended_action,
        customer_aggregation: task.customer_aggregation,
        ai_analysis: {
          summary: result.summary,
          reason: result.reason,
          recommended_action: result.recommended_action,
          recommended_timing: result.recommended_timing,
          message_tone: result.message_tone,
        },
        ai_stats: {
          success: result.success,
          provider: result.provider,
          latencyMs: result.latencyMs,
          error: result.error,
          timestamp: result.timestamp,
        },
      });
    }

    // 组装报告
    const report = {
      metadata: {
        generated_at: new Date().toISOString(),
        total_invoices: normalized.length,
        total_customers: new Set(normalized.map(i => i.customer_name)).size,
      },
      risk_metrics: {
        total_receivables: arHealth.total_receivables.toString(),
        overdue_amount: arHealth.overdue_amount.toString(),
        overdue_ratio: parseFloat((arHealth.overdue_ratio).toFixed(1)),
        avg_days_overdue: Math.round(
          normalized.filter(i => i.is_overdue).reduce((s, i) => s + i.days_overdue, 0) /
          Math.max(normalized.filter(i => i.is_overdue).length, 1)
        ),
        max_days_overdue: Math.max(...normalized.map(i => i.days_overdue), 0),
      },
      aging_distribution: arHealth.aging_distribution.map(d => ({
        bucket: d.bucket,
        amount: d.amount.toString(),
        percentage: parseFloat(d.percentage.toFixed(1)),
      })),
      top_tasks: enriched,
      ai_stats: {
        total_calls: topTasks.length,
        success: aiSuccess,
        failure: aiFailure,
        provider: 'mock', // 生产环境会从 config 读取
      },
    };

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      { error: `分析失败: ${err.message}` },
      { status: 500 }
    );
  }
}
