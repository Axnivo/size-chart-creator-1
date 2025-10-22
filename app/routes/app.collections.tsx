import { useEffect, useState, useCallback } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Badge,
  InlineStack,
  BlockStack,
  TextField,
  Modal,
  TextContainer,
  Banner,
  EmptyState,
  Thumbnail,
  Icon,
  Text,
} from "@shopify/polaris";
import {
  EditIcon,
  DeleteIcon,
  CollectionIcon,
  SearchIcon,
  PlusIcon,
  HomeIcon,
  RefreshIcon,
  ViewIcon,
  ImportIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    if (!session) {
      console.log('No session in app.collections, authentication required');
      throw new Response(null, { status: 401 });
    }
    
    // Add delay to ensure API is ready
    await new Promise(resolve => setTimeout(resolve, 1500));

  const query = `
    query getCollections {
      collections(first: 250) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            productsCount {
              count
            }
            image {
              url
              altText
            }
            updatedAt
          }
        }
      }
    }
  `;

  try {
    // Add retry logic
    let retries = 5;
    let response;
    let responseData;
    
    while (retries > 0) {
      try {
        response = await admin.graphql(query);
        responseData = await response.json();
        
        if (responseData && responseData.data && responseData.data.collections) {
          break;
        }
        
        if (responseData && !responseData.errors) {
          console.log('No collections in response, retrying...');
          throw new Error('Empty collections response');
        }
      } catch (retryError) {
        console.log(`Collections GraphQL retry ${6 - retries}/5`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw retryError;
        }
      }
    }
    
    // Check if the response has the expected structure
    if (responseData.data?.collections?.edges) {
      const collections = responseData.data.collections.edges.map((edge: any) => ({
        ...edge.node,
        productsCount: edge.node.productsCount?.count || 0
      }));
      return json({ collections, error: null });
    } else if (responseData.errors) {
      console.error("GraphQL errors:", responseData.errors);
      return json({ collections: [], error: responseData.errors[0]?.message || "Failed to fetch collections" });
    } else {
      console.error("Unexpected response structure:", responseData);
      return json({ collections: [], error: null });
    }
  } catch (graphqlError) {
    console.error("GraphQL error:", graphqlError);
    return json({ collections: [], error: graphqlError instanceof Error ? graphqlError.message : "Failed to fetch collections" });
  }
  } catch (error) {
    console.error("Authentication or request error:", error);
    return json({ collections: [], error: error instanceof Error ? error.message : "Authentication failed" });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const collectionId = formData.get("collectionId");

  if (actionType === "delete" && collectionId) {
    const mutation = `
      mutation collectionDelete($id: ID!) {
        collectionDelete(input: { id: $id }) {
          deletedCollectionId
          userErrors {
            field
            message
          }
        }
      }
    `;

    try {
      const response = await admin.graphql(mutation, {
        variables: { id: collectionId },
      });
      const data = await response.json();
      
      if (data.data.collectionDelete.userErrors.length > 0) {
        return json({ 
          success: false, 
          error: data.data.collectionDelete.userErrors[0].message 
        });
      }
      
      return json({ success: true });
    } catch (error) {
      return json({ success: false, error: "Failed to delete collection" });
    }
  }

  if (actionType === "update" && collectionId) {
    const title = formData.get("title");
    const description = formData.get("description");
    
    const mutation = `
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    try {
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            id: collectionId,
            title: title,
            descriptionHtml: description ? `<p>${description}</p>` : "",
          },
        },
      });
      const data = await response.json();
      
      if (data.data.collectionUpdate.userErrors.length > 0) {
        return json({ 
          success: false, 
          error: data.data.collectionUpdate.userErrors[0].message 
        });
      }
      
      return json({ success: true });
    } catch (error) {
      return json({ success: false, error: "Failed to update collection" });
    }
  }

  return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Authentication or action failed" });
  }
};

export default function Collections() {
  const { collections, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredCollections = collections?.filter((collection: any) => {
    if (!collection) return false;
    return (collection.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
           (collection.handle || "").toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleEdit = (collection: any) => {
    setEditingCollection(collection);
    setEditTitle(collection.title);
    setEditDescription(collection.descriptionHtml?.replace(/<[^>]*>/g, "") || "");
  };

  const handleSaveEdit = () => {
    if (editingCollection && editTitle.trim()) {
      fetcher.submit(
        {
          actionType: "update",
          collectionId: editingCollection.id,
          title: editTitle.trim(),
          description: editDescription.trim(),
        },
        { method: "POST" }
      );
      // Don't close modal immediately - wait for success response
    }
  };

  const handleDelete = (collectionId: string) => {
    fetcher.submit(
      {
        actionType: "delete",
        collectionId: collectionId,
      },
      { method: "POST" }
    );
    setDeleteConfirmId(null);
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      // Close modals on success
      setEditingCollection(null);
      setDeleteConfirmId(null);
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else if (fetcher.data?.error) {
      console.error("Action failed:", fetcher.data.error);
      // You could show a toast notification here instead of just logging
    }
  }, [fetcher.data]);

  const rows = filteredCollections.map((collection: any) => [
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {collection.image?.url ? (
        <Thumbnail
          source={collection.image.url}
          alt={collection.image.altText || collection.title}
          size="small"
        />
      ) : (
        <div style={{ 
          width: "40px", 
          height: "40px", 
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon source={CollectionIcon} tone="base" />
        </div>
      )}
      <div>
        <Text variant="bodyMd" fontWeight="semibold">
          {collection.title}
        </Text>
        <Text variant="bodySm" tone="subdued">
          /{collection.handle}
        </Text>
      </div>
    </div>,
    <Badge tone="info">{collection.productsCount || 0} products</Badge>,
    new Date(collection.updatedAt).toLocaleDateString(),
    <InlineStack gap="200" align="center">
      <Button
        size="slim"
        icon={EditIcon}
        onClick={() => handleEdit(collection)}
      >
        Edit
      </Button>
      <Button
        size="slim"
        tone="critical"
        icon={DeleteIcon}
        onClick={() => setDeleteConfirmId(collection.id)}
      >
        Delete
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page>
      <TitleBar 
        title="Collections" 
        primaryAction={{
          content: "Create Collection",
          onAction: () => navigate("/app")
        }}
        secondaryActions={[
          {
            content: "Home",
            onAction: () => navigate("/app")
          },
          {
            content: "View Collections",
            onAction: () => navigate("/app/collections-enhanced")
          },
          {
            content: "Bulk Operations",
            onAction: () => navigate("/app/bulk-operations")
          },
          {
            content: "SEO Tools",
            onAction: () => navigate("/app/seo-tools")
          }
        ]}
      />

      {/* Navigation Buttons */}
      <div style={{ width: "100%", marginBottom: "1rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        <Button variant="primary" size="large" fullWidth onClick={() => navigate("/app")}>
          <Icon source={HomeIcon} /> Home
        </Button>
        <Button size="large" fullWidth onClick={() => navigate("/app/collections-enhanced")}>View Collections</Button>
        <Button size="large" fullWidth onClick={() => navigate("/app/bulk-operations")}>Bulk Operations</Button>
        <Button size="large" fullWidth onClick={() => navigate("/app/seo-tools")}>SEO Tools</Button>
      </div>

      <div style={{ 
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
      }}>
        <BlockStack gap="200">
          <Text as="h1" variant="headingXl">
            <span style={{ color: "white", fontWeight: "bold" }}>
              Manage Collections
            </span>
          </Text>
          <Text variant="bodyLg">
            <span style={{ color: "rgba(255,255,255,0.9)" }}>
              View and manage all your store collections
            </span>
          </Text>
        </BlockStack>
      </div>

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <TextField
                label=""
                placeholder="Search collections..."
                value={searchQuery}
                onChange={setSearchQuery}
                prefix={<Icon source={SearchIcon} />}
                clearButton
                onClearButtonClick={() => setSearchQuery("")}
              />

              {error ? (
                <Banner tone="critical">
                  <p>{error}</p>
                </Banner>
              ) : null}
              
              {fetcher.data?.error && !fetcher.data?.success && (
                <Banner tone="critical">
                  <p>Action failed: {fetcher.data.error}</p>
                </Banner>
              )}

              {filteredCollections.length === 0 ? (
                <EmptyState
                  heading="No collections found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start by creating your first collection using the button below.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Collection", "Products", "Last Updated", "Actions"]}
                  rows={rows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">
                Collection Stats
              </Text>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="bodySm">Total Collections</Text>
                  <Badge tone="success">{collections?.length || 0}</Badge>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text variant="bodySm">Active Collections</Text>
                  <Badge tone="info">
                    {collections?.filter((c: any) => (c?.productsCount || 0) > 0).length || 0}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Edit Modal */}
      <Modal
        open={!!editingCollection}
        onClose={() => setEditingCollection(null)}
        title="Edit Collection"
        primaryAction={{
          content: "Save",
          onAction: handleSaveEdit,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setEditingCollection(null),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Collection Title"
              value={editTitle}
              onChange={setEditTitle}
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={setEditDescription}
              multiline={4}
              autoComplete="off"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Collection?"
        primaryAction={{
          content: "Delete",
          onAction: () => deleteConfirmId && handleDelete(deleteConfirmId),
          destructive: true,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteConfirmId(null),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Are you sure you want to delete this collection? This action cannot be undone.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>

      {/* Fixed Bottom Navigation Bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "1rem",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        backdropFilter: "blur(10px)",
        zIndex: 999,
        borderTop: "2px solid rgba(99, 102, 241, 0.3)",
      }}>
        <InlineStack align="center" gap="400">
          <Button
            size="large"
            icon={HomeIcon}
            onClick={() => navigate("/app")}
          >
            Home
          </Button>
          <Button
            size="large"
            variant="primary"
            icon={PlusIcon}
            onClick={() => navigate("/app")}
          >
            Create Collection
          </Button>
          <Button
            size="large"
            icon={RefreshIcon}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            size="large"
            icon={SearchIcon}
            onClick={() => {
              const searchField = document.querySelector('input[placeholder="Search collections..."]') as HTMLInputElement;
              if (searchField) {
                searchField.focus();
                searchField.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            Search
          </Button>
          <Button
            size="large"
            icon={ImportIcon}
            onClick={() => navigate("/app/collections-enhanced")}
          >
            Enhanced View
          </Button>
        </InlineStack>
      </div>

      {/* Add padding to prevent content from being hidden behind fixed nav */}
      <div style={{ paddingBottom: "100px" }}></div>
    </Page>
  );
}