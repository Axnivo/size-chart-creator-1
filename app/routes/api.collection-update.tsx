import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Allow CORS for client-side requests
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return json({}, { headers });
  }

  try {
    // Try to get the session from the request
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    
    if (!shop) {
      return json({ 
        success: false, 
        error: "Shop parameter missing" 
      }, { headers });
    }

    // Get the admin client without full authentication
    const { admin } = await authenticate.admin(request);
    
    if (!admin) {
      return json({ 
        success: false, 
        error: "Unable to create admin client" 
      }, { headers });
    }

    const body = await request.json();
    const { collectionId, title, description, handle } = body;

    const mutation = `
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
            descriptionHtml
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input = {
      id: collectionId,
      title: title,
      descriptionHtml: description ? `<p>${description}</p>` : "",
      handle: handle
    };
    
    const response = await admin.graphql(mutation, {
      variables: { input },
    });
    
    const data = await response.json();
    
    if (data.data?.collectionUpdate?.userErrors?.length > 0) {
      return json({ 
        success: false, 
        error: data.data.collectionUpdate.userErrors[0].message 
      }, { headers });
    }
    
    if (data.data?.collectionUpdate?.collection) {
      return json({ 
        success: true,
        collection: data.data.collectionUpdate.collection
      }, { headers });
    }
    
    return json({ 
      success: false, 
      error: "Unexpected response from Shopify" 
    }, { headers });
    
  } catch (error) {
    console.error("API Update error:", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update collection" 
    }, { headers });
  }
};