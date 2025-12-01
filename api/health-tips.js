// API endpoint to manage SMS health tips
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
  let connection;
  
  try {
    // Connect to TiDB Cloud database
    const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    connection = await mysql.createConnection(dbConfig);
    
    // GET - Fetch all health tips
    if (req.method === 'GET') {
      const [tips] = await connection.execute(`
        SELECT 
          id,
          tip_content,
          category,
          citation,
          source_journal,
          publication_year,
          is_active,
          last_sent_at,
          created_at
        FROM sms_health_tips
        ORDER BY id ASC
      `);
      
      // Get category statistics
      const [categoryStats] = await connection.execute(`
        SELECT 
          category,
          COUNT(*) as count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
        FROM sms_health_tips
        GROUP BY category
        ORDER BY count DESC
      `);
      
      return res.status(200).json({
        success: true,
        tips: tips,
        categoryStats: categoryStats,
        total: tips.length
      });
    }
    
    // POST - Create new health tip
    if (req.method === 'POST') {
      const { tip_content, category, citation, source_journal, publication_year, is_active } = req.body;
      
      if (!tip_content || !category) {
        return res.status(400).json({ error: 'tip_content and category are required' });
      }
      
      const [result] = await connection.execute(`
        INSERT INTO sms_health_tips 
        (tip_content, category, citation, source_journal, publication_year, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [tip_content, category, citation || null, source_journal || null, publication_year || null, is_active !== false]);
      
      return res.status(201).json({
        success: true,
        message: 'Health tip created successfully',
        tipId: result.insertId
      });
    }
    
    // PUT - Update existing health tip
    if (req.method === 'PUT') {
      const { id, tip_content, category, citation, source_journal, publication_year, is_active } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      
      const [result] = await connection.execute(`
        UPDATE sms_health_tips 
        SET 
          tip_content = COALESCE(?, tip_content),
          category = COALESCE(?, category),
          citation = ?,
          source_journal = ?,
          publication_year = ?,
          is_active = COALESCE(?, is_active)
        WHERE id = ?
      `, [tip_content, category, citation, source_journal, publication_year, is_active, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Health tip not found' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Health tip updated successfully'
      });
    }
    
    // DELETE - Delete health tip
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      
      const [result] = await connection.execute(`
        DELETE FROM sms_health_tips WHERE id = ?
      `, [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Health tip not found' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Health tip deleted successfully'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Error managing health tips:', error);
    return res.status(500).json({
      error: 'Failed to manage health tips',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
