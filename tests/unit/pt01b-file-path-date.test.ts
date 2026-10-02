/**
 * P0-01 / P0-02 回归测试：文件解析入口的日期污染
 *
 * 背景（R2-01）：第 2 轮只修了 API 入口（/api/analyze 改用 StrictDate），
 * 但文件解析入口仍调用宽松的 DateUtils.parseDate，导致：
 *   2026-02-30 → 2026-03-02（JS 自动滚动）
 *   2026-02-29 → 2026-03-01
 *   "0"        → 2000-01-01（逾期 9770 天 → 进入 90+ → overdue_score=100 → 污染 Priority）
 *
 * 本测试锁死两个入口的一致性：任何非法日期都不得进入
 * days_overdue → aging → overdue_score → priority_score 这条链。
 *
 * 守卫的不变量：
 *   1. 文件入口与 API 入口对非法日期的判定必须一致（防止「修一个入口、漏另一个」复发）
 *   2. 非法日期不得被改写成另一个日期，也不得被兜底成「今天」
 *   3. 合法日期（含 Excel 序列号）必须仍然可解析（禁止为修 bug 而修坏功能）
 */
import { parseFile } from '../../src/file-parser';
import { normalizeInvoices } from '../../src/data-normalizer';
import { StrictDate } from '../../src/lib/strict-date';
import { calculateARHealth } from '../../src/ar-engine';
import { generateCollectionTasks } from '../../src/priority-engine';

function csvWithDueDate(dueDate: string): Buffer {
  return Buffer.from(
    ['customer,amount,due_date', `Regression Corp,1000,${dueDate}`].join('\n'),
    'utf-8'
  );
}

async function throughFilePath(dueDate: string) {
  const parsed = await parseFile(csvWithDueDate(dueDate), 'p01b.csv');
  const normalized = normalizeInvoices(parsed.invoices);
  return { parsed, normalized };
}

const ILLEGAL_DATES = [
  '2026-02-30',
  '2026-02-29',
  '2026-04-31',
  '2026-13-01',
  '2026-01-32',
  '32/13/2026',
  '00/00/2026',
  '20260230',
  '0',
  '-1',
  'NaN',
  'Infinity',
  'abc',
  // ISO 变体：StrictDate 的 ISO 分支曾缺少回环校验，是绕过通道
  '2026-02-30T00:00:00Z',
  '2026-02-29T12:00:00Z',
  '2026-04-31T00:00:00Z',
  '2026-13-01T00:00:00Z',
  '2026-01-32T00:00:00Z',
  '2026-02-30T00:00:00+08:00',
];

const LEGAL_DATES = [
  '2026-02-28',
  '2026-03-01',
  '2024-02-29', // 闰年合法
  '2026-01-15',
  '2026/12/31',
  '01/15/2026',
];

describe('P0-01 文件入口：非法日期必须被拒绝', () => {
  test.each(ILLEGAL_DATES)('%s 不得进入标准化结果', async (bad) => {
    const { parsed, normalized } = await throughFilePath(bad);
    expect(normalized).toHaveLength(0);
    // 必须留下明确错误，而不是静默丢弃
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  test('2026-02-30 不得被 JS 滚动成 2026-03-02', async () => {
    const { normalized } = await throughFilePath('2026-02-30');
    expect(normalized).toHaveLength(0);
  });

  test('2026-02-29 不得被滚动成 2026-03-01', async () => {
    const { normalized } = await throughFilePath('2026-02-29');
    expect(normalized).toHaveLength(0);
  });

  test('"0" 不得被当作 2000-01-01', async () => {
    const { normalized } = await throughFilePath('0');
    expect(normalized).toHaveLength(0);
  });
});

describe('P0-01 文件入口：合法日期不得被修坏（回归保护）', () => {
  test.each(LEGAL_DATES)('%s 应正常解析', async (good) => {
    const { normalized } = await throughFilePath(good);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].due_date).toBeInstanceOf(Date);
    expect(isNaN(normalized[0].due_date.getTime())).toBe(false);
  });

  test('缺失 due_date：保留发票并按未逾期处理（既有产品行为，不属本轮变更范围）', async () => {
    const buf = Buffer.from(
      ['customer,amount,due_date', 'NoDueDate Corp,1000,'].join('\n'),
      'utf-8'
    );
    const parsed = await parseFile(buf, 'nodue.csv');
    const normalized = normalizeInvoices(parsed.invoices);
    // 「缺失」与「非法」必须区别对待：
    //   缺失 → 保持既有行为（保留 + 未逾期），由 [真脏-5]/[真脏-8] 锁定
    //   非法 → 拒绝（见上面的 ILLEGAL_DATES 用例）
    expect(normalized).toHaveLength(1);
    expect(normalized[0].days_overdue).toBe(0);
  });

  test('空字符串作为日期值传入时必须被判为非法（区别于「缺失」）', () => {
    expect(StrictDate.parse('')).toBeNull();
  });
});

describe('P0-01 Excel 序列号：合法序列号仍可解析', () => {
  test('序列号 46000 解析为有效日期', () => {
    const d = StrictDate.parse(46000);
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d!.getTime())).toBe(false);
  });

  test('超出范围的数字必须拒绝', () => {
    expect(StrictDate.parse(2958466)).toBeNull();
    expect(StrictDate.parse(0)).toBeNull();
    expect(StrictDate.parse(-1)).toBeNull();
    // 8 位日期被当成数字时超出 Excel 序列号上限，必须拒绝
    expect(StrictDate.parse(20260230)).toBeNull();
  });
});

describe('P0-02 完整链：非法日期不得污染 Priority', () => {
  test.each(ILLEGAL_DATES)('%s 不得产出任何 CollectionTask', async (bad) => {
    const { normalized } = await throughFilePath(bad);
    const ar = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, Infinity);
    expect((tasks ?? []).length).toBe(0);
  });

  test('对照：合法日期可正常产出 Priority 任务', async () => {
    const { normalized } = await throughFilePath('2025-01-15');
    const ar = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, ar.customer_aggregations, Infinity);
    expect(normalized).toHaveLength(1);
    expect(tasks.length).toBeGreaterThan(0);
    expect(Number.isFinite(tasks[0].invoice.days_overdue)).toBe(true);
    expect(tasks[0].invoice.days_overdue).toBeLessThan(3650);
  });
});
