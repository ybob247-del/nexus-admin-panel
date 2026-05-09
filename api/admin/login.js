// api/admin/login.js
// Server-side admin authentication — bcrypt password check + JWT cookie

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!passwordHash || !jwtSecret) {
    console.error('Missing ADMIN_PASSWORD_HASH or JWT_SECRET env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Constant-time bcrypt comparison — prevents timing attacks
  const isValid = await bcrypt.compare(password, passwordHash);

  if (!isValid) {
    // Add a small delay to further deter brute-force
    await new Promise(r => setTimeout(r, 500));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Issue a short-lived JWT (8 hours)
  const token = jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    jwtSecret,
    { expiresIn: '8h' }
  );

  // Set as HttpOnly cookie (preferred) AND return in body for JS-based auth
  res.setHeader('Set-Cookie', [
    `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  ]);

  return res.status(200).json({ success: true, token });
}
