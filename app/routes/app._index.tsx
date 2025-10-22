import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  Modal,
  TextField,
  EmptyState,
  Icon,
  Banner,
  Grid,
  Box,
  Thumbnail,
} from "@shopify/polaris";
import {
  CollectionIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
  ViewIcon,
  HomeIcon,
  MagicIcon,
  ImportIcon,
  PlusIcon,
  CreditCardIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate, isShopUninstalled } from "../shopify.server";
import { checkSubscriptionStatus } from "../utils/subscription-redirect.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Don't wrap in try-catch - let authenticate.admin handle redirects
  const { admin, session } = await authenticate.admin(request);
  
  if (!session) {
    console.log('No session in app._index, authentication required');
    throw new Response(null, { status: 401 });
  }
  
  // Check if shop was recently uninstalled and needs re-authentication
  if (isShopUninstalled(session.shop)) {
    console.log('Shop was uninstalled, forcing re-authentication:', session.shop);
    throw new Response(null, { status: 401 });
  }
  
  // Check subscription status
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(admin, session.shop);
  
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";
  
  // Determine if we should show subscription page
  const needsSubscription = !hasActiveSubscription;
  
  if (needsSubscription) {
    console.log(`No subscription for ${session.shop} - showing pricing page`);
  } else {
    console.log(`Active subscription found for ${session.shop}`);
  }
  
  console.log('Loading collections for shop:', session.shop);
  
  // Add a delay to ensure GraphQL API is ready after auth
  // This is especially important for reinstalls
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
            seo {
              title
              description
            }
            updatedAt
          }
        }
      }
    }
  `;
  
  try {
    // Retry logic for GraphQL operations with longer delays
    let retries = 5;
    let response;
    let data;
    
    while (retries > 0) {
      try {
        response = await admin.graphql(query);
        data = await response.json();
        
        // If successful and has data, break the loop
        if (data && data.data && data.data.collections) {
          break;
        }
        
        // If we got a response but no collections, it might be a timing issue
        if (data && !data.errors) {
          console.log('No collections in response, retrying...');
          throw new Error('Empty collections response');
        }
      } catch (retryError) {
        console.log(`GraphQL retry attempt ${6 - retries}/5`);
        retries--;
        if (retries > 0) {
          // Increase delay between retries
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.error('All retries exhausted:', retryError);
          throw retryError;
        }
      }
    }
    
    // Check for GraphQL errors
    if (data && 'errors' in data && data.errors) {
      console.error("GraphQL errors:", data.errors);
      // Still return collections even if there are errors
      // This could be permission issues that don't affect reading
    }
    
    const collections = data.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0
    })) || [];
    
    console.log(`Fetched ${collections.length} collections from Shopify`);
    
    return json({ 
      collections,
      stats: {
        totalCollections: collections.length,
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    // Still return empty array but no error message
    // The app will just show 0 collections
    return json({ 
      collections: [],
      stats: {
        totalCollections: 0,
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Enhanced authentication with retry logic
  let admin, session;
  let authAttempts = 0;
  const maxAuthAttempts = 3;
  
  // Try to authenticate multiple times if needed
  while (authAttempts < maxAuthAttempts) {
    try {
      const auth = await authenticate.admin(request);
      admin = auth.admin;
      session = auth.session;
      
      if (session && admin) {
        console.log(`Auth successful on attempt ${authAttempts + 1} for shop:`, session.shop);
        break;
      }
    } catch (authError) {
      authAttempts++;
      console.error(`Auth attempt ${authAttempts} failed:`, authError);
      
      if (authAttempts < maxAuthAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * authAttempts));
      } else {
        // Final attempt failed, throw the error
        throw authError;
      }
    }
  }
  
  if (!session || !admin) {
    console.error('No valid session after all auth attempts');
    throw new Response(null, { status: 401 });
  }
  
  console.log('Action called with verified session for shop:', session.shop);
  
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    const collectionId = formData.get("collectionId");

    if (actionType === "delete" && collectionId) {
      const mutation = `
        mutation deleteCollection($id: ID!) {
          collectionDelete(input: { id: $id }) {
            deletedCollectionId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await admin.graphql(mutation, {
        variables: { id: collectionId }
      });
      
      const data = await response.json();
      
      if (data.data.collectionDelete.userErrors.length > 0) {
        return json({ 
          success: false, 
          error: data.data.collectionDelete.userErrors[0].message 
        });
      }

      return json({ success: true });
    }

    if (actionType === "update" && collectionId) {
      // Handle collection update with enhanced retry logic
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const handle = formData.get("handle") as string;
      const seoTitle = formData.get("seoTitle") as string;
      const seoDescription = formData.get("seoDescription") as string;
      
      console.log('Updating collection:', collectionId, 'with title:', title);
      
      // Validate session before mutation
      if (!session.accessToken) {
        console.error('No access token in session, cannot proceed');
        return json({ 
          success: false, 
          error: "Session invalid. Please refresh the page.",
          requiresAuth: true 
        });
      }
      
      const mutation = `
        mutation updateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
              seo {
                title
                description
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const variables = {
        input: {
          id: collectionId,
          title,
          descriptionHtml: description,
          handle,
          seo: {
            title: seoTitle || title,
            description: seoDescription
          }
        }
      };
      
      // Enhanced retry logic with auth fallback
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          // Verify admin client is still valid
          if (!admin) {
            console.log('Admin client lost, re-authenticating...');
            const reauth = await authenticate.admin(request);
            admin = reauth.admin;
            session = reauth.session;
            
            if (!admin || !session) {
              throw new Error('Re-authentication failed');
            }
          }
          
          console.log(`Attempt ${4 - retries}: Updating collection with valid session`);
          const response = await admin.graphql(mutation, { variables });
          const data = await response.json();
          
          if (data.data?.collectionUpdate?.userErrors?.length > 0) {
            const errorMessage = data.data.collectionUpdate.userErrors[0].message;
            console.error('GraphQL error:', errorMessage);
            
            // Don't retry for validation errors
            if (!errorMessage.includes('throttled') && !errorMessage.includes('try again')) {
              return json({ 
                success: false, 
                error: errorMessage 
              });
            }
          }
          
          if (data.data?.collectionUpdate?.collection) {
            console.log('Collection updated successfully:', data.data.collectionUpdate.collection.title);
            return json({ 
              success: true, 
              message: "Collection updated successfully",
              collection: data.data.collectionUpdate.collection 
            });
          }
        } catch (error: any) {
          console.error(`Update attempt ${4 - retries} failed:`, error?.message || error);
          lastError = error;
          retries--;
          
          // Check if it's an auth error and try to re-authenticate
          if (error?.message?.includes('Unauthorized') || 
              error?.message?.includes('401') || 
              error?.message?.includes('session')) {
            console.log('Auth error detected, attempting re-authentication...');
            try {
              const reauth = await authenticate.admin(request);
              admin = reauth.admin;
              session = reauth.session;
              console.log('Re-authentication successful');
            } catch (reauthError) {
              console.error('Re-authentication failed:', reauthError);
              return json({ 
                success: false, 
                error: "Session expired. Please refresh the page.",
                requiresAuth: true 
              });
            }
          }
          
          if (retries > 0) {
            // Increase delay with each retry
            const delay = (4 - retries) * 1000;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      return json({ 
        success: false, 
        error: "Failed to update collection. Please try again." 
      });
    }
    
    if (actionType === "duplicate" && collectionId) {
      // First, get the collection details
      const query = `
        query getCollection($id: ID!) {
          collection(id: $id) {
            title
            descriptionHtml
            handle
          }
        }
      `;

      const getResponse = await admin.graphql(query, {
        variables: { id: collectionId }
      });
      const getData = await getResponse.json();
      const original = getData.data.collection;

      // Create duplicate
      const createMutation = `
        mutation createCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const createResponse = await admin.graphql(createMutation, {
        variables: {
          input: {
            title: `${original.title} (Copy)`,
            descriptionHtml: original.descriptionHtml,
            handle: `${original.handle}-copy-${Date.now()}`,
          }
        }
      });

      const createData = await createResponse.json();
      
      if (createData.data.collectionCreate.userErrors.length > 0) {
        return json({ 
          success: false, 
          error: createData.data.collectionCreate.userErrors[0].message 
        });
      }

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: "Operation failed" });
  }
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  // Handle subscription button clicks
  const handleSubscribe = (planType: "monthly" | "annual") => {
    // For Managed Pricing apps, redirect to Shopify's billing page
    // We'll use a simple link redirect instead of API calls
    const shop = data.shop.replace('.myshopify.com', '');
    const billingUrl = `https://admin.shopify.com/store/${shop}/charges/collections-creator/pricing_plans`;
    
    // Open in the same window (top frame)
    window.top.location.href = billingUrl;
  };
  
  // Show subscription page if no active subscription
  if (data.needsSubscription) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <div style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "2rem 0"
            }}>
              <BlockStack gap="600">
                {/* Header */}
                <div style={{ textAlign: "center" }}>
                  <Text variant="heading2xl" as="h1">
                    Choose Your Plan
                  </Text>
                  <div style={{ marginTop: "0.5rem" }}>
                    <Text variant="bodyLg" tone="subdued">
                      Select your subscription plan. Cancel anytime.
                    </Text>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1.5rem",
                  marginTop: "1rem"
                }}>
                  {/* Monthly Plan Card */}
                  <Card>
                    <div style={{
                      padding: "2rem",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column"
                    }}>
                      <BlockStack gap="500">
                        <div style={{ textAlign: "center" }}>
                          <Text variant="headingLg" as="h2">
                            Starter
                          </Text>
                          <Text variant="bodyMd" tone="subdued">
                            Perfect for small stores
                          </Text>
                        </div>

                        <div style={{ 
                          textAlign: "center",
                          padding: "1.5rem 0",
                          borderBottom: "1px solid #e1e3e5"
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }}>
                            <Text variant="heading3xl" as="span">
                              $1.99
                            </Text>
                            <Text variant="bodyMd" tone="subdued" as="span">
                              /month
                            </Text>
                          </div>
                        </div>

                        <BlockStack gap="300">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Unlimited collections</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Bulk operations</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">SEO optimization</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Email support</Text>
                          </div>
                        </BlockStack>

                        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                          <Button
                            variant="primary"
                            size="large"
                            fullWidth
                            onClick={() => handleSubscribe("monthly")}
                          >
                            Subscribe Now
                          </Button>
                          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                            <Text variant="bodySm" tone="subdued">
                              $1.99/month
                            </Text>
                          </div>
                        </div>
                      </BlockStack>
                    </div>
                  </Card>

                  {/* Annual Plan Card */}
                  <Card>
                    <div style={{
                      padding: "2rem",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      border: "2px solid #5c6ac4",
                      borderRadius: "0.5rem"
                    }}>
                      <div style={{
                        position: "absolute",
                        top: "-12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#5c6ac4",
                        color: "white",
                        padding: "4px 16px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Best Value - Save 20%
                      </div>

                      <BlockStack gap="500">
                        <div style={{ textAlign: "center" }}>
                          <Text variant="headingLg" as="h2">
                            Professional
                          </Text>
                          <Text variant="bodyMd" tone="subdued">
                            For growing businesses
                          </Text>
                        </div>

                        <div style={{ 
                          textAlign: "center",
                          padding: "1.5rem 0",
                          borderBottom: "1px solid #e1e3e5"
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }}>
                            <Text variant="heading3xl" as="span">
                              $19.00
                            </Text>
                            <Text variant="bodyMd" tone="subdued" as="span">
                              /year
                            </Text>
                          </div>
                          <Text variant="bodySm" tone="success">
                            Save $4.88 (20% off)
                          </Text>
                        </div>

                        <BlockStack gap="300">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd" fontWeight="semibold">Everything in Starter</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Priority support</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Advanced analytics</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">API access</Text>
                          </div>
                        </BlockStack>

                        <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                          <Button
                            variant="primary"
                            tone="success"
                            size="large"
                            fullWidth
                            onClick={() => handleSubscribe("annual")}
                          >
                            Subscribe Now
                          </Button>
                          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                            <Text variant="bodySm" tone="subdued">
                              $19.00/year
                            </Text>
                          </div>
                        </div>
                      </BlockStack>
                    </div>
                  </Card>
                </div>

                {/* Trust Badges */}
                <div style={{ 
                  textAlign: "center",
                  padding: "2rem 0",
                  borderTop: "1px solid #e1e3e5"
                }}>
                  <BlockStack gap="400">
                    <div style={{ display: "flex", justifyContent: "center", gap: "3rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>🔒</span>
                        <Text variant="bodyMd">Secure Payments</Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>⚡</span>
                        <Text variant="bodyMd">Instant Access</Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>🎯</span>
                        <Text variant="bodyMd">No Setup Fees</Text>
                      </div>
                    </div>
                    <Text variant="bodySm" tone="subdued">
                      Secure billing handled by Shopify
                    </Text>
                  </BlockStack>
                </div>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  const { collections, stats } = data;
  
  // Add debug logging
  console.log('Index component mounted', { collections, stats });
  
  // Track active page - "home" for this page
  const activePage = "home";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editSeoTitle, setEditSeoTitle] = useState("");
  const [editSeoDescription, setEditSeoDescription] = useState("");

  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.requiresAuth) {
        console.log('Authentication required, refreshing page...');
        shopify.toast.show('Session expired. Refreshing...');
        // Use a full page refresh to re-authenticate
        setTimeout(() => {
          window.location.href = '/app';
        }, 1000);
      } else if (fetcher.data.success && fetcher.state === 'idle') {
        console.log('Operation successful');
        shopify.toast.show('✅ Collection updated successfully!');
        // Refresh the page data
        setTimeout(() => {
          navigate("/app", { replace: true });
        }, 500);
      } else if (fetcher.data.error && fetcher.state === 'idle') {
        console.error('Operation failed:', fetcher.data.error);
        shopify.toast.show(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data, fetcher.state, navigate, shopify]);

  const handleEdit = useCallback(async (collection: any) => {
    console.log('Edit clicked for:', collection.title);
    
    // Quick session check before opening modal
    try {
      // Make a quick API call to verify session is still valid
      const response = await fetch('/app?index', {
        method: 'HEAD',
        credentials: 'same-origin'
      });
      
      if (!response.ok && response.status === 401) {
        console.log('Session expired, refreshing...');
        shopify.toast.show('Session expired. Refreshing...');
        window.location.href = '/app';
        return;
      }
    } catch (error) {
      console.log('Session check failed, continuing anyway:', error);
    }
    
    setSelectedCollection(collection);
    setEditTitle(collection.title || "");
    setEditDescription(collection.descriptionHtml || "");
    setEditHandle(collection.handle || "");
    setEditSeoTitle(collection.seo?.title || collection.title || "");
    setEditSeoDescription(collection.seo?.description || "");
    setShowEditModal(true);
  }, [shopify]);

  const handleDelete = useCallback((collection: any) => {
    console.log('Delete clicked for:', collection.title);
    setSelectedCollection(collection);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = () => {
    if (selectedCollection) {
      fetcher.submit(
        {
          actionType: "delete",
          collectionId: selectedCollection.id,
        },
        { method: "POST" }
      );
      setShowDeleteModal(false);
      setTimeout(() => {
        navigate("/app", { replace: true });
      }, 500);
    }
  };

  const handleDuplicate = useCallback((collection: any) => {
    console.log('Duplicate clicked for:', collection.title);
    fetcher.submit(
      {
        actionType: "duplicate",
        collectionId: collection.id,
      },
      { method: "POST" }
    );
    shopify.toast.show("📋 Duplicating collection...");
    setTimeout(() => {
      navigate("/app", { replace: true });
    }, 500);
  }, [fetcher, navigate, shopify]);

  
  const handleHomeClick = (e: any) => {
    console.log('Home button clicked');
    e?.preventDefault();
    e?.stopPropagation();
    navigate("/app");
  };
  
  const handleCreateClick = (e: any) => {
    console.log('Create button clicked');
    e?.preventDefault();
    e?.stopPropagation();
    navigate("/app/create-collection");
  };
  
  const handleBulkClick = (e: any) => {
    console.log('Bulk button clicked');
    e?.preventDefault();
    e?.stopPropagation();
    navigate("/app/bulk-operations");
  };
  
  const handleContactClick = (e: any) => {
    console.log('Contact button clicked');
    e?.preventDefault();
    e?.stopPropagation();
    setShowContactModal(true);
  };

  // Filter collections based on search
  const filteredCollections = collections.filter((collection: any) =>
    collection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prepare data for DataTable
  const rows = filteredCollections.map((collection: any) => [
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {collection.image?.url ? (
        <Thumbnail
          source={collection.image.url}
          alt={collection.title}
          size="small"
        />
      ) : (
        <div style={{
          width: "40px",
          height: "40px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon source={CollectionIcon} tone="base" />
        </div>
      )}
      <div>
        <Text as="span" variant="bodyMd" fontWeight="semibold">{collection.title}</Text>
        <Text as="span" variant="bodySm" tone="subdued">/{collection.handle}</Text>
      </div>
    </div>,
    <Badge tone="info">{`${collection.productsCount} products`}</Badge>,
    <Text as="span" variant="bodySm">{new Date(collection.updatedAt).toLocaleDateString()}</Text>,
    <div style={{ display: "flex", gap: "8px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
      <Button
        size="slim"
        icon={EditIcon}
        onClick={() => {
          handleEdit(collection);
        }}
      >
        Edit
      </Button>
      <Button
        size="slim"
        icon={DuplicateIcon}
        onClick={() => {
          handleDuplicate(collection);
        }}
      >
        Duplicate
      </Button>
      <Button
        size="slim"
        tone="critical"
        icon={DeleteIcon}
        onClick={() => {
          handleDelete(collection);
        }}
      >
        Delete
      </Button>
    </div>
  ]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar title="Collections Manager" />

      {/* Sticky Magical Navigation Buttons */}
      <div style={{ 
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%", 
        background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
        marginBottom: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(6, 1fr)", 
        gap: "0.8rem",
        padding: "0 1rem",
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        <div style={{
          background: activePage === "home" 
            ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
            : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: activePage === "home" ? "4px" : "2px",
          borderRadius: "12px",
          boxShadow: activePage === "home" 
            ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
            : "0 4px 15px rgba(102, 126, 234, 0.4)",
          transition: "all 0.3s ease",
          transform: activePage === "home" ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
        }}>
          <Button 
            variant="primary" 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Home navigation clicked');
              navigate('/app');
            }}
            icon={HomeIcon}
          >
            <span style={{ 
              fontWeight: activePage === "home" ? "700" : "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: activePage === "home" ? "15px" : "14px",
            }}>
              🏠 Home
            </span>
          </Button>
        </div>
        
        {/* Size Chart Creator Button */}
        <div style={{
          background: activePage === "size-chart" 
            ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
            : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: activePage === "size-chart" ? "4px" : "2px",
          borderRadius: "12px",
          boxShadow: activePage === "size-chart" 
            ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
            : "0 4px 15px rgba(255, 107, 107, 0.4)",
          transition: "all 0.3s ease",
          transform: activePage === "size-chart" ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Size Chart navigation clicked');
              navigate('/app/size-chart-creator');
            }}
            icon={ImageIcon}
            variant="primary"
          >
            <span style={{ 
              fontWeight: activePage === "size-chart" ? "700" : "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: activePage === "size-chart" ? "15px" : "14px",
            }}>
              📏 Size Charts
            </span>
          </Button>
        </div>
        
        <div style={{
          background: activePage === "create" 
            ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
            : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: activePage === "create" ? "4px" : "2px",
          borderRadius: "12px",
          boxShadow: activePage === "create" 
            ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
            : "0 4px 15px rgba(240, 147, 251, 0.4)",
          transition: "all 0.3s ease",
          transform: activePage === "create" ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Create navigation clicked');
              navigate('/app/create-collection');
            }}
            icon={MagicIcon}
            variant="primary"
          >
            <span style={{ 
              fontWeight: activePage === "create" ? "700" : "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: activePage === "create" ? "15px" : "14px",
            }}>
              🎨 Create Collection
            </span>
          </Button>
        </div>
        
        <div style={{
          background: activePage === "bulk" 
            ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
            : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: activePage === "bulk" ? "4px" : "2px",
          borderRadius: "12px",
          boxShadow: activePage === "bulk" 
            ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
            : "0 4px 15px rgba(79, 172, 254, 0.4)",
          transition: "all 0.3s ease",
          transform: activePage === "bulk" ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Bulk navigation clicked');
              navigate('/app/bulk-operations');
            }}
            icon={ImportIcon}
            variant="primary"
          >
            <span style={{ 
              fontWeight: activePage === "bulk" ? "700" : "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: activePage === "bulk" ? "15px" : "14px",
            }}>
              ⚡ Bulk Operations
            </span>
          </Button>
        </div>
        
        {/* Subscription Button */}
        <div style={{
          background: activePage === "subscription" 
            ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
            : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: activePage === "subscription" ? "4px" : "2px",
          borderRadius: "12px",
          boxShadow: activePage === "subscription" 
            ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
            : "0 4px 15px rgba(0, 166, 81, 0.4)",
          transition: "all 0.3s ease",
          transform: activePage === "subscription" ? "scale(1.05)" : "scale(1)",
          cursor: "pointer",
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Subscription navigation clicked');
              navigate('/app/subscription');
            }}
            icon={CreditCardIcon}
            variant="primary"
          >
            <span style={{ 
              fontWeight: activePage === "subscription" ? "700" : "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: activePage === "subscription" ? "15px" : "14px",
            }}>
              💳 Subscription
            </span>
          </Button>
        </div>
        
        {/* Contact Support Button */}
        <div style={{
          background: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
          padding: "2px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => {
              console.log('Contact modal button clicked');
              setShowContactModal(true);
            }}
            variant="primary"
          >
            <span style={{ 
              fontWeight: "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "14px",
            }}>
              📧 Contact Support
            </span>
          </Button>
        </div>
      </div>
      </div>

      <Page>
        {/* Stats Header - Only Total Collections */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          padding: "1.5rem",
          borderRadius: "16px",
          marginBottom: "1.5rem",
          color: "white",
          textAlign: "center",
        }}>
          <BlockStack gap="200" align="center">
            <Text variant="displayLarge" as="h1">
              <span style={{ color: "white", fontWeight: "bold", fontSize: "3rem" }}>
                {stats.totalCollections}
              </span>
            </Text>
            <Text variant="headingMd">
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.2rem" }}>
                Total Collections in Your Store
              </span>
            </Text>
          </BlockStack>
        </div>


        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">Your Collections</Text>
                  <TextField
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    prefix={<Icon source={CollectionIcon} />}
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                    autoComplete="off"
                  />
                </InlineStack>

                {collections.length === 0 ? (
                  <EmptyState
                    heading="Start building your catalog"
                    action={{
                      content: "Create your first collection",
                      icon: PlusIcon,
                      onAction: () => navigate("/app/create-collection")
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Group your products into collections to help customers find what they're looking for.</p>
                  </EmptyState>
                ) : filteredCollections.length === 0 ? (
                  <EmptyState
                    heading="No collections found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Try adjusting your search query</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text"]}
                    headings={[
                      "Collection",
                      "Products",
                      "Last Updated",
                      "Actions",
                    ]}
                    rows={rows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete collection?"
          primaryAction={{
            content: "Delete",
            onAction: confirmDelete,
            destructive: true,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowDeleteModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text variant="bodyMd">
              Are you sure you want to delete "{selectedCollection?.title}"? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        {/* Edit Collection Modal */}
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Collection"
          primaryAction={{
            content: "Save Changes",
            loading: fetcher.state === "submitting",
            disabled: !editTitle.trim(),
            onAction: async () => {
              if (selectedCollection && editTitle.trim()) {
                try {
                  console.log('Submitting update for collection:', selectedCollection.id);
                  
                  // Submit the update
                  fetcher.submit(
                    {
                      actionType: "update",
                      collectionId: selectedCollection.id,
                      title: editTitle.trim(),
                      description: editDescription,
                      handle: editHandle,
                      seoTitle: editSeoTitle || editTitle,
                      seoDescription: editSeoDescription
                    },
                    { 
                      method: "POST",
                      action: "/app?index" // Ensure it goes to the right route
                    }
                  );
                  
                  shopify.toast.show('Saving changes...');
                  
                  // Keep modal open briefly to show loading state
                  setTimeout(() => {
                    setShowEditModal(false);
                  }, 500);
                  
                } catch (error) {
                  console.error('Error submitting update:', error);
                  shopify.toast.show('Error updating collection. Please try again.');
                }
              } else if (!editTitle.trim()) {
                shopify.toast.show('Collection title is required');
              }
            },
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowEditModal(false),
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
                requiredIndicator
              />
              
              <TextField
                label="Description"
                value={editDescription}
                onChange={setEditDescription}
                multiline={4}
                autoComplete="off"
                helpText="Describe what products are in this collection"
              />
              
              <TextField
                label="URL Handle"
                value={editHandle}
                onChange={setEditHandle}
                autoComplete="off"
                helpText="Used in the collection URL (e.g., /collections/handle)"
              />
              
              <div style={{ 
                borderTop: "1px solid #e1e3e5", 
                paddingTop: "16px", 
                marginTop: "8px" 
              }}>
                <Text variant="headingSm" as="h3">
                  SEO Settings
                </Text>
              </div>
              
              <TextField
                label="SEO Page Title"
                value={editSeoTitle}
                onChange={setEditSeoTitle}
                autoComplete="off"
                helpText="Title shown in search engine results (50-60 characters)"
              />
              
              <TextField
                label="SEO Meta Description"
                value={editSeoDescription}
                onChange={setEditSeoDescription}
                multiline={3}
                autoComplete="off"
                helpText="Description shown in search results (150-160 characters)"
              />
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Success/Error Messages */}
        {fetcher.data?.success && (
          <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000,
          }}>
            <Banner
              title="Success!"
              tone="success"
              onDismiss={() => {}}
            />
          </div>
        )}

        {fetcher.data?.error && (
          <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000,
          }}>
            <Banner
              title="Error"
              tone="critical"
              onDismiss={() => {}}
            >
              <p>{fetcher.data.error}</p>
            </Banner>
          </div>
        )}

      {/* Contact Support Modal */}
      <Modal
        open={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setEmailCopied(false);
        }}
        title="Contact Support"
        primaryAction={{
          content: "Close",
          onAction: () => {
            setShowContactModal(false);
            setEmailCopied(false);
          },
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              textAlign: "center",
            }}>
              <Text variant="headingMd" as="h3">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  📧 Need Help with Collections Creator?
                </span>
              </Text>
            </div>
            
            <BlockStack gap="300">
              <Text variant="bodyMd">
                We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team.
              </Text>
              
              <div style={{
                background: "#FEF3C7",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #F59E0B",
              }}>
                <Text variant="bodyMd">
                  <span style={{ fontWeight: "600", color: "#92400E" }}>
                    ⏱️ Response Time: We typically respond within 48 hours
                  </span>
                </Text>
              </div>
              
              <div style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">
                    📬 Email Support
                  </Text>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    background: "white",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}>
                    <Text variant="bodyMd" as="p">
                      <strong>support@axnivo.com</strong>
                    </Text>
                    <Button
                      size="micro"
                      variant={emailCopied ? "primary" : "secondary"}
                      onClick={() => {
                        navigator.clipboard.writeText('support@axnivo.com');
                        setEmailCopied(true);
                        shopify.toast.show('✅ Email copied to clipboard!');
                        setTimeout(() => setEmailCopied(false), 3000);
                      }}
                    >
                      {emailCopied ? '✅ Copied!' : 'Copy'}
                    </Button>
                  </div>
                </BlockStack>
              </div>
              
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  ⚡ What We Can Help With:
                </Text>
                <div style={{ paddingLeft: "16px" }}>
                  <Text variant="bodyMd" as="ul">
                    <li>• Collection creation and management issues</li>
                    <li>• Bulk operations support</li>
                    <li>• App installation and setup</li>
                    <li>• Feature requests and suggestions</li>
                    <li>• Technical troubleshooting</li>
                    <li>• General usage questions</li>
                  </Text>
                </div>
              </BlockStack>
              
              <div style={{
                background: "#EFF6FF",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #3B82F6",
              }}>
                <Text variant="bodyMd">
                  <span style={{ fontWeight: "600", color: "#1E40AF" }}>
                    📨 How to Contact:
                  </span>
                </Text>
                <div style={{ marginTop: "8px" }}>
                  <Text variant="bodyMd">
                    1. Click the "Copy" button above to copy our email<br/>
                    2. Send your message to support@axnivo.com<br/>
                    3. We'll respond within 48 hours
                  </Text>
                </div>
              </div>

              <div style={{
                background: "#f0f9ff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #0ea5e9",
              }}>
                <Text variant="bodySm">
                  💡 <strong>Tip:</strong> When contacting support, please include details about what you were trying to do and any error messages you saw. This helps us assist you faster!
                </Text>
              </div>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      </Page>
    </div>
  );
}