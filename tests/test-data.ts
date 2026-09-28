// 测试数据生成器
import { InvoiceData } from '../src/file-parser';
import { NormalizedInvoice } from '../src/data-normalizer';
import { DecimalMoney, DateUtils } from '../src/lib/decimal';

// 生成测试发票数据
export function generateTestInvoices(): InvoiceData[] {
  const today = DateUtils.today();
  
  return [
    // 1. 正常未逾期发票
    {
      customer_name: 'ABC Ltd',
      invoice_number: 'INV-001',
      invoice_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('10000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 2. 1-7天逾期
    {
      customer_name: 'XYZ Corp',
      invoice_number: 'INV-002',
      invoice_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('5000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 3. 8-30天逾期
    {
      customer_name: 'Global Trading',
      invoice_number: 'INV-003',
      invoice_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('25000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 4. 31-60天逾期
    {
      customer_name: 'Tech Solutions',
      invoice_number: 'INV-004',
      invoice_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('15000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 5. 61-90天逾期
    {
      customer_name: 'Mega Industries',
      invoice_number: 'INV-005',
      invoice_date: new Date(today.getTime() - 120 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 75 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('50000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 6. 90+天逾期
    {
      customer_name: 'Old Customer',
      invoice_number: 'INV-006',
      invoice_date: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('100000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 7. 部分付款
    {
      customer_name: 'Partial Pay Co',
      invoice_number: 'INV-007',
      invoice_date: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('20000'),
      paid_amount: DecimalMoney.fromString('8000'),
      currency: 'USD',
    },
    
    // 8. 已付款
    {
      customer_name: 'Paid Customer',
      invoice_number: 'INV-008',
      invoice_date: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('30000'),
      paid_amount: DecimalMoney.fromString('30000'),
      currency: 'USD',
    },
    
    // 9. 同一客户多张发票（小金额）
    {
      customer_name: 'Repeat Customer',
      invoice_number: 'INV-009',
      invoice_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('500'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    {
      customer_name: 'Repeat Customer',
      invoice_number: 'INV-010',
      invoice_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('800'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
    
    // 10. 大金额未逾期
    {
      customer_name: 'Big Client',
      invoice_number: 'INV-011',
      invoice_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      due_date: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('500000'),
      paid_amount: DecimalMoney.fromString('0'),
      currency: 'USD',
    },
  ];
}

// 生成脏数据测试
export function generateDirtyTestInvoices(): InvoiceData[] {
  const today = DateUtils.today();
  
  return [
    // 空值
    {
      customer_name: '',
      invoice_number: 'INV-BAD-001',
      amount: DecimalMoney.fromString('1000'),
      currency: 'USD',
    },
    
    // 重复数据
    {
      customer_name: 'Duplicate Customer',
      invoice_number: 'INV-DUP-001',
      invoice_date: today,
      due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('1000'),
      currency: 'USD',
    },
    {
      customer_name: 'Duplicate Customer',
      invoice_number: 'INV-DUP-001',
      invoice_date: today,
      due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('1000'),
      currency: 'USD',
    },
    
    // 负数金额
    {
      customer_name: 'Negative Amount',
      invoice_number: 'INV-BAD-002',
      invoice_date: today,
      due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('-500'),
      currency: 'USD',
    },
    
    // 付款超过发票金额
    {
      customer_name: 'Overpaid',
      invoice_number: 'INV-BAD-003',
      invoice_date: today,
      due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      amount: DecimalMoney.fromString('1000'),
      paid_amount: DecimalMoney.fromString('1500'),
      currency: 'USD',
    },
  ];
}
