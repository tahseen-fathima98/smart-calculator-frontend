// Vercel Serverless Function - User Data Storage
// Uses Vercel KV (free tier) for persistent storage

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId } = req.method === 'GET' ? req.query : req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // GET - Retrieve user data
    if (req.method === 'GET') {
      // Try to get from KV store (if available)
      // Fallback to in-memory/mock data for free tier
      const userData = await getUserData(userId);
      
      if (userData) {
        return res.status(200).json(userData);
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    // POST - Save user data
    if (req.method === 'POST') {
      const { analytics, chatHistory } = req.body;

      if (!analytics && !chatHistory) {
        return res.status(400).json({ error: 'No data to save' });
      }

      const userData = {
        userId,
        analytics,
        chatHistory,
        lastUpdated: new Date().toISOString()
      };

      await saveUserData(userId, userData);

      return res.status(200).json({ 
        success: true,
        message: 'Data saved successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('User data error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
}

// Simple in-memory store (works for single instance, free tier)
// For production, upgrade to Vercel KV or Upstash Redis
const dataStore = new Map();

async function getUserData(userId) {
  // In production with Vercel KV:
  // const kv = await import('@vercel/kv');
  // return await kv.get(`user:${userId}`);
  
  // Free tier fallback - in-memory
  return dataStore.get(userId) || null;
}

async function saveUserData(userId, data) {
  // In production with Vercel KV:
  // const kv = await import('@vercel/kv');
  // await kv.set(`user:${userId}`, data, { ex: 2592000 }); // 30 days expiry
  
  // Free tier fallback - in-memory
  dataStore.set(userId, data);
  
  // Optional: Log to see data is being saved
  console.log(`Saved data for user: ${userId}, calculations: ${data.analytics?.totalCalculations}`);
}
