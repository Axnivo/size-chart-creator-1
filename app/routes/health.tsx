import { json } from "@remix-run/node";

export async function loader() {
  const requiredEnvVars = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET", 
    "SESSION_SECRET",
    "APP_URL"
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  return json({ 
    status: "healthy", 
    service: "size-chart-creator",
    platform: "Render",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || "3000",
    appUrl: process.env.APP_URL || process.env.SHOPIFY_APP_URL || "not set",
    hasSessionSecret: !!process.env.SESSION_SECRET,
    hasShopifyCredentials: !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    missingEnvironmentVariables: missingVars.length > 0 ? missingVars : null,
    ready: missingVars.length === 0
  });
}

export default function HealthCheck() {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Size Chart Creator - Health Check</h1>
      <p>✅ App is running successfully on Render</p>
      <p>This endpoint helps diagnose deployment issues.</p>
      <hr />
      <p>Service Status: Healthy</p>
      <p>Platform: Render</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Check <a href="/health" target="_blank">/health</a> endpoint for detailed environment status</p>
    </div>
  );
}