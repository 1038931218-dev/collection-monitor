'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvoiceRow {
  customer_name: string;
  invoice_number?: string;
  amount: number;
  paid_amount?: number;
  outstanding_amount: number;
  days_overdue: number;
  status: string;
}

interface Task {
  invoice: InvoiceRow;
  priority: {
    priority_score: number;
    priority_level: 'LOW' | 'MEDIUM' | 'HIGH';
    overdue_score: number;
    amount_score: number;
    history_score: number;
    trend_score: number;
  };
  reason: string;
  recommended_action: string;
  ai_analysis?: {
    summary: string;
    reason: string;
    recommended_action: 'follow_up_now' | 'follow_up_later' | 'monitor' | 'review_account';
    recommended_timing: 'today' | 'within_3_days' | 'next_week' | 'monitor';
    message_tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM';
  };
  ai_stats?: { success: boolean; provider: string; latencyMs: number; timestamp: string };
}

interface Report {
  metadata: { generated_at: string; total_invoices: number; total_customers: number };
  risk_metrics: {
    total_receivables: string;
    overdue_amount: string;
    overdue_ratio: number;
    avg_days_overdue: number;
    max_days_overdue: number;
  };
  aging_distribution: Array<{ bucket: string; amount: string; percentage: number }>;
  top_tasks: Task[];
  ai_stats?: { total_calls: number; success: number; failure: number; provider: string };
}

function levelBadge(level: string) {
  const cls = level === 'HIGH' ? 'badge-high' : level === 'MEDIUM' ? 'badge-medium' : 'badge-low';
  return `<span class="badge ${cls}">${level}</span>`;
}

