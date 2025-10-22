import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    console.log(`Received shop/redact webhook for ${shop}`);
    console.log("Shop redact request:", payload);

    // Shopify handles data cleanup automatically
    // No external backend needed for GDPR compliance
    console.log(`Shop data cleanup acknowledged for: ${shop}`);

    // Return 200 immediately
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};