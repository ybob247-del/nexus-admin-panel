// Test API endpoint to diagnose database connection issues
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    // Log environment variable (without sensitive data)
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return res.status(500).json({
        error: 'DATABASE_URL not set',
        env: Object.keys(process.env)
      });
    }

    // Parse DATABASE_URL
    const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const match = dbUrl.match(regex);
    
    if (!match) {
      return res.status(500).json({
        error: 'Invalid DATABASE_URL format',
        format: 'Expected: mysql://user:pass@host:port/database'
      });
    }

    const dbConfig = {
      host: match[3],
      port: parseInt(match[4]),
      user: match[1],
      password: match[2],
      database: match[5],
      ssl: { rejectUnauthorized: true }
    };

    // Test connection
    const connection = await mysql.createConnection(dbConfig);
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM sms_health_tips');
    
    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      tipCount: rows[0].count,
      dbInfo: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
      stack: error.stack
    });
  }
}
