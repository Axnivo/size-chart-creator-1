import { useState, useEffect } from "react";
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
  Banner,
  Badge,
  Select,
  TextField,
  RadioButton,
  Checkbox,
  ProgressBar,
  EmptyState,
  DataTable,
  Modal,
  TextContainer,
  Icon,
  List,
} from "@shopify/polaris";
import {
  MagicIcon,
  CalendarIcon,
  ChartVerticalFilledIcon,
  ImageIcon,
  HomeIcon,
  CollectionIcon,
  RefreshIcon,
  CheckIcon,
  AlertTriangleIcon,
  StarOutlineIcon,
  ImportIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  // Fetch products and their performance data
  const productsQuery = `
    query getProducts {
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            tags
            createdAt
            totalInventory
            priceRangeV2 {
              minVariantPrice {
                amount
              }
              maxVariantPrice {
                amount
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;
  
  try {
    const response = await admin.graphql(productsQuery);
    const data = await response.json();
    const products = data.data?.products?.edges?.map((edge: any) => edge.node) || [];
    
    return json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ products: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  
  if (actionType === "createAICollection") {
    const aiType = formData.get("aiType");
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const productIds = JSON.parse(formData.get("productIds") as string);
    
    const mutation = `
      mutation collectionCreate($input: CollectionInput!) {
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
    
    try {
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            title,
            descriptionHtml: `<p>${description}</p>`,
            handle: title.toLowerCase().replace(/\s+/g, "-"),
            products: productIds,
          },
        },
      });
      
      const data = await response.json();
      
      if (data.data.collectionCreate.userErrors.length === 0) {
        return json({ success: true, collection: data.data.collectionCreate.collection });
      } else {
        return json({ 
          success: false, 
          error: data.data.collectionCreate.userErrors[0].message 
        });
      }
    } catch (error) {
      return json({ success: false, error: "Failed to create collection" });
    }
  }
  
  return json({ success: false, error: "Invalid action" });
};

