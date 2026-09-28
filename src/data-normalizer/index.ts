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
}

export type InvoiceStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE' | 'UNKNOWN';

// 数据标准化
export function normalizeInvoice(invoice: InvoiceData): NormalizedInvoice | null {
  // 过滤空客户名称
  if (!invoice.customer_name || invoice.customer_name.trim() === '') {
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
    invoice_date: invoice.invoice_date || today,
    due_date: invoice.due_date || today,
    amount: invoice.amount,
    paid_amount: invoice.paid_amount || DecimalMoney.fromString('0'),
    outstanding_amount: finalOutstanding,
    is_overdue: isOverdue,
    days_overdue: daysOverdue,
    status,
    currency: invoice.currency || 'USD',
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
