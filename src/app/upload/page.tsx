'use client';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

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
    if (!ALLOWED_EXT.includes(ext)) return 'Unsupported format. Please upload .csv / .xlsx / .xls';
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_SIZE_MB} MB`;
    return null;
  };

  const handleFile = async (file: File) => {
    setError('');
    const err = validateFile(file);
    if (err) { setError(err); return; }
    
    // Track upload started
    track('upload_started', { filename: file.name, size: file.size });
    
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
        throw new Error(j.error || 'Upload failed');
      }
      const j: ParsedData = await resp.json();
      if (j.errors && j.errors.length > 0) {
        setError(j.errors.slice(0, 3).join('; '));
        return;
      }
      if (j.invoices.length === 0) {
        setError('No valid invoice data detected. Please check your file content.');
        return;
      }
      if (j.invoices.length > MAX_ROWS) {
        setError(`Exceeds ${MAX_ROWS} row limit. Please split the file and re-upload.`);
        return;
      }
      sessionStorage.setItem('parsedInvoices', JSON.stringify(j));
      // Track upload completed
      track('upload_completed', { invoices: j.invoices.length });
      router.push('/mapping');
    } catch (e: any) {
      setError(e.message || 'Upload failed, please try again');
      setState('idle');
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="container" style={{maxWidth:640, paddingTop:40}}>
      <nav className="topnav"><span className="brand">AI Collection Manager</span><a href="/">Home</a></nav>
      <h1 style={{marginBottom:6}}>Upload AR File</h1>
      <p className="lead" style={{marginBottom:28}}>Supports CSV, Excel (.xlsx / .xls), max 10MB</p>

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
          {state === 'uploading' ? 'Processing...' : 'Click or drag file here'}
        </div>
        <div style={{fontSize:13, color:'var(--text-dim)'}}>
          {state === 'uploading' ? '' : `${ALLOWED_EXT.join(' / ')} format, ≤${MAX_SIZE_MB}MB, ≤${MAX_ROWS} rows`}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={onChange} />

      <div style={{marginTop:24, display:'flex', gap:10, alignItems:'center'}}>
        <span style={{fontSize:14, color:'var(--text-dim)'}}>Want to see a demo?</span>
        <button className="btn btn-secondary" style={{fontSize:13, padding:'8px 14px'}}
          onClick={() => { sessionStorage.removeItem('parsedInvoices'); router.push('/demo'); }}>
          View Demo
        </button>
      </div>
    </div>
  );
}
