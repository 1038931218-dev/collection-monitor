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
        // 从 sessionStorage 恢复 Top 5
        const raw = sessionStorage.getItem('aiReport');
        if (!raw) { router.replace('/upload'); return; }
        const report = JSON.parse(raw);
        const t = (report.top_tasks as Task[]).find(x => (x.invoice.invoice_number ?? `${x.invoice.customer_name}-${x.invoice.days_overdue}`) === decodeURIComponent(params.id));
        if (!t) { setError('未找到该任务'); setLoading(false); return; }
        setTask(t);
        setTone((t.ai_analysis?.message_tone as any) ?? 'PROFESSIONAL');
        setLoading(false);
      } catch {
        setError('加载失败，请重新上传');
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
      setError(e.message || '生成消息失败');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`主题：${draft.subject}\n\n${draft.message}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="container" style={{paddingTop:80,textAlign:'center',color:'var(--text-dim)'}}>加载中...</div>;
  if (error) return (
    <div className="container" style={{paddingTop:40}}>
      <div className="alert alert-error">{error}</div>
      <button className="btn btn-secondary" onClick={() => router.push('/report')}>返回报告</button>
    </div>
  );
  if (!task) return null;

  return (
    <div className="container" style={{maxWidth:640, paddingTop:40}}>
      <nav className="topnav"><span className="brand">AI收款管家</span><a href="/report">← 返回报告</a></nav>

      <h1 style={{fontSize:22, marginBottom:4}}>催款消息草稿</h1>
      <div style={{fontSize:14, color:'var(--text-dim)', marginBottom:24}}>
        {task.invoice.customer_name} · 未收 {task.invoice.outstanding_amount} · 逾期 {task.invoice.days_overdue} 天
      </div>

      {/* 确定性事实（程序计算，非 AI） */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontSize:12, fontWeight:700, color:'var(--text-dim)', marginBottom:8}}>数据事实（程序计算）</div>
        <div style={{fontSize:14}}>{task.reason}</div>
      </div>

      {/* AI 分析（明确标记） */}
      {task.ai_analysis && (
        <div className="card" style={{borderLeft:`3px solid var(--accent)`, marginBottom:16}}>
          <div style={{fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:8}}>AI Recommendation</div>
          <div style={{fontSize:14, marginBottom:8}}>{task.ai_analysis.summary}</div>
          <div style={{fontSize:13, color:'var(--text-dim)'}}>
            建议：{task.ai_analysis.recommended_action.replace(/_/g,' ')} · 时机：{task.ai_analysis.recommended_timing.replace(/_/g,' ')}
          </div>
        </div>
      )}

      {/* 语气选择 */}
      <div style={{fontSize:14, marginBottom:8}}>选择语气</div>
      <div className="tone-row">
        {(['FRIENDLY','PROFESSIONAL','FIRM'] as const).map(t => (
          <button key={t} className={`tone-btn ${tone === t ? 'active' : ''}`} onClick={() => setTone(t)}>{t}</button>
        ))}
      </div>

      <div style={{display:'flex', gap:10, margin:'16px 0 24px'}}>
        <button className="btn btn-primary" onClick={generate}>生成催款消息</button>
      </div>

      {draft && (
        <div className="msg-draft">
          {!draft.aiSuccess && <div className="alert alert-warn" style={{marginBottom:12}}>AI 服务不可用，已使用系统默认话术。</div>}
          <div className="subject">{draft.subject}</div>
          <div className="body">{draft.message}</div>
          <div className="copy-row">
            <button className="btn btn-secondary" style={{fontSize:13, padding:'6px 14px'}} onClick={copy}>
              {copied ? '✓ 已复制' : '复制消息'}
            </button>
            <span style={{fontSize:12, color:'var(--text-dim)'}}>请确认内容后再手动发送（本工具不自动发送）</span>
          </div>
        </div>
      )}
    </div>
  );
}
