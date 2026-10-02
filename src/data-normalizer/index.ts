import { DecimalMoney, DateUtils } from '../lib/decimal';
import { InvoiceData } from '../file-parser';

export interface NormalizedInvoice {
  customer_name: string;
  invoice_number?: string;
  invoice_date: Date;
  due_date: Date;
  amount: DecimalMoney;
  paid_amount: DecimalMoney;
  outstanding_amount: DecimalMoney;
  is_overdue: boolean;
  days_overdue: number;
  status: InvoiceStatus;
  currency: string;
  /** 最后一笔付款日期；由原始数据或 payment_records 推导填充 */
  paid_date?: Date;
}

export type InvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE' | 'UNKNOWN';

/**
 * P0-01: 只有真实有效的 Date 才允许进入财务计算。
 * 非法 Date 对象（Invalid Date）必须与「缺失」一样被拒绝。
 */
function isValidDate(v: unknown): v is Date {
  return v instanceof Date && !isNaN(v.getTime());
}

// 数据标准化
export function normalizeInvoice(invoice: InvoiceData): NormalizedInvoice | null {
  // 过滤空客户名称
  if (!invoice.customer_name || invoice.customer_name.trim() === '') {
    return null;
  }

  // ── P0-01: 「提供了但非法」的日期一律拒绝（fail-closed）────────────────
  //
  // 严格区分两种情形：
  //   缺失（undefined）   = 源数据未提供   → 保持既有产品行为（按未逾期处理）
  //   非法（Invalid Date）= 源数据提供了但解析不出 → 拒绝，绝不兜底
  //
  // 原实现的危害集中在「非法」这一支：宽松解析器会把 2026-02-30 静默滚成
  // 2026-03-02，或返回 null 后被 `|| today` 兜底，两条路都会污染
  //   days_overdue → aging → overdue_score → priority_score
  if (invoice.due_date !== undefined && !isValidDate(invoice.due_date)) {
    return null;
  }
  if (invoice.invoice_date !== undefined && !isValidDate(invoice.invoice_date)) {
    return null;
  }
  if (invoice.paid_date !== undefined && !isValidDate(invoice.paid_date)) {
    return null;
  }

  const today = DateUtils.today();
  
  // 计算未收金额
  const outstanding = invoice.amount.subtract(invoice.paid_amount || DecimalMoney.fromString('0'));
  
  // 确保不为负数
  const finalOutstanding = outstanding.cents < 0 
    ? DecimalMoney.fromString('0') 
    : outstanding;

  // 计算逾期天数
  const daysOverdue = invoice.due_date 
    ? Math.max(0, DateUtils.daysBetween(invoice.due_date, today))
    : 0;

  // 判断是否逾期
  const isOverdue = finalOutstanding.cents > 0 && daysOverdue > 0;

  // 确定状态
  const status = determineStatus(finalOutstanding, invoice.paid_amount, daysOverdue);

  return {
    customer_name: invoice.customer_name.trim(),
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date ?? today,
    // P0-01: 此处的 `?? today` 只作用于「缺失」的日期，不作用于「非法」日期
    // （非法日期已在上方被拒绝）。缺失到期日按未逾期处理是既有产品行为，
    // 由 [真脏-5]/[真脏-8] 锁定。
    due_date: invoice.due_date ?? today,
    amount: invoice.amount,
    paid_amount: invoice.paid_amount || DecimalMoney.fromString('0'),
    outstanding_amount: finalOutstanding,
    is_overdue: isOverdue,
    days_overdue: daysOverdue,
    status,
    currency: invoice.currency || 'USD',
    paid_date: invoice.paid_date, // Phase 2: 传递最后一笔付款日期
  };
}

function determineStatus(outstanding: DecimalMoney, paid: DecimalMoney | undefined, daysOverdue: number): InvoiceStatus {
  if (outstanding.cents <= 0) {
    return 'PAID';
  }
  
  if (paid && paid.cents > 0 && outstanding.cents > 0) {
    return 'PARTIALLY_PAID';
  }
  
  if (daysOverdue > 0) {
    return 'OVERDUE';
  }
  
  return 'UNPAID';
}

export function normalizeInvoices(invoices: InvoiceData[]): NormalizedInvoice[] {
  const seen = new Set<string>();
  
  return invoices
    .map(normalizeInvoice)
    .filter((inv): inv is NormalizedInvoice => {
      if (inv === null) return false;
      // 去重：同一客户 + 同一发票号只保留一条
      if (inv.invoice_number) {
        const key = `${inv.customer_name}:${inv.invoice_number}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
}
