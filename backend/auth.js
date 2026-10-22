/**
 * auth.js — JWT middleware and helper functions.
 *
 * authenticate  — Required-auth middleware. Rejects requests with missing / invalid tokens.
 * optionalAuth  — Optional-auth middleware. Attaches user if valid token present; continues otherwise.
 * requireRole   — Role-guard factory. Use after authenticate.
 *
 * Token storage:
 * Access tokens are stored as HTTP-only, Secure, SameSite=Strict cookies.
 * This prevents JavaScript access to the token (mitigating XSS token theft).
 * The cookie is cleared on logout.
 *
 * The user's role is embedded in the JWT payload, but every privileged route
 * re-validates the role from the token — the frontend cannot override it.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.error('[auth] FATAL: JWT_SECRET is not set. Set it in your .env file.');
  process.exit(1);
}

/**
 * Sign a new access token for a user.
 * @param {{ id, email, name, role }} user
 * @returns {string} signed JWT
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Set the access-token cookie on the response.
 * Production uses Secure + SameSite=Strict. Development omits Secure to allow http://localhost.
 */
function setTokenCookie(res, token) {
  res.cookie('fundit_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 1000, // 1 hour — longer than the token's 15 m lifetime for UX,
                              // but the token itself will reject after 15 m
  });
}

/** Clear the auth cookie (used on logout). */
function clearTokenCookie(res) {
  res.clearCookie('fundit_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
}

/**
 * Extract the token from either the cookie or the Authorization: Bearer header.
 * Cookie takes precedence.
 */
function extractToken(req) {
  if (req.cookies && req.cookies.fundit_token) {
    return req.cookies.fundit_token;
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/** Middleware: requires a valid JWT. Attaches decoded payload to req.user. */
function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

/** Middleware: attaches req.user if a valid token is present; otherwise just continues. */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    } catch (_) {
      // Invalid token is silently ignored for optional routes
    }
  }
  next();
}

/** Middleware factory: requires the authenticated user to have a specific role. */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { signToken, setTokenCookie, clearTokenCookie, authenticate, optionalAuth, requireRole };
