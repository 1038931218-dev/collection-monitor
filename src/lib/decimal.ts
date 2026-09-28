// 精确数值处理 - 使用整数存储分，避免浮点误差
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

  static parseDate(str: string): Date | null {
    if (!str) return null;
    
    // 尝试多种格式
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/,   // MM-DD-YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{8}$/,                // YYYYMMDD
    ];

    // 直接解析
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // MM/DD/YYYY 格式
    const mmddyyyy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      return new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`);
    }

    // DD/MM/YYYY 格式
    const ddmmyyyy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (ddmmyyyy && parseInt(ddmmyyyy[1]) <= 12) {
      return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
    }

    return null;
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
export const FIELD_MAPPINGS: Record<string, string[]> = {
  customer_name: ['customer', 'client', 'customer name', 'client name', 'buyer', 'vendor', '姓名', '客户'],
  invoice_number: ['invoice', 'invoice number', 'invoice #', 'ref', 'ref number', '发票号', '单号'],
  invoice_date: ['invoice date', 'issued date', 'date issued', 'invoice date', '发票日期'],
  due_date: ['due date', 'payment due', 'due', '到期日', '付款日'],
  amount: ['amount', 'invoice amount', 'total', '总金额', '金额'],
  paid_amount: ['paid', 'paid amount', 'amount paid', '已付', '已付款'],
  status: ['status', 'payment status', '状态'],
  paid_date: ['paid date', 'payment date', 'paid on', '付款日期'],
  currency: ['currency', 'currency code', '币种'],
};
