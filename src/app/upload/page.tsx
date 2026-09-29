'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

type State = 'idle' | 'uploading' | 'parsed';

interface ParsedData {
  invoices: Array<{
    customer_name: string;
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
    amount: number;
    paid_amount?: number;
    currency?: string;
  }>;
  mapping: Record<string, string>;
  errors: string[];
}

const ALLOWED_EXT = ['.csv', '.xlsx', '.xls'];
const MAX_SIZE_MB = 10;
const MAX_ROWS = 10000;

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return '不支持的文件格式，请上传 .csv / .xlsx / .xls';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `文件太大（${(file.size / 1024 / 1024).toFixed(1)} MB），最大 ${MAX_SIZE_MB} MB`;
    return null;
  };

  const handleFile = async (file: File) => {
    setError('');
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setState('uploading');
    try {
      const buf = await file.arrayBuffer();
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: Buffer.from(buf).toString('base64') }),
      });
      if (!resp.ok) {
        const j = await resp.json();
        throw new Error(j.error || '上传失败');
      }
      const j: ParsedData = await resp.json();
      if (j.errors && j.errors.length > 0) {
        setError(j.errors.slice(0, 3).join('；'));
        return;
      }
      if (j.invoices.length === 0) {
        setError('未检测到有效发票数据，请检查文件内容。');
        return;
      }
      if (j.invoices.length > MAX_ROWS) {
        setError(`超过 ${MAX_ROWS} 行限制，请拆分文件后重新上传。`);
        return;
      }
      sessionStorage.setItem('parsedInvoices', JSON.stringify(j));
      router.push('/mapping');
    } catch (e: any) {
      setError(e.message || '上传失败，请重试');
      setState('idle');
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="container" style={{maxWidth:640, paddingTop:40}}>
      <nav className="topnav"><span className="brand">AI收款管家</span><a href="/">首页</a></nav>
      <h1 style={{marginBottom:6}}>上传应收账款文件</h1>
      <p className="lead" style={{marginBottom:28}}>支持 CSV、Excel (.xlsx / .xls)，最大 10MB</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '48px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(47,129,247,.07)' : 'transparent',
          transition: 'all .15s',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div style={{fontSize:40, marginBottom:12}}>📁</div>
        <div style={{fontSize:17, fontWeight:600, marginBottom:6}}>
          {state === 'uploading' ? '正在解析...' : '点击或拖拽文件到此处'}
        </div>
        <div style={{fontSize:13, color:'var(--text-dim)'}}>
          {state === 'uploading' ? '' : `${ALLOWED_EXT.join(' / ')} 格式，≤${MAX_SIZE_MB}MB，≤${MAX_ROWS}行`}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={onChange} />

      <div style={{marginTop:24, display:'flex', gap:10, alignItems:'center'}}>
        <span style={{fontSize:14, color:'var(--text-dim)'}}>想先看效果？</span>
        <button className="btn btn-secondary" style={{fontSize:13, padding:'8px 14px'}}
          onClick={() => { sessionStorage.removeItem('parsedInvoices'); router.push('/demo'); }}>
          查看示例
        </button>
      </div>
    </div>
  );
}
