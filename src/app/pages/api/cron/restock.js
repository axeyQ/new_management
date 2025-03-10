// src/pages/api/cron/restock.js (for Next.js Pages Router if needed)
import runAutomaticRestock from '@/lib/cronService';

export default async function handler(req, res) {
  // Optional: Add authorization check using a secret token
  const authToken = req.headers['x-cron-auth-token'];
  if (process.env.CRON_SECRET && authToken !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  const result = await runAutomaticRestock();
  
  return res.status(result.success ? 200 : 500).json(result);
}