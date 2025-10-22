import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  if (!session) {
    return json({ error: "No session found" }, { status: 401 });
  }

  const formData = await request.formData();
  const planType = formData.get("planType") as string;

  // For Managed Pricing apps, we redirect to Shopify's billing page
  // The actual subscription is handled by Shopify, not through the API
  
  // Construct the URL to Shopify's billing/subscription page
  // This will show the subscription plans you've configured in Partner Dashboard
  const billingUrl = `https://admin.shopify.com/store/${session.shop.replace('.myshopify.com', '')}/charges/collections-creator/pricing_plans`;
  
  return json({ 
    success: true, 
    redirectUrl: billingUrl,
    message: "Redirecting to Shopify billing..." 
  });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({ error: "Method not allowed" }, { status: 405 });
};