import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    console.log(`Received customers/redact webhook for ${shop}`);
    console.log("Customer redact request:", payload);

    // TODO: Implement logic to delete customer data
    // For now, we'll acknowledge receipt of the webhook
    // In production, you should:
    // 1. Delete any personal data you have stored for this customer
    // 2. Ensure the data is permanently removed from your database
    // 3. Log the deletion for compliance purposes

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};