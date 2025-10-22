import { json } from "@remix-run/node";

export async function loader() {
  return json({ 
    status: "healthy", 
    service: "collection-creator",
    platform: "Render",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

export default function HealthCheck() {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Collections Creator - Health Check</h1>
      <p>✅ App is running successfully on Render</p>
      <p>This endpoint keeps the app warm to prevent cold starts.</p>
      <hr />
      <p>Service Status: Healthy</p>
      <p>Platform: Render</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}