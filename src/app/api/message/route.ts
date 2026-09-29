// POST /api/message
// 生成催款消息草稿（不自动发送）
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/service';
import { getAIProvider } from '@/lib/ai/factory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, tone } = body;

    if (!task?.invoice) {
      return NextResponse.json({ error: '缺少任务数据' }, { status: 400 });
    }

    const ctx = {
      invoice_number: task.invoice.invoice_number,
      customer_name: task.invoice.customer_name,
      amount: String(task.invoice.amount),
      paid_amount: String(task.invoice.paid_amount ?? 0),
      outstanding_amount: String(task.invoice.outstanding_amount),
      days_overdue: task.invoice.days_overdue,
      priority_score: task.priority?.priority_score ?? 0,
      priority_level: task.priority?.priority_level ?? 'LOW',
      overdue_score: task.priority?.overdue_score ?? 0,
      amount_score: task.priority?.amount_score ?? 0,
      history_score: task.priority?.history_score ?? 40,
      trend_score: task.priority?.trend_score ?? 40,
      reason: task.reason || `逾期 ${task.invoice.days_overdue} 天`,
      recommended_action: task.recommended_action || 'follow_up_later',
    };

    const provider = getAIProvider();
    const result = await aiService.generateCollectionMessage(ctx, tone, provider);

    return NextResponse.json({
      subject: result.subject,
      message: result.message,
      success: result.success,
      provider: result.provider,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `生成消息失败: ${err.message}` },
      { status: 500 }
    );
  }
}
