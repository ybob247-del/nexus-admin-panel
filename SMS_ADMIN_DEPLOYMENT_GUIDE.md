# SMS Admin Panel - Deployment Guide

## 🎯 What's New

The admin panel now includes **SMS Management** features:
- **SMS Analytics Dashboard** - Real-time delivery metrics, campaign performance
- **Health Tips Management** - CRUD interface for 30 evidence-based health tips
- **A/B Testing** - Placeholder for future optimization features

## 📁 New Files Added

1. `sms-admin.html` - SMS management interface (3 tabs)
2. `api/sms-analytics.js` - API endpoint for SMS analytics data
3. `api/health-tips.js` - API endpoint for health tips CRUD operations
4. `package.json` - Dependencies (mysql2)

## 🚀 Deployment Steps

### Step 1: Install Dependencies

```bash
cd /home/ubuntu/nexus-admin-panel
npm install
```

### Step 2: Add Environment Variable to Vercel

The SMS admin panel needs access to your TiDB Cloud database.

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/ybob247-del/nexus-admin-panel
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** `mysql://2bdzn41uM6mMWcv.97707ddd6929:H5SnzaA7CqYS45l06gin@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/3gcYftfyZmb2335Uoynmho`
   - **Environments:** Production, Preview, Development

**Option B: Via Vercel CLI**
```bash
vercel env add DATABASE_URL
# Paste the DATABASE_URL when prompted
```

### Step 3: Commit and Push Changes

```bash
git add .
git commit -m "Add SMS management features to admin panel"
git push origin main
```

### Step 4: Deploy to Vercel

Vercel will automatically deploy when you push to main. Or manually trigger:

```bash
vercel --prod
```

### Step 5: Test the SMS Admin Panel

1. Visit: https://nexus-admin-panel-liart.vercel.app/
2. Enter admin password
3. Click **📱 SMS Management →** tab
4. You should see:
   - SMS Analytics with delivery metrics
   - 30 health tips with citations
   - Campaign performance charts

## 🔗 Navigation Flow

```
Main Admin Panel (index.html)
├── 📧 Send Invite
├── 📋 History
├── 📊 Analytics
└── 📱 SMS Management → (links to sms-admin.html)
    ├── 📱 SMS Analytics
    ├── 💊 Health Tips
    └── 🧪 A/B Testing
```

## 🎨 Features

### SMS Analytics Tab
- **Summary Cards:** Total sent, delivery rate, SMS-enabled users, active campaigns
- **Campaign Performance Chart:** Bar chart showing delivered vs failed SMS
- **Campaigns Table:** All campaigns with send statistics
- **Recent Sends Table:** Last 50 SMS sends with status

### Health Tips Management Tab
- **Category Filter:** Filter tips by category (hormone_health, nutrition, exercise, etc.)
- **Add New Tip:** Modal form to create new tips with citations
- **Edit Tip:** Modify existing tips
- **Delete Tip:** Remove tips from library
- **Citation Display:** Shows journal, year, and full citation

### A/B Testing Tab
- Placeholder for future A/B testing features
- Will support testing SMS templates, timing, and content variations

## 🔐 Security

- Admin panel requires password authentication (existing system)
- API endpoints connect to database using environment variable
- SSL/TLS encryption for database connection
- No sensitive data exposed in client-side code

## 🐛 Troubleshooting

### Issue: "Failed to load analytics"
**Solution:** Check that DATABASE_URL is set in Vercel environment variables

### Issue: "Failed to load health tips"
**Solution:** Verify database migration was run successfully (COMBINED_SMS_MIGRATION_MYSQL.sql)

### Issue: Charts not displaying
**Solution:** Check browser console for Chart.js errors, ensure CDN is accessible

### Issue: API endpoints returning 500 errors
**Solution:** Check Vercel function logs for database connection errors

## 📊 Database Tables Used

- `sms_campaigns` - Campaign definitions
- `sms_campaign_sends` - SMS delivery tracking
- `sms_health_tips` - Health tips library with citations
- `users.notification_preferences` - User SMS preferences

## 🔄 Future Enhancements

- [ ] A/B testing implementation
- [ ] SMS cost tracking (Twilio API integration)
- [ ] User segmentation for campaigns
- [ ] Scheduled campaign management
- [ ] SMS template builder
- [ ] Real-time delivery status updates
- [ ] Export analytics to CSV
- [ ] Email notifications for failed SMS

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify DATABASE_URL is correct
3. Test database connection manually
4. Check browser console for client-side errors

---

**Deployment Date:** Nov 30, 2025
**Version:** 2.0.0
**Status:** Ready for production deployment
