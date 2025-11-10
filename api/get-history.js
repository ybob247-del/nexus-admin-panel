// API endpoint to fetch invite history
// This will be replaced with actual database queries in production

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Replace with actual database query
    // For now, return empty array (client will use localStorage)
    
    // In production, this would be:
    // const invites = await db.invites.find().sort({ timestamp: -1 }).limit(100);
    
    const invites = [];
    
    return res.status(200).json({
      success: true,
      invites: invites,
      total: invites.length
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({
      error: 'Failed to fetch invite history',
      details: error.message
    });
  }
}

