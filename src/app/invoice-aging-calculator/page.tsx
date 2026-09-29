import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Invoice Aging Calculator - Free AR Aging Tool | Collection Monitor',
  description: 'Calculate your accounts receivable aging schedule in seconds. Upload your invoice data or use our free calculator to analyze AR aging by bucket. Understand overdue invoices and prioritize collections.',
  keywords: ['invoice aging calculator', 'accounts receivable aging', 'AR aging report', 'overdue invoice calculator', 'accounts receivable analysis'],
  openGraph: {
    title: 'Invoice Aging Calculator - Free AR Aging Tool',
    description: 'Calculate your accounts receivable aging schedule in seconds. Free tool for small businesses.',
    url: 'https://collection-monitor-nine.vercel.app/invoice-aging-calculator',
    siteName: 'Collection Monitor',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Invoice Aging Calculator - Free AR Aging Tool',
    description: 'Calculate your accounts receivable aging schedule in seconds.',
  },
  alternates: {
    canonical: 'https://collection-monitor-nine.vercel.app/invoice-aging-calculator',
  },
};

export default function InvoiceAgingCalculator() {
  return (
    <div className="container" style={{ maxWidth: 800, padding: '40px 20px' }}>
      {/* Navigation */}
      <nav style={{ marginBottom: 32 }}>
        <Link href="/" style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          ← Back to Collection Monitor
        </Link>
      </nav>

      {/* Hero Section */}
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
          Invoice Aging Calculator
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Calculate your accounts receivable aging schedule. Understand which invoices are overdue
          and prioritize your collection efforts.
        </p>
      </header>

      {/* What is Invoice Aging */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          What is Invoice Aging?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
          Invoice aging (also called Accounts Receivable Aging) is a method of organizing your
          outstanding invoices by how long they&apos;ve been unpaid. It helps you understand
          your cash flow position and prioritize which customers to contact first.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)', marginTop: 12 }}>
          The aging report categorizes invoices into buckets:
        </p>
        <ul style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text)', paddingLeft: 24 }}>
          <li><strong>Current (0-30 days):</strong> Invoices not yet due</li>
          <li><strong>1-30 days past due:</strong> Slightly overdue</li>
          <li><strong>31-60 days past due:</strong> Moderately overdue</li>
          <li><strong>61-90 days past due:</strong> Significantly overdue</li>
          <li><strong>90+ days past due:</strong> Critical - high risk of bad debt</li>
        </ul>
      </section>

      {/* How to Calculate */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          How to Calculate AR Aging
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
          To calculate your invoice aging:
        </p>
        <ol style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text)', paddingLeft: 24 }}>
          <li>Gather all outstanding invoices</li>
          <li>Note the invoice date and due date for each</li>
          <li>Calculate days past due = Today&apos;s date - Due date</li>
          <li>Categorize into aging buckets (0-30, 31-60, 61-90, 90+)</li>
          <li>Sum totals by bucket to see your AR aging report</li>
        </ol>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)', marginTop: 16 }}>
          <strong>Tip:</strong> Focus your collection efforts on 90+ day invoices first.
          These have the highest risk of becoming bad debt.
        </p>
      </section>

      {/* Why It Matters */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          Why Invoice Aging Matters
        </h2>
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="label">Cash Flow</div>
            <div className="value">Visibility</div>
          </div>
          <div className="stat">
            <div className="label">Bad Debt Risk</div>
            <div className="value danger">Reduce</div>
          </div>
          <div className="stat">
            <div className="label">Collection Priority</div>
            <div className="value warn">Focus</div>
          </div>
          <div className="stat">
            <div className="label">Customer Relationships</div>
            <div className="value ok">Improve</div>
          </div>
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
          Regular invoice aging analysis helps you:
        </p>
        <ul style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text)', paddingLeft: 24 }}>
          <li>Predict cash flow more accurately</li>
          <li>Identify problematic customers early</li>
          <li>Reduce days sales outstanding (DSO)</li>
          <li>Make informed credit decisions</li>
          <li>Improve relationships with timely follow-ups</li>
        </ul>
      </section>

      {/* CTA Section */}
      <section style={{ 
        background: 'var(--surface)', 
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '32px',
        textAlign: 'center',
        marginTop: 40
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          Try Our Free AR Aging Tool
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 24 }}>
          Upload your invoice Excel/CSV and get an instant aging report with AI-powered insights.
        </p>
        <Link href="/upload" className="btn btn-primary" style={{ fontSize: 17, padding: '14px 30px' }}>
          Get Your Aging Report Free →
        </Link>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 16 }}>
          No signup required · CSV & Excel supported · 100% local processing
        </p>
      </section>

      {/* FAQ Section */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
          Frequently Asked Questions
        </h2>
        
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            What is a good AR aging profile?
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
            A healthy AR aging profile typically has 80%+ of receivables in the Current and
            1-30 days past due buckets. Anything over 90 days past due should be less than 5%
            of total receivables.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            How often should I run an AR aging report?
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
            Small businesses should run their AR aging report at least monthly. Ideally,
            run it weekly to catch problems early. If you have significant overdue accounts,
            review daily.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            What&apos;s the difference between aging and DSO?
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
            AR aging shows the distribution of your receivables across time buckets.
            Days Sales Outstanding (DSO) is a single metric that represents the average
            number of days it takes to collect payment. Both are important for understanding
            your cash flow health.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            How do I prioritize which invoices to chase first?
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)' }}>
            Prioritize by: 1) Amount (largest first), 2) Age (oldest first), 3) Customer
            relationship value, 4) Likelihood of collection. Our tool combines these factors
            into an automated priority score.
          </p>
        </div>
      </section>
    </div>
  );
}
