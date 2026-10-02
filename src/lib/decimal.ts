// 精确数值处理 - 使用整数存储分，避免浮点误差
import { StrictDate } from './strict-date';

export class DecimalMoney {
  private _cents: number;

  constructor(cents: number) {
    this._cents = Math.round(cents);
  }

  static fromString(str: string): DecimalMoney {
    const cleaned = str.replace(/[^0-9.\-]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) throw new Error('Invalid money format');
    
    const dollars = parseInt(parts[0] || '0', 10);
    const centsPart = parts[1] ? parts[1].padEnd(2, '0').slice(0, 2) : '00';
    const cents = parseInt(centsPart, 10);
    
    return new DecimalMoney(dollars * 100 + cents);
  }

  static fromNumber(num: number): DecimalMoney {
    return new DecimalMoney(Math.round(num * 100));
  }

  get cents(): number {
    return this._cents;
  }

  get dollars(): number {
    return this.cents / 100;
  }

  add(other: DecimalMoney): DecimalMoney {
    return new DecimalMoney(this.cents + other.cents);
  }

  subtract(other: DecimalMoney): DecimalMoney {
    return new DecimalMoney(this.cents - other.cents);
  }

  multiply(factor: number): DecimalMoney {
    return new DecimalMoney(Math.round(this.cents * factor));
  }

  divide(divisor: number): DecimalMoney {
    if (divisor === 0) throw new Error('Division by zero');
    return new DecimalMoney(Math.round(this.cents / divisor));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isNegative(): boolean {
    return this.cents < 0;
  }

  abs(): DecimalMoney {
    return new DecimalMoney(Math.abs(this.cents));
  }

  toString(currency: string = '$'): string {
    const sign = this.cents < 0 ? '-' : '';
    const absCents = Math.abs(this.cents);
    const dollars = Math.floor(absCents / 100);
    const cents = absCents % 100;
    return `${sign}${currency}${dollars.toLocaleString()}.${cents.toString().padStart(2, '0')}`;
  }

  toFixed(places: number = 2): string {
    return (this.cents / 100).toFixed(places);
  }

  percentageOf(total: DecimalMoney): number {
    if (total.isZero()) return 0;
    return (this.cents / total.cents) * 100;
  }
}

// 日期工具
export class DateUtils {
  static today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * @deprecated P0-01（2026-10-01）—— 请勿在新代码中使用，改用 `StrictDate.parse`。
   *
   * 历史问题：本方法原先直接 `new Date(str)`，会静默接受不存在的日期：
   *   2026-02-30 → 2026-03-02（JS 自动滚动）
   *   2026-02-29 → 2026-03-01
   *   "0"        → 2000-01-01
   * 而解析失败时返回 null，调用方（data-normalizer）又用 `|| today` 兜底，
   * 导致非法日期要么被改写成另一个日期、要么被伪装成「今天」，
   * 两条路都会污染 days_overdue → aging → priority_score。
   *
   * 现内部已改为完全委托 StrictDate，不再保留任何宽松行为。
   * 保留签名的唯一目的是兼容既有调用点。
   */
  static parseDate(str: string): Date | null {
    return StrictDate.parse(str);
  }

  static daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// 字段识别映射
// 注意：顺序重要！更特化的字段必须放在前面，避免「已付金额」先命中 amount
export const FIELD_MAPPINGS: Record<string, string[]> = {
  customer_name: ['customer', 'client', 'customer name', 'client name', 'buyer', 'vendor', '姓名', '客户'],
  invoice_number: ['invoice', 'invoice number', 'invoice #', 'ref', 'ref number', '发票号', '单号'],
  invoice_date: ['invoice date', 'issued date', 'date issued', '发票日期'],
  due_date: ['due date', 'payment due', 'due', '到期日', '付款日'],
  paid_amount: ['paid', 'paid amount', 'amount paid', '已付', '已付款'],
  amount: ['amount', 'invoice amount', 'total', '总金额', '金额'],
  status: ['status', 'payment status', '状态'],
  paid_date: ['paid date', 'payment date', 'paid on', '付款日期'],
  currency: ['currency', 'currency code', '币种'],
};
