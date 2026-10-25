import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-icon">🌱</span>
          <span>Fund</span>it
        </Link>

        {/* Hamburger for mobile */}
        <button
          className="navbar__hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Nav links */}
        <ul className={`navbar__links${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
          <li><NavLink to="/" className="navbar__link" end>Home</NavLink></li>
          <li><NavLink to="/explore" className="navbar__link">Explore</NavLink></li>
          <li><NavLink to="/about" className="navbar__link">About</NavLink></li>
          {user?.role === 'admin' && (
            <li><NavLink to="/admin" className="navbar__link">Admin</NavLink></li>
          )}
        </ul>

        {/* Auth actions */}
        <div className="navbar__actions">
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost btn-sm navbar__user-btn">
                <span>👤</span> {user.name.split(' ')[0]}
              </Link>
              <Link to="/create-campaign" className="btn btn-accent btn-sm">
                + Start Fundraiser
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm navbar__logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm navbar__login-btn">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
