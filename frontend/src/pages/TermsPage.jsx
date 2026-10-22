export default function TermsPage() {
  return (
    <div className="container" style={{ maxWidth: 760, padding: 'var(--space-12) var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-8)' }}>Terms of Use</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Acceptance</h2>
          <p>By using Fundit you agree to these terms. This is a capstone demo project. All payments use Razorpay test mode — no real money is collected.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Campaigns</h2>
          <p>Campaign owners are responsible for the accuracy of their campaign descriptions. Fundit administrators may close or remove campaigns that violate community standards.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Prohibited Content</h2>
          <p>Do not create campaigns for illegal activities, fraudulent causes, or misleading content. Violations will result in campaign removal and potential account suspension.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Limitation of Liability</h2>
          <p>Fundit is provided as-is for demonstration purposes. We are not liable for any losses arising from use of the platform.</p>
        </section>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Last updated: October 2026</p>
      </div>
    </div>
  );
}
