// api/_auth.js
// Shared JWT authentication helper for all admin API routes
// Import and call verifyAdminToken(req, res) at the top of any protected handler

import jwt from 'jsonwebtoken';

/**
 * Verifies the admin JWT from Authorization header or cookie.
 * Returns { valid: true, decoded } on success, or sends 401 and returns { valid: false }.
 */
export function verifyAdminToken(req, res) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Server configuration error' });
    return { valid: false };
  }

  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token && req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=');
      acc[k] = v;
      return acc;
    }, {});
    token = cookies['admin_token'];
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return { valid: false };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return { valid: true, decoded };
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return { valid: false };
  }
}
