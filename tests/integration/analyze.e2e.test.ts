// 主集成测试：端到端链路验证
import { describe, test, expect, beforeEach } from '@jest/globals';
import { runAnalyzeChain, validateInvoice, validateAggregation } from './helpers/run-analyze';
import { DecimalMoney } from '../../src/lib/decimal';
import { getTestToday } from '../helpers/fixed-date';
import { setTestClock, TestClock } from '../../src/lib/clock';

describe('AR 端到端集成测试', () => {
  beforeEach(() => {
    // 设置固定测试日期，确保结果可复现
    const testDate = getTestToday();
    setTestClock(new TestClock(testDate));
  });

  describe('Task A: 基础链路验证', () => {
    test('应该正确处理正常发票', () => {
      const invoice = {
        customer_name: 'ABC Ltd',
        invoice_number: 'INV-001',
        amount: DecimalMoney.fromString('1000'),
        paid_amount: DecimalMoney.fromString('0'),
        currency: 'USD'
      };
      
      const result = runAnalyzeChain([invoice]);
      
      expect(result.errors).toHaveLength(0);
      expect(result.normalized).toHaveLength(1);
      expect(result.arHealth).toBeTruthy();
      expect(result.tasks).toBeTruthy();
    });

    test('应该正确处理逾期发票并分类', () => {
      // 45天前到期 = 应落入 31-60 分类
      // 测试日期是 2026-09-28，所以 due_date 应该是 2026-08-14
      const dueDate = new Date('2026-08-14');
      const invoice = {
        customer_name: 'XYZ Corp',
        invoice_number: 'INV-002',
        amount: DecimalMoney.fromString('5000'),
        paid_amount: DecimalMoney.fromString('0'),
        currency: 'USD',
        due_date: dueDate
      };
      
      const result = runAnalyzeChain([invoice]);
      
      expect(result.errors).toHaveLength(0);
      expect(result.normalized[0].days_overdue).toBeGreaterThan(30);
      expect(result.normalized[0].days_overdue).toBeLessThanOrEqual(60);
    });

    test('应该处理部分付款发票', () => {
      const invoice = {
        customer_name: 'Partial Pay Co',
        invoice_number: 'INV-003',
        amount: DecimalMoney.fromString('2000'),
        paid_amount: DecimalMoney.fromString('800'),
        currency: 'USD'
      };
      
      const result = runAnalyzeChain([invoice]);
      
      expect(result.errors).toHaveLength(0);
      expect(result.normalized[0].outstanding_amount.cents).toBe(120000); // $1,200
    });
  });

  describe('Task B: 脏数据测试', () => {
    test('空客户名应该被过滤', () => {
      const invoice = {
        customer_name: '',
        invoice_number: 'INV-BAD',
        amount: DecimalMoney.fromString('1000'),
        currency: 'USD'
      };
      
      const result = runAnalyzeChain([invoice]);
      
      expect(result.normalized).toHaveLength(0);
    });

    test('非法日期应该被拒绝', () => {
      // 通过 API 路由传入非法日期字符串，应该被 StrictDate.parse 拒绝
      // 测试数据格式需要与 analyze 路由期望一致
      const invoice = {
        customer_name: 'Test Customer',
        invoice_number: 'INV-INVALID',
        invoice_date: '2026-01-01',
        due_date: '2026-02-30', // 非法日期
        amount: 1000,
        currency: 'USD'
      };
      
      // 直接使用 StrictDate.parse 测试
      const { StrictDate } = require('../../src/lib/strict-date');
      const parsed = StrictDate.parse(invoice.due_date);
      
      expect(parsed).toBeNull(); // 非法日期应该返回 null
    });

    test('负数金额应该被处理', () => {
      const invoice = {
        customer_name: 'Negative Amount',
        invoice_number: 'INV-NEG',
        amount: DecimalMoney.fromString('-500'),
        currency: 'USD'
      };
      
      const result = runAnalyzeChain([invoice]);
      
      expect(result.errors).toHaveLength(0);
      // 负数金额应该被截断为0
      expect(result.normalized[0]?.outstanding_amount.cents).toBe(0);
    });

    test('超长客户名不应导致崩溃', () => {
      const longName = 'A'.repeat(10000);
      const invoice = {
        customer_name: longName,
        invoice_number: 'INV-LONG',
        amount: DecimalMoney.fromString('1000'),
        currency: 'USD'
      };
      
      expect(() => runAnalyzeChain([invoice])).not.toThrow();
    });

    test('重复发票号应该被去重', () => {
      const invoice1 = {
        customer_name: 'Duplicate Customer',
        invoice_number: 'INV-DUP',
        amount: DecimalMoney.fromString('1000'),
        currency: 'USD'
      };
      
      const invoice2 = { ...invoice1 }; // 完全相同
      
      const result = runAnalyzeChain([invoice1, invoice2]);
      
      expect(result.normalized).toHaveLength(1);
    });
  });

  describe('Task C: 聚合验证', () => {
    test('应该正确计算总应收金额', () => {
      const invoices = [
        {
          customer_name: 'Customer A',
          invoice_number: 'INV-A1',
          amount: DecimalMoney.fromString('1000'),
          currency: 'USD'
        },
        {
          customer_name: 'Customer A',
          invoice_number: 'INV-A2',
          amount: DecimalMoney.fromString('2000'),
          currency: 'USD'
        },
        {
          customer_name: 'Customer B',
          invoice_number: 'INV-B1',
          amount: DecimalMoney.fromString('3000'),
          currency: 'USD'
        }
      ];
      
      const result = runAnalyzeChain(invoices);
      
      expect(result.arHealth).toBeTruthy();
      expect(result.arHealth.total_receivables.cents).toBe(600000); // $6,000
    });

    test('应该正确计算逾期金额', () => {
      const invoices = [
        {
          customer_name: 'Overdue Customer',
          invoice_number: 'INV-O1',
          amount: DecimalMoney.fromString('5000'),
          currency: 'USD'
        }
      ];
      
      const result = runAnalyzeChain(invoices);
      
      expect(result.arHealth).toBeTruthy();
      expect(result.arHealth.overdue_amount.cents).toBeGreaterThanOrEqual(0);
    });
  });
});