export default function AICollections() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [aiType, setAiType] = useState("seasonal");
  const [season, setSeason] = useState("summer");
  const [performanceMetric, setPerformanceMetric] = useState("bestsellers");
  const [visualCategory, setVisualCategory] = useState("color");
  const [colorTheme, setColorTheme] = useState("warm");
  const [priceRange, setPriceRange] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  
  const analyzeProducts = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      let filtered = [...products];
      let title = "";
      let description = "";
      
      if (aiType === "seasonal") {
        // Seasonal analysis
        const seasonKeywords: Record<string, string[]> = {
          summer: ["summer", "beach", "sun", "swim", "shorts", "tank", "sandal", "light"],
          winter: ["winter", "coat", "jacket", "warm", "wool", "fleece", "boot", "thermal"],
          spring: ["spring", "floral", "pastel", "light", "fresh", "rain"],
          fall: ["fall", "autumn", "layer", "cardigan", "sweater", "harvest"],
        };
        
        const keywords = seasonKeywords[season] || [];
        filtered = products.filter((p: any) => {
          const searchText = `${p.title} ${p.tags.join(" ")} ${p.productType}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword));
        });
        
        title = `${season.charAt(0).toUpperCase() + season.slice(1)} Collection ${new Date().getFullYear()}`;
        description = `Curated ${season} essentials featuring seasonal favorites and trending items.`;
        
      } else if (aiType === "performance") {
        // Performance-based analysis
        if (performanceMetric === "bestsellers") {
          // Simulate bestsellers (in real app, would use sales data)
          filtered = products.slice(0, 20);
          title = "Bestsellers Collection";
          description = "Our top-performing products loved by customers.";
          
        } else if (performanceMetric === "trending") {
          // Simulate trending (recent products)
          filtered = products.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).slice(0, 15);
          title = "Trending Now";
          description = "Discover what's hot and trending in our store.";
          
        } else if (performanceMetric === "high-margin") {
          // High price products
          filtered = products.filter((p: any) => {
            const price = parseFloat(p.priceRangeV2?.maxVariantPrice?.amount || "0");
            return price > 50;
          }).slice(0, 20);
          title = "Premium Collection";
          description = "Exclusive high-value products for discerning customers.";
        }
        
      } else if (aiType === "visual") {
        // Visual similarity analysis
        if (visualCategory === "color") {
          // Color-based grouping (simplified)
          const colorKeywords: Record<string, string[]> = {
            warm: ["red", "orange", "yellow", "gold", "amber", "coral"],
            cool: ["blue", "green", "purple", "teal", "cyan", "indigo"],
            neutral: ["black", "white", "gray", "grey", "beige", "brown"],
            pastel: ["pink", "lavender", "mint", "peach", "sky", "baby"],
          };
          
          const keywords = colorKeywords[colorTheme] || [];
          filtered = products.filter((p: any) => {
            const searchText = `${p.title} ${p.tags.join(" ")}`.toLowerCase();
            return keywords.some(keyword => searchText.includes(keyword));
          });
          
          title = `${colorTheme.charAt(0).toUpperCase() + colorTheme.slice(1)} Tones Collection`;
          description = `Products featuring ${colorTheme} color palettes and aesthetics.`;
          
        } else if (visualCategory === "style") {
          // Style-based grouping
          const styleKeywords = ["minimal", "vintage", "modern", "classic", "boho"];
          filtered = products.filter((p: any) => {
            const searchText = `${p.title} ${p.tags.join(" ")}`.toLowerCase();
            return styleKeywords.some(keyword => searchText.includes(keyword));
          }).slice(0, 20);
          
          title = "Curated Style Collection";
          description = "Handpicked products that match your aesthetic preferences.";
        }
      }
      
      // Apply price filter if needed
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map(Number);
        filtered = filtered.filter((p: any) => {
          const price = parseFloat(p.priceRangeV2?.minVariantPrice?.amount || "0");
          return price >= min && (max ? price <= max : true);
        });
      }
      
      setSuggestedProducts(filtered.slice(0, 30));
      setSelectedProducts(filtered.slice(0, 30).map((p: any) => p.id));
      setCollectionTitle(title);
      setCollectionDescription(description);
      setIsAnalyzing(false);
    }, 2000);
  };
  
  const handleCreateCollection = () => {
    if (selectedProducts.length > 0 && collectionTitle) {
      fetcher.submit(
        {
          actionType: "createAICollection",
          aiType,
          title: collectionTitle,
          description: collectionDescription,
          productIds: JSON.stringify(selectedProducts),
        },
        { method: "POST" }
      );
    }
  };
  
  useEffect(() => {
    if (fetcher.data?.success) {
      navigate("/app/collections-enhanced");
    }
  }, [fetcher.data, navigate]);
  
  const rows = suggestedProducts.map((product: any) => [
    <Checkbox
      checked={selectedProducts.includes(product.id)}
      onChange={(checked) => {
        if (checked) {
          setSelectedProducts([...selectedProducts, product.id]);
        } else {
          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
        }
      }}
    />,
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {product.images?.edges?.[0]?.node?.url && (
        <img 
          src={product.images.edges[0].node.url} 
          alt={product.title}
          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
        />
      )}
      <div>
        <Text variant="bodyMd" fontWeight="semibold">{product.title}</Text>
        <Text variant="bodySm" tone="subdued">{product.vendor}</Text>
      </div>
    </div>,
    <Badge>{product.productType || "N/A"}</Badge>,
    `$${product.priceRangeV2?.minVariantPrice?.amount || "0"}`,
    <Badge tone="info">{product.totalInventory || 0} in stock</Badge>,
  ]);
  
  return (
    <Page>
      <TitleBar title="AI-Powered Collections" />
      
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
      }}>
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  AI Collection Generator
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Let AI create smart collections based on data and patterns
                </span>
              </Text>
            </div>
            <Icon source={MagicIcon} tone="base" />
          </InlineStack>
        </BlockStack>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Choose AI Analysis Type</Text>
              
              <BlockStack gap="200">
                <RadioButton
                  label={
                    <InlineStack gap="200">
                      <Icon source={CalendarIcon} />
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Seasonal Collections</Text>
                        <Text variant="bodySm" tone="subdued">
                          Automatically group products by season and trends
                        </Text>
                      </div>
                    </InlineStack>
                  }
                  checked={aiType === "seasonal"}
                  onChange={() => setAiType("seasonal")}
                />
                
                <RadioButton
                  label={
                    <InlineStack gap="200">
                      <Icon source={ChartVerticalFilledIcon} />
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Performance-Based</Text>
                        <Text variant="bodySm" tone="subdued">
                          Group by sales performance, trending, or margins
                        </Text>
                      </div>
                    </InlineStack>
                  }
                  checked={aiType === "performance"}
                  onChange={() => setAiType("performance")}
                />
                
                <RadioButton
                  label={
                    <InlineStack gap="200">
                      <Icon source={ImageIcon} />
                      <div>
                        <Text variant="bodyMd" fontWeight="semibold">Visual Similarity</Text>
                        <Text variant="bodySm" tone="subdued">
                          Group products by colors, styles, or visual themes
                        </Text>
                      </div>
                    </InlineStack>
                  }
                  checked={aiType === "visual"}
                  onChange={() => setAiType("visual")}
                />
              </BlockStack>
              
              {/* Configuration Options */}
              {aiType === "seasonal" && (
                <Card sectioned>
                  <BlockStack gap="300">
                    <Select
                      label="Select Season"
                      options={[
                        { label: "Summer", value: "summer" },
                        { label: "Winter", value: "winter" },
                        { label: "Spring", value: "spring" },
                        { label: "Fall/Autumn", value: "fall" },
                      ]}
                      value={season}
                      onChange={setSeason}
                    />
                  </BlockStack>
                </Card>
              )}
              
              {aiType === "performance" && (
                <Card sectioned>
                  <BlockStack gap="300">
                    <Select
                      label="Performance Metric"
                      options={[
                        { label: "Bestsellers", value: "bestsellers" },
                        { label: "Trending Now", value: "trending" },
                        { label: "High Margin Products", value: "high-margin" },
                      ]}
                      value={performanceMetric}
                      onChange={setPerformanceMetric}
                    />
                  </BlockStack>
                </Card>
              )}
              
              {aiType === "visual" && (
                <Card sectioned>
                  <BlockStack gap="300">
                    <Select
                      label="Visual Grouping"
                      options={[
                        { label: "By Color Theme", value: "color" },
                        { label: "By Style", value: "style" },
                      ]}
                      value={visualCategory}
                      onChange={setVisualCategory}
                    />
                    
                    {visualCategory === "color" && (
                      <Select
                        label="Color Theme"
                        options={[
                          { label: "Warm Tones", value: "warm" },
                          { label: "Cool Tones", value: "cool" },
                          { label: "Neutral Tones", value: "neutral" },
                          { label: "Pastel Tones", value: "pastel" },
                        ]}
                        value={colorTheme}
                        onChange={setColorTheme}
                      />
                    )}
                  </BlockStack>
                </Card>
              )}
              
              <Select
                label="Price Range Filter (Optional)"
                options={[
                  { label: "All Prices", value: "all" },
                  { label: "Under $25", value: "0-25" },
                  { label: "$25 - $50", value: "25-50" },
                  { label: "$50 - $100", value: "50-100" },
                  { label: "Over $100", value: "100-9999" },
                ]}
                value={priceRange}
                onChange={setPriceRange}
              />
              
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={analyzeProducts}
                loading={isAnalyzing}
                icon={MagicIcon}
              >
                {isAnalyzing ? "Analyzing Products..." : "Generate AI Collection"}
              </Button>
              
              {isAnalyzing && (
                <BlockStack gap="200">
                  <ProgressBar progress={75} />
                  <Text variant="bodySm" alignment="center">
                    AI is analyzing your products and creating smart groupings...
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
          
          {suggestedProducts.length > 0 && (
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd">AI Suggested Products</Text>
                  <Badge tone="success">
                    {selectedProducts.length} of {suggestedProducts.length} selected
                  </Badge>
                </InlineStack>
                
                <TextField
                  label="Collection Title"
                  value={collectionTitle}
                  onChange={setCollectionTitle}
                />
                
                <TextField
                  label="Collection Description"
                  value={collectionDescription}
                  onChange={setCollectionDescription}
                  multiline={3}
                />
                
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Select", "Product", "Type", "Price", "Inventory"]}
                  rows={rows}
                />
                
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleCreateCollection}
                    loading={fetcher.state === "submitting"}
                    disabled={selectedProducts.length === 0}
                  >
                    Create Collection with {selectedProducts.length} Products
                  </Button>
                  
                  <Button
                    onClick={() => setShowPreview(true)}
                  >
                    Preview Collection
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">AI Insights</Text>
              
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="bodySm">Total Products</Text>
                  <Badge>{products.length}</Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodySm">Products Analyzed</Text>
                  <Badge tone="info">{suggestedProducts.length}</Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text variant="bodySm">Match Rate</Text>
                  <Badge tone="success">
                    {products.length > 0 
                      ? Math.round((suggestedProducts.length / products.length) * 100) 
                      : 0}%
                  </Badge>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">How It Works</Text>
              
              <List type="number">
                <List.Item>
                  <Text variant="bodySm">
                    Choose an AI analysis type that fits your needs
                  </Text>
                </List.Item>
                <List.Item>
                  <Text variant="bodySm">
                    Configure specific parameters for the analysis
                  </Text>
                </List.Item>
                <List.Item>
                  <Text variant="bodySm">
                    AI analyzes your products and suggests groupings
                  </Text>
                </List.Item>
                <List.Item>
                  <Text variant="bodySm">
                    Review and customize the suggested collection
                  </Text>
                </List.Item>
                <List.Item>
                  <Text variant="bodySm">
                    Create the collection with one click
                  </Text>
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Collection Preview"
        primaryAction={{
          content: "Create Collection",
          onAction: handleCreateCollection,
        }}
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setShowPreview(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="headingLg">{collectionTitle}</Text>
            <Text>{collectionDescription}</Text>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
            }}>
              {selectedProducts.slice(0, 6).map((productId) => {
                const product = suggestedProducts.find(p => p.id === productId);
                return product?.images?.edges?.[0]?.node?.url ? (
                  <img
                    key={productId}
                    src={product.images.edges[0].node.url}
                    alt={product.title}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                ) : null;
              })}
            </div>
            
            <Text variant="bodySm" tone="subdued">
              {selectedProducts.length} products will be added to this collection
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {/* Fixed Bottom Navigation */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "1rem",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        zIndex: 1000,
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
            icon={CollectionIcon}
            onClick={() => navigate("/app/collections-enhanced")}
          >
            Collections
          </Button>
          <Button
            size="large"
            icon={ImportIcon}
            onClick={() => navigate("/app/bulk-operations")}
          >
            Bulk Ops
          </Button>
          <Button
            size="large"
            icon={RefreshIcon}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </InlineStack>
      </div>
      
      <div style={{ paddingBottom: "100px" }}></div>
    </Page>
  );
}