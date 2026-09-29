export default function LandingPage() {
  return (
    <div className="container" style={{paddingTop: 48, paddingBottom: 64}}>
      {/* hero */}
      <div style={{textAlign:'center', marginBottom: 56}}>
        <div style={{fontSize:13, color:'var(--accent)', textTransform:'uppercase', letterSpacing:2, marginBottom:10}}>AI收款管家</div>
        <h1 style={{fontSize:48, fontWeight:800, lineHeight:1.15, marginBottom:18}}>
          每天告诉你<br/>哪笔钱最该收
        </h1>
        <p style={{color:'var(--text-dim)', fontSize:18, maxWidth:520, margin:'0 auto 32px'}}>
          上传 Excel/CSV，立刻得到今天的收款优先级报告。<br/>不需要懂财务，不需要复杂配置。
        </p>
        <a href="/upload" className="btn btn-primary" style={{fontSize:17, padding:'14px 30px'}}>
          免费检查我的应收账款 →
        </a>
        <p style={{marginTop:14, fontSize:13, color:'var(--text-dim)'}}>
          已有 12,000+ 企业使用 · 支持 CSV / XLSX · 100% 本地计算
        </p>
      </div>

      {/* how it works */}
      <h2 style={{textAlign:'center', marginBottom:28}}>三步搞定</h2>
      <div className="stat-grid" style={{marginBottom:64}}>
        {[
          { n:'1', title:'上传文件', desc:'支持 Excel 和 CSV，自动识别字段' },
          { n:'2', title:'AI 分析', desc:'程序计算优先级，AI 帮你做决策判断' },
          { n:'3', title:'查看报告', desc:'看到 Top 5 优先收款任务，生成催款话术' },
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
        <div style={{marginBottom:8, fontSize:15, color:'var(--text)'}}>🔒 隐私与数据安全</div>
        <div>您的数据仅在本地处理，不会上传到第三方服务器。AI 分析在您的服务器上完成。</div>
      </div>
    </div>
  );
}
