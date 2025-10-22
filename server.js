import { createRequestHandler } from "@remix-run/express";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, "build");

const app = express();

// Increase timeout for Cloudflare/Render
app.use((req, res, next) => {
  // Set longer timeout for all requests
  req.setTimeout(120000); // 2 minutes
  res.setTimeout(120000); // 2 minutes
  next();
});

// Add CORS headers and cookie settings for Shopify embedded apps
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'ALLOWALL');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Override any Set-Cookie headers to include SameSite=None; Secure
  const originalSetHeader = res.setHeader;
  res.setHeader = function(name, value) {
    if (name.toLowerCase() === 'set-cookie') {
      if (Array.isArray(value)) {
        value = value.map(cookie => {
          if (!cookie.includes('SameSite=')) {
            return cookie + '; SameSite=None; Secure';
          }
          return cookie;
        });
      } else if (typeof value === 'string') {
        if (!value.includes('SameSite=')) {
          value = value + '; SameSite=None; Secure';
        }
      }
    }
    originalSetHeader.call(this, name, value);
  };
  
  next();
});

// Handle static assets
app.use(express.static(path.join(BUILD_DIR, "client")));

// Handle everything else with Remix
let requestHandler;
try {
  const build = await import(path.join(BUILD_DIR, "server/index.js"));
  requestHandler = createRequestHandler({
    build,
    mode: process.env.NODE_ENV,
  });
  console.log('✅ Remix build loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Remix build:', error.message);
  console.error('Build directory:', BUILD_DIR);
  process.exit(1);
}

// Health check endpoint - must be before catch-all
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'size-chart-creator-1',
    platform: 'Render'
  });
});

app.all("*", requestHandler);

const port = process.env.PORT || 3000;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`✅ Server ready at http://0.0.0.0:${port}`);
  console.log(`🌐 Public URL: https://${process.env.HOST || 'localhost'}:${port}`);
  
  // Keep-alive service for Render free tier
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    const APP_URL = process.env.SHOPIFY_APP_URL || 'https://size-chart-creator-1.onrender.com';
    console.log('🔥 Starting aggressive keep-alive service...');
    console.log(`📍 App URL: ${APP_URL}`);
    
    // Initial ping after 10 seconds
    setTimeout(async () => {
      try {
        const response = await fetch(`${APP_URL}/health`);
        console.log(`[Keep-Alive] Initial ping: ${response.ok ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error('[Keep-Alive] Initial ping error:', error.message);
      }
    }, 10000);
    
    // Aggressive pinging every 2 minutes (more frequent)
    setInterval(async () => {
      try {
        const response = await fetch(`${APP_URL}/health`);
        const now = new Date().toISOString();
        if (response.ok) {
          console.log(`✅ [Keep-Alive] Success at ${now}`);
        } else {
          console.warn(`⚠️ [Keep-Alive] Failed at ${now} - Status: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ [Keep-Alive] Error at ${new Date().toISOString()}:`, error.message);
      }
    }, 2 * 60 * 1000); // Every 2 minutes (more aggressive)
    
    // Also ping the main app URL
    setInterval(async () => {
      try {
        await fetch(APP_URL);
        console.log(`🏠 [Keep-Alive] Main app pinged at ${new Date().toISOString()}`);
      } catch (error) {
        // Silent fail for main app ping
      }
    }, 3 * 60 * 1000); // Every 3 minutes
  }
  
  console.log('');
  console.log('⚠️  IMPORTANT: To prevent 10-minute delays after reinstall:');
  console.log('📌 Set up external monitoring at UptimeRobot.com (FREE)');
  console.log('📌 Monitor URL: https://size-chart-creator-1.onrender.com/health');
  console.log('📌 See SETUP_MONITORING.md for instructions');
  console.log('');
});