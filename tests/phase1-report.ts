/**
 * 生成 Phase 1 验收报告
 * 人工可核对：Invoice | Outstanding | Days Overdue | Aging | Priority
 */

import { normalizeInvoices } from '../src/data-normalizer';
import { calculateARHealth } from '../src/ar-engine';
import { generateCollectionTasks } from '../src/priority-engine';
import { generateCollectionReport } from '../src/lib/report-generator';
import { generateTestInvoices } from './test-data';

const invoices = generateTestInvoices();
const normalized = normalizeInvoices(invoices);
const arReport = calculateARHealth(normalized);
const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);

console.log('\n' + '='.repeat(100));
console.log('Phase 1 验收报告 - 人工可核对结果');
console.log('='.repeat(100));

console.log('\n【测试数据汇总】');
console.log(`总发票数: ${normalized.length}`);
console.log(`总客户数: ${new Set(normalized.map(i => i.customer_name)).size}`);
console.log(`总应收金额: ${arReport.total_receivables.toString()}`);
console.log(`逾期金额: ${arReport.overdue_amount.toString()}`);
console.log(`逾期比例: ${arReport.overdue_ratio.toFixed(1)}%`);

console.log('\n【Top 5 Priority 详细】');
console.log('-'.repeat(100));
console.log('排名 | 发票号      | 客户             | 未收金额     | 逾期天数 | 账龄   | 优先级评分 | 优先级 | 原因');
console.log('-'.repeat(100));

tasks.forEach((task, idx) => {
  const inv = task.invoice;
  const aging = inv.days_overdue === 0 ? 'CURRENT' :
                inv.days_overdue <= 7 ? '1-7' :
                inv.days_overdue <= 30 ? '8-30' :
                inv.days_overdue <= 60 ? '31-60' :
                inv.days_overdue <= 90 ? '61-90' : '90+';
  console.log(
    `${String(idx + 1).padStart(4)} | ` +
    `${(inv.invoice_number || 'N/A').padEnd(11)} | ` +
    `${inv.customer_name.padEnd(14)} | ` +
    `${inv.outstanding_amount.toString().padStart(11)} | ` +
    `${String(inv.days_overdue).padStart(8)} | ` +
    `${aging.padEnd(6)} | ` +
    `${String(task.priority.priority_score).padStart(10)} | ` +
    `${task.priority.priority_level.padEnd(8)} | ` +
    `${task.reason}`
  );
});

console.log('\n【所有发票明细】');
console.log('-'.repeat(100));
console.log('发票号      | 客户             | 金额         | 已付       | 未收       | 逾期天数 | 状态');
console.log('-'.repeat(100));

normalized.forEach(inv => {
  console.log(
    `${(inv.invoice_number || 'N/A').padEnd(11)} | ` +
    `${inv.customer_name.padEnd(14)} | ` +
    `${inv.amount.toString().padStart(11)} | ` +
    `${inv.paid_amount.toString().padStart(10)} | ` +
    `${inv.outstanding_amount.toString().padStart(11)} | ` +
    `${String(inv.days_overdue).padStart(8)} | ` +
    `${inv.status}`
  );
});

console.log('\n【账龄分布】');
console.log('-'.repeat(80));
arReport.aging_distribution.forEach(d => {
  console.log(`${d.bucket.padEnd(8)} | ${d.amount.toString().padStart(11)} | ${d.percentage.toFixed(1)}% (${d.count}张)`);
});

console.log('\n【客户聚合】');
console.log('-'.repeat(80));
arReport.customer_aggregations.forEach(c => {
  console.log(`${c.customer_name.padEnd(14)} | 发票数: ${c.invoice_count} | 未收: ${c.total_outstanding.toString()} | 逾期: ${c.total_overdue.toString()}`);
});

console.log('\n' + '='.repeat(100));
