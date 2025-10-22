import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    console.log(`Received customers/data_request webhook for ${shop}`);
    console.log("Customer data request:", payload);

    // TODO: Implement logic to handle customer data requests
    // For now, we'll acknowledge receipt of the webhook
    // In production, you should:
    // 1. Check if you store any data for this customer
    // 2. If yes, compile the data and send it to the customer
    // 3. If no, simply acknowledge the request

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};