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
  priority: { priority_score: number; priority_level: 'LOW' | 'MEDIUM' | 'HIGH' };
  reason: string;
  recommended_action: string;
  ai_analysis?: {
    summary: string;
    reason: string;
    recommended_action: string;
    recommended_timing: string;
    message_tone: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM';
  };
}

export default function MessagePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [tone, setTone] = useState<'FRIENDLY' | 'PROFESSIONAL' | 'FIRM'>('PROFESSIONAL');
  const [draft, setDraft] = useState<{ subject: string; message: string; aiSuccess: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Restore Top 5 from sessionStorage
        const raw = sessionStorage.getItem('aiReport');
        if (!raw) { router.replace('/upload'); return; }
        const report = JSON.parse(raw);
        const t = (report.top_tasks as Task[]).find(x => (x.invoice.invoice_number ?? `${x.invoice.customer_name}-${x.invoice.days_overdue}`) === decodeURIComponent(params.id));
        if (!t) { setError('Task not found'); setLoading(false); return; }
        setTask(t);
        setTone((t.ai_analysis?.message_tone as any) ?? 'PROFESSIONAL');
        setLoading(false);
      } catch {
        setError('Failed to load, please re-upload');
        setLoading(false);
      }
    })();
  }, [params.id, router]);

  const generate = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, tone }),
      });
      const j = await resp.json();
      if (j.error) throw new Error(j.error);
      setDraft({ subject: j.subject, message: j.message, aiSuccess: j.success });
    } catch (e: any) {
      setError(e.message || 'Failed to generate message');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.message}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="container" style={{paddingTop:80,textAlign:'center',color:'var(--text-dim)'}}>Loading...</div>;
  if (error) return (
    <div className="container" style={{paddingTop:40}}>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => router.push('/report')}>Back to Report</button>
    </div>
  );
  if (!task) return null;

  return (
    <div className="container" style={{maxWidth:640, paddingTop:40}}>
      <nav className="topnav"><span className="brand">AI Collection Manager</span><a href="/report">← Back to Report</a></nav>

      <h1 style={{fontSize:22, marginBottom:4}}>Collection Message Draft</h1>
      <div style={{fontSize:14, color:'var(--text-dim)', marginBottom:24}}>
        {task.invoice.customer_name} · Outstanding {task.invoice.outstanding_amount} · Overdue {task.invoice.days_overdue} days
      </div>

      {/* Deterministic facts (program calculated, not AI) */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:12, fontWeight:700, color:'var(--text-dim)', marginBottom:8}}>Data Facts (Program Calculated)</div>
        <div style={{fontSize:14}}>{task.reason}</div>
      </div>

      {/* AI Analysis (clearly marked) */}
      {task.ai_analysis && (
        <div className="card" style={{borderLeft:`3px solid var(--accent)`, marginBottom:16}}>
          <div style={{fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:8}}>AI Recommendation</div>
          <div style={{fontSize:14, marginBottom:8}}>{task.ai_analysis.summary}</div>
          <div style={{fontSize:13, color:'var(--text-dim)'}}>
            Action: {task.ai_analysis.recommended_action.replace(/_/g,' ')} · Timing: {task.ai_analysis.recommended_timing.replace(/_/g,' ')}
          </div>
        </div>
      )}

      {/* Tone selection */}
      <div style={{fontSize:14, marginBottom:8}}>Select Tone</div>
      <div className="tone-row">
        {(['FRIENDLY','PROFESSIONAL','FIRM'] as const).map(t => (
          <button key={t} className={`tone-btn ${tone === t ? 'active' : ''}`} onClick={() => setTone(t)}>{t}</button>
        ))}
      </div>

      <div style={{display:'flex', gap:10, margin:'16px 0 24px'}}>
        <button className="btn btn-primary" onClick={generate}>Generate Collection Message</button>
      </div>

      {draft && (
        <div className="msg-draft">
          {!draft.aiSuccess && <div className="alert alert-warn" style={{marginBottom:12}}>AI service unavailable, using default template.</div>}
          <div className="subject">{draft.subject}</div>
          <div className="body">{draft.message}</div>
          <div className="copy-row">
            <button className="btn btn-secondary" style={{fontSize:13, padding:'6px 14px'}} onClick={copy}>
              {copied ? '✓ Copied' : 'Copy Message'}
            </button>
            <span style={{fontSize:12, color:'var(--text-dim)'}}>Please review before sending manually (this tool does not auto-send)</span>
          </div>
        </div>
      )}
    </div>
  );
}
