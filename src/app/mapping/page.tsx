'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

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
    // Track report generation started
    track('report_generated', { invoices: data.length });
    router.push('/report');
  };

  if (loaded && missing.length > 0) {
    return (
      <div className="container" style={{maxWidth:560, paddingTop:40}}>
        <h1 style={{fontSize:24, marginBottom:8}}>Missing Required Fields</h1>
        <div className="alert alert-warn">
          We automatically detected most fields, but the following required fields could not be identified:
          <ul style={{margin:'8px 0 0', paddingLeft:18}}>
            {missing.map(m => <li key={m}>{m}</li>)}
          </ul>
          Please check that your file contains: Customer Name, Due Date, and Amount.
        </div>
        <button className="btn btn-secondary" onClick={() => router.replace('/upload')}>Upload Again</button>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <div className="container" style={{maxWidth:560, paddingTop:40}}>
      <h1 style={{fontSize:24, marginBottom:4}}>Confirm Field Mapping</h1>
      <p className="lead" style={{marginBottom:24}}>
        We automatically detected {detected} field{detected !== 1 ? 's' : ''}. Please confirm the mapping below.
      </p>

      <div className="card" style={{marginBottom:16}}>
        <table style={{fontSize:13}}>
          <thead>
            <tr><th>Original Column</th><th>Detect ed As</th></tr>
          </thead>
          <tbody>
            {Object.entries(mapping).map(([orig, std]) => (
              <tr key={orig}>
                <td>{orig}</td>
                <td><span className="badge badge-ai">{std}</span></td>
              </tr>
            ))}
            {detected === 0 && <tr><td colSpan={2} style={{color:'var(--text-dim)'}}>No fields detected</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{fontSize:14, color:'var(--text-dim)', marginBottom:16}}>
        {data.length} invoice record{data.length !== 1 ? 's' : ''} found. You can confirm and generate the report, or go back to modify.
      </div>

      <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
        <button className="btn btn-primary" onClick={confirm}>Confirm & Generate Report</button>
        <button className="btn btn-secondary" onClick={() => router.replace('/upload')}>Upload Again</button>
      </div>
    </div>
  );
}
