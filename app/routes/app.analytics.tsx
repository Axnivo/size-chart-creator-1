import { useState, useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Select,
  DataTable,
  ProgressBar,
  Icon,
  Box,
  Grid,
  Tabs,
  List,
} from "@shopify/polaris";
import {
  ChartVerticalFilledIcon,
  ChartVerticalIcon,
  CashDollarIcon,
  ViewIcon,
  CartFilledIcon,
  CollectionIcon,
  HomeIcon,
  ImportIcon,
  MagicIcon,
  RefreshIcon,
  StarFilledIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const query = `
    query getAnalyticsData {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
            productsCount {
              count
            }
            image {
              url
            }
            updatedAt
            createdAt
          }
        }
      }
    }
  `;
  
  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    
    const collections = data.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0,
      // Simulate analytics data (in production, this would come from actual analytics)
      analytics: {
        revenue: Math.floor(Math.random() * 50000) + 1000,
        views: Math.floor(Math.random() * 10000) + 100,
        orders: Math.floor(Math.random() * 500) + 10,
        conversionRate: (Math.random() * 10 + 0.5).toFixed(2),
        avgOrderValue: Math.floor(Math.random() * 200) + 50,
        growth: Math.random() * 40 - 10, // -10% to +30%
      }
    })) || [];
    
    return json({ collections });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return json({ collections: [] });
  }
};

