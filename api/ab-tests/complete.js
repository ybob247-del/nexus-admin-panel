// API endpoint to complete an A/B test
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
    const { test_id } = req.body;
    
    // Validate required fields
    if (!test_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing test_id'
      });
    }
    
    // Connect to TiDB Cloud database
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    connection = await mysql.createConnection(dbConfig);
    
    // Check if test exists and is active
    const [tests] = await connection.execute(
      'SELECT id, status FROM ab_tests WHERE id = ?',
      [test_id]
    );
    
    if (tests.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }
    
    if (tests[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Test is not active'
      });
    }
    
    // Update test status to completed
    await connection.execute(`
      UPDATE ab_tests 
      SET status = 'completed', completed_at = NOW()
      WHERE id = ?
    `, [test_id]);
    
    return res.status(200).json({
      success: true,
      message: 'Test completed successfully'
    });
    
  } catch (error) {
    console.error('Error completing A/B test:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete A/B test',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
