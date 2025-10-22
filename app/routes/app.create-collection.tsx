import { useEffect, useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
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
  Grid,
  LegacyCard,
  Modal,
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
  SettingsIcon,
  HashtagIcon,
  TextIcon,
  GlobeIcon,
  CalendarIcon,
  ImportIcon,
  ChartVerticalFilledIcon,
  DuplicateIcon,
  ClockIcon,
  HeartIcon,
  DocumentIcon,
  CreditCardIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import appStyles from "../styles/app.css?url";
import customStyles from "../styles/custom.css?url";

export const links = () => [
  { rel: "stylesheet", href: appStyles },
  { rel: "stylesheet", href: customStyles }
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Calculate date for "this week" (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Query to get collections count and recent collections
    const collectionsQuery = `
      query {
        collections(first: 250) {
          edges {
            node {
              id
              title
              updatedAt
              productsCount {
                count
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    // Query for all products with detailed information for manual selection
    const productsQuery = `
      query {
        products(first: 250, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
                width
                height
              }
              vendor
              productType
              tags
              updatedAt
              status
              totalInventory
              publishedAt
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    // Execute GraphQL queries
    const [collectionsResponse, productsResponse] = await Promise.all([
      admin.graphql(collectionsQuery),
      admin.graphql(productsQuery)
    ]);

    const collectionsData = await collectionsResponse.json();
    const productsData = await productsResponse.json();

    // Process collections data
    const collections = collectionsData.data?.collections?.edges || [];
    const totalCollections = collections.length;
    
    // Count collections updated this week
    const recentCollections = collections.filter(edge => {
      const updatedAt = new Date(edge.node.updatedAt);
      return updatedAt >= weekAgo;
    });
    const collectionsThisWeek = recentCollections.length;

    // Calculate success rate (collections with products vs empty collections)
    const collectionsWithProducts = collections.filter(edge => 
      edge.node.productsCount?.count > 0
    );
    const successRate = totalCollections > 0 
      ? Math.round((collectionsWithProducts.length / totalCollections) * 100) 
      : 0;

    // Process products data - filter to only show published products
    const allProducts = productsData.data?.products?.edges?.map(edge => edge.node) || [];
    const products = allProducts.filter(product => product.status === 'ACTIVE' && product.publishedAt);
    const totalProducts = products.length;
    
    const stats = {
      totalCollections,
      totalProducts,
      successRate,
      collectionsThisWeek,
    };

    return json({ 
      shop: session.shop.replace(".myshopify.com", ""),
      stats,
      products
    });
  } catch (error) {
    console.error('Error fetching Shopify data:', error);
    
    // Return fallback data if there's an authentication error - no login prompts
    const stats = {
      totalCollections: 0,
      totalProducts: 0,
      successRate: 0,
      collectionsThisWeek: 0,
    };

    return json({ 
      shop: "demo-shop",
      stats,
      products: []
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const handle = formData.get("handle") as string;
    const seoTitle = formData.get("seoTitle") as string;
    const seoDescription = formData.get("seoDescription") as string;
    const collectionType = formData.get("collectionType") as string;
    const selectedProducts = JSON.parse(formData.get("selectedProducts") as string || "[]");
    const conditions = JSON.parse(formData.get("conditions") as string || "[]");
    const conditionMatch = formData.get("conditionMatch") as string;

    let mutation;
    let variables;

    if (collectionType === "smart") {
      // Create smart collection with rules
      const rules = conditions
        .filter((c: any) => c.value)
        .map((c: any) => {
          // Map condition types to Shopify's expected format
          let column = c.type.toUpperCase();
          if (column === 'PRODUCT_TYPE') column = 'TYPE';
          if (column === 'VARIANT_INVENTORY') column = 'INVENTORY_QUANTITY';
          if (column === 'VARIANT_WEIGHT') column = 'WEIGHT';
          
          // Map operators to Shopify's expected format
          let relation = c.operator.toUpperCase();
          if (relation === 'GREATER') relation = 'GREATER_THAN';
          if (relation === 'LESS') relation = 'LESS_THAN';
          
          return {
            column: column,
            relation: relation,
            condition: c.value
          };
        });

      mutation = `
        mutation createSmartCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      variables = {
        input: {
          title,
          descriptionHtml: description ? `<p>${description}</p>` : "",
          handle: handle || undefined,
          ruleSet: rules.length > 0 ? {
            appliedDisjunctively: conditionMatch === "any",
            rules: rules
          } : undefined,
          seo: (seoTitle || seoDescription) ? {
            title: seoTitle || undefined,
            description: seoDescription || undefined
          } : undefined
        }
      };
    } else {
      // Create manual collection
      mutation = `
        mutation createCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      variables = {
        input: {
          title,
          descriptionHtml: description ? `<p>${description}</p>` : "",
          handle: handle || undefined,
          seo: (seoTitle || seoDescription) ? {
            title: seoTitle || undefined,
            description: seoDescription || undefined
          } : undefined
        }
      };
    }

    // Execute mutation with retry logic for better reliability after reinstall
    let retries = 3;
    let response;
    let data;
    
    while (retries > 0) {
      try {
        console.log(`Creating collection, attempt ${4 - retries}/3`);
        response = await admin.graphql(mutation, { variables });
        data = await response.json();
        
        // Check if successful
        if (data && data.data && data.data.collectionCreate) {
          break;
        }
        
        // If there's an error but no exception, handle it
        if (data?.data?.collectionCreate?.userErrors?.length > 0) {
          break; // Don't retry user errors
        }
      } catch (retryError) {
        console.error(`GraphQL error on attempt ${4 - retries}:`, retryError);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw new Error('Failed to create collection after 3 attempts');
        }
      }
    }
    
    if (data.data.collectionCreate.userErrors.length > 0) {
      return json({ 
        success: false, 
        error: data.data.collectionCreate.userErrors[0].message 
      });
    }

    const collectionId = data.data.collectionCreate.collection.id;

    // If manual collection with selected products, add them
    if (collectionType === "manual" && selectedProducts.length > 0) {
      const addProductsMutation = `
        mutation addProductsToCollection($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            collection {
              id
              products(first: 5) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      await admin.graphql(addProductsMutation, {
        variables: {
          id: collectionId,
          productIds: selectedProducts
        }
      });
    }
    
    return json({ 
      success: true, 
      collection: data.data.collectionCreate.collection 
    });
  } catch (error) {
    console.error('Authentication or creation error:', error);
    return json({ success: false, error: "Failed to create collection - please try again" });
  }
};

export default function CreateCollection() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const isLoading = fetcher.state === "submitting";
  
  // Track active page - "create" for this page
  const activePage = "create";
  
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [handle, setHandle] = useState("");
  const collectionType = "manual"; // Always manual collection
  const [isOnlineStore, setIsOnlineStore] = useState(true);
  const [creationProgress, setCreationProgress] = useState(0);
  const [inputError, setInputError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // success, info, draft
  const [showContactModal, setShowContactModal] = useState(false);
  
  // Smart collection conditions state
  const [conditionMatch, setConditionMatch] = useState("all"); // "all" or "any"
  const [conditions, setConditions] = useState([{
    id: 1,
    type: "tag",
    operator: "equals",
    value: ""
  }]);

  // Show toast when collection is created successfully
  useEffect(() => {
    if (fetcher.data?.success) {
      setToastMessage(`Collection '${fetcher.data.collection.title}' created successfully!`);
      setToastType("success");
      setToastActive(true);
      // Auto-dismiss toast after 4.5 seconds
      setTimeout(() => {
        setToastActive(false);
      }, 4500);
      // Reset form after successful creation
      setTimeout(() => {
        setCollectionName("");
        setCollectionDescription("");
        setSeoTitle("");
        setSeoDescription("");
        setHandle("");
      }, 2000);
    }
  }, [fetcher.data]);

  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);
  
  // Manual collection products state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);


  const handleSubmit = () => {
    if (!collectionName.trim()) {
      setInputError("Collection name is required");
      return;
    }
    
    setInputError("");
    
    fetcher.submit(
      {
        title: collectionName,
        description: collectionDescription,
        seoTitle: seoTitle,
        seoDescription: seoDescription,
        handle: handle,
        collectionType: collectionType,
        selectedProducts: JSON.stringify(Array.from(selectedProducts)),
        conditions: JSON.stringify(conditions),
        conditionMatch: conditionMatch
      },
      { method: "POST" }
    );
  };

  const handleAISuggestions = () => {
    const suggestions = {
      names: [
        "Summer Essentials", 
        "Best Sellers 2024", 
        "New Arrivals", 
        "Limited Edition",
        "Trending Now",
        "Customer Favorites",
        "Seasonal Collection",
        "Premium Selection",
        "Flash Sale Items",
        "Featured Products",
        "Holiday Special",
        "Clearance Sale",
        "Exclusive Deals",
        "Weekly Picks",
        "Editor's Choice",
        "Gift Ideas",
        "Back to School",
        "Winter Collection",
        "Spring Collection",
        "Fall Favorites",
        "Weekend Deals",
        "Top Rated",
        "Under $50",
        "Luxury Items",
        "Eco-Friendly",
        "New in Stock",
        "Staff Picks",
        "Bundle Deals",
        "Anniversary Sale",
        "Black Friday Deals"
      ],
      descriptions: [
        "Curated collection of our most popular items",
        "Handpicked products for the season",
        "Exclusive items available for a limited time",
        "Top-rated products loved by our customers",
        "Special offers and discounts on selected items",
        "Fresh arrivals that are trending right now",
        "Premium quality products at the best prices",
        "Carefully selected items for special occasions",
        "Our team's favorite picks for this month",
        "Amazing deals you don't want to miss",
        "Essential items for everyday use",
        "Perfect gifts for your loved ones",
        "Sustainable and eco-conscious products",
        "Limited stock items - grab them while you can",
        "Bestselling products from our catalog"
      ]
    };
    
    // Keep track of last used suggestions to avoid repetition
    if (!window.lastUsedSuggestions) {
      window.lastUsedSuggestions = { names: [], descriptions: [] };
    }
    
    // Filter out recently used names
    let availableNames = suggestions.names.filter(
      name => !window.lastUsedSuggestions.names.includes(name)
    );
    
    // If all names have been used, reset the list
    if (availableNames.length === 0) {
      availableNames = suggestions.names;
      window.lastUsedSuggestions.names = [];
    }
    
    // Filter out recently used descriptions
    let availableDescriptions = suggestions.descriptions.filter(
      desc => !window.lastUsedSuggestions.descriptions.includes(desc)
    );
    
    // If all descriptions have been used, reset the list
    if (availableDescriptions.length === 0) {
      availableDescriptions = suggestions.descriptions;
      window.lastUsedSuggestions.descriptions = [];
    }
    
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    const randomDesc = availableDescriptions[Math.floor(Math.random() * availableDescriptions.length)];
    
    // Add to recently used
    window.lastUsedSuggestions.names.push(randomName);
    window.lastUsedSuggestions.descriptions.push(randomDesc);
    
    // Keep only last 5 used names and descriptions
    if (window.lastUsedSuggestions.names.length > 5) {
      window.lastUsedSuggestions.names.shift();
    }
    if (window.lastUsedSuggestions.descriptions.length > 5) {
      window.lastUsedSuggestions.descriptions.shift();
    }
    
    setCollectionName(randomName);
    setCollectionDescription(randomDesc);
    // Show custom toast for AI suggestions
    setToastMessage("✨ AI suggestions applied!");
    setToastType("info");
    setToastActive(true);
    setTimeout(() => setToastActive(false), 3000);
  };

  useEffect(() => {
    if (isLoading) {
      setCreationProgress(10);
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
      // Removed shopify.toast.show - using custom toast instead
      setTimeout(() => setCreationProgress(0), 2000);
    }
  }, [fetcher.data, shopify, isLoading]);

  // Filter products based on search query
  const filteredProducts = loaderData.products?.filter(product => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    return (
      product.title.toLowerCase().includes(query) ||
      product.vendor.toLowerCase().includes(query) ||
      product.productType.toLowerCase().includes(query) ||
      product.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }) || [];

  // Get products to display (first 20 or all based on showAllProducts)
  const productsToShow = showAllProducts ? filteredProducts : filteredProducts.slice(0, 20);

  const handleProductSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: "80px" }}>
        <TitleBar 
        title="Collection Creator" 
        primaryAction={{
          content: "Create Collection",
          onAction: () => {
            const nameInput = document.querySelector('input[placeholder="e.g., Summer Essentials, Best Sellers"]') as HTMLInputElement;
            if (nameInput) {
              nameInput.focus();
              nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }}
        secondaryActions={[
          {
            content: "Bulk Operations",
            onAction: () => navigate("/app/bulk-operations")
          }
        ]}
      />

      {/* Sticky Magical Navigation Buttons */}
      <div style={{ 
        position: "sticky",
        top: 0,
        zIndex: 999,
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
        }}>
          <Button 
            variant="primary" 
            size="large" 
            fullWidth 
            onClick={() => navigate("/app")}
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
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => navigate("/app/create-collection")}
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
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => navigate("/app/bulk-operations")}
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
        }}>
          <Button 
            size="large" 
            fullWidth 
            onClick={() => navigate("/app/subscription")}
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

      {/* Compact Magical Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "1rem 1.5rem",
        color: "white",
        position: "relative",
        overflow: "hidden",
        borderRadius: "0 0 20px 20px",
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
      }}>
        <div style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "120px",
          height: "120px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-20px",
          left: "-20px",
          width: "100px",
          height: "100px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
        }} />
        
        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
          <InlineStack gap="300" align="center">
            <div style={{
              width: "48px",
              height: "48px",
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            }}>
              <span style={{ fontSize: "24px" }}>✨</span>
            </div>
            <BlockStack gap="100">
              <Text as="h1" variant="headingLg">
                <span style={{ fontWeight: "700", letterSpacing: "0.5px" }}>Create Collection</span>
              </Text>
              <Text variant="bodyMd" tone="base">
                <span style={{ opacity: "0.95" }}>Build organized product collections with ease</span>
              </Text>
            </BlockStack>
          </InlineStack>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <BlockStack gap="400">
          
          {/* Progress Bar */}
          {creationProgress > 0 && creationProgress < 100 && (
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300" align="center">
                  <Icon source={RefreshIcon} />
                  <Text variant="headingMd">Creating Collection</Text>
                </InlineStack>
                <ProgressBar progress={creationProgress} tone="primary" />
                <Text variant="bodySm" alignment="center" tone="subdued">
                  Processing... {creationProgress}%
                </Text>
              </BlockStack>
            </Card>
          )}


          {/* Error Messages */}
          {fetcher.data?.error && !isLoading && (
            <Banner
              title="Unable to create collection"
              tone="critical"
              icon={AlertTriangleIcon}
            >
              <p>{fetcher.data.error}</p>
            </Banner>
          )}


          {/* Basic Information */}
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Collection Details
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Give your collection a name and description
                </Text>
              </BlockStack>
              
              <TextField
                label="Collection Name"
                value={collectionName}
                onChange={setCollectionName}
                placeholder="e.g., Summer Essentials, Best Sellers"
                requiredIndicator
                autoComplete="off"
                error={inputError}
              />

              <TextField
                label="Description"
                value={collectionDescription}
                onChange={setCollectionDescription}
                placeholder="Tell customers about this collection..."
                multiline={3}
                autoComplete="off"
              />

              <InlineStack gap="300">
                <div style={{
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  padding: "2px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 10px rgba(240, 147, 251, 0.3)",
                  display: "inline-block",
                }}>
                  <Button
                    icon={MagicIcon}
                    onClick={handleAISuggestions}
                    variant="primary"
                    size="slim"
                  >
                    <span style={{ fontWeight: "600" }}>✨ AI Suggestions</span>
                  </Button>
                </div>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Visibility Settings */}
          {false && collectionType === "manual" && (
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <InlineStack gap="300" align="space-between">
                    <div>
                      <Text variant="headingMd" as="h2">
                        Products
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Select products to add to this collection
                      </Text>
                    </div>
                    {selectedProducts.size > 0 && (
                      <Badge tone="info">
                        {selectedProducts.size} selected
                      </Badge>
                    )}
                  </InlineStack>
                </BlockStack>
                
                <TextField
                  label="Search products"
                  value={productSearchQuery}
                  onChange={setProductSearchQuery}
                  placeholder="Search by name, vendor, type, or tag..."
                  prefix={<Icon source={SearchIcon} />}
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setProductSearchQuery("")}
                />
                
                {loaderData.products && loaderData.products.length > 0 ? (
                  <BlockStack gap="300">
                    <div style={{ 
                      maxHeight: "400px", 
                      overflowY: "auto",
                      border: "1px solid var(--p-color-border)",
                      borderRadius: "8px",
                      padding: "8px"
                    }}>
                      <BlockStack gap="200">
                        {productsToShow.map((product) => {
                          const isSelected = selectedProducts.has(product.id);
                          const price = product.priceRangeV2?.minVariantPrice;
                          
                          return (
                            <Box
                              key={product.id}
                              padding="300"
                              background={isSelected ? "bg-surface-selected" : "bg-surface"}
                              borderWidth="025"
                              borderColor={isSelected ? "border-brand" : "border"}
                              borderRadius="200"
                              onClick={() => handleProductSelect(product.id)}
                              style={{ cursor: "pointer" }}
                            >
                              <InlineStack gap="300" align="center">
                                <Checkbox
                                  label=""
                                  checked={isSelected}
                                  onChange={() => handleProductSelect(product.id)}
                                />
                                
                                <div style={{ width: "60px", height: "60px", flexShrink: 0 }}>
                                  {product.featuredImage ? (
                                    <Thumbnail
                                      source={product.featuredImage.url}
                                      alt={product.featuredImage.altText || product.title}
                                      size="small"
                                    />
                                  ) : (
                                    <div style={{
                                      width: "60px",
                                      height: "60px",
                                      background: "var(--p-color-bg-surface-neutral-subdued)",
                                      borderRadius: "6px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}>
                                      <Icon source={ImageIcon} tone="subdued" />
                                    </div>
                                  )}
                                </div>
                                
                                <BlockStack gap="100" style={{ flex: 1, minWidth: 0 }}>
                                  <Text variant="bodyMd" fontWeight="medium" truncate>
                                    {product.title}
                                  </Text>
                                  <InlineStack gap="200" align="center">
                                    {price && (
                                      <Text variant="bodySm" tone="subdued">
                                        {formatPrice(price.amount, price.currencyCode)}
                                      </Text>
                                    )}
                                    {product.vendor && (
                                      <Text variant="bodySm" tone="subdued">
                                        • {product.vendor}
                                      </Text>
                                    )}
                                    {product.productType && (
                                      <Text variant="bodySm" tone="subdued">
                                        • {product.productType}
                                      </Text>
                                    )}
                                  </InlineStack>
                                  {product.totalInventory !== null && (
                                    <Text variant="bodySm" tone={product.totalInventory > 0 ? "success" : "critical"}>
                                      {product.totalInventory} in stock
                                    </Text>
                                  )}
                                </BlockStack>
                              </InlineStack>
                            </Box>
                          );
                        })}
                      </BlockStack>
                    </div>
                    
                    <InlineStack gap="300" align="center">
                      <Text variant="bodySm" tone="subdued">
                        Showing {productsToShow.length} of {filteredProducts.length} products
                        {productSearchQuery && ` matching "${productSearchQuery}"`}
                      </Text>
                      
                      {filteredProducts.length > 20 && !showAllProducts && (
                        <Button
                          variant="tertiary"
                          size="slim"
                          onClick={() => setShowAllProducts(true)}
                        >
                          Show all {filteredProducts.length} products
                        </Button>
                      )}
                      
                      {showAllProducts && filteredProducts.length > 20 && (
                        <Button
                          variant="tertiary"
                          size="slim"
                          onClick={() => setShowAllProducts(false)}
                        >
                          Show less
                        </Button>
                      )}
                    </InlineStack>
                    
                    {selectedProducts.size > 0 && (
                      <InlineStack gap="200">
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => setSelectedProducts(new Set())}
                        >
                          Clear selection
                        </Button>
                      </InlineStack>
                    )}
                  </BlockStack>
                ) : (
                  <EmptyState
                    heading="No products found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create some products first to add them to your collection.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          )}

          {/* Smart Collection Conditions - Hidden */}
          {false && collectionType === "smart" && (
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">
                    Conditions
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Products must match:
                  </Text>
                </BlockStack>
                
                <BlockStack gap="300">
                  <InlineStack gap="300">
                    <RadioButton
                      label="All conditions"
                      checked={conditionMatch === "all"}
                      id="all-conditions"
                      name="conditionMatch"
                      onChange={() => setConditionMatch("all")}
                    />
                    <RadioButton
                      label="Any condition"
                      checked={conditionMatch === "any"}
                      id="any-conditions"
                      name="conditionMatch"
                      onChange={() => setConditionMatch("any")}
                    />
                  </InlineStack>

                  <BlockStack gap="300">
                    {conditions.map((condition, index) => (
                      <Box key={condition.id} padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
                        <InlineStack gap="300" align="center">
                          <div style={{ minWidth: "120px" }}>
                            <Select
                              label=""
                              options={[
                                { label: "Tag", value: "tag" },
                                { label: "Product title", value: "title" },
                                { label: "Product type", value: "product_type" },
                                { label: "Product vendor", value: "vendor" },
                                { label: "Variant title", value: "variant_title" },
                                { label: "Variant weight", value: "variant_weight" },
                                { label: "Variant inventory", value: "variant_inventory" },
                                { label: "Variant price", value: "variant_price" },
                                { label: "Variant compare at price", value: "variant_compare_at_price" },
                              ]}
                              value={condition.type}
                              onChange={(value) => {
                                const newConditions = [...conditions];
                                newConditions[index] = { ...condition, type: value };
                                setConditions(newConditions);
                              }}
                            />
                          </div>
                          <div style={{ minWidth: "140px" }}>
                            <Select
                              label=""
                              options={[
                                { label: "is equal to", value: "equals" },
                                { label: "is not equal to", value: "not_equals" },
                                { label: "contains", value: "contains" },
                                { label: "does not contain", value: "not_contains" },
                                { label: "starts with", value: "starts_with" },
                                { label: "ends with", value: "ends_with" },
                                { label: "is greater than", value: "greater_than" },
                                { label: "is less than", value: "less_than" },
                              ]}
                              value={condition.operator}
                              onChange={(value) => {
                                const newConditions = [...conditions];
                                newConditions[index] = { ...condition, operator: value };
                                setConditions(newConditions);
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <TextField
                              label=""
                              value={condition.value}
                              onChange={(value) => {
                                const newConditions = [...conditions];
                                newConditions[index] = { ...condition, value };
                                setConditions(newConditions);
                              }}
                              placeholder="Enter value"
                              autoComplete="off"
                            />
                          </div>
                          {conditions.length > 1 && (
                            <Button
                              variant="tertiary"
                              size="slim"
                              onClick={() => {
                                const newConditions = conditions.filter((_, i) => i !== index);
                                setConditions(newConditions);
                              }}
                              accessibilityLabel="Remove condition"
                            >
                              Remove
                            </Button>
                          )}
                        </InlineStack>
                      </Box>
                    ))}
                    
                    <Button
                      variant="secondary"
                      size="slim"
                      icon={PlusIcon}
                      onClick={() => {
                        const newCondition = {
                          id: Math.max(...conditions.map(c => c.id)) + 1,
                          type: "tag",
                          operator: "equals",
                          value: ""
                        };
                        setConditions([...conditions, newCondition]);
                      }}
                    >
                      Add another condition
                    </Button>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          )}

          {/* Visibility Settings */}
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Visibility
                </Text>
                <Text variant="bodyMd" tone="subdued">
                  Choose where this collection appears
                </Text>
              </BlockStack>
              
              <Box padding="300" background={isOnlineStore ? "bg-surface-success-subdued" : "bg-surface"} borderRadius="200">
                <Checkbox
                  label="Online Store"
                  helpText="Customers can find this collection on your website"
                  checked={isOnlineStore}
                  onChange={setIsOnlineStore}
                />
              </Box>
            </BlockStack>
          </Card>

          {/* SEO Settings - Collapsible */}
          <Card>
            <Box
              padding="400"
              background="bg-surface-neutral-subdued"
              borderRadius="200"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ cursor: "pointer" }}
            >
              <InlineStack gap="300" align="space-between">
                <BlockStack gap="100">
                  <Text variant="headingMd">SEO Settings</Text>
                  <Text variant="bodyMd" tone="subdued">Optional settings for better discoverability</Text>
                </BlockStack>
                <Text variant="headingMd">{showAdvanced ? "−" : "+"}</Text>
              </InlineStack>
            </Box>
            
            {showAdvanced && (
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <TextField
                    label="URL Handle"
                    value={handle}
                    onChange={setHandle}
                    placeholder="summer-collection"
                    prefix="collections/"
                    helpText="Leave empty for auto-generation"
                    autoComplete="off"
                  />

                  <TextField
                    label="SEO Title"
                    value={seoTitle}
                    onChange={setSeoTitle}
                    placeholder="Summer Collection - Your Store"
                    helpText="Title shown in search results"
                    autoComplete="off"
                  />

                  <TextField
                    label="SEO Description"
                    value={seoDescription}
                    onChange={setSeoDescription}
                    placeholder="Shop our curated summer collection..."
                    multiline={2}
                    helpText="Description shown in search results"
                    autoComplete="off"
                  />
                </BlockStack>
              </Box>
            )}
          </Card>
        </BlockStack>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
        borderTop: "2px solid transparent",
        borderImage: "linear-gradient(90deg, #667eea 0%, #f093fb 50%, #4facfe 100%) 1",
        padding: "1rem 1.5rem",
        zIndex: 1000,
        boxShadow: "0 -4px 20px rgba(102, 126, 234, 0.15)",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <InlineStack gap="400" align="center">
            <div style={{
              background: "linear-gradient(135deg, #e0e7ff 0%, #cfe2ff 100%)",
              padding: "2px",
              borderRadius: "10px",
              boxShadow: "0 2px 10px rgba(99, 102, 241, 0.2)",
            }}>
              <Button
                variant="secondary"
                size="large"
                onClick={() => {
                  setIsDraft(true);
                  // Show custom toast for draft
                  setToastMessage("📝 Draft saved!");
                  setToastType("draft");
                  setToastActive(true);
                  setTimeout(() => setToastActive(false), 3000);
                }}
                disabled={!collectionName.trim()}
              >
                <span style={{ fontWeight: "600" }}>📝 Save Draft</span>
              </Button>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                padding: "3px",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
                transition: "all 0.3s ease",
              }}>
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={isLoading}
                  onClick={handleSubmit}
                  disabled={!collectionName.trim()}
                >
                  <span style={{
                    fontWeight: "700",
                    letterSpacing: "0.5px",
                    fontSize: "16px",
                    textShadow: "0 1px 2px rgba(0,0,0,0.1)"
                  }}>
                    {isLoading ? "🎨 Creating Magic..." : "✨ Create Collection"}
                  </span>
                </Button>
              </div>
            </div>
          </InlineStack>
        </div>
      </div>
    </div>
    {toastActive && (
      <div style={{
        position: "fixed",
        top: "240px",
        right: "20px",
        zIndex: 9999,
        background: toastType === "success" ? "#008060" : toastType === "info" ? "#5C6AC4" : "#6B7280",
        color: "white",
        padding: "12px 20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        animation: "slideIn 0.3s ease-out",
        maxWidth: "400px"
      }}>
        <span style={{ fontSize: "20px" }}>
          {toastType === "success" ? "✅" : toastType === "info" ? "✨" : "📝"}
        </span>
        <span>{toastMessage}</span>
        <button
          onClick={toggleToastActive}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "18px",
            marginLeft: "auto",
            padding: "0 4px"
          }}
        >
          ×
        </button>
      </div>
    )}

    {/* Contact Support Modal */}
    <Modal
      open={showContactModal}
      onClose={() => setShowContactModal(false)}
      title="Contact Support"
      primaryAction={{
        content: "Close",
        onAction: () => setShowContactModal(false),
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
                    onClick={() => {
                      navigator.clipboard.writeText('support@axnivo.com');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </BlockStack>
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
  </>
  );
}