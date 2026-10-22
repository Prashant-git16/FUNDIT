export default function AboutPage() {
  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1 className="page-header__title">About Fundit</h1>
          <p className="page-header__subtitle">Our mission, values, and how we work</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 800, padding: 'var(--space-12) var(--space-6)' }}>
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
            What is Fundit?
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 'var(--text-lg)' }}>
            Fundit is a transparent crowdfunding platform built for India. We connect people who need support with communities that care — across healthcare, education, disaster relief, animal welfare, environmental causes, and shelter.
          </p>
        </section>

        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>Our Values</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            {[
              { icon: '🔍', title: 'Transparency', desc: 'Campaign owners can post expense reports with receipts so donors know where their money goes.' },
              { icon: '🔒', title: 'Security', desc: 'Payments are secured by Razorpay. We never store raw card details.' },
              { icon: '🤝', title: 'Community', desc: 'Every donation, large or small, makes a difference. We celebrate all supporters.' },
              { icon: '⚡', title: 'Simplicity', desc: 'Creating a campaign or donating takes minutes. No unnecessary complexity.' },
            ].map((v) => (
              <div key={v.title} className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>{v.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{v.title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>How It Works</h2>
          <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              'Create an account (email or Google sign-in).',
              'Start a campaign with a clear goal, description, and image.',
              'Share your campaign link with friends and on social media.',
              'Donors contribute via secure Razorpay checkout in test mode.',
              'Track your fundraising progress in real time on your dashboard.',
              'Post expense reports to keep donors informed and build trust.',
            ].map((step, i) => (
              <li key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--color-primary)' }}>Step {i + 1}:</strong> {step}
              </li>
            ))}
          </ol>
        </section>

        <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-6)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', borderRadius: 'var(--radius-xl)', textAlign: 'center', color: '#fff' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
            Ready to make a difference?
          </h3>
          <p style={{ opacity: 0.85, marginBottom: 'var(--space-5)' }}>
            Join thousands of changemakers on Fundit.
          </p>
          <a href="/create-campaign" className="btn btn-accent btn-lg">Start a Fundraiser</a>
        </div>
      </div>
    </>
  );
}
