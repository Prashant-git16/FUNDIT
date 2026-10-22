export default function AboutPage() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="page-header__title">About Fundit</h1>
          <p className="page-header__subtitle">Our mission, values, and how we work</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1040, padding: 'var(--space-12) var(--space-6)' }}>
        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-4)', letterSpacing: '-0.02em' }}>
            What is Fundit?
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.15rem' }}>
            Fundit is a transparent crowdfunding platform built for India. We connect people who need support with communities that care — across healthcare, education, disaster relief, animal welfare, environmental causes, and shelter.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-6)', letterSpacing: '-0.02em' }}>
            Our Values
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {[
              {
                icon: '🔍',
                variant: '',
                title: 'Transparency',
                desc: 'Campaign organizers publish detailed expense breakdowns with receipts, ensuring every donor sees the tangible impact of their support.'
              },
              {
                icon: '🛡️',
                variant: 'icon-box--accent',
                title: 'Security',
                desc: 'Transactions are secured with server-side HMAC-SHA256 signature verification, encrypted cookies, and enterprise cloud protection.'
              },
              {
                icon: '🤝',
                variant: 'icon-box--purple',
                title: 'Community',
                desc: 'From ₹50 to ₹5,00,000, every single contribution counts. We celebrate generous changemakers uniting for social good.'
              },
              {
                icon: '⚡',
                variant: 'icon-box--blue',
                title: 'Simplicity',
                desc: 'Creating a campaign or donating takes under 60 seconds with an intuitive, clutter-free user interface across all screen sizes.'
              },
            ].map((v) => (
              <div key={v.title} className="card" style={{ padding: 'var(--space-8)' }}>
                <div className={`icon-box ${v.variant}`} style={{ marginBottom: 'var(--space-5)' }}>
                  {v.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
                  {v.title}
                </h3>
                <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-6)', letterSpacing: '-0.02em' }}>
            How It Works
          </h2>
          <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {[
              'Create an account (email or Google sign-in).',
              'Start a campaign with a clear goal, description, and image.',
              'Share your campaign link with friends and on social media.',
              'Donors contribute via secure Razorpay checkout (with simulated dev mode for testing).',
              'Track your fundraising progress in real time on your dashboard.',
              'Post expense reports to keep donors informed and build trust.',
            ].map((step, i) => (
              <li key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1.05rem' }}>
                <strong style={{ color: 'var(--color-primary)' }}>Step {i + 1}:</strong> {step}
              </li>
            ))}
          </ol>
        </section>

        <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-10) var(--space-8)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', borderRadius: 'var(--radius-xl)', textAlign: 'center', color: '#fff', boxShadow: '0 12px 30px rgba(15,118,110,0.3)' }}>
          <h3 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
            Ready to make a difference?
          </h3>
          <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)', fontSize: '1.1rem' }}>
            Join thousands of changemakers on Fundit.
          </p>
          <a href="/create-campaign" className="btn btn-accent btn-lg" style={{ fontWeight: 700, padding: '16px 36px', fontSize: '1.1rem' }}>
            Start a Fundraiser
          </a>
        </div>
      </div>
    </>
  );
}
