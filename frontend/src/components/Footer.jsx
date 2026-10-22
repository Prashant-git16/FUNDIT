import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__logo">🤝 Fundit</div>
            <p className="footer__tagline">
              Connecting people with causes that matter. Transparent, secure, and community-driven crowdfunding for India.
            </p>
          </div>

          <div>
            <p className="footer__col-title">Platform</p>
            <ul className="footer__links">
              <li><Link to="/explore" className="footer__link">Explore Campaigns</Link></li>
              <li><Link to="/create-campaign" className="footer__link">Start a Fundraiser</Link></li>
              <li><Link to="/about" className="footer__link">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer__col-title">Company</p>
            <ul className="footer__links">
              <li><Link to="/about" className="footer__link">About Fundit</Link></li>
              <li><Link to="/contact" className="footer__link">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer__col-title">Legal</p>
            <ul className="footer__links">
              <li><Link to="/privacy" className="footer__link">Privacy Policy</Link></li>
              <li><Link to="/terms" className="footer__link">Terms of Use</Link></li>
            </ul>
          </div>
        </div>

        <hr className="footer__divider" />

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Fundit. All rights reserved.</span>
          <span>Payments secured by Razorpay · Test mode</span>
        </div>
      </div>
    </footer>
  );
}
