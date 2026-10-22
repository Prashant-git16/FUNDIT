export default function PrivacyPage() {
  return (
    <div className="container" style={{ maxWidth: 760, padding: 'var(--space-12) var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-8)' }}>Privacy Policy</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Data We Collect</h2>
          <p>We collect your name and email when you register. We store records of donations you make, including amount and date. Passwords are stored as one-way bcrypt hashes — we cannot recover your password.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>How We Use Your Data</h2>
          <p>Your data is used to operate your account, process donations, display your campaign activity, and improve the platform. We do not sell your personal data to third parties.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Payments</h2>
          <p>Payments are processed by Razorpay. Fundit does not store raw card numbers or bank credentials. Razorpay's privacy policy applies to payment processing.</p>
        </section>
        <section>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Anonymous Donations</h2>
          <p>If you choose to donate anonymously, your name is not shown on the public campaign page. Your identity is still stored in our database for fraud prevention and audit purposes.</p>
        </section>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Last updated: October 2026</p>
      </div>
    </div>
  );
}
