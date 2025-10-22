/**
 * Direct Shopify Admin API service for collection management
 * This replaces the Lambda backend with direct API calls
 */
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

interface CreateCollectionResponse {
  success: boolean;
  collection_id?: string;
  collection_handle?: string;
  error?: string;
}

/**
 * Create a collection directly using Shopify Admin API
 */
export async function createCollectionDirect(
  admin: AdminApiContext,
  collectionTitle: string,
  collectionDescription?: string
): Promise<CreateCollectionResponse> {
  try {
    console.log("Creating collection directly via Shopify Admin API...");
    console.log("Title:", collectionTitle);
    console.log("Description:", collectionDescription);

    // Create collection using GraphQL Admin API
    const response = await admin.graphql(
      `#graphql
        mutation collectionCreate($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            title: collectionTitle,
            description: collectionDescription || "Collection created via Collection Creator app",
            descriptionHtml: collectionDescription || "Collection created via Collection Creator app",
          },
        },
      },
    );

    const responseData = await response.json();
    console.log("GraphQL Response:", JSON.stringify(responseData, null, 2));

    if (responseData.data?.collectionCreate?.userErrors?.length > 0) {
      const errors = responseData.data.collectionCreate.userErrors;
      console.error("Collection creation errors:", errors);
      return {
        success: false,
        error: errors.map((e: any) => e.message).join(", "),
      };
    }

    const collection = responseData.data?.collectionCreate?.collection;
    if (!collection) {
      console.error("No collection data in response");
      return {
        success: false,
        error: "Failed to create collection - no data returned",
      };
    }

    // Extract numeric ID from GraphQL ID
    const collectionId = collection.id.replace("gid://shopify/Collection/", "");

    console.log("Collection created successfully:");
    console.log("- ID:", collectionId);
    console.log("- Handle:", collection.handle);
    console.log("- Title:", collection.title);

    return {
      success: true,
      collection_id: collectionId,
      collection_handle: collection.handle,
    };
  } catch (error) {
    console.error("Error creating collection via Shopify API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get collections from Shopify Admin API
 */
export async function getCollections(admin: AdminApiContext) {
  try {
    const response = await admin.graphql(
      `#graphql
        query getCollections($first: Int!) {
          collections(first: $first) {
            edges {
              node {
                id
                title
                handle
                description
                productsCount
                updatedAt
              }
            }
          }
        }`,
      {
        variables: {
          first: 50,
        },
      },
    );

    const responseData = await response.json();
    return responseData.data?.collections?.edges?.map((edge: any) => edge.node) || [];
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

/**
 * Delete a collection from Shopify Admin API
 */
export async function deleteCollection(admin: AdminApiContext, collectionId: string) {
  try {
    const response = await admin.graphql(
      `#graphql
        mutation collectionDelete($input: CollectionDeleteInput!) {
          collectionDelete(input: $input) {
            deletedCollectionId
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: `gid://shopify/Collection/${collectionId}`,
          },
        },
      },
    );

    const responseData = await response.json();
    
    if (responseData.data?.collectionDelete?.userErrors?.length > 0) {
      const errors = responseData.data.collectionDelete.userErrors;
      console.error("Collection deletion errors:", errors);
      return {
        success: false,
        error: errors.map((e: any) => e.message).join(", "),
      };
    }

    return {
      success: true,
      deletedId: responseData.data?.collectionDelete?.deletedCollectionId,
    };
  } catch (error) {
    console.error("Error deleting collection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}