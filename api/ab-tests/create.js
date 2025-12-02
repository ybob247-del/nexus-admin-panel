// API endpoint to create a new A/B test
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  
  try {
    const { test_name, description, variant_a_name, variant_b_name, traffic_split } = req.body;
    
    // Validate required fields
    if (!test_name || !description || !variant_a_name || !variant_b_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate traffic split
    const split = parseInt(traffic_split) || 50;
    if (split < 10 || split > 90) {
      return res.status(400).json({
        success: false,
        error: 'Traffic split must be between 10 and 90'
      });
    }
    
    // Connect to TiDB Cloud database
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    connection = await mysql.createConnection(dbConfig);
    
    // Insert new A/B test
    const [result] = await connection.execute(`
      INSERT INTO ab_tests 
        (test_name, description, variant_a_name, variant_b_name, traffic_split, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', NOW())
    `, [test_name, description, variant_a_name, variant_b_name, split]);
    
    return res.status(200).json({
      success: true,
      data: {
        id: result.insertId,
        test_name,
        description,
        variant_a_name,
        variant_b_name,
        traffic_split: split,
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create A/B test',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
