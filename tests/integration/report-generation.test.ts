import { generateCollectionReport } from '../../src/lib/report-generator';
import { calculateARHealth } from '../../src/ar-engine';
import { generateCollectionTasks } from '../../src/priority-engine';
import { normalizeInvoices } from '../../src/data-normalizer';
import { generateTestInvoices } from '../test-data';

describe('Report Generator', () => {
  test('应该生成完整的AR健康报告', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const report = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, report.customer_aggregations, 5);
    
    const collectionReport = generateCollectionReport(normalized, report, tasks);
    
    // 验证报告结构
    expect(collectionReport.metadata).toBeDefined();
    expect(collectionReport.risk_metrics).toBeDefined();
    expect(collectionReport.aging_distribution).toBeDefined();
    expect(collectionReport.top_priority).toBeDefined();
    expect(collectionReport.ai_analysis).toBeDefined();
    
    // 验证数据
    expect(collectionReport.metadata.total_invoices).toBe(normalized.length);
    expect(collectionReport.top_priority.items.length).toBe(5);
  });

  test('报告应该包含正确的风险指标', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const arReport = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
    
    const report = generateCollectionReport(normalized, arReport, tasks);
    
    // 验证风险指标
    expect(report.risk_metrics.total_receivables).toContain('$');
    expect(report.risk_metrics.overdue_ratio).toContain('%');
    expect(parseFloat(report.risk_metrics.overdue_ratio)).toBeGreaterThan(0);
  });

  test('Top Priority应该按优先级排序', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const arReport = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
    
    const report = generateCollectionReport(normalized, arReport, tasks);
    
    // 验证排序
    for (let i = 1; i < report.top_priority.items.length; i++) {
      expect(report.top_priority.items[i].priority_score).toBeLessThanOrEqual(
        report.top_priority.items[i - 1].priority_score
      );
    }
  });

  test('应该包含AI分析（占位符）', () => {
    const invoices = generateTestInvoices();
    const normalized = normalizeInvoices(invoices);
    const arReport = calculateARHealth(normalized);
    const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
    
    const report = generateCollectionReport(normalized, arReport, tasks);
    
    expect(report.ai_analysis.summary).toBeTruthy();
    expect(report.ai_analysis.risk_assessment).toBeTruthy();
    expect(report.ai_analysis.key_findings.length).toBeGreaterThan(0);
    expect(report.ai_analysis.recommendations.length).toBeGreaterThan(0);
  });

  test('报告生成应该稳定（多次运行一致）', () => {
    const invoices = generateTestInvoices();
    
    const report1 = generateTestReport(invoices);
    const report2 = generateTestReport(invoices);
    
    expect(report1.risk_metrics.total_receivables).toBe(report2.risk_metrics.total_receivables);
    expect(report1.risk_metrics.overdue_ratio).toBe(report2.risk_metrics.overdue_ratio);
    expect(report1.top_priority.items.length).toBe(report2.top_priority.items.length);
  });
});

function generateTestReport(invoices: any[]) {
  const normalized = normalizeInvoices(invoices);
  const arReport = calculateARHealth(normalized);
  const tasks = generateCollectionTasks(normalized, arReport.customer_aggregations, 5);
  return generateCollectionReport(normalized, arReport, tasks);
}
