/**
 * Keep-alive service to prevent Render free tier from sleeping
 * This service pings the health endpoint every 5 minutes
 */

export function initKeepAlive() {
  // Only run in production on Render
  if (process.env.NODE_ENV !== 'production' || !process.env.RENDER) {
    console.log('Keep-alive service not started (not on Render production)');
    return;
  }

  const APP_URL = process.env.SHOPIFY_APP_URL || 'https://collection-creator.onrender.com';
  const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

  console.log('Starting keep-alive service...');
  console.log(`Will ping ${APP_URL}/health every 5 minutes`);

  // Initial ping after 30 seconds
  setTimeout(() => {
    pingHealth(APP_URL);
  }, 30000);

  // Regular pings every 5 minutes
  setInterval(() => {
    pingHealth(APP_URL);
  }, PING_INTERVAL);
}

async function pingHealth(appUrl: string) {
  try {
    const response = await fetch(`${appUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Collection-Creator-KeepAlive/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Keep-Alive] Health check successful at ${new Date().toISOString()}`);
      console.log(`[Keep-Alive] Uptime: ${data.uptime} seconds`);
    } else {
      console.error(`[Keep-Alive] Health check failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('[Keep-Alive] Error pinging health endpoint:', error);
  }
}