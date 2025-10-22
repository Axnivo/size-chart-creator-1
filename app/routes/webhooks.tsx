import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // The authenticate.webhook will automatically validate HMAC
    // If HMAC is invalid, it will throw an error
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    // Queue webhook processing for production (process async to respond quickly)
    // For now, we'll process synchronously but respond immediately
    
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        // Handle customer data request
        console.log("Customer data request:", payload);
        // TODO: In production, check if you store any data for this customer
        // If yes, compile the data and send it to the customer
        // If no, simply acknowledge the request
        break;

      case "CUSTOMERS_REDACT":
        // Handle customer redact request
        console.log("Customer redact request:", payload);
        // TODO: In production, delete any personal data for this customer
        // Ensure the data is permanently removed from your database
        // Log the deletion for compliance purposes
        break;

      case "SHOP_REDACT":
        // Handle shop redact request (48 hours after uninstall)
        console.log("Shop redact request:", payload);
        // Shopify handles data cleanup automatically
        // No external backend needed for GDPR compliance
        console.log(`Shop data cleanup acknowledged for: ${shop}`);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    // Always return 200 OK immediately
    return new Response(null, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    // Return 401 for invalid HMAC or authentication errors
    return new Response("Unauthorized", { 
      status: 401,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }
};