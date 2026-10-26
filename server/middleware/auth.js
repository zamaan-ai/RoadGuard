import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/**
 * Verifies a Bearer token if present and attaches `req.user`.
 * Does NOT reject requests without a token — routes that must be
 * protected use `requireAuth` below. This lets read-only dashboard
 * data stay publicly viewable (matches the original mock-data demo)
 * while write actions can be locked down.
 */
export function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Include an Authorization: Bearer <token> header.' });
  }
  next();
}
