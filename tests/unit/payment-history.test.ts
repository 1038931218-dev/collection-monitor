/**
 * Phase 2 测试：支付历史分析（TypeScript/Jest）
 */

import {
  analyzePaymentHistory,
  daysToPayFromSample,
  PaymentHistoryAnalysis,
} from '../../src/payment-history';

const TODAY = new Date('2026-09-28');

describe('Phase 2: PaymentHistory', () => {
  describe('daysToPayFromSample', () => {
    test('逾期5天', () => {
      const s = { due_date: new Date('2026-08-01'), payment_date: new Date('2026-08-06') };
      expect(daysToPayFromSample(s)).toBe(5);
    });

    test('提前2天', () => {
      const s = { due_date: new Date('2026-08-01'), payment_date: new Date('2026-07-30') };
      expect(daysToPayFromSample(s)).toBe(-2);
    });

    test('按时付款', () => {
      const s = { due_date: new Date('2026-08-01'), payment_date: new Date('2026-08-01') };
      expect(daysToPayFromSample(s)).toBe(0);
    });
  });

  describe('analyzePaymentHistory - 无历史', () => {
    let a: PaymentHistoryAnalysis;

    beforeEach(() => {
      a = analyzePaymentHistory('c', 'Test', [], TODAY);
    });

    test('平均付款天数为 null', () => {
      expect(a.average_payment_days).toBeNull();
    });

    test('中位数付款天数为 null', () => {
      expect(a.median_payment_days).toBeNull();
    });

    test('最近付款天数 ago 为 null', () => {
      expect(a.last_payment_days_ago).toBeNull();
    });

    test('recent_average_payment_days 为 null', () => {
      expect(a.recent_average_payment_days).toBeNull();
    });

    test('trend 为 UNKNOWN', () => {
      expect(a.payment_trend).toBe('UNKNOWN');
    });

    test('behavior 为 UNKNOWN', () => {
      expect(a.payment_behavior).toBe('UNKNOWN');
    });

    test('total_payments 为 0', () => {
      expect(a.total_payments).toBe(0);
    });

    test('overdue_count 和 rate 均为 0', () => {
      expect(a.historical_overdue_count).toBe(0);
      expect(a.historical_overdue_rate).toBe(0);
    });
  });

  describe('analyzePaymentHistory - Customer A 可靠客户（全部+5天）', () => {
    const samples = [
      { due_date: new Date('2026-07-26'), payment_date: new Date('2026-07-31') }, // +5
      { due_date: new Date('2026-06-25'), payment_date: new Date('2026-06-30') }, // +5
      { due_date: new Date('2026-05-28'), payment_date: new Date('2026-06-02') }, // +5
      { due_date: new Date('2026-04-27'), payment_date: new Date('2026-05-02') }, // +5
    ];

    test('average_payment_days = 5.0', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.average_payment_days).toBeCloseTo(5, 1);
    });

    test('median_payment_days = 5.0', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.median_payment_days).toBeCloseTo(5, 1);
    });

    test('trend = STABLE', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.payment_trend).toBe('STABLE');
    });

    test('behavior = ON_TIME (avg=5 <= 7)', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.payment_behavior).toBe('ON_TIME');
    });

    test('total_payments = 4', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.total_payments).toBe(4);
    });

    test('last_payment_days_ago > 0', () => {
      const a = analyzePaymentHistory('cust-a', 'A', samples, TODAY);
      expect(a.last_payment_days_ago).toBeGreaterThan(0);
    });
  });

  describe('analyzePaymentHistory - Customer B 轻微延迟（+7天）', () => {
    const samples = [
      { due_date: new Date('2026-08-05'), payment_date: new Date('2026-08-12') },
      { due_date: new Date('2026-07-08'), payment_date: new Date('2026-07-15') },
      { due_date: new Date('2026-06-03'), payment_date: new Date('2026-06-10') },
    ];

    test('average = 7.0, behavior = ON_TIME', () => {
      const a = analyzePaymentHistory('cust-b', 'B', samples, TODAY);
      expect(a.average_payment_days).toBeCloseTo(7, 1);
      expect(a.payment_behavior).toBe('ON_TIME'); // 7天刚好在ON_TIME边界
    });
  });

  describe('analyzePaymentHistory - Customer C 恶化趋势（+2→+18）', () => {
    const samples = [
      { due_date: new Date('2026-07-31'), payment_date: new Date('2026-08-02') }, // +2
      { due_date: new Date('2026-06-30'), payment_date: new Date('2026-07-02') }, // +2
      { due_date: new Date('2026-04-30'), payment_date: new Date('2026-05-18') }, // +18
    ];

    test('average ≈ 7.3', () => {
      const a = analyzePaymentHistory('cust-c', 'C', samples, TODAY);
      expect(a.average_payment_days).toBeCloseTo(7.3, 0.5);
    });

    test('trend = IMPROVING（付款从+18天改善到+2天）', () => {
      const a = analyzePaymentHistory('cust-c', 'C', samples, TODAY);
      // 早期+18天，近期+2天，改善明显
      expect(a.payment_trend).toBe('IMPROVING');
      expect(a.average_payment_days).toBeCloseTo(7.3, 0.5);
    });
  });

  describe('analyzePaymentHistory - Customer E 大金额可靠', () => {
    const samples = [
      { due_date: new Date('2026-07-30'), payment_date: new Date('2026-08-03') },   // +4
      { due_date: new Date('2026-06-25'), payment_date: new Date('2026-06-28') },  // +3
      { due_date: new Date('2026-05-20'), payment_date: new Date('2026-05-25') },  // +5
      { due_date: new Date('2026-04-15'), payment_date: new Date('2026-04-20') },  // +5
    ];

    test('average ≈ 4.25', () => {
      const a = analyzePaymentHistory('cust-e', 'E', samples, TODAY);
      expect(a.average_payment_days).toBeCloseTo(4.25, 1);
    });

    test('behavior = ON_TIME', () => {
      const a = analyzePaymentHistory('cust-e', 'E', samples, TODAY);
      expect(a.payment_behavior).toBe('ON_TIME');
    });

    test('recent_average_payment_days = 4 (最近3笔的平均)', () => {
      const a = analyzePaymentHistory('cust-e', 'E', samples, TODAY);
      // 最近3笔（按付款时间排序后取末尾3笔）: +5, +3, +4 → avg=4
      expect(a.recent_average_payment_days).toBe(4);
    });
  });

  describe('analyzePaymentHistory - Customer F 严重逾期', () => {
    const samples = [
      { due_date: new Date('2026-07-15'), payment_date: new Date('2026-08-20') }, // +36
      { due_date: new Date('2026-05-10'), payment_date: new Date('2026-06-15') }, // +36
      { due_date: new Date('2026-01-30'), payment_date: new Date('2026-03-10') }, // +39
    ];

    test('average ≈ 37', () => {
      const a = analyzePaymentHistory('cust-f', 'F', samples, TODAY);
      expect(a.average_payment_days).toBeCloseTo(37, 0.5);
    });

    test('median = 36', () => {
      const a = analyzePaymentHistory('cust-f', 'F', samples, TODAY);
      expect(a.median_payment_days).toBe(36);
    });

    test('max_historical_overdue_days >= 36', () => {
      const a = analyzePaymentHistory('cust-f', 'F', samples, TODAY);
      expect(a.max_historical_overdue_days).toBeGreaterThanOrEqual(36);
    });

    test('behavior = SEVERE_LATE', () => {
      const a = analyzePaymentHistory('cust-f', 'F', samples, TODAY);
      expect(a.payment_behavior).toBe('SEVERE_LATE');
    });
  });

  describe('tscand 边界测试', () => {
    test('样本 < 3 时 trend = UNKNOWN', () => {
      const samples = [
        { due_date: new Date('2026-01-01'), payment_date: new Date('2026-01-10') },
        { due_date: new Date('2026-06-01'), payment_date: new Date('2026-06-15') },
      ];
      const a = analyzePaymentHistory('c', 'T', samples, TODAY);
      expect(a.payment_trend).toBe('UNKNOWN');
    });

    test('仅 1 个样本', () => {
      const samples = [{ due_date: new Date('2026-01-01'), payment_date: new Date('2026-01-10') }];
      const a = analyzePaymentHistory('c', 'T', samples, TODAY);
      expect(a.payment_trend).toBe('UNKNOWN');
      expect(a.average_payment_days).toBe(9);
    });
  });

  describe('behavior 标签判定', () => {
    const cases = [
      { days: -5, expected: 'EARLY' as const },
      { days: -1, expected: 'EARLY' as const },
      { days: 0, expected: 'ON_TIME' as const },
      { days: 3, expected: 'ON_TIME' as const },
      { days: 7, expected: 'ON_TIME' as const },
      { days: 10, expected: 'LATE' as const },
      { days: 14, expected: 'LATE' as const },
      { days: 20, expected: 'SEVERE_LATE' as const },
      { days: 45, expected: 'SEVERE_LATE' as const },
    ];

    for (const c of cases) {
      test(`avg=${c.days} → ${c.expected}`, () => {
        const due = new Date('2026-01-01');
        const pay = new Date(due.getTime() + c.days * 24 * 60 * 60 * 1000);
        const a = analyzePaymentHistory('c', 'T', [{ due_date: due, payment_date: pay }], TODAY);
        expect(a.payment_behavior).toBe(c.expected);
      });
    }
  });
});
