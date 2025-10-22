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
  Badge,
  TextField,
  Modal,
  Banner,
  ProgressBar,
  Icon,
  Box,
  DataTable,
  EmptyState,
  Tabs,
  List,
} from "@shopify/polaris";
import {
  SearchIcon,
  CheckIcon,
  XSmallIcon,
  AlertTriangleIcon,
  MagicIcon,
  GlobeIcon,
  HashtagIcon,
  ImageIcon,
  RefreshIcon,
  HomeIcon,
  CollectionIcon,
  ImportIcon,
  ChartVerticalFilledIcon,
  EditIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
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
            }
          }
        }
      }
    `;
    
    const response = await admin.graphql(query);
    const data = await response.json();
    
    const collections = data.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0,
      // Calculate SEO score (in production, this would be more sophisticated)
      seoScore: calculateSEOScore(edge.node),
    })) || [];
    
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    // Return empty data instead of showing login prompts
    return json({ collections: [] });
  }
};

function calculateSEOScore(collection: any): number {
  let score = 0;
  
  // Title optimization (20 points)
  if (collection.title) {
    if (collection.title.length >= 30 && collection.title.length <= 60) score += 20;
    else if (collection.title.length >= 20) score += 10;
  }
  
  // Description (20 points)
  const description = collection.descriptionHtml?.replace(/<[^>]*>/g, "") || "";
  if (description.length >= 150 && description.length <= 160) score += 20;
  else if (description.length >= 100) score += 10;
  
  // Handle/URL (15 points)
  if (collection.handle) {
    if (collection.handle.includes("-")) score += 10;
    if (collection.handle.length <= 50) score += 5;
  }
  
  // Image (15 points)
  if (collection.image?.url) score += 10;
  if (collection.image?.altText) score += 5;
  
  // Products (15 points)
  if (collection.productsCount > 0) score += 15;
  
  // Keywords simulation (15 points)
  if (description.split(" ").length > 20) score += 15;
  
  return Math.min(score, 100);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    
    if (actionType === "updateSEO") {
      const collectionId = formData.get("collectionId") as string;
      const seoTitle = formData.get("seoTitle") as string;
      const seoDescription = formData.get("seoDescription") as string;
      
      // Update collection SEO settings in Shopify
      const mutation = `
        mutation updateCollectionSEO($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
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
      
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            id: collectionId,
            seo: {
              title: seoTitle,
              description: seoDescription
            }
          }
        }
      });
      
      const data = await response.json();
      
      if (data.data?.collectionUpdate?.userErrors?.length > 0) {
        return json({ 
          success: false, 
          error: data.data.collectionUpdate.userErrors[0].message 
        });
      }
      
      return json({ success: true, message: "SEO settings updated successfully" });
    }
  
  if (actionType === "generateMeta") {
    // AI-powered meta generation (simulated)
    const title = formData.get("title") as string;
    const generatedMeta = {
      title: `${title} | Best Deals & Free Shipping`,
      description: `Shop our ${title} collection. Discover amazing products with free shipping on orders over $50. Limited time offers available.`,
      keywords: `${title.toLowerCase()}, online shopping, best deals, free shipping`,
    };
    
    return json({ success: true, generatedMeta });
  }
  
  return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: "Authentication or action failed" });
  }
};

