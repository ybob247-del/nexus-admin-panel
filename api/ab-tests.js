// API endpoint to fetch all A/B tests with statistics
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
    
    // Fetch all A/B tests with participant counts
    const [tests] = await connection.execute(`
      SELECT 
        t.id,
        t.test_name,
        t.description,
        t.variant_a_name,
        t.variant_b_name,
        t.traffic_split,
        t.status,
        t.created_at,
        t.completed_at,
        COUNT(DISTINCT p.user_id) as total_participants,
        SUM(CASE WHEN p.variant_assigned = 'A' THEN 1 ELSE 0 END) as variant_a_count,
        SUM(CASE WHEN p.variant_assigned = 'B' THEN 1 ELSE 0 END) as variant_b_count,
        SUM(CASE WHEN p.variant_assigned = 'A' AND p.converted = 1 THEN 1 ELSE 0 END) as variant_a_conversions,
        SUM(CASE WHEN p.variant_assigned = 'B' AND p.converted = 1 THEN 1 ELSE 0 END) as variant_b_conversions
      FROM ab_tests t
      LEFT JOIN ab_test_participants p ON t.id = p.test_id
      GROUP BY t.id, t.test_name, t.description, t.variant_a_name, t.variant_b_name, 
               t.traffic_split, t.status, t.created_at, t.completed_at
      ORDER BY 
        CASE WHEN t.status = 'active' THEN 0 ELSE 1 END,
        t.created_at DESC
    `);
    
    return res.status(200).json({
      success: true,
      data: tests
    });
    
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch A/B tests',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
