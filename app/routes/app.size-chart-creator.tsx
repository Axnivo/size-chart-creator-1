import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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
  Select,
  ProgressBar,
  Spinner,
  RadioButton,
  FormLayout,
} from "@shopify/polaris";
import {
  ImageIcon,
  ProductIcon,
  UploadIcon,
  DeleteIcon,
  ViewIcon,
  HomeIcon,
  MagicIcon,
  ImportIcon,
  PlusIcon,
  CreditCardIcon,
  CollectionIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate, isShopUninstalled } from "../shopify.server";
import { checkSubscriptionStatus } from "../utils/subscription-redirect.server";
import { SizeChartService } from "../services/size-chart.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  if (!session) {
    console.log('No session in size-chart-creator, authentication required');
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
    return json({ 
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  }
  
  console.log('Loading products for size chart processing for shop:', session.shop);
  
  // Add a delay to ensure GraphQL API is ready after auth
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Get products query
  const productsQuery = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  
  // Get collections query
  const collectionsQuery = `
    query getCollections {
      collections(first: 250) {
        edges {
          node {
            id
            title
            handle
            productsCount {
              count
            }
          }
        }
      }
    }
  `;
  
  try {
    // Retry logic for GraphQL operations
    let retries = 5;
    let productsResponse, collectionsResponse;
    let productsData, collectionsData;
    
    while (retries > 0) {
      try {
        productsResponse = await admin.graphql(productsQuery, {
          variables: { first: 250 }
        });
        collectionsResponse = await admin.graphql(collectionsQuery);
        
        productsData = await productsResponse.json();
        collectionsData = await collectionsResponse.json();
        
        // If successful and has data, break the loop
        if (productsData && productsData.data && collectionsData && collectionsData.data) {
          break;
        }
        
        throw new Error('Empty response');
      } catch (retryError) {
        console.log(`GraphQL retry attempt ${6 - retries}/5`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.error('All retries exhausted:', retryError);
          throw retryError;
        }
      }
    }
    
    const products = productsData.data?.products?.edges?.map((edge: any) => ({
      ...edge.node,
      images: edge.node.images?.edges?.map((imgEdge: any) => imgEdge.node) || []
    })) || [];
    
    const collections = collectionsData.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0
    })) || [];
    
    console.log(`Fetched ${products.length} products and ${collections.length} collections from Shopify`);
    
    return json({ 
      products,
      collections,
      stats: {
        totalProducts: products.length,
        totalCollections: collections.length,
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return json({ 
      products: [],
      collections: [],
      stats: {
        totalProducts: 0,
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
        await new Promise(resolve => setTimeout(resolve, 500 * authAttempts));
      } else {
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
    
    if (actionType === "process_size_charts") {
      const selectedProducts = JSON.parse(formData.get("selectedProducts") as string || "[]");
      const selectedCollection = formData.get("selectedCollection") as string;
      const processingMode = formData.get("processingMode") as string;
      
      console.log(`Processing size charts for ${selectedProducts.length} products`);
      
      // Get brand configuration from form data
      const brandConfig = {
        mainColor: formData.get("mainColor") as string || '#8B4A9C',
        headerBg: formData.get("headerBg") as string || '#D1B3E0',
        textColor: formData.get("textColor") as string || '#000000',
        borderColor: formData.get("borderColor") as string || '#8B4A9C',
        bulletColor: formData.get("bulletColor") as string || '#8B4A9C',
        alternateRowColor: formData.get("alternateRowColor") as string || '#F8F8F8',
        brandName: formData.get("brandName") as string || '',
        tableBorderWidth: parseInt(formData.get("tableBorderWidth") as string || '11'),
        headerBorderWidth: parseInt(formData.get("headerBorderWidth") as string || '18'),
        outerBorderWidth: parseInt(formData.get("outerBorderWidth") as string || '22'),
        titleUnderlineHeight: parseInt(formData.get("titleUnderlineHeight") as string || '4'),
        titleFontSize: parseInt(formData.get("titleFontSize") as string || '48'),
        headerFontSize: parseInt(formData.get("headerFontSize") as string || '32'),
        cellFontSize: parseInt(formData.get("cellFontSize") as string || '38'),
        detailFontSize: parseInt(formData.get("detailFontSize") as string || '32'),
        bulletFontSize: parseInt(formData.get("bulletFontSize") as string || '36'),
      };
      
      // Initialize the size chart service with brand configuration
      const sizeChartService = new SizeChartService(admin, brandConfig);
      
      // Process the products using the actual service
      const results = await sizeChartService.processProducts(selectedProducts);
      
      const successfulCount = results.filter(r => r.success).length;
      const skippedCount = results.filter(r => r.skipped).length;
      
      return json({ 
        success: true,
        message: `Processed ${successfulCount} of ${selectedProducts.length} products`,
        results,
        processedCount: successfulCount,
        totalCount: selectedProducts.length,
        skippedCount
      });
    }
    
    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: "Operation failed" });
  }
};

export default function SizeChartCreator() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  
  // Handle subscription button clicks
  const handleSubscribe = (planType: "monthly" | "annual") => {
    const shop = data.shop.replace('.myshopify.com', '');
    const billingUrl = `https://admin.shopify.com/store/${shop}/charges/collections-creator/pricing_plans`;
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
                            <Text variant="bodyMd">Unlimited size charts</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Bulk operations</Text>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: "#00a651", fontSize: "1.25rem" }}>✓</span>
                            <Text variant="bodyMd">Custom brand colors</Text>
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
                        </div>
                      </BlockStack>
                    </div>
                  </Card>
                </div>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  const { products, collections, stats } = data;
  
  // Track active page - "size-chart" for this page
  const activePage = "size-chart";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [processingMode, setProcessingMode] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  
  // Brand customization state
  const [brandName, setBrandName] = useState("");
  const [mainColor, setMainColor] = useState("#8B4A9C");
  const [headerBg, setHeaderBg] = useState("#D1B3E0");
  const [textColor, setTextColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#8B4A9C");
  const [bulletColor, setBulletColor] = useState("#8B4A9C");
  const [alternateRowColor, setAlternateRowColor] = useState("#F8F8F8");
  const [tableBorderWidth, setTableBorderWidth] = useState(11);
  const [headerBorderWidth, setHeaderBorderWidth] = useState(18);
  const [outerBorderWidth, setOuterBorderWidth] = useState(22);
  const [titleUnderlineHeight, setTitleUnderlineHeight] = useState(4);
  const [titleFontSize, setTitleFontSize] = useState(48);
  const [headerFontSize, setHeaderFontSize] = useState(32);
  const [cellFontSize, setCellFontSize] = useState(38);
  const [detailFontSize, setDetailFontSize] = useState(32);
  const [bulletFontSize, setBulletFontSize] = useState(36);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  
  // Handle fetcher responses
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.requiresAuth) {
        console.log('Authentication required, refreshing page...');
        shopify.toast.show('Session expired. Refreshing...');
        setTimeout(() => {
          window.location.href = '/app';
        }, 1000);
      } else if (fetcher.data.success && fetcher.state === 'idle') {
        console.log('Operation successful');
        setIsProcessing(false);
        setShowResults(true);
        setProcessingResults(fetcher.data.results || []);
        shopify.toast.show(`✅ Processed ${fetcher.data.processedCount} of ${fetcher.data.totalCount} products!`);
      } else if (fetcher.data.error && fetcher.state === 'idle') {
        console.error('Operation failed:', fetcher.data.error);
        setIsProcessing(false);
        shopify.toast.show(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data, fetcher.state, shopify]);

  // Filter products based on search and collection
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleProductToggle = useCallback((product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts);
    }
  }, [selectedProducts, filteredProducts]);

  const handleStartProcessing = useCallback(() => {
    if (selectedProducts.length === 0) {
      shopify.toast.show('Please select at least one product');
      return;
    }
    
    setIsProcessing(true);
    setShowResults(false);
    
    fetcher.submit(
      {
        actionType: "process_size_charts",
        selectedProducts: JSON.stringify(selectedProducts),
        selectedCollection,
        processingMode,
        // Brand configuration
        brandName,
        mainColor,
        headerBg,
        textColor,
        borderColor,
        bulletColor,
        alternateRowColor,
        tableBorderWidth: tableBorderWidth.toString(),
        headerBorderWidth: headerBorderWidth.toString(),
        outerBorderWidth: outerBorderWidth.toString(),
        titleUnderlineHeight: titleUnderlineHeight.toString(),
        titleFontSize: titleFontSize.toString(),
        headerFontSize: headerFontSize.toString(),
        cellFontSize: cellFontSize.toString(),
        detailFontSize: detailFontSize.toString(),
        bulletFontSize: bulletFontSize.toString(),
      },
      { method: "POST" }
    );
  }, [selectedProducts, selectedCollection, processingMode, brandName, mainColor, headerBg, textColor, borderColor, bulletColor, alternateRowColor, tableBorderWidth, headerBorderWidth, outerBorderWidth, titleUnderlineHeight, titleFontSize, headerFontSize, cellFontSize, detailFontSize, bulletFontSize, fetcher, shopify]);

  // Prepare data for DataTable
  const rows = filteredProducts.map((product: any) => [
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input
        type="checkbox"
        checked={selectedProducts.some(p => p.id === product.id)}
        onChange={() => handleProductToggle(product)}
        style={{ marginRight: "8px" }}
      />
      {product.images?.[0]?.url ? (
        <Thumbnail
          source={product.images[0].url}
          alt={product.title}
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
          <Icon source={ProductIcon} tone="base" />
        </div>
      )}
      <div>
        <Text as="span" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
        <Text as="span" variant="bodySm" tone="subdued">/{product.handle}</Text>
      </div>
    </div>,
    <Badge tone={product.descriptionHtml?.includes('size') || product.descriptionHtml?.includes('measurement') ? 'success' : 'attention'}>
      {product.descriptionHtml?.includes('size') || product.descriptionHtml?.includes('measurement') ? 'Has Size Data' : 'No Size Data'}
    </Badge>,
    <Text as="span" variant="bodySm">{new Date(product.updatedAt).toLocaleDateString()}</Text>,
  ]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar title="Size Chart Creator" />

      {/* Sticky Navigation */}
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
          gridTemplateColumns: "repeat(5, 1fr)", 
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
              onClick={() => navigate('/app')}
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
          
          <div style={{
            background: activePage === "size-chart" 
              ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
              : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: activePage === "size-chart" ? "4px" : "2px",
            borderRadius: "12px",
            boxShadow: activePage === "size-chart" 
              ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
              : "0 4px 15px rgba(240, 147, 251, 0.4)",
            transition: "all 0.3s ease",
            transform: activePage === "size-chart" ? "scale(1.05)" : "scale(1)",
            cursor: "pointer",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate('/app/size-chart-creator')}
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
              onClick={() => navigate('/app/create-collection')}
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
              onClick={() => navigate('/app/bulk-operations')}
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
              onClick={() => setShowContactModal(true)}
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
        {/* Stats Header */}
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
                {stats.totalProducts}
              </span>
            </Text>
            <Text variant="headingMd">
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.2rem" }}>
                Products Available for Size Chart Processing
              </span>
            </Text>
          </BlockStack>
        </div>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg" as="h2">📏 Size Chart Processing</Text>
                
                <div>
                  <Text variant="headingMd" as="h3">Processing Options</Text>
                  <div style={{ marginTop: "1rem" }}>
                    <RadioButton
                      label="Process all products"
                      checked={processingMode === "all"}
                      id="all"
                      name="processingMode"
                      onChange={() => setProcessingMode("all")}
                    />
                    <RadioButton
                      label="Process selected products only"
                      checked={processingMode === "selected"}
                      id="selected"
                      name="processingMode"
                      onChange={() => setProcessingMode("selected")}
                    />
                  </div>
                </div>

                <TextField
                  label="Search products"
                  placeholder="Search by product name..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  prefix={<Icon source={ProductIcon} />}
                  clearButton
                  onClearButtonClick={() => setSearchQuery("")}
                  autoComplete="off"
                />

                <div>
                  <Button
                    variant="plain"
                    onClick={() => setShowBrandSettings(!showBrandSettings)}
                  >
                    {showBrandSettings ? 'Hide Brand Settings' : 'Customize Brand & Colors'}
                  </Button>
                </div>

                {showBrandSettings && (
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">🎨 Brand Customization</Text>
                      
                      <TextField
                        label="Brand Name (Optional)"
                        value={brandName}
                        onChange={setBrandName}
                        placeholder="Enter your brand name"
                        helpText="Will appear as logo if no image is uploaded"
                        autoComplete="off"
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                          <Text variant="bodyMd" as="p">Main Color</Text>
                          <input
                            type="color"
                            value={mainColor}
                            onChange={(e) => setMainColor(e.target.value)}
                            style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                        
                        <div>
                          <Text variant="bodyMd" as="p">Header Background</Text>
                          <input
                            type="color"
                            value={headerBg}
                            onChange={(e) => setHeaderBg(e.target.value)}
                            style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                        
                        <div>
                          <Text variant="bodyMd" as="p">Text Color</Text>
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                        
                        <div>
                          <Text variant="bodyMd" as="p">Border Color</Text>
                          <input
                            type="color"
                            value={borderColor}
                            onChange={(e) => setBorderColor(e.target.value)}
                            style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <TextField
                          label="Title Font Size"
                          type="number"
                          value={titleFontSize.toString()}
                          onChange={(value) => setTitleFontSize(parseInt(value) || 48)}
                          suffix="px"
                          autoComplete="off"
                        />
                        
                        <TextField
                          label="Header Font Size"
                          type="number"
                          value={headerFontSize.toString()}
                          onChange={(value) => setHeaderFontSize(parseInt(value) || 32)}
                          suffix="px"
                          autoComplete="off"
                        />
                        
                        <TextField
                          label="Table Border Width"
                          type="number"
                          value={tableBorderWidth.toString()}
                          onChange={(value) => setTableBorderWidth(parseInt(value) || 11)}
                          suffix="px"
                          autoComplete="off"
                        />
                        
                        <TextField
                          label="Header Border Width"
                          type="number"
                          value={headerBorderWidth.toString()}
                          onChange={(value) => setHeaderBorderWidth(parseInt(value) || 18)}
                          suffix="px"
                          autoComplete="off"
                        />
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          // Reset to defaults
                          setBrandName("");
                          setMainColor("#8B4A9C");
                          setHeaderBg("#D1B3E0");
                          setTextColor("#000000");
                          setBorderColor("#8B4A9C");
                          setBulletColor("#8B4A9C");
                          setAlternateRowColor("#F8F8F8");
                          setTableBorderWidth(11);
                          setHeaderBorderWidth(18);
                          setOuterBorderWidth(22);
                          setTitleUnderlineHeight(4);
                          setTitleFontSize(48);
                          setHeaderFontSize(32);
                          setCellFontSize(38);
                          setDetailFontSize(32);
                          setBulletFontSize(36);
                        }}
                      >
                        Reset to Defaults
                      </Button>
                    </BlockStack>
                  </Card>
                )}

                <div>
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p">
                      Selected: {selectedProducts.length} products
                    </Text>
                    <Button
                      variant="plain"
                      onClick={handleSelectAll}
                    >
                      {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </InlineStack>
                </div>

                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={handleStartProcessing}
                  loading={isProcessing}
                  disabled={selectedProducts.length === 0}
                >
                  {isProcessing ? 'Processing...' : `🚀 Start Processing (${selectedProducts.length} products)`}
                </Button>

                {isProcessing && (
                  <div>
                    <Text variant="bodyMd" as="p">Processing products...</Text>
                    <div style={{ marginTop: "0.5rem" }}>
                      <Spinner accessibilityLabel="Processing" size="small" />
                    </div>
                  </div>
                )}
              </BlockStack>
            </Card>

            {/* Processing Results */}
            {showResults && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">📊 Processing Results</Text>
                  
                  <div>
                    <Text variant="bodyMd" as="p">
                      Processed {processingResults.filter(r => r.success).length} of {processingResults.length} products successfully
                    </Text>
                  </div>

                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <BlockStack gap="200">
                      {processingResults.map((result, index) => (
                        <div key={index} style={{
                          padding: "0.75rem",
                          border: "1px solid #e1e3e5",
                          borderRadius: "0.5rem",
                          background: result.success ? "#f0f9ff" : "#fef2f2"
                        }}>
                          <Text variant="bodyMd" as="p">
                            {result.success ? '✅' : '❌'} {result.productTitle}
                          </Text>
                          {result.error && (
                            <Text variant="bodySm" tone="subdued" as="p">
                              {result.error}
                            </Text>
                          )}
                        </div>
                      ))}
                    </BlockStack>
                  </div>
                </BlockStack>
              </Card>
            )}
          </Layout.Section>

          <Layout.Section variant="twoThirds">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingLg" as="h2">Your Products</Text>
                  <Badge tone="info">{filteredProducts.length} products</Badge>
                </InlineStack>

                {products.length === 0 ? (
                  <EmptyState
                    heading="No products found"
                    action={{
                      content: "Go to Products",
                      icon: ProductIcon,
                      onAction: () => navigate("/app")
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>You need products in your store to create size charts.</p>
                  </EmptyState>
                ) : filteredProducts.length === 0 ? (
                  <EmptyState
                    heading="No products found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Try adjusting your search query</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={[
                      "Product",
                      "Size Data Status",
                      "Last Updated",
                    ]}
                    rows={rows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

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
                    📧 Need Help with Size Chart Creator?
                  </span>
                </Text>
              </div>
              
              <BlockStack gap="300">
                <Text variant="bodyMd">
                  We're here to help! For any questions, issues, or feature requests regarding the Size Chart Creator app, please reach out to our support team.
                </Text>
                
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
              </BlockStack>
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
      </Page>
    </div>
  );
}