import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate, markShopUninstalled, clearShopSessions } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    // Mark shop as uninstalled and clear sessions
    markShopUninstalled(shop);
    await clearShopSessions(shop);
    
    console.log(`App uninstalled for shop: ${shop} - sessions cleared`);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};