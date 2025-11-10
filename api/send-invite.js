// Vercel Serverless Function to forward beta invite requests to n8n
// This solves CORS issues by acting as a server-side proxy

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

    // Forward request to n8n webhook
    const n8nWebhookUrl = 'https://ybob247.app.n8n.cloud/webhook/3658ee4e-a522-4f57-ac3d-343f1fa15eff';
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        duration
      } )
    });

    if (response.ok) {
      return res.status(200).json({ 
        success: true, 
        message: 'Beta invite sent successfully' 
      });
    } else {
      throw new Error('n8n webhook failed');
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to send invite',
      details: error.message 
    });
  }
}
