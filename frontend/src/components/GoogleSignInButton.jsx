import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function GoogleSignInButton({ onError, from = '/dashboard' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If client ID is not defined in frontend env, fetch dynamically from backend /api/config
    if (!clientId) {
      api.get('/api/config')
        .then((cfg) => {
          if (cfg.googleClientId) setClientId(cfg.googleClientId);
        })
        .catch((err) => console.warn('[google-auth] Could not fetch public config:', err.message));
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script if not already present
    let script = document.getElementById('google-gsi-client');
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initGoogleBtn = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      } catch (err) {
        console.error('[google-auth] Initialization error:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleBtn();
    } else {
      // Check every 100ms for up to 3 seconds in case script is loading in head
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleBtn();
        }
      }, 100);
      const timer = setTimeout(() => clearInterval(interval), 3000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [clientId]);

  async function handleCredentialResponse(response) {
    if (!response || !response.credential) return;
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google', { idToken: response.credential });
      login(data.user);
      if (data.needsProfileCompletion) {
        navigate('/complete-profile', { replace: true, state: { from } });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('[google-auth] Sign-in error:', err);
      if (onError) onError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  if (!clientId) {
    return (
      <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-2)' }}>
        Google sign-in is available once configured. (Add <code>GOOGLE_CLIENT_ID</code> in <code>.env</code>)
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: 46 }}>
      {loading && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>
          Signing in with Google…
        </p>
      )}
      <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />
    </div>
  );
}
