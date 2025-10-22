import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * This route forces re-authentication if needed
 * Useful after app reinstall
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Try to authenticate
    await authenticate.admin(request);
    // If successful, redirect to main app
    return redirect("/app");
  } catch (error) {
    // If auth fails, Shopify will handle the redirect to OAuth
    throw error;
  }
};