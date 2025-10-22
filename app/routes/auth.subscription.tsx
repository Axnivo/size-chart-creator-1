import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * This route handles subscription initialization during app installation
 * For managed pricing apps, this should trigger the subscription selection
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  
  if (!session) {
    console.log("No session found in subscription auth");
    return redirect(`/app`);
  }
  
  console.log("Checking subscription requirements for shop:", session.shop);
  
  try {
    // For managed pricing apps, we need to check if there's a subscription
    // If not, the app should prompt during installation
    // This is handled by Shopify automatically for managed pricing
    
    // Check current installation for subscription
    const query = `#graphql
      query checkInstallation {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            status
            name
          }
        }
      }
    `;
    
    const response = await admin.graphql(query);
    const data = await response.json();
    
    console.log("Installation check:", JSON.stringify(data, null, 2));
    
    const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];
    
    if (subscriptions.length === 0) {
      console.log("No active subscriptions found - should prompt for payment");
      
      // For managed pricing, Shopify should handle this automatically
      // If we reach here without a subscription, there's a configuration issue
      console.error("WARNING: Managed pricing app installed without subscription!");
      console.error("This indicates a configuration issue in Partner Dashboard");
    }
    
  } catch (error) {
    console.error("Error checking subscription during auth:", error);
  }
  
  // Redirect back to the app
  return redirect(`/app?shop=${session.shop}`);
};