import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

/**
 * For Managed Pricing apps, redirect to Shopify's subscription page
 * This bypasses the Billing API and uses the proper managed pricing flow
 */
export async function redirectToSubscriptionPage(
  shop: string,
  host: string
): { redirectUrl: string } {
  // For managed pricing apps, we need to redirect to Shopify's subscription management
  // This URL will show the subscription plans configured in Partner Dashboard
  const redirectUrl = `https://${shop}/admin/charges/collections-creator/pricing_plans`;
  
  return { redirectUrl };
}

/**
 * Check if shop has an active subscription (for display purposes only)
 */
export async function checkSubscriptionStatus(
  admin: AdminApiContext,
  shop: string
): Promise<{ hasActiveSubscription: boolean; subscription?: any }> {
  try {
    const query = `#graphql
      query checkSubscription {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            name
            status
            test
            createdAt
            currentPeriodEnd
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const result = await response.json();
    
    const subscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];
    
    // Check for active subscription (including test subscriptions in dev)
    const hasActiveSubscription = subscriptions.length > 0 && 
      subscriptions.some((sub: any) => 
        sub.status === "ACTIVE" || sub.status === "PENDING"
      );

    // Get the first active subscription with details
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === "ACTIVE" || sub.status === "PENDING"
    );

    return {
      hasActiveSubscription,
      subscription: activeSubscription || subscriptions[0],
    };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { hasActiveSubscription: false };
  }
}