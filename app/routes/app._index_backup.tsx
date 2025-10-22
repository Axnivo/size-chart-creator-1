import { useEffect, useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  TextField,
  InlineStack,
  Banner,
  List,
  Badge,
  Icon,
  Divider,
  ProgressBar,
  RadioButton,
  Checkbox,
  Select,
  EmptyState,
  Thumbnail,
  DropZone,
} from "@shopify/polaris";
import {
  CollectionIcon,
  StarOutlineIcon,
  CheckIcon,
  AlertTriangleIcon,
  MagicIcon,
  SearchIcon,
  ImageIcon,
  ProductIcon,
  ViewIcon,
  RefreshIcon,
  PlusIcon,
  HomeIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import appStyles from "../styles/app.css?url";

export const links = () => [{ rel: "stylesheet", href: appStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Get some stats for the dashboard
  const stats = {
    totalCollections: Math.floor(Math.random() * 100) + 50,
    recentCollections: Math.floor(Math.random() * 10) + 1,
    popularCategory: "Summer Collection",
  };
  
  return json({ stats });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const collectionTitle = formData.get("title");
  const collectionDescription = formData.get("description");
  const collectionType = formData.get("collectionType");
  const seoTitle = formData.get("seoTitle");
  const seoDescription = formData.get("seoDescription");
  const handle = formData.get("handle");

  if (!collectionTitle || typeof collectionTitle !== "string") {
    return json(
      { error: "Collection name is required" },
      { status: 400 }
    );
  }

  if (!session?.shop) {
    return json(
      { error: "Shop domain not found in session" },
      { status: 401 }
    );
  }

  try {
    const mutation = `
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
            handle
            descriptionHtml
            seo {
              title
              description
            }
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables: any = {
      input: {
        title: collectionTitle.trim(),
        descriptionHtml: collectionDescription ? 
          `${collectionDescription}` : 
          "",
      },
    };

    // Add SEO fields if provided
    if (seoTitle || seoDescription) {
      variables.input.seo = {};
      if (seoTitle) variables.input.seo.title = seoTitle;
      if (seoDescription) variables.input.seo.description = seoDescription;
    }

    // Add handle if provided
    if (handle) {
      variables.input.handle = handle;
    }

    const response = await admin.graphql(mutation, { variables });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseJson = await response.json();
    
    if (responseJson?.errors) {
      const errorMessages = responseJson.errors.map((e: any) => 
        `${e.message} (${e.extensions?.code || 'unknown'})`
      );
      throw new Error(`GraphQL errors: ${errorMessages.join(", ")}`);
    }

    const data = responseJson?.data;
    if (!data) {
      throw new Error("No data returned from GraphQL API");
    }

    const collectionCreate = data.collectionCreate;
    
    if (collectionCreate.userErrors && collectionCreate.userErrors.length > 0) {
      const errors = collectionCreate.userErrors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
      throw new Error(`Validation errors: ${errors}`);
    }

    const collection = collectionCreate.collection;
    
    if (!collection) {
      throw new Error("Collection was not created successfully");
    }

    return json({
      success: true,
      collection: {
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
        url: `https://${session.shop}/admin/collections/${collection.id.split('/').pop()}`
      },
    });
  } catch (error) {
    let errorMessage = "Failed to create collection. Please try again.";
    
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('scope') || msg.includes('permission')) {
        errorMessage = "App doesn't have permission to create collections.";
      } else if (msg.includes('authentication') || msg.includes('unauthorized')) {
        errorMessage = "Authentication failed. Please try logging out and back in.";
      } else if (msg.includes('network') || msg.includes('fetch')) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return json(
      { 
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const { stats } = fetcher.data || {};
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionType, setCollectionType] = useState("manual");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [handle, setHandle] = useState("");
  const [salesChannels, setSalesChannels] = useState({
    online: true,
    pos: false,
  });
  const [inputError, setInputError] = useState("");
  const [creationProgress, setCreationProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showSeoPreview, setShowSeoPreview] = useState(false);

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  const handleSubmit = useCallback(() => {
    if (!collectionName.trim()) {
      setInputError("Collection name is required");
      return;
    }
    setInputError("");
    setCreationProgress(0);
    
    const formData: any = {
      title: collectionName,
      description: collectionDescription,
      collectionType: collectionType,
    };

    if (seoTitle) formData.seoTitle = seoTitle;
    if (seoDescription) formData.seoDescription = seoDescription;
    if (handle) formData.handle = handle;

    fetcher.submit(formData, { method: "POST" });
  }, [collectionName, collectionDescription, collectionType, seoTitle, seoDescription, handle, fetcher]);

  // Auto-generate handle from title
  useEffect(() => {
    if (collectionName && !handle) {
      const autoHandle = collectionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setHandle(autoHandle);
    }
  }, [collectionName, handle]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCreationProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(interval);
    } else if (fetcher.data?.success) {
      setCreationProgress(100);
      setCollectionName("");
      setCollectionDescription("");
      setSeoTitle("");
      setSeoDescription("");
      setHandle("");
      setCollectionType("manual");
      shopify.toast.show(`✨ Collection '${fetcher.data.collection.title}' created successfully!`);
      setTimeout(() => setCreationProgress(0), 2000);
    }
  }, [fetcher.data, shopify, isLoading]);

  return (
    <Page>
      <TitleBar title="Add Collection">
        <button variant="primary" onClick={() => navigate("/app/collections")}>
          View Collections
        </button>
      </TitleBar>
      
      <div style={{ 
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
        padding: "1rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
      }}>
        <InlineStack align="space-between">
          <InlineStack gap="300">
            <div style={{ 
              background: "rgba(255,255,255,0.2)", 
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
            }}>
              <Icon source={MagicIcon} tone="base" />
            </div>
            <BlockStack gap="100">
              <Text as="h2" variant="headingLg" tone="inherit">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  Create Collection
                </span>
              </Text>
              <Text variant="bodySm">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Add a new collection to organize your products
                </span>
              </Text>
            </BlockStack>
          </InlineStack>
          <InlineStack gap="300">
            <Button
              variant="secondary"
              size="large"
              onClick={() => navigate("/app/collections")}
              icon={ViewIcon}
            >
              View Collections
            </Button>
            <Button
              variant="primary"
              tone="success"
              size="large"
              loading={isLoading}
              onClick={handleSubmit}
              disabled={!collectionName.trim()}
              icon={MagicIcon}
            >
              Create Collection
            </Button>
          </InlineStack>
        </InlineStack>
      </div>

      <BlockStack gap="500">
        {creationProgress > 0 && creationProgress < 100 && (
          <Box paddingBlockEnd="400">
            <ProgressBar progress={creationProgress} tone="primary" />
            <Text variant="bodySm" tone="subdued" alignment="center">
              Creating your collection... {creationProgress}%
            </Text>
          </Box>
        )}

        {fetcher.data?.error && !isLoading && (
          <Banner
            title="Error creating collection"
            tone="critical"
            icon={AlertTriangleIcon}
            onDismiss={() => {}}
          >
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        {inputError && (
          <Banner
            title="Validation Error"
            tone="warning"
            onDismiss={() => setInputError("")}
          >
            <p>{inputError}</p>
          </Banner>
        )}

        {fetcher.data?.success && fetcher.data?.collection && !isLoading && (
          <div className="success-animation">
            <Banner
              title="Success!"
              tone="success"
              icon={CheckIcon}
            >
              <p>Collection "{fetcher.data.collection.title}" created successfully!</p>
              {fetcher.data.collection.url && (
                <Button
                  url={fetcher.data.collection.url}
                  external
                  variant="plain"
                  size="slim"
                >
                  View in Shopify Admin
                </Button>
              )}
            </Banner>
          </div>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Title and Description Card */}
              <Card>
                <BlockStack gap="400">
                  <TextField
                    label="Title"
                    value={collectionName}
                    onChange={setCollectionName}
                    placeholder="e.g., Summer collection, Under $100, Staff picks"
                    autoComplete="off"
                    disabled={isLoading}
                    requiredIndicator
                  />

                  <div>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Description
                    </Text>
                    <div style={{ 
                      marginTop: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      minHeight: "120px",
                      padding: "12px",
                      background: "#fff",
                    }}>
                      <textarea
                        value={collectionDescription}
                        onChange={(e) => setCollectionDescription(e.target.value)}
                        placeholder="Describe your collection..."
                        style={{
                          width: "100%",
                          minHeight: "100px",
                          border: "none",
                          outline: "none",
                          resize: "vertical",
                          fontFamily: "inherit",
                          fontSize: "14px",
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </BlockStack>
              </Card>

              {/* Collection Type Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Collection type
                  </Text>
                  
                  <BlockStack gap="300">
                    <Box>
                      <RadioButton
                        label="Manual"
                        helpText="Add products to this collection one by one."
                        checked={collectionType === "manual"}
                        id="manual"
                        name="collectionType"
                        onChange={() => setCollectionType("manual")}
                      />
                    </Box>
                    
                    <Box>
                      <RadioButton
                        label="Smart"
                        helpText="Existing and future products that match the conditions you set will automatically be added to this collection."
                        checked={collectionType === "smart"}
                        id="smart"
                        name="collectionType"
                        onChange={() => setCollectionType("smart")}
                      />
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Search Engine Listing Card */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h3">
                      Search engine listing
                    </Text>
                    <Button
                      variant="plain"
                      onClick={() => setShowSeoPreview(!showSeoPreview)}
                    >
                      {showSeoPreview ? "Hide preview" : "Edit website SEO"}
                    </Button>
                  </InlineStack>

                  {showSeoPreview && (
                    <>
                      <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodySm" tone="subdued">
                            Preview
                          </Text>
                          <Text variant="bodyMd" fontWeight="semibold" tone="info">
                            {seoTitle || collectionName || "Collection title"}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            {`${window.location.hostname}/collections/${handle || 'collection-handle'}`}
                          </Text>
                          <Text variant="bodySm">
                            {seoDescription || collectionDescription || "Add a description to see how this collection might appear in a search engine listing"}
                          </Text>
                        </BlockStack>
                      </Box>

                      <TextField
                        label="Page title"
                        value={seoTitle}
                        onChange={setSeoTitle}
                        placeholder={collectionName || "Enter page title"}
                        helpText={`${seoTitle.length} of 70 characters used`}
                        maxLength={70}
                        disabled={isLoading}
                      />

                      <TextField
                        label="Description"
                        value={seoDescription}
                        onChange={setSeoDescription}
                        placeholder="Enter meta description"
                        helpText={`${seoDescription.length} of 160 characters used`}
                        maxLength={160}
                        multiline={2}
                        disabled={isLoading}
                      />

                      <TextField
                        label="URL handle"
                        value={handle}
                        onChange={setHandle}
                        placeholder="collection-handle"
                        prefix={`${window.location.hostname}/collections/`}
                        helpText="Used in the web address"
                        disabled={isLoading}
                      />
                    </>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Publishing Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Publishing
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    Sales channels
                  </Text>
                  
                  <BlockStack gap="200">
                    <Checkbox
                      label="Online Store"
                      checked={salesChannels.online}
                      onChange={(newChecked) => setSalesChannels({...salesChannels, online: newChecked})}
                    />
                    <Checkbox
                      label="Point of Sale"
                      checked={salesChannels.pos}
                      onChange={(newChecked) => setSalesChannels({...salesChannels, pos: newChecked})}
                      helpText="Available to all locations"
                    />
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Image Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Image
                  </Text>
                  
                  <div style={{
                    border: "2px dashed #ddd",
                    borderRadius: "8px",
                    padding: "40px",
                    textAlign: "center",
                    background: "#fafafa",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.background = "#f5f5ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ddd";
                    e.currentTarget.style.background = "#fafafa";
                  }}>
                    <BlockStack gap="200">
                      <div style={{ margin: "0 auto" }}>
                        <Icon source={ImageIcon} tone="subdued" />
                      </div>
                      <BlockStack gap="100">
                        <Button variant="primary" size="slim">
                          Add image
                        </Button>
                        <Text variant="bodySm" tone="subdued">
                          or drop an image to upload
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </div>
                </BlockStack>
              </Card>

              {/* Theme Template Card */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Theme template
                  </Text>
                  
                  <Select
                    label=""
                    options={[
                      {label: 'Default collection', value: 'default'},
                      {label: 'Custom template 1', value: 'custom1'},
                      {label: 'Custom template 2', value: 'custom2'},
                    ]}
                    value="default"
                    onChange={() => {}}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

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
            variant="primary"
            icon={PlusIcon}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              const nameField = document.querySelector('input[placeholder="Summer Collection, Best Sellers, etc."]') as HTMLInputElement;
              if (nameField) nameField.focus();
            }}
          >
            Quick Create
          </Button>
          <Button
            size="large"
            icon={ViewIcon}
            onClick={() => navigate("/app/collections")}
          >
            View Collections
          </Button>
          <Button
            size="large"
            icon={RefreshIcon}
            onClick={() => window.location.reload()}
          >
            Reset Form
          </Button>
          <Button
            size="large"
            icon={MagicIcon}
            onClick={() => handleAISuggestions()}
          >
            AI Suggest
          </Button>
        </InlineStack>
      </div>

      {/* Add padding to prevent content from being hidden behind fixed nav */}
      <div style={{ paddingBottom: "100px" }}></div>
    </Page>
  );
}