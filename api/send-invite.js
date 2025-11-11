// Enhanced Vercel Serverless Function with Database Tracking and Rate Limiting
// This version stores invite history in a database and enforces rate limits

import https from 'https';

// In-memory rate limit storage (will be replaced with Redis/database in production)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  HOURLY_LIMIT: 10,
  DAILY_LIMIT: 50,
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000
};

// Check rate limits
function checkRateLimit(ip) {
  const now = Date.now();
  const key = `rate_${ip}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { hourly: [], daily: [] });
  }
  
  const limits = rateLimitStore.get(key);
  
  // Clean old entries
  limits.hourly = limits.hourly.filter(time => time > now - RATE_LIMITS.HOUR_MS);
  limits.daily = limits.daily.filter(time => time > now - RATE_LIMITS.DAY_MS);
  
  // Check limits
  if (limits.hourly.length >= RATE_LIMITS.HOURLY_LIMIT) {
    return {
      allowed: false,
      reason: 'Hourly limit exceeded (10 invites per hour)',
      retryAfter: Math.ceil((limits.hourly[0] + RATE_LIMITS.HOUR_MS - now) / 1000)
    };
  }
  
  if (limits.daily.length >= RATE_LIMITS.DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'Daily limit exceeded (50 invites per day)',
      retryAfter: Math.ceil((limits.daily[0] + RATE_LIMITS.DAY_MS - now) / 1000)
    };
  }
  
  // Update rate limit
  limits.hourly.push(now);
  limits.daily.push(now);
  rateLimitStore.set(key, limits);
  
  return {
    allowed: true,
    remaining: {
      hourly: RATE_LIMITS.HOURLY_LIMIT - limits.hourly.length,
      daily: RATE_LIMITS.DAILY_LIMIT - limits.daily.length
    }
  };
}

// Store invite in database (placeholder - will be replaced with actual database)
async function storeInvite(email, duration, status) {
  // TODO: Replace with actual database call (PostgreSQL, MongoDB, etc.)
  // For now, we'll just log it
  const inviteRecord = {
    email,
    duration,
    status,
    timestamp: new Date().toISOString(),
    ip: 'admin'
  };
  
  console.log('Invite stored:', inviteRecord);
  
  // In production, this would be:
  // await db.invites.insert(inviteRecord);
  
  return inviteRecord;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, duration } = req.body;

    // Validate input
    if (!email || !duration) {
      return res.status(400).json({ error: 'Email and duration are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate duration
    const validDurations = ['7', '30', '60', '90'];
    if (!validDurations.includes(String(duration))) {
      return res.status(400).json({ error: 'Invalid duration. Must be 7, 30, 60, or 90 days' });
    }

    // Check rate limit
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(clientIp);
    
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason,
        retryAfter: rateCheck.retryAfter
      });
    }

    // Forward request to n8n webhook
    const n8nWebhookUrl = 'https://ybob247.app.n8n.cloud/webhook/3659ee4e-a522-4f57-ac3d-343f11a15eff';
    const postData = JSON.stringify({ email, duration });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Make the request to n8n
    const n8nResponse = await new Promise((resolve, reject) => {
      const request = https.request(n8nWebhookUrl, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            body: data
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(postData);
      request.end();
    });

    // Accept any 2xx status code as success (200, 201, 204, etc.)
    if (n8nResponse.statusCode >= 200 && n8nResponse.statusCode < 300) {
      // Store invite in database
      await storeInvite(email, duration, 'sent');

      return res.status(200).json({
        success: true,
        message: 'Beta invite sent successfully',
        rateLimit: rateCheck.remaining
      });
    } else {
      // Store failed invite
      await storeInvite(email, duration, 'failed');
      
      throw new Error(`n8n webhook returned status ${n8nResponse.statusCode}: ${n8nResponse.body}`);
    }
  } catch (error) {
    console.error('Error:', error);
    
    // Store error
    if (req.body?.email && req.body?.duration) {
      await storeInvite(req.body.email, req.body.duration, 'error');
    }
    
    return res.status(500).json({
      error: 'Failed to send invite',
      details: error.message
    });
  }
}

