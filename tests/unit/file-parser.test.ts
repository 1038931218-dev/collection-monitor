import { parseFile } from '../../src/file-parser';
import { normalizeInvoices } from '../../src/data-normalizer';
import { generateTestInvoices, generateDirtyTestInvoices } from '../test-data';
import { DecimalMoney } from '../../src/lib/decimal';

describe('File Parser', () => {
  test('应该正确解析正常发票数据', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    expect(normalized).toHaveLength(11); // 10张发票（1条重复）
    expect(normalized.every(inv => inv.customer_name !== '')).toBe(true);
  });

  test('应该跳过空客户名称', () => {
    const invoices = generateDirtyTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    // 空客户名称的应该被过滤或标记
    expect(normalized.some(inv => inv.customer_name === '')).toBe(false);
  });

  test('应该处理重复数据', () => {
    const invoices = generateDirtyTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    // 重复的INV-DUP-001应该只保留一条
    const dupCount = normalized.filter(inv => inv.invoice_number === 'INV-DUP-001').length;
    expect(dupCount).toBe(1);
  });

  test('应该正确处理部分付款', () => {
    const invoices = generateTestInvoices();
    const partial = invoices.find(inv => inv.invoice_number === 'INV-007');
    
    if (partial) {
      const normalized = normalizeInvoices([partial])[0];
      expect(normalized.paid_amount.cents).toBe(800000); // $8000
      expect(normalized.outstanding_amount.cents).toBe(1200000); // $12000
      expect(normalized.status).toBe('PARTIALLY_PAID');
    }
  });

  test('应该正确处理已付款', () => {
    const invoices = generateTestInvoices();
    const paid = invoices.find(inv => inv.invoice_number === 'INV-008');
    
    if (paid) {
      const normalized = normalizeInvoices([paid])[0];
      expect(normalized.outstanding_amount.cents).toBe(0);
      expect(normalized.status).toBe('PAID');
    }
  });

  test('应该正确处理逾期天数', () => {
    const invoices = generateTestInvoices();
    const overdue = invoices.find(inv => inv.invoice_number === 'INV-006');
    
    if (overdue) {
      const normalized = normalizeInvoices([overdue])[0];
      expect(normalized.is_overdue).toBe(true);
      expect(normalized.days_overdue).toBeGreaterThan(90);
    }
  });

  test('金额计算应该精确（无浮点误差）', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    // 计算总金额
    const total = normalized.reduce(
      (sum, inv) => sum.add(inv.outstanding_amount),
      DecimalMoney.fromString('0')
    );
    
    // 总金额应该是整数分
    expect(total.cents).toBe(Math.round(total.cents));
  });

  test('多次运行应该得到一致结果', () => {
    const invoices = generateTestInvoices();
    
    const result1 = normalizeInvoices(invoices);
    const result2 = normalizeInvoices(invoices);
    
    expect(result1).toEqual(result2);
  });
});

describe('Dirty Data Handling', () => {
  test('应该处理负数金额', () => {
    const invoices = generateDirtyTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    // 负数金额应该被调整为0
    const negative = normalized.find(inv => inv.invoice_number === 'INV-BAD-002');
    if (negative) {
      expect(negative.outstanding_amount.cents).toBeGreaterThanOrEqual(0);
    }
  });

  test('应该处理超付情况', () => {
    const invoices = generateDirtyTestInvoices();
    const normalized = normalizeInvoices(invoices);
    
    const overpaid = normalized.find(inv => inv.invoice_number === 'INV-BAD-003');
    if (overpaid) {
      expect(overpaid.outstanding_amount.cents).toBe(0);
      expect(overpaid.status).toBe('PAID');
    }
  });
});
