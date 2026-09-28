import { DecimalMoney, DateUtils, FIELD_MAPPINGS } from '../lib/decimal';
import * as XLSX from 'xlsx';

export interface InvoiceData {
  customer_name: string;
  invoice_number?: string;
  invoice_date?: Date;
  due_date?: Date;
  amount: DecimalMoney;
  paid_amount?: DecimalMoney;
  status?: string;
  paid_date?: Date;
  currency?: string;
}

export interface ParsedFile {
  invoices: InvoiceData[];
  mapping: Record<string, string>;
  hasErrors: boolean;
  errors: string[];
}

export interface ColumnMapping {
  csvColumn: string;
  standardField: string;
}

// 读取文件并解析
export async function parseFile(file: Buffer, filename: string): Promise<ParsedFile> {
  const errors: string[] = [];
  let invoices: InvoiceData[] = [];
  let mapping: Record<string, string> = {};

  try {
    // 根据扩展名选择解析器
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'csv') {
      ({ invoices, mapping, errors } = await parseCSV(file, filename));
    } else if (ext === 'xlsx' || ext === 'xls') {
      ({ invoices, mapping, errors } = await parseExcel(file, filename));
    } else {
      errors.push(`不支持的文件格式: .${ext}`);
      return { invoices, mapping, hasErrors: true, errors };
    }

    // 数据标准化
    invoices = normalizeInvoices(invoices, errors);

    return {
      invoices,
      mapping,
      hasErrors: errors.length > 0,
      errors
    };
  } catch (error) {
    errors.push(`解析失败: ${error instanceof Error ? error.message : String(error)}`);
    return { invoices, mapping, hasErrors: true, errors };
  }
}

async function parseCSV(file: Buffer, filename: string): Promise<{ invoices: InvoiceData[]; mapping: Record<string, string>; errors: string[] }> {
  const errors: string[] = [];
  const text = file.toString('utf-8');
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    errors.push('文件为空或只有标题行');
    return { invoices: [], mapping: {}, errors };
  }

  // 解析CSV（简单处理，不考虑引号内的逗号）
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const dataLines = lines.slice(1);

  const invoices: InvoiceData[] = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const values = dataLines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length !== headers.length) {
      errors.push(`第${i + 2}行列数不匹配`);
      continue;
    }

    const invoice: InvoiceData = {
      customer_name: '',
      amount: DecimalMoney.fromString('0'),
    };

    // 映射列
    headers.forEach((header, idx) => {
      const value = values[idx];
      const field = detectField(header);
      if (field) {
        invoice[field as keyof InvoiceData] = parseValue(field, value);
      }
    });

    // 验证必需字段
    if (!invoice.customer_name) {
      errors.push(`第${i + 2}行缺少客户名称`);
      continue;
    }
    if (invoice.amount.cents === 0 && !valueIsMissing(invoice.amount)) {
      errors.push(`第${i + 2}行缺少金额`);
      continue;
    }

    invoices.push(invoice);
  }

  return { invoices, mapping: {}, errors };
}

async function parseExcel(file: Buffer, filename: string): Promise<{ invoices: InvoiceData[]; mapping: Record<string, string>; errors: string[] }> {
  const errors: string[] = [];
  
  const workbook = XLSX.read(file, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 转换为JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  
  if (jsonData.length === 0) {
    errors.push('Excel文件为空');
    return { invoices: [], mapping: {}, errors };
  }

  // 获取表头
  const headers = Object.keys(jsonData[0]);
  const mapping: Record<string, string> = {};

  // 自动识别字段
  headers.forEach(header => {
    const standardField = detectField(header);
    if (standardField) {
      mapping[header] = standardField;
    }
  });

  // 转换数据
  const invoices: InvoiceData[] = jsonData.map((row, idx) => {
    const invoice: InvoiceData = {
      customer_name: '',
      amount: DecimalMoney.fromString('0'),
    };

    headers.forEach(header => {
      const standardField = mapping[header];
      if (standardField) {
        const value = row[header];
        invoice[standardField as keyof InvoiceData] = parseValue(standardField, value);
      }
    });

    return invoice;
  });

  return { invoices, mapping, errors };
}

function detectField(header: string): string | null {
  const normalized = header.toLowerCase().trim();
  
  for (const [standardField, aliases] of Object.entries(FIELD_MAPPINGS)) {
    if (aliases.some(alias => normalized.includes(alias.toLowerCase()))) {
      return standardField;
    }
  }
  
  return null;
}

function parseValue(field: string, value: any): any {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  switch (field) {
    case 'amount':
    case 'paid_amount':
      return DecimalMoney.fromString(String(value).replace(/[$,]/g, ''));
    
    case 'invoice_date':
    case 'due_date':
    case 'paid_date':
      return DateUtils.parseDate(String(value));
    
    default:
      return String(value).trim();
  }
}

function normalizeInvoices(invoices: InvoiceData[], errors: string[]): InvoiceData[] {
  const normalized: InvoiceData[] = [];
  
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    
    // 设置默认值
    if (!inv.paid_amount) {
      inv.paid_amount = DecimalMoney.fromString('0');
    }
    if (!inv.currency) {
      inv.currency = 'USD';
    }
    if (!inv.status) {
      inv.status = 'UNPAID';
    }

    // 去重检查
    const isDuplicate = normalized.some(n => 
      n.invoice_number === inv.invoice_number && 
      n.customer_name === inv.customer_name
    );
    
    if (isDuplicate) {
      errors.push(`重复数据跳过: ${inv.invoice_number || '无发票号'} - ${inv.customer_name}`);
      continue;
    }

    normalized.push(inv);
  }

  return normalized;
}

function valueIsMissing(value: any): boolean {
  return value === undefined || value === null || value === '';
}
