import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// This route warms up the GraphQL API after reinstall
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    if (!session) {
      return json({ warmed: false, error: "No session" });
    }
    
    // Simple query to warm up the API
    const warmupQuery = `
      query warmup {
        shop {
          name
          currencyCode
        }
      }
    `;
    
    // Try to execute a simple query to warm up the connection
    try {
      const response = await admin.graphql(warmupQuery);
      const data = await response.json();
      
      console.log('API warmed up for shop:', session.shop);
      
      return json({ 
        warmed: true, 
        shop: session.shop,
        ready: true 
      });
    } catch (error) {
      console.error('Warmup failed:', error);
      return json({ 
        warmed: false, 
        error: "API not ready yet",
        retry: true 
      });
    }
  } catch (error) {
    return json({ 
      warmed: false, 
      error: "Authentication required" 
    });
  }
};