import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    try {
        const { payload, session, topic, shop } = await authenticate.webhook(request);
        console.log(`Received ${topic} webhook for ${shop}`);

        const current = payload.current as string[];
        if (session && session.accessToken) {
            // Shopify handles scope updates automatically
            // No need for external token storage
            console.log(`Scopes updated for shop: ${shop}`);
            console.log(`New scopes:`, current);
        }
        return new Response();
    } catch (error) {
        console.error("Webhook authentication failed:", error);
        return new Response("Unauthorized", { status: 401 });
    }
};