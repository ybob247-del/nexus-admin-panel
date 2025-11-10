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

    // Forward request to n8n webhook using native https module
    const https = require('https' );
    
    const n8nWebhookUrl = 'https://ybob247.app.n8n.cloud/webhook/3658ee4e-a522-4f57-ac3d-343f1fa15eff';
    const postData = JSON.stringify({ email, duration } );

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Make the request to n8n
    const n8nResponse = await new Promise((resolve, reject) => {
      const request = https.request(n8nWebhookUrl, options, (response ) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            body: data
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(postData);
      request.end();
    });

    if (n8nResponse.statusCode === 200) {
      return res.status(200).json({
        success: true,
        message: 'Beta invite sent successfully'
      });
    } else {
      throw new Error(`n8n webhook returned status ${n8nResponse.statusCode}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Failed to send invite',
      details: error.message
    });
  }
}
