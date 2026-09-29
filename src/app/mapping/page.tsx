'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RawInvoice {
  customer_name: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  amount: number;
  paid_amount?: number;
  currency?: string;
}

interface ParsedData {
  invoices: RawInvoice[];
  mapping: Record<string, string>;
  errors: string[];
}

const REQUIRED = ['customer_name', 'due_date', 'amount'];
const OPTIONAL = ['invoice_number', 'invoice_date', 'paid_amount', 'currency'];

export default function MappingPage() {
  const router = useRouter();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [data, setData] = useState<RawInvoice[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('parsedInvoices');
    if (!raw) { router.replace('/upload'); return; }
    try {
      const j: ParsedData = JSON.parse(raw);
      setMapping(j.mapping || {});
      setData(j.invoices || []);
      setErrors(j.errors || []);
      setLoaded(true);
    } catch { router.replace('/upload'); }
  }, [router]);

  const missing = REQUIRED.filter(f => !Object.values(mapping).includes(f));
  const detected = Object.values(mapping).filter(Boolean).length;

  const confirm = () => {
    if (missing.length > 0) return;
    sessionStorage.setItem('confirmedInvoices', JSON.stringify(data));
    router.push('/report');
  };

  if (loaded && missing.length > 0) {
    return (
      <div className="container" style={{maxWidth:560, paddingTop:40}}>
        <h1 style={{fontSize:24, marginBottom:8}}>需要您补充信息</h1>
        <div className="alert alert-warn">
          系统已自动识别大部分字段，但以下必需字段无法确认：
          <ul style={{margin:'8px 0 0', paddingLeft:18}}>
            {missing.map(m => <li key={m}>{m}</li>)}
          </ul>
          请检查文件是否包含：客户名称、到期日期、金额。
        </div>
        <button className="btn btn-secondary" onClick={() => router.replace('/upload')}>重新上传</button>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <div className="container" style={{maxWidth:560, paddingTop:40}}>
      <h1 style={{fontSize:24, marginBottom:4}}>确认字段映射</h1>
      <p className="lead" style={{marginBottom:24}}>
        我们已经自动识别了 {detected} 个字段。请确认下方映射正确后继续。
      </p>

      <div className="card" style={{marginBottom:16}}>
        <table style={{fontSize:13}}>
          <thead>
            <tr><th>原始列名</th><th>识别为</th></tr>
          </thead>
          <tbody>
            {Object.entries(mapping).map(([orig, std]) => (
              <tr key={orig}>
                <td>{orig}</td>
                <td><span className="badge badge-ai">{std}</span></td>
              </tr>
            ))}
            {detected === 0 && <tr><td colSpan={2} style={{color:'var(--text-dim)'}}>未识别到字段</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{fontSize:14, color:'var(--text-dim)', marginBottom:16}}>
        共 {data.length} 条发票记录。您可以直接确认进入报告，或回到上一步修改。
      </div>

      <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
        <button className="btn btn-primary" onClick={confirm}>确认并生成报告</button>
        <button className="btn btn-secondary" onClick={() => router.replace('/upload')}>重新上传</button>
      </div>
    </div>
  );
}
