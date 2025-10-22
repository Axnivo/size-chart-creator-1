import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  
  if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
    console.log(`Subscription update for shop ${shop}:`, payload);
    
    // Handle subscription status changes
    const subscription = payload as any;
    
    if (subscription.status === "CANCELLED" || subscription.status === "EXPIRED") {
      console.log(`Subscription ${subscription.status} for shop ${shop}`);
      // You could store this status in a database or cache
      // For now, the hasActiveSubscription check will handle it
    }
    
    if (subscription.status === "ACTIVE") {
      console.log(`Subscription activated for shop ${shop}`);
    }
  }
  
  return new Response(null, { status: 200 });
};