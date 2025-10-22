import { useState } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Grid,
  Modal,
  TextField,
  Icon,
  Banner,
  Box,
  Tabs,
} from "@shopify/polaris";
import {
  StarFilledIcon,
  PlusIcon,
  DuplicateIcon,
  CheckIcon,
  CalendarIcon,
  ProductIcon,
  ChartVerticalFilledIcon,
  HashtagIcon,
  ImageIcon,
  CollectionIcon,
  HomeIcon,
  ImportIcon,
  MagicIcon,
  ViewIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

const TEMPLATES = [
  {
    id: "seasonal-summer",
    category: "seasonal",
    title: "Summer Collection",
    description: "Perfect for showcasing summer products, beachwear, and outdoor items",
    icon: "☀️",
    color: "linear-gradient(135deg, #ffd89b 0%, #ff6b6b 100%)",
    tags: ["summer", "beach", "outdoor", "warm"],
    products: ["swimwear", "sunglasses", "sandals", "shorts"],
    rules: [
      { type: "tag", operator: "contains", value: "summer" },
      { type: "product_type", operator: "equals", value: "swimwear" },
    ],
  },
  {
    id: "seasonal-winter",
    category: "seasonal",
    title: "Winter Wonderland",
    description: "Cozy winter essentials and holiday items",
    icon: "❄️",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tags: ["winter", "cold", "holiday", "cozy"],
    products: ["jackets", "boots", "scarves", "gloves"],
    rules: [
      { type: "tag", operator: "contains", value: "winter" },
      { type: "product_type", operator: "equals", value: "outerwear" },
    ],
  },
  {
    id: "sale-flash",
    category: "promotional",
    title: "Flash Sale",
    description: "Limited time offers and quick deals",
    icon: "⚡",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    tags: ["sale", "discount", "limited", "flash"],
    products: ["clearance", "overstock"],
    rules: [
      { type: "tag", operator: "contains", value: "sale" },
      { type: "compare_at_price", operator: "greater_than", value: "0" },
    ],
  },
  {
    id: "new-arrivals",
    category: "product-launch",
    title: "New Arrivals",
    description: "Showcase your latest products and fresh inventory",
    icon: "✨",
    color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    tags: ["new", "arrival", "latest", "fresh"],
    products: ["recent"],
    rules: [
      { type: "created_at", operator: "greater_than", value: "30_days_ago" },
    ],
  },
  {
    id: "bestsellers",
    category: "performance",
    title: "Best Sellers",
    description: "Your top-performing products in one collection",
    icon: "🏆",
    color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    tags: ["bestseller", "popular", "trending"],
    products: ["top-rated"],
    rules: [
      { type: "tag", operator: "contains", value: "bestseller" },
    ],
  },
  {
    id: "gift-guide",
    category: "occasion",
    title: "Gift Guide",
    description: "Curated gift ideas for special occasions",
    icon: "🎁",
    color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    tags: ["gift", "present", "occasion"],
    products: ["giftable"],
    rules: [
      { type: "tag", operator: "contains", value: "gift" },
    ],
  },
  {
    id: "eco-friendly",
    category: "lifestyle",
    title: "Eco-Friendly",
    description: "Sustainable and environmentally conscious products",
    icon: "🌱",
    color: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
    tags: ["eco", "sustainable", "organic", "green"],
    products: ["sustainable"],
    rules: [
      { type: "tag", operator: "contains", value: "eco" },
      { type: "tag", operator: "contains", value: "sustainable" },
    ],
  },
  {
    id: "luxury",
    category: "premium",
    title: "Luxury Collection",
    description: "Premium, high-end products for discerning customers",
    icon: "💎",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tags: ["luxury", "premium", "exclusive"],
    products: ["high-end"],
    rules: [
      { type: "price", operator: "greater_than", value: "100" },
      { type: "tag", operator: "contains", value: "luxury" },
    ],
  },
  {
    id: "clearance",
    category: "promotional",
    title: "Clearance Sale",
    description: "Deep discounts on last-chance items",
    icon: "🏷️",
    color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    tags: ["clearance", "final-sale", "last-chance"],
    products: ["clearance"],
    rules: [
      { type: "tag", operator: "contains", value: "clearance" },
      { type: "inventory_quantity", operator: "less_than", value: "10" },
    ],
  },
  {
    id: "trending",
    category: "performance",
    title: "Trending Now",
    description: "What's hot and popular right now",
    icon: "🔥",
    color: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    tags: ["trending", "hot", "popular"],
    products: ["trending"],
    rules: [
      { type: "tag", operator: "contains", value: "trending" },
    ],
  },
];

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const templateId = formData.get("templateId");
  const customTitle = formData.get("customTitle");
  const customDescription = formData.get("customDescription");
  
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return json({ success: false, error: "Template not found" });
  }
  
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
          title: customTitle || template.title,
          descriptionHtml: `<p>${customDescription || template.description}</p>`,
          handle: (customTitle || template.title).toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
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
    return json({ success: false, error: "Failed to create collection from template" });
  }
};