export default function Analytics() {
  const { collections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [selectedTab, setSelectedTab] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  
  // Calculate totals
  const totals = collections.reduce((acc: any, collection: any) => ({
    revenue: acc.revenue + collection.analytics.revenue,
    views: acc.views + collection.analytics.views,
    orders: acc.orders + collection.analytics.orders,
    collections: acc.collections + 1,
  }), { revenue: 0, views: 0, orders: 0, collections: 0 });
  
  const avgConversionRate = collections.length > 0
    ? (collections.reduce((sum: number, c: any) => sum + parseFloat(c.analytics.conversionRate), 0) / collections.length).toFixed(2)
    : "0";
  
  // Sort collections by selected metric
  const topPerformers = [...collections].sort((a, b) => {
    switch (selectedMetric) {
      case "revenue": return b.analytics.revenue - a.analytics.revenue;
      case "views": return b.analytics.views - a.analytics.views;
      case "orders": return b.analytics.orders - a.analytics.orders;
      case "conversion": return parseFloat(b.analytics.conversionRate) - parseFloat(a.analytics.conversionRate);
      default: return 0;
    }
  }).slice(0, 10);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  // Chart data for revenue trend
  const chartData = [
    { name: "Mon", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Tue", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Wed", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Thu", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Fri", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Sat", value: Math.floor(Math.random() * 5000) + 2000 },
    { name: "Sun", value: Math.floor(Math.random() * 5000) + 2000 },
  ];
  
  const tabs = [
    { id: "overview", content: "Overview", icon: ChartVerticalFilledIcon },
    { id: "performance", content: "Performance", icon: ChartVerticalFilledIcon },
    { id: "comparison", content: "Comparison", icon: CollectionIcon },
    { id: "insights", content: "Insights", icon: StarFilledIcon },
  ];
  
  return (
    <Page>
      <TitleBar title="Collection Analytics" />
      
      {/* Animated Header */}
      <div style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "300px",
          height: "300px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          animation: "pulse 4s ease-in-out infinite",
        }} />
        
        <style>
          {`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.1; }
              50% { transform: scale(1.1); opacity: 0.2; }
            }
            
            @keyframes slideIn {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            .metric-card {
              animation: slideIn 0.5s ease-out;
              transition: all 0.3s ease;
            }
            
            .metric-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
          `}
        </style>
        
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  Analytics Dashboard
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Track performance and optimize your collections
                </span>
              </Text>
            </div>
            <Select
              label=""
              options={[
                { label: "Last 7 Days", value: "7days" },
                { label: "Last 30 Days", value: "30days" },
                { label: "Last 90 Days", value: "90days" },
                { label: "This Year", value: "year" },
              ]}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </InlineStack>
        </BlockStack>
      </div>
      
      {/* Key Metrics Cards */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <div className="metric-card">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Icon source={CashDollarIcon} tone="success" />
                    <Badge tone="success">+12.5%</Badge>
                  </InlineStack>
                  <Text variant="headingXl" as="h2">
                    {formatCurrency(totals.revenue)}
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Total Revenue
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <div className="metric-card" style={{ animationDelay: "0.1s" }}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Icon source={CartFilledIcon} tone="info" />
                    <Badge tone="info">+8.3%</Badge>
                  </InlineStack>
                  <Text variant="headingXl" as="h2">
                    {formatNumber(totals.orders)}
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Total Orders
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <div className="metric-card" style={{ animationDelay: "0.2s" }}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Icon source={ViewIcon} tone="base" />
                    <Badge>+15.2%</Badge>
                  </InlineStack>
                  <Text variant="headingXl" as="h2">
                    {formatNumber(totals.views)}
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Total Views
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <div className="metric-card" style={{ animationDelay: "0.3s" }}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Icon source={ChartVerticalFilledIcon} tone="success" />
                    <Badge tone="success">{avgConversionRate}%</Badge>
                  </InlineStack>
                  <Text variant="headingXl" as="h2">
                    {avgConversionRate}%
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Avg Conversion
                  </Text>
                </BlockStack>
              </Card>
            </div>
          </Grid.Cell>
        </Grid>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              {/* Overview Tab */}
              {selectedTab === 0 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Revenue Trend</Text>
                  
                  <div style={{
                    background: "linear-gradient(to bottom, rgba(139, 92, 246, 0.1), transparent)",
                    borderRadius: "8px",
                    padding: "1rem",
                  }}>
                    <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "10px" }}>
                      {chartData.map((day, index) => {
                        const height = (day.value / Math.max(...chartData.map(d => d.value))) * 100;
                        return (
                          <div key={index} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                              height: `${height}%`,
                              background: "linear-gradient(to top, #8b5cf6, #3b82f6)",
                              borderRadius: "4px 4px 0 0",
                              position: "relative",
                              transition: "all 0.3s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scaleY(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scaleY(1)";
                            }}
                            >
                              <div style={{
                                position: "absolute",
                                top: "-25px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: "10px",
                                fontWeight: "bold",
                              }}>
                                ${(day.value / 1000).toFixed(1)}k
                              </div>
                            </div>
                            <Text variant="bodySm" tone="subdued">
                              {day.name}
                            </Text>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <BlockStack gap="200">
                    <Text variant="headingMd">Quick Stats</Text>
                    <List type="bullet">
                      <List.Item>
                        <InlineStack gap="100">
                          <Text variant="bodyMd">Best performing collection:</Text>
                          <Badge tone="success">{topPerformers[0]?.title}</Badge>
                        </InlineStack>
                      </List.Item>
                      <List.Item>
                        <InlineStack gap="100">
                          <Text variant="bodyMd">Most viewed collection:</Text>
                          <Badge tone="info">
                            {[...collections].sort((a, b) => b.analytics.views - a.analytics.views)[0]?.title}
                          </Badge>
                        </InlineStack>
                      </List.Item>
                      <List.Item>
                        <InlineStack gap="100">
                          <Text variant="bodyMd">Highest conversion rate:</Text>
                          <Badge>
                            {[...collections].sort((a, b) => 
                              parseFloat(b.analytics.conversionRate) - parseFloat(a.analytics.conversionRate)
                            )[0]?.title}
                          </Badge>
                        </InlineStack>
                      </List.Item>
                    </List>
                  </BlockStack>
                </BlockStack>
              )}
              
              {/* Performance Tab */}
              {selectedTab === 1 && (
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">Top Performing Collections</Text>
                    <Select
                      label=""
                      options={[
                        { label: "By Revenue", value: "revenue" },
                        { label: "By Orders", value: "orders" },
                        { label: "By Views", value: "views" },
                        { label: "By Conversion", value: "conversion" },
                      ]}
                      value={selectedMetric}
                      onChange={setSelectedMetric}
                    />
                  </InlineStack>
                  
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "text"]}
                    headings={[
                      "Collection",
                      "Revenue",
                      "Orders",
                      "Views",
                      "Conversion",
                      "Trend",
                    ]}
                    rows={topPerformers.map((collection: any) => [
                      <InlineStack gap="200">
                        {collection.image?.url && (
                          <img
                            src={collection.image.url}
                            alt={collection.title}
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        )}
                        <div>
                          <Text variant="bodyMd" fontWeight="semibold">{collection.title}</Text>
                          <Text variant="bodySm" tone="subdued">
                            {collection.productsCount} products
                          </Text>
                        </div>
                      </InlineStack>,
                      formatCurrency(collection.analytics.revenue),
                      formatNumber(collection.analytics.orders),
                      formatNumber(collection.analytics.views),
                      `${collection.analytics.conversionRate}%`,
                      collection.analytics.growth > 0 ? (
                        <Badge tone="success">
                          <InlineStack gap="050">
                            <Icon source={ChartVerticalFilledIcon} />
                            {Math.abs(collection.analytics.growth).toFixed(1)}%
                          </InlineStack>
                        </Badge>
                      ) : (
                        <Badge tone="critical">
                          <InlineStack gap="050">
                            <Icon source={ChartVerticalIcon} />
                            {Math.abs(collection.analytics.growth).toFixed(1)}%
                          </InlineStack>
                        </Badge>
                      ),
                    ])}
                  />
                </BlockStack>
              )}
              
              {/* Comparison Tab */}
              {selectedTab === 2 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Collection Comparison</Text>
                  
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">
                      Select collections to compare performance metrics
                    </Text>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                      {collections.slice(0, 6).map((collection: any) => (
                        <Box
                          key={collection.id}
                          padding="300"
                          background={selectedCollections.includes(collection.id) ? "bg-surface-selected" : "bg-surface"}
                          borderWidth="025"
                          borderColor="border"
                          borderRadius="200"
                          onClick={() => {
                            if (selectedCollections.includes(collection.id)) {
                              setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                            } else if (selectedCollections.length < 3) {
                              setSelectedCollections([...selectedCollections, collection.id]);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <InlineStack gap="200" align="center">
                            <input
                              type="checkbox"
                              checked={selectedCollections.includes(collection.id)}
                              onChange={() => {}}
                            />
                            <Text variant="bodyMd">{collection.title}</Text>
                          </InlineStack>
                        </Box>
                      ))}
                    </div>
                  </BlockStack>
                  
                  {selectedCollections.length > 0 && (
                    <Card>
                      <BlockStack gap="300">
                        <Text variant="headingSm">Comparison Results</Text>
                        {selectedCollections.map(id => {
                          const collection = collections.find((c: any) => c.id === id);
                          if (!collection) return null;
                          
                          return (
                            <Box key={id} padding="200" background="bg-surface-neutral-subdued" borderRadius="200">
                              <BlockStack gap="200">
                                <Text variant="bodyMd" fontWeight="semibold">
                                  {collection.title}
                                </Text>
                                <InlineStack gap="400">
                                  <Text variant="bodySm">
                                    Revenue: {formatCurrency(collection.analytics.revenue)}
                                  </Text>
                                  <Text variant="bodySm">
                                    Orders: {collection.analytics.orders}
                                  </Text>
                                  <Text variant="bodySm">
                                    Conversion: {collection.analytics.conversionRate}%
                                  </Text>
                                </InlineStack>
                              </BlockStack>
                            </Box>
                          );
                        })}
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              )}
              
              {/* Insights Tab */}
              {selectedTab === 3 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">AI-Powered Insights</Text>
                  
                  <BlockStack gap="300">
                    <Box padding="300" background="bg-surface-success-subdued" borderRadius="200">
                      <InlineStack gap="200" align="start">
                        <Icon source={CheckIcon} tone="success" />
                        <BlockStack gap="100">
                          <Text variant="headingSm">Top Opportunity</Text>
                          <Text variant="bodyMd">
                            The "Summer Essentials" collection has 25% higher conversion rate than average. 
                            Consider featuring it more prominently.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-warning-subdued" borderRadius="200">
                      <InlineStack gap="200" align="start">
                        <Icon source={AlertTriangleIcon} tone="warning" />
                        <BlockStack gap="100">
                          <Text variant="headingSm">Improvement Area</Text>
                          <Text variant="bodyMd">
                            3 collections have zero products. Adding products could increase overall revenue by 15%.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-info-subdued" borderRadius="200">
                      <InlineStack gap="200" align="start">
                        <Icon source={ChartVerticalFilledIcon} tone="info" />
                        <BlockStack gap="100">
                          <Text variant="headingSm">Growth Trend</Text>
                          <Text variant="bodyMd">
                            Collections created in the last 30 days show 40% higher engagement. 
                            Keep the momentum going!
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
                      <InlineStack gap="200" align="start">
                        <Icon source={StarFilledIcon} />
                        <BlockStack gap="100">
                          <Text variant="headingSm">Recommendation</Text>
                          <Text variant="bodyMd">
                            Create seasonal collections 2 weeks before peak shopping periods for 
                            maximum impact.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              )}
            </Tabs>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Performance Score</Text>
                
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <div style={{
                    width: "120px",
                    height: "120px",
                    margin: "0 auto",
                    background: "conic-gradient(#10b981 0deg 270deg, #e5e7eb 270deg)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}>
                    <div style={{
                      width: "100px",
                      height: "100px",
                      background: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Text variant="heading2xl" as="span">
                        75
                      </Text>
                    </div>
                  </div>
                  <Text variant="bodySm" tone="subdued">
                    Your collections are performing well
                  </Text>
                </div>
                
                <BlockStack gap="100">
                  <ProgressBar progress={75} tone="success" />
                  <Text variant="bodySm">75/100 Overall Score</Text>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Quick Actions</Text>
                
                <Button fullWidth onClick={() => navigate("/app/ai-collections")}>
                  Create AI Collection
                </Button>
                
                <Button fullWidth onClick={() => navigate("/app/bulk-operations")}>
                  Bulk Operations
                </Button>
                
                <Button fullWidth variant="plain">
                  Export Report
                </Button>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Tips</Text>
                
                <List type="bullet">
                  <List.Item>
                    <Text variant="bodySm">
                      Update collections weekly for better engagement
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Use high-quality images to increase click rates
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Create seasonal collections 2 weeks early
                    </Text>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
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
            icon={MagicIcon}
            onClick={() => navigate("/app/ai-collections")}
          >
            AI Magic
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