export default function SEOTools() {
  const { collections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [schemaType, setSchemaType] = useState("Product");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const handleOptimize = (collection: any) => {
    setSelectedCollection(collection);
    setSeoTitle(collection.title);
    setSeoDescription(collection.descriptionHtml?.replace(/<[^>]*>/g, "") || "");
    setShowOptimizeModal(true);
  };
  
  const handleGenerateMeta = () => {
    if (selectedCollection) {
      setIsAnalyzing(true);
      fetcher.submit(
        {
          actionType: "generateMeta",
          title: selectedCollection.title,
        },
        { method: "POST" }
      );
      
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 2000);
    }
  };
  
  const handleSaveSEO = () => {
    if (selectedCollection) {
      fetcher.submit(
        {
          actionType: "updateSEO",
          collectionId: selectedCollection.id,
          seoTitle,
          seoDescription,
        },
        { method: "POST" }
      );
      
      // Wait a moment then close modal and refresh
      setTimeout(() => {
        setShowOptimizeModal(false);
        navigate("/app/seo-tools", { replace: true });
      }, 500);
    }
  };
  
  useEffect(() => {
    if (fetcher.data?.generatedMeta) {
      setSeoTitle(fetcher.data.generatedMeta.title);
      setSeoDescription(fetcher.data.generatedMeta.description);
      setKeywords(fetcher.data.generatedMeta.keywords);
    }
  }, [fetcher.data]);
  
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
  
  const tabs = [
    { id: "analyzer", content: "SEO Analyzer", icon: SearchIcon },
    { id: "meta", content: "Meta Tags", icon: HashtagIcon },
    { id: "schema", content: "Schema Markup", icon: GlobeIcon },
    { id: "suggestions", content: "Suggestions", icon: MagicIcon },
  ];
  
  // Sort collections by SEO score
  const sortedCollections = [...collections].sort((a, b) => a.seoScore - b.seoScore);
  
  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar 
        title="SEO Optimization Tools"
        primaryAction={{
          content: "View Collections",
          onAction: () => navigate("/app/collections-enhanced")
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
            content: "Create Collection",
            onAction: () => navigate("/app")
          },
          {
            content: "Bulk Operations",
            onAction: () => navigate("/app/bulk-operations")
          }
        ]}
      />

      {/* Sticky Navigation Header */}
      <div style={{ 
        position: "sticky",
        top: 0,
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        zIndex: 100,
        padding: "0.5rem 1rem"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", maxWidth: "1200px", margin: "0 auto" }}>
          <Button size="large" fullWidth onClick={() => navigate("/app")}>
            <Icon source={HomeIcon} /> Home
          </Button>
          <Button size="large" fullWidth onClick={() => navigate("/app/collections-enhanced")}>View All Collections</Button>
          <Button size="large" fullWidth onClick={() => navigate("/app")}>Create Collection</Button>
          <Button size="large" fullWidth onClick={() => navigate("/app/bulk-operations")}>Bulk Operations</Button>
          <Button variant="primary" size="large" fullWidth onClick={() => navigate("/app/seo-tools")}>SEO Tools</Button>
        </div>
      </div>

      <Page>
      
      {/* Animated Header */}
      <div style={{
        background: "linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #6366f1 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>
          {`
            @keyframes searchPulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            
            .search-icon {
              animation: searchPulse 2s ease-in-out infinite;
            }
            
            .seo-card {
              transition: all 0.3s ease;
            }
            
            .seo-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 15px 30px rgba(0,0,0,0.2);
            }
            
            .score-ring {
              transition: all 0.5s ease;
            }
          `}
        </style>
        
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  SEO Optimization Center
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Boost your collections' search visibility
                </span>
              </Text>
            </div>
            <div className="search-icon">
              <Icon source={SearchIcon} tone="base" />
            </div>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge tone="success">
              {collections.filter(c => c.seoScore >= 80).length} Optimized
            </Badge>
            <Badge tone="warning">
              {collections.filter(c => c.seoScore >= 60 && c.seoScore < 80).length} Needs Work
            </Badge>
            <Badge tone="critical">
              {collections.filter(c => c.seoScore < 60).length} Poor SEO
            </Badge>
          </InlineStack>
        </BlockStack>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Collection SEO Analysis</Text>
                <Button
                  icon={RefreshIcon}
                  onClick={() => navigate("/app/seo-tools", { replace: true })}
                >
                  Re-analyze
                </Button>
              </InlineStack>
              
              {collections.length === 0 ? (
                <EmptyState
                  heading="No collections to analyze"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create collections first to analyze their SEO</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "numeric", "text", "text", "text"]}
                  headings={[
                    "Collection",
                    "SEO Score",
                    "Issues",
                    "Opportunities",
                    "Actions",
                  ]}
                  rows={sortedCollections.map((collection: any) => {
                    const issues = [];
                    const opportunities = [];
                    
                    if (!collection.descriptionHtml) issues.push("No description");
                    if (!collection.image?.url) issues.push("No image");
                    if (!collection.image?.altText) issues.push("No alt text");
                    if (collection.productsCount === 0) issues.push("No products");
                    
                    if (collection.title.length < 30) opportunities.push("Expand title");
                    if (!collection.handle.includes("-")) opportunities.push("Optimize URL");
                    
                    return [
                      <InlineStack gap="200" align="center">
                        {collection.image?.url ? (
                          <img
                            src={collection.image.url}
                            alt={collection.title}
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        ) : (
                          <Icon source={ImageIcon} />
                        )}
                        <div>
                          <Text variant="bodyMd" fontWeight="semibold">
                            {collection.title}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            /{collection.handle}
                          </Text>
                        </div>
                      </InlineStack>,
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          border: `3px solid ${getScoreColor(collection.seoScore)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}>
                          {collection.seoScore}
                        </div>
                        {getScoreBadge(collection.seoScore)}
                      </div>,
                      issues.length > 0 ? (
                        <InlineStack gap="100" wrap>
                          {issues.slice(0, 2).map((issue, i) => (
                            <Badge key={i} tone="critical">
                              <InlineStack gap="050">
                                <Icon source={XSmallIcon} />
                                {issue}
                              </InlineStack>
                            </Badge>
                          ))}
                          {issues.length > 2 && (
                            <Badge>+{issues.length - 2} more</Badge>
                          )}
                        </InlineStack>
                      ) : (
                        <Badge tone="success">
                          <InlineStack gap="050">
                            <Icon source={CheckIcon} />
                            All good
                          </InlineStack>
                        </Badge>
                      ),
                      opportunities.length > 0 ? (
                        <InlineStack gap="100" wrap>
                          {opportunities.map((opp, i) => (
                            <Badge key={i} tone="info">{opp}</Badge>
                          ))}
                        </InlineStack>
                      ) : (
                        <Text variant="bodySm" tone="subdued">-</Text>
                      ),
                      <Button
                        size="slim"
                        onClick={() => handleOptimize(collection)}
                      >
                        Optimize
                      </Button>,
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
                <Text variant="headingMd">Overall SEO Health</Text>
                
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <div style={{
                    width: "120px",
                    height: "120px",
                    margin: "0 auto",
                    background: `conic-gradient(
                      #10b981 0deg ${(collections.filter(c => c.seoScore >= 80).length / collections.length) * 360}deg,
                      #f59e0b ${(collections.filter(c => c.seoScore >= 80).length / collections.length) * 360}deg ${((collections.filter(c => c.seoScore >= 80).length + collections.filter(c => c.seoScore >= 60 && c.seoScore < 80).length) / collections.length) * 360}deg,
                      #ef4444 ${((collections.filter(c => c.seoScore >= 80).length + collections.filter(c => c.seoScore >= 60 && c.seoScore < 80).length) / collections.length) * 360}deg
                    )`,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                      <Text variant="heading2xl">
                        {collections.length > 0 
                          ? Math.round(collections.reduce((sum, c) => sum + c.seoScore, 0) / collections.length)
                          : 0}
                      </Text>
                    </div>
                  </div>
                  <Text variant="bodySm" tone="subdued">
                    Average SEO Score
                  </Text>
                </div>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Quick Actions</Text>
                
                <BlockStack gap="200">
                  <Button fullWidth icon={MagicIcon}>
                    Generate All Meta Tags
                  </Button>
                  
                  <Button fullWidth icon={GlobeIcon}>
                    Create Sitemap
                  </Button>
                  
                  <Button fullWidth icon={HashtagIcon}>
                    Bulk Update Keywords
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">SEO Tips</Text>
                
                <List type="bullet">
                  <List.Item>
                    <Text variant="bodySm">
                      Keep titles between 30-60 characters
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Write descriptions of 150-160 characters
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Use descriptive URLs with hyphens
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Add alt text to all images
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text variant="bodySm">
                      Include relevant keywords naturally
                    </Text>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {/* SEO Optimization Modal */}
      <Modal
        open={showOptimizeModal}
        onClose={() => setShowOptimizeModal(false)}
        title={`Optimize SEO: ${selectedCollection?.title}`}
        size="large"
        primaryAction={{
          content: "Save Changes",
          onAction: handleSaveSEO,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowOptimizeModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {/* SEO Analyzer Tab */}
            {selectedTab === 0 && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">SEO Analysis</Text>
                  
                  {selectedCollection && (
                    <BlockStack gap="300">
                      <Box padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd">Current SEO Score</Text>
                          <Text variant="headingLg">
                            {selectedCollection.seoScore}/100
                          </Text>
                        </InlineStack>
                        <ProgressBar progress={selectedCollection.seoScore} tone={
                          selectedCollection.seoScore >= 80 ? "success" :
                          selectedCollection.seoScore >= 60 ? "warning" : "critical"
                        } />
                      </Box>
                      
                      <BlockStack gap="200">
                        <Text variant="headingSm">Issues Found</Text>
                        
                        {!selectedCollection.descriptionHtml && (
                          <InlineStack gap="200">
                            <Icon source={XSmallIcon} tone="critical" />
                            <Text variant="bodyMd">Missing meta description</Text>
                          </InlineStack>
                        )}
                        
                        {selectedCollection.title.length < 30 && (
                          <InlineStack gap="200">
                            <Icon source={AlertTriangleIcon} tone="warning" />
                            <Text variant="bodyMd">Title too short (under 30 chars)</Text>
                          </InlineStack>
                        )}
                        
                        {!selectedCollection.image?.altText && (
                          <InlineStack gap="200">
                            <Icon source={XSmallIcon} tone="critical" />
                            <Text variant="bodyMd">Missing image alt text</Text>
                          </InlineStack>
                        )}
                      </BlockStack>
                      
                      <BlockStack gap="200">
                        <Text variant="headingSm">Recommendations</Text>
                        
                        <InlineStack gap="200">
                          <Icon source={CheckIcon} tone="success" />
                          <Text variant="bodyMd">Add focus keywords to title</Text>
                        </InlineStack>
                        
                        <InlineStack gap="200">
                          <Icon source={CheckIcon} tone="success" />
                          <Text variant="bodyMd">Include call-to-action in description</Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            )}
            
            {/* Meta Tags Tab */}
            {selectedTab === 1 && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">Meta Tags</Text>
                    <Button
                      icon={MagicIcon}
                      onClick={handleGenerateMeta}
                      loading={isAnalyzing}
                    >
                      AI Generate
                    </Button>
                  </InlineStack>
                  
                  <TextField
                    label="SEO Title"
                    value={seoTitle}
                    onChange={setSeoTitle}
                    helpText={`${seoTitle.length}/60 characters`}
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Meta Description"
                    value={seoDescription}
                    onChange={setSeoDescription}
                    multiline={3}
                    helpText={`${seoDescription.length}/160 characters`}
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Keywords"
                    value={keywords}
                    onChange={setKeywords}
                    placeholder="summer, collection, sale, fashion"
                    helpText="Comma-separated keywords"
                    autoComplete="off"
                  />
                  
                  <Box padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
                    <BlockStack gap="200">
                      <Text variant="headingSm">Preview</Text>
                      <Text variant="bodyMd" fontWeight="semibold" tone="info">
                        {seoTitle || selectedCollection?.title}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        https://yourstore.com/collections/{selectedCollection?.handle}
                      </Text>
                      <Text variant="bodySm">
                        {seoDescription || "No description provided"}
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            )}
            
            {/* Schema Markup Tab */}
            {selectedTab === 2 && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">Schema Markup</Text>
                  
                  <Box padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
                    <pre style={{ fontSize: "12px", overflow: "auto" }}>
{`{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "${selectedCollection?.title}",
  "description": "${seoDescription}",
  "url": "https://yourstore.com/collections/${selectedCollection?.handle}",
  "numberOfItems": ${selectedCollection?.productsCount},
  "image": "${selectedCollection?.image?.url || ""}",
  "potentialAction": {
    "@type": "ViewAction",
    "target": "https://yourstore.com/collections/${selectedCollection?.handle}"
  }
}`}
                    </pre>
                  </Box>
                  
                  <Button fullWidth>
                    Copy Schema Markup
                  </Button>
                </BlockStack>
              </Card>
            )}
            
            {/* Suggestions Tab */}
            {selectedTab === 3 && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd">AI Suggestions</Text>
                  
                  <BlockStack gap="300">
                    <Box padding="300" background="bg-surface-success-subdued" borderRadius="200">
                      <BlockStack gap="100">
                        <Text variant="headingSm">Title Suggestions</Text>
                        <List type="bullet">
                          <List.Item>{selectedCollection?.title} - Best Deals</List.Item>
                          <List.Item>Shop {selectedCollection?.title} Collection</List.Item>
                          <List.Item>{selectedCollection?.title} | Up to 50% Off</List.Item>
                        </List>
                      </BlockStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-info-subdued" borderRadius="200">
                      <BlockStack gap="100">
                        <Text variant="headingSm">Description Ideas</Text>
                        <List type="bullet">
                          <List.Item>
                            Discover our {selectedCollection?.title} collection with exclusive deals
                          </List.Item>
                          <List.Item>
                            Shop {selectedCollection?.productsCount} amazing products in our {selectedCollection?.title}
                          </List.Item>
                        </List>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </Tabs>
        </Modal.Section>
      </Modal>
      
      {fetcher.data?.success && (
        <Banner tone="success" onDismiss={() => {}}>
          {fetcher.data.message}
        </Banner>
      )}
      
    </Page>
    </div>
  );
}