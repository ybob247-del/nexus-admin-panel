// API endpoint to fetch SMS analytics data
import mysql from 'mysql2/promise';

// Parse DATABASE_URL from environment
function parseDatabaseUrl(url) {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2],
    database: match[5],
    ssl: { rejectUnauthorized: true }
  };
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  
  try {
    // Connect to TiDB Cloud database
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    connection = await mysql.createConnection(dbConfig);
    
    // Fetch SMS campaign statistics
    const [campaigns] = await connection.execute(`
      SELECT 
        c.id,
        c.campaign_name,
        c.campaign_type,
        c.is_active,
        COUNT(s.id) as total_sends,
        SUM(CASE WHEN s.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM sms_campaigns c
      LEFT JOIN sms_campaign_sends s ON c.id = s.campaign_id
      GROUP BY c.id, c.campaign_name, c.campaign_type, c.is_active
      ORDER BY c.id
    `);
    
    // Fetch recent SMS sends
    const [recentSends] = await connection.execute(`
      SELECT 
        s.id,
        s.phone_number,
        s.message_content,
        s.status,
        s.sent_at,
        s.delivered_at,
        s.error_message,
        c.campaign_name
      FROM sms_campaign_sends s
      JOIN sms_campaigns c ON s.campaign_id = c.id
      ORDER BY s.sent_at DESC
      LIMIT 50
    `);
    
    // Fetch user SMS preferences statistics
    const [preferencesStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN JSON_EXTRACT(notification_preferences, '$.sms_enabled') = true THEN 1 ELSE 0 END) as sms_enabled,
        SUM(CASE WHEN JSON_EXTRACT(notification_preferences, '$.weekly_tips') = true THEN 1 ELSE 0 END) as weekly_tips_enabled,
        SUM(CASE WHEN JSON_EXTRACT(notification_preferences, '$.monthly_reminder') = true THEN 1 ELSE 0 END) as monthly_reminder_enabled
      FROM users
      WHERE notification_preferences IS NOT NULL
    `);
    
    // Calculate delivery rates
    const totalSent = campaigns.reduce((sum, c) => sum + parseInt(c.total_sends || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + parseInt(c.delivered || 0), 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + parseInt(c.failed || 0), 0);
    
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0;
    const failureRate = totalSent > 0 ? ((totalFailed / totalSent) * 100).toFixed(2) : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        campaigns: campaigns,
        recentSends: recentSends,
        preferencesStats: preferencesStats[0] || {},
        summary: {
          totalSent,
          totalDelivered,
          totalFailed,
          deliveryRate: parseFloat(deliveryRate),
          failureRate: parseFloat(failureRate)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching SMS analytics:', error);
    return res.status(500).json({
      error: 'Failed to fetch SMS analytics',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
