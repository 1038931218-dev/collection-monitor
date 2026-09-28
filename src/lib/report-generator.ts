import { DecimalMoney } from '../lib/decimal';
import { NormalizedInvoice } from '../data-normalizer';
import { ARHealthReport } from '../ar-engine';
import { CollectionTask } from '../priority-engine';

// AR报告数据结构
export interface ARRiskMetrics {
  total_receivables: string;
  overdue_amount: string;
  overdue_ratio: string;
  avg_days_overdue: number;
  max_days_overdue: number;
}

// 单条账款详情
export interface InvoiceDetail {
  invoice_number?: string;
  customer_name: string;
  amount: string;
  paid_amount: string;
  outstanding_amount: string;
  days_overdue: number;
  priority_level: string;
  priority_score: number;
  reason: string;
  recommended_action: string;
}

// Top Priority列表
export interface TopPriorityList {
  total_count: number;
  items: InvoiceDetail[];
}

// AI分析结果
export interface AIAnalysis {
  summary: string;
  risk_assessment: string;
  key_findings: string[];
  recommendations: string[];
}

// 完整报告
export interface CollectionReport {
  metadata: {
    generated_at: string;
    total_invoices: number;
    total_customers: number;
  };
  risk_metrics: ARRiskMetrics;
  aging_distribution: {
    bucket: string;
    amount: string;
    percentage: string;
  }[];
  top_priority: TopPriorityList;
  ai_analysis: AIAnalysis;
}

// 生成报告
export function generateCollectionReport(
  invoices: NormalizedInvoice[],
  arHealth: ARHealthReport,
  topTasks: CollectionTask[]
): CollectionReport {
  // 风险指标
  const overdueInvoices = invoices.filter(inv => inv.is_overdue);
  const avgDaysOverdue = overdueInvoices.length > 0
    ? overdueInvoices.reduce((sum, inv) => sum + inv.days_overdue, 0) / overdueInvoices.length
    : 0;
  const maxDaysOverdue = Math.max(...invoices.map(inv => inv.days_overdue), 0);

  const riskMetrics: ARRiskMetrics = {
    total_receivables: arHealth.total_receivables.toString(),
    overdue_amount: arHealth.overdue_amount.toString(),
    overdue_ratio: `${arHealth.overdue_ratio.toFixed(1)}%`,
    avg_days_overdue: Math.round(avgDaysOverdue),
    max_days_overdue: maxDaysOverdue,
  };

  // 账龄分布
  const agingDistribution = arHealth.aging_distribution.map(d => ({
    bucket: d.bucket,
    amount: d.amount.toString(),
    percentage: `${d.percentage.toFixed(1)}%`,
  }));

  // Top Priority列表
  const topPriority: TopPriorityList = {
    total_count: topTasks.length,
    items: topTasks.map(task => ({
      invoice_number: task.invoice.invoice_number,
      customer_name: task.invoice.customer_name,
      amount: task.invoice.amount.toString(),
      paid_amount: task.invoice.paid_amount.toString(),
      outstanding_amount: task.invoice.outstanding_amount.toString(),
      days_overdue: task.invoice.days_overdue,
      priority_level: task.priority.priority_level,
      priority_score: task.priority.priority_score,
      reason: task.reason,
      recommended_action: task.recommended_action,
    })),
  };

  // AI分析（暂时使用占位符，Phase 4 接入真实AI）
  const aiAnalysis: AIAnalysis = {
    summary: generateSummary(arHealth, topTasks),
    risk_assessment: generateRiskAssessment(arHealth),
    key_findings: generateKeyFindings(invoices, arHealth),
    recommendations: generateRecommendations(topTasks),
  };

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      total_invoices: invoices.length,
      total_customers: new Set(invoices.map(inv => inv.customer_name)).size,
    },
    risk_metrics: riskMetrics,
    aging_distribution: agingDistribution,
    top_priority: topPriority,
    ai_analysis: aiAnalysis,
  };
}

function generateSummary(arHealth: ARHealthReport, topTasks: CollectionTask[]): string {
  const highPriority = topTasks.filter(t => t.priority.priority_level === 'HIGH').length;
  const mediumPriority = topTasks.filter(t => t.priority.priority_level === 'MEDIUM').length;
  
  return `当前应收账款${arHealth.total_receivables.toString()}，逾期${arHealth.overdue_ratio.toFixed(1)}%。建议重点关注${highPriority}个高风险账户和${mediumPriority}个中风险账户。`;
}

function generateRiskAssessment(arHealth: ARHealthReport): string {
  if (arHealth.overdue_ratio > 30) {
    return '高风险：逾期比例超过30%，需要立即采取行动';
  } else if (arHealth.overdue_ratio > 15) {
    return '中风险：逾期比例超过15%，建议加强催收力度';
  } else if (arHealth.overdue_ratio > 5) {
    return '低风险：逾期比例在5-15%之间，保持常规监控';
  } else {
    return '健康：逾期比例低于5%，财务状况良好';
  }
}

function generateKeyFindings(invoices: NormalizedInvoice[], arHealth: ARHealthReport): string[] {
  const findings: string[] = [];

  if (arHealth.overdue_amount.cents > 0) {
    findings.push(`逾期金额: ${arHealth.overdue_amount.toString()}`);
  }

  const currentAmount = arHealth.aging_distribution.find(d => d.bucket === 'CURRENT')?.amount || DecimalMoney.fromString('0');
  if (currentAmount.cents > 0) {
    findings.push(`当前到期金额: ${currentAmount.toString()}`);
  }

  const overdue90Plus = arHealth.aging_distribution.find(d => d.bucket === '90+')?.amount || DecimalMoney.fromString('0');
  if (overdue90Plus.cents > 0) {
    findings.push(`90天以上逾期: ${overdue90Plus.toString()}`);
  }

  return findings;
}

function generateRecommendations(topTasks: CollectionTask[]): string[] {
  const recommendations: string[] = [];

  const highPriority = topTasks.filter(t => t.priority.priority_level === 'HIGH');
  if (highPriority.length > 0) {
    recommendations.push(`立即跟进${highPriority.length}个高风险账户`);
  }

  const mediumPriority = topTasks.filter(t => t.priority.priority_level === 'MEDIUM');
  if (mediumPriority.length > 0) {
    recommendations.push(`本周内处理${mediumPriority.length}个中风险账户`);
  }

  recommendations.push('定期检查应收账款账龄分布');
  recommendations.push('与客户建立良好的沟通机制');

  return recommendations;
}
