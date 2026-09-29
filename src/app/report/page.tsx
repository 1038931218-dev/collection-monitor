'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

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
  const m: Record<string, string> = { today: 'Today', within_3_days: 'Within 3 days', next_week: 'Next week', monitor: 'Monitor' };
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
        // Track priority viewed when report loads
        if (data.top_tasks.length > 0) {
          track('priority_viewed', { count: data.top_tasks.length });
        }
      } catch (e: any) {
        setError(e.message || 'Analysis failed, please try again');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <div className="container" style={{paddingTop:80, textAlign:'center', color:'var(--text-dim)'}}>Analyzing...</div>;
  if (error) return (
    <div className="container" style={{paddingTop:80}}>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => router.back()}>Go Back</button>
    </div>
  );
  if (!report) return null;

  return (
    <div className="container">
      <nav className="topnav">
        <span className="brand">AI Collection Manager</span>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary" style={{fontSize:13,padding:'6px 12px'}} onClick={() => router.push('/upload')}>Upload New</button>
        </div>
      </nav>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{marginBottom:4}}>AR Health Report</h1>
        <div style={{color:'var(--text-dim)',fontSize:13}}>{report.metadata.generated_at && new Date(report.metadata.generated_at).toLocaleString()} · {report.metadata.total_invoices} invoice{report.metadata.total_invoices !== 1 ? 's' : ''} · {report.metadata.total_customers} customer{report.metadata.total_customers !== 1 ? 's' : ''}</div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{marginBottom:32}}>
        <div className="stat">
          <div className="label">Total Receivables</div>
          <div className="value">{report.risk_metrics.total_receivables}</div>
        </div>
        <div className="stat">
          <div className="label">Overdue Amount</div>
          <div className="value danger">{report.risk_metrics.overdue_amount}</div>
        </div>
        <div className="stat">
          <div className="label">Overdue Ratio</div>
          <div className={`value ${report.risk_metrics.overdue_ratio > 30 ? 'danger' : report.risk_metrics.overdue_ratio > 15 ? 'warn' : 'ok'}`}>
            {report.risk_metrics.overdue_ratio}%
          </div>
        </div>
        <div className="stat">
          <div className="label">Avg Overdue</div>
          <div className="value">{report.risk_metrics.avg_days_overdue} days</div>
        </div>
      </div>

      {/* Aging distribution */}
      <h2 style={{fontSize:17, marginBottom:12}}>Aging Distribution</h2>
      <table style={{marginBottom:32, fontSize:14}}>
        <thead><tr><th>Bucket</th><th>Amount</th><th>%</th></tr></thead>
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
      <h2 style={{fontSize:17, marginBottom:12}}>Today's Priority Tasks ({report.top_tasks.length})</h2>
      {report.top_tasks.length === 0 && <p style={{color:'var(--text-dim)'}}>No overdue invoices found.</p>}
      {report.top_tasks.map((task, i) => (
        <TaskCard key={task.invoice.invoice_number ?? i} task={task} expanded={expandedId === task.invoice.invoice_number}
          onToggle={() => setExpandedId(expandedId === task.invoice.invoice_number ? null : task.invoice.invoice_number!)} />
      ))}

      {/* AI stats */}
      {report.ai_stats && (
        <div style={{marginTop:20, fontSize:12, color:'var(--text-dim)', textAlign:'center'}}>
          AI: {report.ai_stats.success} success / {report.ai_stats.failure} failure · Provider: {report.ai_stats.provider}
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
          <div style={{fontSize:12, color:'var(--text-dim)', marginTop:4}}>Score: {task.priority.priority_score}</div>
        </div>
      </div>
      <div className="task-meta">
        <span>Outstanding <strong>{task.invoice.outstanding_amount}</strong></span>
        <span>Overdue <strong>{task.invoice.days_overdue} days</strong></span>
        <span>Status <strong>{task.invoice.status}</strong></span>
      </div>
      <div style={{fontSize:13, color:'var(--text-dim)', marginBottom:8}}>{task.reason}</div>
      <button style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13,padding:0}} onClick={onToggle}>
        {expanded ? 'Collapse ▲' : 'View AI Analysis ▼'}
      </button>
      {expanded && task.ai_analysis && (
        <div className="ai-block">
          <div className="tag">AI Recommendation</div>
          <div style={{marginTop:6}}>{task.ai_analysis.summary}</div>
          <div style={{marginTop:8, fontSize:13, color:'var(--text-dim)'}}>
            Action: <strong style={{color:'var(--text)'}}>{task.ai_analysis.recommended_action.replace(/_/g,' ')}</strong>
            &nbsp;·&nbsp;Timing: <strong style={{color:'var(--text)'}}>{timingTag(task.ai_analysis.recommended_timing)}</strong>
            &nbsp;·&nbsp;Tone: <strong style={{color:'var(--text)'}}>{task.ai_analysis.message_tone}</strong>
          </div>
          <div style={{marginTop:12}}>
            <a href={`/tasks/${encodeURIComponent(task.invoice.invoice_number ?? `task-${task.invoice.customer_name}-${task.invoice.days_overdue}`)}`} className="btn btn-primary" style={{fontSize:13,padding:'6px 14px'}}>
              Generate Collection Message
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
