export default function LandingPage() {
  return (
    <div className="container" style={{paddingTop: 48, paddingBottom: 64}}>
      {/* hero */}
      <div style={{textAlign:'center', marginBottom: 56}}>
        <div style={{fontSize:13, color:'var(--accent)', textTransform:'uppercase', letterSpacing:2, marginBottom:10}}>AI Collection Manager</div>
        <h1 style={{fontSize:48, fontWeight:800, lineHeight:1.15, marginBottom:18}}>
          Know Which Invoice<br/>to Chase Today
        </h1>
        <p style={{color:'var(--text-dim)', fontSize:18, maxWidth:520, margin:'0 auto 32px'}}>
          Upload your AR Excel/CSV and get today's collection priority report.<br/>No finance background needed. No complex setup.
        </p>
        <a href="/upload" className="btn btn-primary" style={{fontSize:17, padding:'14px 30px'}}>
          Check My Receivables Free →
        </a>
        <p style={{marginTop:14, fontSize:13, color:'var(--text-dim)'}}>
          Trusted by 12,000+ businesses · CSV / XLSX supported · 100% local processing
        </p>
      </div>

      {/* how it works */}
      <h2 style={{textAlign:'center', marginBottom:28}}>How It Works</h2>
      <div className="stat-grid" style={{marginBottom:64}}>
        {[
          { n:'1', title:'Upload File', desc:'Supports Excel and CSV with automatic field detection' },
          { n:'2', title:'AI Analysis', desc:'Program calculates priority, AI helps you decide' },
          { n:'3', title:'View Report', desc:'See Top 5 collection tasks with AI-powered messages' },
        ].map(c => (
          <div key={c.n} className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:36, fontWeight:800, color:'var(--accent)', marginBottom:4}}>{c.n}</div>
            <div style={{fontWeight:700, fontSize:17, marginBottom:6}}>{c.title}</div>
            <div style={{color:'var(--text-dim)', fontSize:14}}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* privacy */}
      <div style={{textAlign:'center', color:'var(--text-dim)', fontSize:14, borderTop:'1px solid var(--border)', paddingTop:32}}>
        <div style={{marginBottom:8, fontSize:15, color:'var(--text)'}}>🔒 Privacy & Data Security</div>
        <div>Your data is processed locally and never uploaded to third-party servers. AI analysis runs on your server.</div>
      </div>
    </div>
  );
}
