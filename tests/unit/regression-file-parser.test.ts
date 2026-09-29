/**
 * 回归测试：Phase 4.3 修复的两个真实 Bug
 *
 * Bug 1: parseFile 中 errors 变量为 const 导致解构赋值崩溃
 *         → 所有 CSV/XLSX 文件解析失败
 * Bug 2: FIELD_MAPPINGS 中 amount 排在 paid_amount 前面，
 *         导致中文「已付金额」列先命中 amount 而非 paid_amount
 *
 * 这两个 Bug 必须在后续重构/升级后依然被保护。
 */
import { parseFile } from '../../src/file-parser';
import { normalizeInvoices } from '../../src/data-normalizer';
import { DecimalMoney } from '../../src/lib/decimal';
import { generateTestInvoices } from '../test-data';

describe('Phase 4.3 Regression: File Parser & Field Mapping', () => {
  // ── Bug 1 回归：parseFile 能正常解析 CSV（不解构崩溃）──────────────────
  test('Bug 1 回归: parseFile 解析 CSV 不抛错', async () => {
    const csv = `customer name,invoice number,invoice date,due date,amount,paid amount,currency
Alice,INV-001,2026-07-01,2026-08-01,10000,0,USD
Bob,INV-002,2026-08-01,2026-09-01,5000,5000,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'test.csv');

    // 解析成功，返回 2 条发票
    expect(parsed.invoices.length).toBe(2);
    expect(parsed.errors).toHaveLength(0);

    // 第一条：Alice $10,000
    expect(parsed.invoices[0].customer_name).toBe('Alice');
    expect(parsed.invoices[0].invoice_number).toBe('INV-001');
    expect(parsed.invoices[0].amount.cents).toBe(1000000);
  });

  test('Bug 1 回归: parseFile 解析含重复数据的 CSV', async () => {
    const csv = `customer,invoice,amount
Alice,INV-001,100
Alice,INV-001,100
Bob,INV-002,200
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'dedup.csv');

    // 去重后只有 2 条
    expect(parsed.invoices.length).toBe(2);
    expect(parsed.errors.length).toBeGreaterThan(0); // 有去重警告
  });

  // ── Bug 2 回归：中文字段「已付金额」被正确识别为 paid_amount ─────────────
  test('Bug 2 回归: 中文字段「已付金额」识别为 paid_amount', async () => {
    const csv = `客户名称,发票号,发票日期,到期日,金额,已付金额,币种
客户A,INV-A,2026-07-01,2026-08-01,10000,3000,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'chinese.csv');

    // 关键断言：已付金额 = 3000（$30,000 cents）
    expect(parsed.invoices.length).toBe(1);
    expect(parsed.invoices[0].paid_amount?.cents).toBe(300000);
    // 总金额 = 10000
    expect(parsed.invoices[0].amount.cents).toBe(1000000);
  });

  test('Bug 2 回归: 英文字段 paid_amount 与 amount 互不混淆', async () => {
    const csv = `customer,invoice_number,invoice_date,due_date,amount,paid_amount,currency
Alice,INV-001,2026-07-01,2026-08-01,10000,2000,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'english.csv');

    expect(parsed.invoices[0].amount.cents).toBe(1000000);
    expect(parsed.invoices[0].paid_amount?.cents).toBe(200000);
  });

  test('Bug 2 回归: 中文字段「总金额」识别为 amount（非 paid_amount）', async () => {
    const csv = `客户,发票号,发票日期,到期日,总金额,已付,币种
Alice,INV-001,2026-07-01,2026-08-01,5000,0,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'total.csv');

    expect(parsed.invoices[0].amount.cents).toBe(500000);
    expect(parsed.invoices[0].paid_amount?.cents).toBe(0);
  });

  // ── 综合回归：完整链路（parseFile → normalize → AR）─────────────────────
  test('综合回归: CSV → normalize → AR 全链路含部分付款', async () => {
    const csv = `customer,invoice_number,invoice_date,due_date,amount,paid_amount,currency
Alice,INV-001,2026-07-01,2026-08-01,10000,2000,USD
Bob,INV-002,2026-08-01,2026-09-01,5000,5000,USD
`;
    const buffer = Buffer.from(csv, 'utf-8');
    const parsed = await parseFile(buffer, 'chain.csv');
    const normalized = normalizeInvoices(parsed.invoices);

    // Alice: outstanding = 10000 - 2000 = 8000
    const alice = normalized.find(n => n.customer_name === 'Alice');
    expect(alice!.outstanding_amount.cents).toBe(800000);
    expect(alice!.status).toBe('PARTIALLY_PAID');

    // Bob: outstanding = 0 (fully paid)
    const bob = normalized.find(n => n.customer_name === 'Bob');
    expect(bob!.outstanding_amount.cents).toBe(0);
    expect(bob!.status).toBe('PAID');
  });
});