export default function Templates() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  
  const categories = [
    { id: "all", content: "All Templates", icon: DuplicateIcon },
    { id: "seasonal", content: "Seasonal", icon: CalendarIcon },
    { id: "promotional", content: "Promotional", icon: HashtagIcon },
    { id: "performance", content: "Performance", icon: ChartVerticalFilledIcon },
    { id: "occasion", content: "Occasions", icon: ProductIcon },
    { id: "lifestyle", content: "Lifestyle", icon: StarFilledIcon },
    { id: "premium", content: "Premium", icon: StarFilledIcon },
    { id: "product-launch", content: "Product Launch", icon: PlusIcon },
  ];
  
  const filteredTemplates = selectedCategory === 0 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === categories[selectedCategory].id);
  
  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setCustomTitle(template.title);
    setCustomDescription(template.description);
  };
  
  const handleCreateFromTemplate = () => {
    if (selectedTemplate) {
      fetcher.submit(
        {
          templateId: selectedTemplate.id,
          customTitle,
          customDescription,
        },
        { method: "POST" }
      );
      setSelectedTemplate(null);
    }
  };
  
  if (fetcher.data?.success) {
    navigate("/app/collections-enhanced");
  }
  
  return (
    <Page>
      <TitleBar title="Collection Templates" />
      
      {/* Animated Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }
            
            .template-card {
              transition: all 0.3s ease;
              cursor: pointer;
              position: relative;
              overflow: hidden;
            }
            
            .template-card:hover {
              transform: translateY(-10px) scale(1.02);
              box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            }
            
            .template-card::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
              transform: rotate(45deg);
              transition: all 0.5s;
              opacity: 0;
            }
            
            .template-card:hover::before {
              animation: shine 0.5s ease-in-out;
            }
            
            @keyframes shine {
              0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
              50% { opacity: 1; }
              100% { transform: translateX(100%) translateY(100%) rotate(45deg); opacity: 0; }
            }
          `}
        </style>
        
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  Template Gallery
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Professional templates to jumpstart your collections
                </span>
              </Text>
            </div>
            <div style={{ animation: "float 3s ease-in-out infinite" }}>
              <Icon source={DuplicateIcon} tone="base" />
            </div>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge tone="success">{TEMPLATES.length} Templates</Badge>
            <Badge tone="info">8 Categories</Badge>
            <Badge>One-Click Setup</Badge>
          </InlineStack>
        </BlockStack>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <Tabs tabs={categories} selected={selectedCategory} onSelect={setSelectedCategory}>
              <BlockStack gap="400">
                <Grid>
                  {filteredTemplates.map((template) => (
                    <Grid.Cell key={template.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                      <div className="template-card">
                        <Card>
                          <BlockStack gap="300">
                            <div style={{
                              height: "120px",
                              background: template.color,
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "3rem",
                            }}>
                              {template.icon}
                            </div>
                            
                            <BlockStack gap="200">
                              <Text variant="headingMd" fontWeight="semibold">
                                {template.title}
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                {template.description}
                              </Text>
                            </BlockStack>
                            
                            <InlineStack gap="100" wrap>
                              {template.tags.slice(0, 3).map((tag: string) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </InlineStack>
                            
                            <InlineStack gap="100">
                              <Button
                                fullWidth
                                onClick={() => handleUseTemplate(template)}
                                icon={CheckIcon}
                              >
                                Use Template
                              </Button>
                              <Button
                                icon={ViewIcon}
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowPreview(true);
                                }}
                              />
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </div>
                    </Grid.Cell>
                  ))}
                </Grid>
                
                {filteredTemplates.length === 0 && (
                  <Box padding="800">
                    <BlockStack gap="400" align="center">
                      <Icon source={CollectionIcon} tone="subdued" />
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        No templates found in this category
                      </Text>
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Tabs>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Template Benefits</Text>
                
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Save hours of setup time</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Professional designs</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">SEO optimized</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Conversion focused</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Mobile responsive</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Custom Template?</Text>
                <Text variant="bodyMd" tone="subdued">
                  Can't find what you need? Create your own template or request a custom design.
                </Text>
                <Button fullWidth icon={PlusIcon}>
                  Create Custom Template
                </Button>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Popular This Week</Text>
                
                <BlockStack gap="200">
                  {TEMPLATES.slice(0, 3).map((template) => (
                    <Box
                      key={template.id}
                      padding="200"
                      background="bg-surface-neutral-subdued"
                      borderRadius="200"
                    >
                      <InlineStack gap="200" align="center">
                        <span>{template.icon}</span>
                        <div style={{ flex: 1 }}>
                          <Text variant="bodyMd" fontWeight="semibold">
                            {template.title}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Used 234 times
                          </Text>
                        </div>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {/* Template Customization Modal */}
      <Modal
        open={!!selectedTemplate && !showPreview}
        onClose={() => setSelectedTemplate(null)}
        title="Customize Template"
        primaryAction={{
          content: "Create Collection",
          onAction: handleCreateFromTemplate,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setSelectedTemplate(null),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Box padding="300" background="bg-surface-neutral-subdued" borderRadius="200">
              <InlineStack gap="200" align="center">
                <span style={{ fontSize: "2rem" }}>{selectedTemplate?.icon}</span>
                <div>
                  <Text variant="headingMd">{selectedTemplate?.title}</Text>
                  <Text variant="bodySm" tone="subdued">Template</Text>
                </div>
              </InlineStack>
            </Box>
            
            <TextField
              label="Collection Title"
              value={customTitle}
              onChange={setCustomTitle}
              autoComplete="off"
            />
            
            <TextField
              label="Collection Description"
              value={customDescription}
              onChange={setCustomDescription}
              multiline={3}
              autoComplete="off"
            />
            
            <Box padding="300" background="bg-surface-info-subdued" borderRadius="200">
              <BlockStack gap="200">
                <Text variant="headingSm">This template includes:</Text>
                <List type="bullet">
                  <List.Item>Pre-configured smart rules</List.Item>
                  <List.Item>SEO optimized settings</List.Item>
                  <List.Item>Suggested product tags</List.Item>
                  <List.Item>Professional layout</List.Item>
                </List>
              </BlockStack>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {/* Template Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Template Preview"
        primaryAction={{
          content: "Use This Template",
          onAction: () => {
            setShowPreview(false);
            handleUseTemplate(selectedTemplate);
          },
        }}
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setShowPreview(false),
          },
        ]}
      >
        <Modal.Section>
          {selectedTemplate && (
            <BlockStack gap="400">
              <div style={{
                height: "150px",
                background: selectedTemplate.color,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
              }}>
                {selectedTemplate.icon}
              </div>
              
              <BlockStack gap="200">
                <Text variant="headingLg">{selectedTemplate.title}</Text>
                <Text variant="bodyMd">{selectedTemplate.description}</Text>
              </BlockStack>
              
              <BlockStack gap="200">
                <Text variant="headingSm">Included Tags:</Text>
                <InlineStack gap="100" wrap>
                  {selectedTemplate.tags.map((tag: string) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
              
              <BlockStack gap="200">
                <Text variant="headingSm">Suggested Products:</Text>
                <InlineStack gap="100" wrap>
                  {selectedTemplate.products.map((product: string) => (
                    <Badge key={product} tone="info">{product}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
              
              <BlockStack gap="200">
                <Text variant="headingSm">Smart Rules:</Text>
                {selectedTemplate.rules.map((rule: any, index: number) => (
                  <Box key={index} padding="200" background="bg-surface-neutral-subdued" borderRadius="100">
                    <Text variant="bodySm">
                      {rule.type} {rule.operator} {rule.value}
                    </Text>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
      
      {fetcher.data?.error && (
        <Banner tone="critical" onDismiss={() => {}}>
          {fetcher.data.error}
        </Banner>
      )}
      
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