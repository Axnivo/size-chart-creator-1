import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("=== AUTH CALLBACK TRIGGERED ===");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);
  
  try {
    const result = await authenticate.admin(request);
    console.log("Auth successful:", result);
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
};