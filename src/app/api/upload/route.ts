// POST /api/upload
// 接收前端上传的文件，调用现有 parseFile + normalizeInvoices，返回结构化数据
import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/file-parser';
import { normalizeInvoices } from '@/data-normalizer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, data } = body as { filename: string; data: string };

    if (!data || !filename) {
      return NextResponse.json({ error: '缺少文件或文件名' }, { status: 400 });
    }

    // base64 → Buffer
    const buf = Buffer.from(data, 'base64');

    // 大小限制
    if (buf.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: '文件大小超过限制（最大 10MB）' },
        { status: 413 }
      );
    }

    // 调用现有解析器
    const parsed = await parseFile(buf, filename);

    // 标准化
    const normalized = normalizeInvoices(parsed.invoices);

    // 只返回关键字段（不暴露内部 DecimalMoney 对象）
    return NextResponse.json({
      invoices: normalized.map(inv => ({
        customer_name: inv.customer_name,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date.toISOString().split('T')[0],
        due_date: inv.due_date.toISOString().split('T')[0],
        amount: inv.amount.cents / 100,
        paid_amount: inv.paid_amount.cents / 100,
        currency: inv.currency,
        status: inv.status,
        days_overdue: inv.days_overdue,
        outstanding_amount: inv.outstanding_amount.cents / 100,
      })),
      mapping: parsed.mapping,
      errors: parsed.errors,
      total: normalized.length,
    });
  } catch (err: unknown) {
    // 生产环境不暴露内部错误详情
    console.error('[UPLOAD] 处理失败:', err instanceof Error ? err.name : 'UnknownError');
    return NextResponse.json(
      { error: '文件处理失败，请检查格式后重试' },
      { status: 500 }
    );
  }
}
