import { useState } from "react";
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
  ProgressBar,
  Icon,
  Box,
  Grid,
  DataTable,
  EmptyState,
  List,
  Modal,
  Banner,
} from "@shopify/polaris";
import {
  HeartIcon,
  CheckIcon,
  XSmallIcon,
  AlertTriangleIcon,
  ChartVerticalFilledIcon,
  ChartVerticalIcon,
  RefreshIcon,
  MagicIcon,
  ViewIcon,
  ProductIcon,
  CashDollarIcon,
  ClockIcon,
  HomeIcon,
  CollectionIcon,
  ImportIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

interface HealthMetric {
  name: string;
  score: number;
  maxScore: number;
  status: "good" | "warning" | "critical";
  issues: string[];
  recommendations: string[];
}

interface CollectionHealth {
  id: string;
  title: string;
  handle: string;
  overallScore: number;
  metrics: HealthMetric[];
  trend: "up" | "down" | "stable";
  lastUpdated: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const query = `
    query getCollections {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            image {
              url
              altText
            }
            productsCount {
              count
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
    
    const collections = data.data?.collections?.edges?.map((edge: any) => {
      const collection = edge.node;
      const health = calculateHealthScore(collection);
      return health;
    }) || [];
    
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return json({ collections: [] });
  }
};

function calculateHealthScore(collection: any): CollectionHealth {
  const metrics: HealthMetric[] = [];
  
  // 1. Product Count Metric (20 points)
  const productCount = collection.productsCount?.count || 0;
  const productMetric: HealthMetric = {
    name: "Product Count",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: [],
  };
  
  if (productCount >= 10) {
    productMetric.score = 20;
    productMetric.status = "good";
  } else if (productCount >= 5) {
    productMetric.score = 15;
    productMetric.status = "warning";
    productMetric.issues.push("Low product count");
    productMetric.recommendations.push("Add more products to improve collection appeal");
  } else {
    productMetric.score = productCount * 2;
    productMetric.status = "critical";
    productMetric.issues.push("Very low product count");
    productMetric.recommendations.push("Add at least 10 products for better customer experience");
  }
  metrics.push(productMetric);
  
  // 2. Content Quality Metric (20 points)
  const hasDescription = collection.descriptionHtml && collection.descriptionHtml.length > 50;
  const hasImage = !!collection.image?.url;
  const hasAltText = !!collection.image?.altText;
  
  const contentMetric: HealthMetric = {
    name: "Content Quality",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: [],
  };
  
  if (hasDescription) contentMetric.score += 10;
  else {
    contentMetric.issues.push("Missing description");
    contentMetric.recommendations.push("Add a compelling description");
  }
  
  if (hasImage) contentMetric.score += 7;
  else {
    contentMetric.issues.push("Missing image");
    contentMetric.recommendations.push("Add a collection image");
  }
  
  if (hasAltText) contentMetric.score += 3;
  else if (hasImage) {
    contentMetric.issues.push("Missing alt text");
    contentMetric.recommendations.push("Add alt text for accessibility");
  }
  
  contentMetric.status = contentMetric.score >= 17 ? "good" : contentMetric.score >= 10 ? "warning" : "critical";
  metrics.push(contentMetric);
  
  // 3. Freshness Metric (20 points)
  const daysSinceUpdate = Math.floor((Date.now() - new Date(collection.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const freshnessMetric: HealthMetric = {
    name: "Freshness",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: [],
  };
  
  if (daysSinceUpdate <= 7) {
    freshnessMetric.score = 20;
    freshnessMetric.status = "good";
  } else if (daysSinceUpdate <= 30) {
    freshnessMetric.score = 15;
    freshnessMetric.status = "warning";
    freshnessMetric.issues.push("Not recently updated");
    freshnessMetric.recommendations.push("Refresh collection monthly");
  } else {
    freshnessMetric.score = Math.max(0, 20 - Math.floor(daysSinceUpdate / 10));
    freshnessMetric.status = "critical";
    freshnessMetric.issues.push("Stale collection");
    freshnessMetric.recommendations.push("Update immediately to maintain relevance");
  }
  metrics.push(freshnessMetric);
  
  // 4. SEO Readiness (20 points)
  const seoMetric: HealthMetric = {
    name: "SEO Readiness",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: [],
  };
  
  if (collection.title && collection.title.length >= 20) seoMetric.score += 10;
  else {
    seoMetric.issues.push("Title too short");
    seoMetric.recommendations.push("Expand title for better SEO");
  }
  
  if (collection.handle && collection.handle.includes("-")) seoMetric.score += 5;
  else {
    seoMetric.issues.push("URL not optimized");
    seoMetric.recommendations.push("Use hyphens in URL");
  }
  
  if (hasDescription && collection.descriptionHtml.length >= 150) seoMetric.score += 5;
  else {
    seoMetric.issues.push("Description too short for SEO");
    seoMetric.recommendations.push("Write 150+ character description");
  }
  
  seoMetric.status = seoMetric.score >= 17 ? "good" : seoMetric.score >= 10 ? "warning" : "critical";
  metrics.push(seoMetric);
  
  // 5. Performance Potential (20 points)
  const performanceMetric: HealthMetric = {
    name: "Performance Potential",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: [],
  };
  
  // Simulate performance based on various factors
  if (productCount > 5) performanceMetric.score += 10;
  if (hasImage) performanceMetric.score += 5;
  if (daysSinceUpdate <= 30) performanceMetric.score += 5;
  
  if (performanceMetric.score < 10) {
    performanceMetric.issues.push("Low performance potential");
    performanceMetric.recommendations.push("Improve content and product selection");
  }
  
  performanceMetric.status = performanceMetric.score >= 17 ? "good" : performanceMetric.score >= 10 ? "warning" : "critical";
  metrics.push(performanceMetric);
  
  // Calculate overall score
  const overallScore = Math.round(
    metrics.reduce((sum, metric) => sum + (metric.score / metric.maxScore) * 20, 0)
  );
  
  // Determine trend (simulated)
  const trend = Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "stable" : "down";
  
  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    overallScore,
    metrics,
    trend,
    lastUpdated: collection.updatedAt,
  };
}

export default function HealthScore() {
  const { collections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [selectedCollection, setSelectedCollection] = useState<CollectionHealth | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Calculate statistics
  const healthyCollections = collections.filter(c => c.overallScore >= 80);
  const warningCollections = collections.filter(c => c.overallScore >= 60 && c.overallScore < 80);
  const criticalCollections = collections.filter(c => c.overallScore < 60);
  const averageScore = collections.length > 0
    ? Math.round(collections.reduce((sum, c) => sum + c.overallScore, 0) / collections.length)
    : 0;
  
  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge tone="success">{score}/100</Badge>;
    if (score >= 60) return <Badge tone="warning">{score}/100</Badge>;
    return <Badge tone="critical">{score}/100</Badge>;
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };
  
  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <Icon source={ChartVerticalFilledIcon} tone="success" />;
    if (trend === "down") return <Icon source={ChartVerticalIcon} tone="critical" />;
    return <Icon source={RefreshIcon} />;
  };
  
  const filteredCollections = filterStatus === "all" 
    ? collections
    : filterStatus === "healthy"
    ? healthyCollections
    : filterStatus === "warning"
    ? warningCollections
    : criticalCollections;
  
  const handleViewDetails = (collection: CollectionHealth) => {
    setSelectedCollection(collection);
    setShowDetailsModal(true);
  };
  
  return (
    <Page>
      <TitleBar title="Collection Health Score" />
      
      {/* Animated Header */}
      <div style={{
        background: "linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>
          {`
            @keyframes heartbeat {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            
            .heart-icon {
              animation: heartbeat 2s ease-in-out infinite;
            }
            
            .health-card {
              transition: all 0.3s ease;
              cursor: pointer;
            }
            
            .health-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 15px 30px rgba(0,0,0,0.2);
            }
            
            .health-ring {
              transition: all 0.5s ease;
              stroke-dasharray: 440;
              stroke-dashoffset: 440;
              animation: fillRing 2s ease-out forwards;
            }
            
            @keyframes fillRing {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}
        </style>
        
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  Collection Health Monitor
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Track and improve your collection performance
                </span>
              </Text>
            </div>
            <div className="heart-icon">
              <Icon source={HeartIcon} tone="base" />
            </div>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge tone="success">{healthyCollections.length} Healthy</Badge>
            <Badge tone="warning">{warningCollections.length} Need Attention</Badge>
            <Badge tone="critical">{criticalCollections.length} Critical</Badge>
          </InlineStack>
        </BlockStack>
      </div>
      
      {/* Overall Health Stats */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Icon source={HeartIcon} tone="success" />
                  <Badge tone="success">Health</Badge>
                </InlineStack>
                <Text variant="headingXl">{averageScore}/100</Text>
                <Text variant="bodySm" tone="subdued">Average Score</Text>
                <ProgressBar progress={averageScore} tone="success" />
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Icon source={CheckIcon} tone="success" />
                  <Text variant="bodySm">Healthy</Text>
                </InlineStack>
                <Text variant="headingXl">{healthyCollections.length}</Text>
                <Text variant="bodySm" tone="subdued">Collections</Text>
                <ProgressBar 
                  progress={(healthyCollections.length / collections.length) * 100} 
                  tone="success" 
                />
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Icon source={AlertTriangleIcon} tone="warning" />
                  <Text variant="bodySm">Warning</Text>
                </InlineStack>
                <Text variant="headingXl">{warningCollections.length}</Text>
                <Text variant="bodySm" tone="subdued">Need Attention</Text>
                <ProgressBar 
                  progress={(warningCollections.length / collections.length) * 100} 
                  tone="warning" 
                />
              </BlockStack>
            </Card>
          </Grid.Cell>
          
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Icon source={XSmallIcon} tone="critical" />
                  <Text variant="bodySm">Critical</Text>
                </InlineStack>
                <Text variant="headingXl">{criticalCollections.length}</Text>
                <Text variant="bodySm" tone="subdued">Immediate Action</Text>
                <ProgressBar 
                  progress={(criticalCollections.length / collections.length) * 100} 
                  tone="critical" 
                />
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Collection Health Overview</Text>
                <InlineStack gap="200">
                  <Button
                    onClick={() => setFilterStatus("all")}
                    pressed={filterStatus === "all"}
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("healthy")}
                    pressed={filterStatus === "healthy"}
                  >
                    Healthy
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("warning")}
                    pressed={filterStatus === "warning"}
                  >
                    Warning
                  </Button>
                  <Button
                    onClick={() => setFilterStatus("critical")}
                    pressed={filterStatus === "critical"}
                  >
                    Critical
                  </Button>
                </InlineStack>
              </InlineStack>
              
              {filteredCollections.length === 0 ? (
                <EmptyState
                  heading="No collections found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create collections to monitor their health</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "numeric", "text", "text", "text", "text"]}
                  headings={[
                    "Collection",
                    "Health Score",
                    "Status",
                    "Issues",
                    "Trend",
                    "Actions",
                  ]}
                  rows={filteredCollections.map((collection) => {
                    const criticalIssues = collection.metrics.filter(m => m.status === "critical").length;
                    const warningIssues = collection.metrics.filter(m => m.status === "warning").length;
                    
                    return [
                      <Text variant="bodyMd" fontWeight="semibold">
                        {collection.title}
                      </Text>,
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "50px",
                          height: "50px",
                          position: "relative",
                        }}>
                          <svg width="50" height="50">
                            <circle
                              cx="25"
                              cy="25"
                              r="20"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="4"
                            />
                            <circle
                              cx="25"
                              cy="25"
                              r="20"
                              fill="none"
                              stroke={getScoreColor(collection.overallScore)}
                              strokeWidth="4"
                              strokeDasharray={`${(collection.overallScore / 100) * 126} 126`}
                              transform="rotate(-90 25 25)"
                            />
                            <text
                              x="25"
                              y="25"
                              textAnchor="middle"
                              dy="5"
                              fontSize="14"
                              fontWeight="bold"
                            >
                              {collection.overallScore}
                            </text>
                          </svg>
                        </div>
                        {getScoreBadge(collection.overallScore)}
                      </div>,
                      collection.overallScore >= 80 ? (
                        <Badge tone="success">Healthy</Badge>
                      ) : collection.overallScore >= 60 ? (
                        <Badge tone="warning">Warning</Badge>
                      ) : (
                        <Badge tone="critical">Critical</Badge>
                      ),
                      <InlineStack gap="100">
                        {criticalIssues > 0 && (
                          <Badge tone="critical">{criticalIssues} critical</Badge>
                        )}
                        {warningIssues > 0 && (
                          <Badge tone="warning">{warningIssues} warning</Badge>
                        )}
                        {criticalIssues === 0 && warningIssues === 0 && (
                          <Badge tone="success">No issues</Badge>
                        )}
                      </InlineStack>,
                      getTrendIcon(collection.trend),
                      <InlineStack gap="100">
                        <Button
                          size="slim"
                          onClick={() => handleViewDetails(collection)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="slim"
                          icon={MagicIcon}
                          onClick={() => navigate("/app/collections-enhanced")}
                        >
                          Fix Now
                        </Button>
                      </InlineStack>,
                    ];
                  })}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Health Tips</Text>
                
                <List type="bullet">
                  <List.Item>
                    <Text variant="bodySm">
                      Keep at least 10 products per collection
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Update collections weekly for freshness
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Add high-quality images with alt text
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Write descriptions of 150+ characters
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Use SEO-friendly URLs with hyphens
                    </Text>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Quick Fixes</Text>
                
                <BlockStack gap="200">
                  <Button fullWidth icon={MagicIcon}>
                    Auto-Fix All Issues
                  </Button>
                  
                  <Button fullWidth icon={RefreshIcon}>
                    Refresh All Collections
                  </Button>
                  
                  <Button fullWidth icon={ProductIcon}>
                    Add Missing Products
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Top Issues</Text>
                
                <BlockStack gap="200">
                  <Box padding="200" background="bg-surface-critical-subdued" borderRadius="200">
                    <InlineStack gap="200">
                      <Icon source={XSmallIcon} tone="critical" />
                      <Text variant="bodySm">
                        {criticalCollections.length} collections need immediate attention
                      </Text>
                    </InlineStack>
                  </Box>
                  
                  <Box padding="200" background="bg-surface-warning-subdued" borderRadius="200">
                    <InlineStack gap="200">
                      <Icon source={AlertTriangleIcon} tone="warning" />
                      <Text variant="bodySm">
                        {collections.filter(c => 
                          c.metrics.some(m => m.name === "Freshness" && m.status !== "good")
                        ).length} collections need updating
                      </Text>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {/* Health Details Modal */}
      <Modal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Health Report: ${selectedCollection?.title}`}
        size="large"
        primaryAction={{
          content: "Fix Issues",
          onAction: () => {
            setShowDetailsModal(false);
            navigate("/app/collections-enhanced");
          },
        }}
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setShowDetailsModal(false),
          },
        ]}
      >
        <Modal.Section>
          {selectedCollection && (
            <BlockStack gap="400">
              <Box padding="400" background="bg-surface-neutral-subdued" borderRadius="200">
                <InlineStack align="space-between">
                  <div>
                    <Text variant="headingLg">Overall Health Score</Text>
                    <Text variant="bodySm" tone="subdued">
                      Last updated: {new Date(selectedCollection.lastUpdated).toLocaleDateString()}
                    </Text>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Text variant="heading2xl">
                      {selectedCollection.overallScore}/100
                    </Text>
                    {getScoreBadge(selectedCollection.overallScore)}
                  </div>
                </InlineStack>
              </Box>
              
              <BlockStack gap="300">
                {selectedCollection.metrics.map((metric) => (
                  <Card key={metric.name}>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="headingSm">{metric.name}</Text>
                        <InlineStack gap="200">
                          <Text variant="bodyMd">
                            {metric.score}/{metric.maxScore}
                          </Text>
                          <Badge tone={
                            metric.status === "good" ? "success" :
                            metric.status === "warning" ? "warning" : "critical"
                          }>
                            {metric.status}
                          </Badge>
                        </InlineStack>
                      </InlineStack>
                      
                      <ProgressBar 
                        progress={(metric.score / metric.maxScore) * 100}
                        tone={
                          metric.status === "good" ? "success" :
                          metric.status === "warning" ? "warning" : "critical"
                        }
                      />
                      
                      {metric.issues.length > 0 && (
                        <Box padding="200" background="bg-surface-critical-subdued" borderRadius="100">
                          <BlockStack gap="100">
                            <Text variant="bodySm" fontWeight="semibold">Issues:</Text>
                            <List type="bullet">
                              {metric.issues.map((issue, i) => (
                                <List.Item key={i}>
                                  <Text variant="bodySm">{issue}</Text>
                                </List.Item>
                              ))}
                            </List>
                          </BlockStack>
                        </Box>
                      )}
                      
                      {metric.recommendations.length > 0 && (
                        <Box padding="200" background="bg-surface-info-subdued" borderRadius="100">
                          <BlockStack gap="100">
                            <Text variant="bodySm" fontWeight="semibold">Recommendations:</Text>
                            <List type="bullet">
                              {metric.recommendations.map((rec, i) => (
                                <List.Item key={i}>
                                  <Text variant="bodySm">{rec}</Text>
                                </List.Item>
                              ))}
                            </List>
                          </BlockStack>
                        </Box>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </BlockStack>
          )}
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
            icon={MagicIcon}
            onClick={() => navigate("/app/ai-collections")}
          >
            AI Magic
          </Button>
          <Button
            size="large"
            icon={ChartVerticalFilledIcon}
            onClick={() => navigate("/app/analytics")}
          >
            Analytics
          </Button>
        </InlineStack>
      </div>
      
      <div style={{ paddingBottom: "100px" }}></div>
    </Page>
  );
}