function timingTag(t: string) {
  const m: Record<string, string> = { today: '今天', within_3_days: '3天内', next_week: '下周', monitor: '观察' };
  return m[t] ?? t;
}

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('confirmedInvoices');
    if (!raw) { router.replace('/upload'); return; }
    (async () => {
      try {
        const invoices = JSON.parse(raw) as InvoiceRow[];
        const resp = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoices, topN: 5 }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: Report = await resp.json();
        setReport(data);
      } catch (e: any) {
        setError(e.message || '分析失败，请重试');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="container" style={{paddingTop:80, textAlign:'center', color:'var(--text-dim)'}}>分析中...</div>;
  if (error) return (
    <div className="container" style={{paddingTop:80}}>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => router.back()}>返回</button>
    </div>
  );
  if (!report) return null;

  return (
    <div className="container">
      <nav className="topnav">
        <span className="brand">AI收款管家</span>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary" style={{fontSize:13,padding:'6px 12px'}} onClick={() => router.push('/upload')}>重新上传</button>
        </div>
      </nav>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{marginBottom:4}}>应收账款报告</h1>
        <div style={{color:'var(--text-dim)',fontSize:13}}>{report.metadata.generated_at && new Date(report.metadata.generated_at).toLocaleString('zh-CN')} · {report.metadata.total_invoices} 张发票 · {report.metadata.total_customers} 个客户</div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{marginBottom:32}}>
        <div className="stat">
          <div className="label">应收总额</div>
          <div className="value">{report.risk_metrics.total_receivables}</div>
        </div>
        <div className="stat">
          <div className="label">逾期金额</div>
          <div className="value danger">{report.risk_metrics.overdue_amount}</div>
        </div>
        <div className="stat">
          <div className="label">逾期比例</div>
          <div className={`value ${report.risk_metrics.overdue_ratio > 30 ? 'danger' : report.risk_metrics.overdue_ratio > 15 ? 'warn' : 'ok'}`}>
            {report.risk_metrics.overdue_ratio}%
          </div>
        </div>
        <div className="stat">
          <div className="label">平均逾期</div>
          <div className="value">{report.risk_metrics.avg_days_overdue} 天</div>
        </div>
      </div>

      {/* Aging distribution */}
      <h2 style={{fontSize:17, marginBottom:12}}>账龄分布</h2>
      <table style={{marginBottom:32, fontSize:14}}>
        <thead><tr><th>区间</th><th>金额</th><th>占比</th></tr></thead>
        <tbody>
          {report.aging_distribution.map(d => (
            <tr key={d.bucket}>
              <td><span className="badge badge-low">{d.bucket}</span></td>
              <td style={{fontWeight:600}}>{d.amount}</td>
              <td style={{color:'var(--text-dim)'}}>{d.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Top Tasks */}
      <h2 style={{fontSize:17, marginBottom:12}}>今天最该收的 {report.top_tasks.length} 笔钱</h2>
      {report.top_tasks.length === 0 && <p style={{color:'var(--text-dim)'}}>暂无逾期账款。</p>}
      {report.top_tasks.map((task, i) => (
        <TaskCard key={task.invoice.invoice_number ?? i} task={task} expanded={expandedId === task.invoice.invoice_number}
          onToggle={() => setExpandedId(expandedId === task.invoice.invoice_number ? null : task.invoice.invoice_number!)} />
      ))}

      {/* AI stats */}
      {report.ai_stats && (
        <div style={{marginTop:20, fontSize:12, color:'var(--text-dim)', textAlign:'center'}}>
          AI 调用：{report.ai_stats.success} 成功 / {report.ai_stats.failure} 失败 · 使用 {report.ai_stats.provider}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, expanded, onToggle }: {
  task: Task; expanded: boolean; onToggle: () => void;
}) {
  const lvl = task.priority.priority_level;
  const lvlCls = lvl === 'HIGH' ? 'badge-high' : lvl === 'MEDIUM' ? 'badge-medium' : 'badge-low';
  return (
    <div className="task">
      <div className="task-head">
        <div>
          <div style={{fontWeight:700, fontSize:16}}>{task.invoice.customer_name}</div>
          {task.invoice.invoice_number && <div style={{fontSize:12, color:'var(--text-dim)'}}>{task.invoice.invoice_number}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <span className={`badge ${lvlCls}`} style={{fontSize:13}}>{lvl}</span>
          <div style={{fontSize:12, color:'var(--text-dim)', marginTop:4}}>得分 {task.priority.priority_score}</div>
        </div>
      </div>
      <div className="task-meta">
        <span>未收 <strong>{task.invoice.outstanding_amount}</strong></span>
        <span>逾期 <strong>{task.invoice.days_overdue} 天</strong></span>
        <span>状态 <strong>{task.invoice.status}</strong></span>
      </div>
      <div style={{fontSize:13, color:'var(--text-dim)', marginBottom:8}}>{task.reason}</div>
      <button style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13,padding:0}} onClick={onToggle}>
        {expanded ? '收起 ▲' : '查看 AI 分析 ▼'}
      </button>
      {expanded && task.ai_analysis && (
        <div className="ai-block">
          <div className="tag">AI Recommendation</div>
          <div style={{marginTop:6}}>{task.ai_analysis.summary}</div>
          <div style={{marginTop:8, fontSize:13, color:'var(--text-dim)'}}>
            建议行动：<strong style={{color:'var(--text)'}}>{task.ai_analysis.recommended_action.replace(/_/g,' ')}</strong>
            &nbsp;·&nbsp;时机：<strong style={{color:'var(--text)'}}>{timingTag(task.ai_analysis.recommended_timing)}</strong>
            &nbsp;·&nbsp;语气：<strong style={{color:'var(--text)'}}>{task.ai_analysis.message_tone}</strong>
          </div>
          <div style={{marginTop:12}}>
            <a href={`/tasks/${encodeURIComponent(task.invoice.invoice_number ?? `task-${task.invoice.customer_name}-${task.invoice.days_overdue}`)}`} className="btn btn-primary" style={{fontSize:13,padding:'6px 14px'}}>
              生成催款消息
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
