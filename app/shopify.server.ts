import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

// Use Memory session storage with extended TTL
const memoryStorage = new MemorySessionStorage();

// Track uninstalled shops to force re-authentication
const uninstalledShops = new Set<string>();

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: memoryStorage,
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/app/uninstalled",
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    SHOP_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      // Store session immediately after auth
      console.log('AfterAuth hook - session created for shop:', session.shop);
      
      // Remove shop from uninstalled list if it was there
      if (uninstalledShops.has(session.shop)) {
        console.log('Shop reinstalled, removing from uninstalled list:', session.shop);
        uninstalledShops.delete(session.shop);
      }
      
      // Clear any stale sessions for this shop before storing new one
      const existingSessions = await memoryStorage.findSessionsByShop(session.shop);
      for (const oldSession of existingSessions) {
        if (oldSession.id !== session.id) {
          await memoryStorage.deleteSession(oldSession.id);
        }
      }
      
      // Check for active subscriptions
      console.log('Checking for active subscriptions after auth...');
      try {
        const query = `#graphql
          query checkSubscription {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                test
              }
            }
          }
        `;
        
        const response = await admin.graphql(query);
        const data = await response.json();
        const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];
        
        console.log(`Found ${subscriptions.length} active subscriptions for ${session.shop}`);
        
        if (subscriptions.length === 0) {
          console.log('💳 No subscription found for ${session.shop}');
          console.log('User will need to subscribe to access app features.');
          // For managed pricing, subscription should be prompted during installation
          // If not, user will see subscription page in the app
        } else {
          console.log(`✅ Active subscription confirmed for ${session.shop}`);
        }
      } catch (error) {
        console.error('Error checking subscription in afterAuth:', error);
      }
      
      // Register webhooks after auth
      try {
        await shopify.registerWebhooks({ session });
      } catch (error) {
        console.error("Error registering webhooks:", error);
        // Don't throw - webhooks are optional
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: false,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = memoryStorage; // Export the memory storage instance
export const isShopUninstalled = (shop: string) => uninstalledShops.has(shop);
export const markShopUninstalled = (shop: string) => uninstalledShops.add(shop);
export const clearShopSessions = async (shop: string) => {
  const sessions = await memoryStorage.findSessionsByShop(shop);
  for (const session of sessions) {
    await memoryStorage.deleteSession(session.id);
  }
};
