# Enhanced Admin Panel Guide

**Last Updated:** May 2026
**Status:** Production — Server-Side Auth Active
**Company:** Nexus Biomedical Intelligence

---

## TABLE OF CONTENTS

1. [Authentication](#authentication)
2. [Features](#features)
3. [Deployment Instructions](#deployment-instructions)
4. [Usage Guide](#usage-guide)
5. [Database Integration](#database-integration-future)
6. [Troubleshooting](#troubleshooting)

---

## AUTHENTICATION

The admin panel uses **server-side authentication** with bcrypt password verification and JWT session tokens. There is no client-side password check — the password is never stored in source code.

### How to Log In

1. Navigate to the admin panel URL
2. Enter your admin password in the login form
3. Click **Access Admin Panel**
4. Your session is valid for **8 hours**

### How It Works

- The login form sends your password to `/api/admin/login` via POST
- The server compares it against the bcrypt hash in `ADMIN_PASSWORD_HASH` env var
- On success, a signed JWT is returned and stored in `localStorage`
- All subsequent API calls include the JWT in the `Authorization: Bearer` header
- The SMS Management page (`sms-admin.html`) verifies the JWT on load and redirects to login if missing or expired

### Resetting the Admin Password

1. Generate a new bcrypt hash at [bcrypt.online](https://bcrypt.online) (cost factor 12)
2. Go to Vercel → **nexus-admin-panel** → **Settings** → **Environment Variables**
3. Edit `ADMIN_PASSWORD_HASH` and paste the new hash
4. Push a commit to trigger a redeploy

---

## ENVIRONMENT VARIABLES

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password (cost factor 12) |
| `JWT_SECRET` | Secret key for signing JWT tokens (48+ random bytes) |
| `DATABASE_URL` | MySQL/TiDB connection string |

---

## FEATURES

### 1. Rate Limiting

**Limits:**
- **Hourly:** 10 invites per hour per IP
- **Daily:** 50 invites per day per IP

### 2. Invite History

- Search by email address
- Export to CSV
- Columns: Email, Duration, Date/Time, Status

### 3. Analytics Dashboard

- Total invites sent (all time)
- Weekly invites (last 7 days)
- Daily invites (today)
- Most popular duration
- Duration breakdown table

### 4. SMS Management (`sms-admin.html`)

- SMS campaign analytics
- Health tips management (add, edit, delete)
- A/B test management

---

## DEPLOYMENT INSTRUCTIONS

### Standard Deployment

```bash
git add .
git commit -m "Update admin panel"
git push origin main
```

Vercel auto-deploys on push to `main`. Live in ~30 seconds.

### Required Environment Variables

Set these in Vercel before deploying:

- `ADMIN_PASSWORD_HASH` — bcrypt hash of admin password
- `JWT_SECRET` — random 48+ character secret
- `DATABASE_URL` — TiDB/MySQL connection string

---

## USAGE GUIDE

### Accessing the Admin Panel

1. Navigate to the admin panel URL
2. Enter your admin password
3. Click **Access Admin Panel**

### Sending Beta Invites

1. Enter email address
2. Select duration (7, 30, 60, or 90 days)
3. Click **Send Beta Invite**

### Viewing Invite History

- Use the **History** tab
- Search by email in real-time
- Click **Export to CSV** to download

### Viewing Analytics

- Use the **Analytics** tab
- View totals, weekly/daily counts, and duration breakdown

---

## DATABASE INTEGRATION (FUTURE)

### Current Implementation

**Storage:** Browser localStorage (temporary — data lost if cache cleared)

### Recommended: Vercel Postgres

```javascript
import { sql } from '@vercel/postgres';

// Store invite
await sql`
  INSERT INTO invites (email, duration, status, ip_address)
  VALUES (${email}, ${duration}, 'sent', ${ip})
`;
```

### Alternative: Supabase (Free tier)

```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
await supabase.from('invites').insert({ email, duration, status: 'sent' });
```

---

## TROUBLESHOOTING

### Issue: Password not working

**Solution:**
- Verify `ADMIN_PASSWORD_HASH` is set correctly in Vercel env vars
- Regenerate the hash at [bcrypt.online](https://bcrypt.online) and update the env var
- Ensure cost factor 12 was used when generating the hash
- Trigger a redeploy after updating env vars

### Issue: "Authentication error" on login

**Solution:**
- Check browser console for network errors
- Verify `/api/admin/login` returns JSON (not HTML)
- Confirm `vercel.json` has the correct API rewrite rule

### Issue: SMS admin page redirects to login

**Solution:**
- This is expected behavior if your session has expired (8-hour limit)
- Log in again from the main admin panel

### Issue: History not showing

**Cause:** localStorage cleared or different browser

**Solution:** Use the same browser/device, or implement database storage

### Issue: Analytics showing 0

**Cause:** No invites sent yet, or localStorage cleared

**Solution:** Send a test invite and check the History tab

---

## API ENDPOINTS

All endpoints require `Authorization: Bearer <token>` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/login` | POST | Authenticate and receive JWT |
| `/api/admin/verify` | GET | Verify an existing JWT |
| `/api/send-invite` | POST | Send a beta invite email |
| `/api/send-invite-enhanced` | POST | Send invite (enhanced version) |
| `/api/get-history` | GET | Get invite history |
| `/api/sms-analytics` | GET | Get SMS campaign analytics |
| `/api/health-tips` | GET/POST/PUT/DELETE | Manage health tips |
| `/api/ab-tests` | GET | List A/B tests |
| `/api/ab-tests/create` | POST | Create a new A/B test |
| `/api/ab-tests/complete` | POST | Complete an A/B test |

---

## SECURITY NOTES

- Passwords are never stored in source code or client-side JavaScript
- All admin API routes return HTTP 401 without a valid JWT
- JWT tokens expire after 8 hours
- bcrypt cost factor 12 is used for password hashing
- The `sms-admin.html` page redirects unauthenticated users to login
