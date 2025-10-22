import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Badge,
  InlineGrid,
  Box,
  Divider,
  Banner,
  Modal,
} from "@shopify/polaris";
import {
  HomeIcon,
  MagicIcon,
  ImportIcon,
  CreditCardIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { checkSubscriptionStatus } from "../utils/subscription-redirect.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  if (!session || !session.shop) {
    console.log('No valid session found in subscription page');
    throw new Response(null, { status: 401 });
  }

  console.log('Subscription page - authenticated for shop:', session.shop);

  // Get current subscription details
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(admin, session.shop);
  
  // Parse subscription details if exists
  let currentPlan = null;
  let nextBillingDate = null;
  let amount = null;
  
  if (hasActiveSubscription && subscription) {
    // Determine plan type from subscription name or amount
    if (subscription.name?.toLowerCase().includes('annual') || subscription.name?.toLowerCase().includes('year')) {
      currentPlan = 'annual';
      amount = '$19.00';
    } else {
      currentPlan = 'monthly';
      amount = '$1.99';
    }
    
    // Get next billing date if available
    if (subscription.currentPeriodEnd) {
      nextBillingDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  const shop = session.shop.replace('.myshopify.com', '');
  
  return json({
    hasActiveSubscription,
    currentPlan,
    nextBillingDate,
    amount,
    shop,
    subscription
  });
};

export default function Subscription() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const app = useAppBridge();
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const activePage = "subscription";
  
  const handleUpgrade = (targetPlan: 'monthly' | 'annual') => {
    // Redirect to Shopify billing page using App Bridge
    const billingUrl = `https://admin.shopify.com/store/${data.shop}/charges/collections-creator/pricing_plans`;
    if (app && window.top) {
      // Use App Bridge to navigate within Shopify Admin
      window.open(billingUrl, '_top');
    } else {
      window.location.href = billingUrl;
    }
  };
  
  const handleManageSubscription = () => {
    // Redirect to Shopify billing settings using App Bridge
    const billingUrl = `https://admin.shopify.com/store/${data.shop}/settings/billing`;
    if (app && window.top) {
      // Use App Bridge to navigate within Shopify Admin
      window.open(billingUrl, '_top');
    } else {
      window.location.href = billingUrl;
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar title="Subscription" />

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
            onClick={() => navigate('/app/subscription')}
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
      <Layout>
        <Layout.Section>
          {/* Current Subscription Status */}
          <Card>
            <BlockStack gap="500">
              <Text variant="heading2xl" as="h2">
                Current Subscription
              </Text>
              
              {data.hasActiveSubscription ? (
                <>
                  <InlineGrid columns="1fr auto" gap="400">
                    <Box>
                      <BlockStack gap="200">
                        <Text variant="bodyLg" tone="subdued">
                          Active Plan
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Text variant="heading3xl" as="p">
                            {data.currentPlan === 'annual' ? 'Professional' : 'Starter'}
                          </Text>
                          <Badge tone="success">Active</Badge>
                        </div>
                        <Text variant="headingLg">
                          {data.amount} / {data.currentPlan === 'annual' ? 'year' : 'month'}
                        </Text>
                      </BlockStack>
                    </Box>
                    
                    <Box>
                      <BlockStack gap="200">
                        <Text variant="bodyLg" tone="subdued">
                          Next Billing Date
                        </Text>
                        <Text variant="headingLg">
                          {data.nextBillingDate || 'Not available'}
                        </Text>
                      </BlockStack>
                    </Box>
                  </InlineGrid>
                  
                  <Divider />
                  
                  <InlineGrid columns="1fr auto" gap="400">
                    <div>
                      <Text variant="bodyLg">
                        Manage your subscription, update payment method, or view invoices
                      </Text>
                    </div>
                    <Button onClick={handleManageSubscription}>
                      Manage Billing
                    </Button>
                  </InlineGrid>
                </>
              ) : (
                <Banner tone="warning">
                  <p>No active subscription found. Subscribe to access all features.</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Available Plans */}
          <Card>
            <BlockStack gap="500">
              <Text variant="heading2xl" as="h2">
                Available Plans
              </Text>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                {/* Monthly Plan */}
                <Card>
                  <BlockStack gap="400">
                    <div style={{ position: 'relative' }}>
                      {data.currentPlan === 'monthly' && (
                        <Badge tone="info">Current Plan</Badge>
                      )}
                      <Text variant="headingXl" as="h3">
                        Starter
                      </Text>
                      <Text variant="bodyLg" tone="subdued">
                        Perfect for small stores
                      </Text>
                    </div>
                    
                    <div>
                      <Text variant="heading3xl" as="p">
                        $1.99
                      </Text>
                      <Text variant="bodyLg" tone="subdued">
                        per month
                      </Text>
                    </div>
                    
                    <BlockStack gap="200">
                      <Text variant="bodyLg">✓ Unlimited collections</Text>
                      <Text variant="bodyLg">✓ Bulk operations</Text>
                      <Text variant="bodyLg">✓ SEO optimization</Text>
                      <Text variant="bodyLg">✓ Email support</Text>
                    </BlockStack>
                    
                    {data.currentPlan !== 'monthly' && (
                      <Button 
                        fullWidth 
                        onClick={() => handleUpgrade('monthly')}
                        disabled={data.currentPlan === 'monthly'}
                      >
                        {data.hasActiveSubscription ? 'Downgrade to Monthly' : 'Subscribe Monthly'}
                      </Button>
                    )}
                  </BlockStack>
                </Card>
                
                {/* Annual Plan */}
                <Card>
                  <BlockStack gap="400">
                    <div style={{ position: 'relative' }}>
                      {data.currentPlan === 'annual' && (
                        <Badge tone="info">Current Plan</Badge>
                      )}
                      <Text variant="headingXl" as="h3">
                        Professional
                      </Text>
                      <Text variant="bodyLg" tone="subdued">
                        For growing businesses
                      </Text>
                      <Badge tone="success">Save 20%</Badge>
                    </div>
                    
                    <div>
                      <Text variant="heading3xl" as="p">
                        $19.00
                      </Text>
                      <Text variant="bodyLg" tone="subdued">
                        per year
                      </Text>
                      <Text variant="bodySm" tone="success">
                        Save $4.88/year
                      </Text>
                    </div>
                    
                    <BlockStack gap="200">
                      <Text variant="bodyLg">✓ Everything in Starter</Text>
                      <Text variant="bodyLg">✓ Priority support</Text>
                      <Text variant="bodyLg">✓ Advanced analytics</Text>
                      <Text variant="bodyLg">✓ API access</Text>
                    </BlockStack>
                    
                    {data.currentPlan !== 'annual' && (
                      <Button 
                        variant="primary"
                        tone="success"
                        fullWidth 
                        onClick={() => handleUpgrade('annual')}
                        disabled={data.currentPlan === 'annual'}
                      >
                        {data.hasActiveSubscription ? 'Upgrade to Annual' : 'Subscribe Annual'}
                      </Button>
                    )}
                  </BlockStack>
                </Card>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {/* Billing Information */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingXl" as="h3">
                Important Billing Information
              </Text>
              
              <BlockStack gap="300">
                <div>
                  <Text variant="bodyLg" fontWeight="semibold">
                    Immediate Billing
                  </Text>
                  <Text variant="bodyLg" tone="subdued">
                    Charges are processed immediately upon subscription. Your first billing cycle starts right away.
                  </Text>
                </div>
                
                <div>
                  <Text variant="bodyLg" fontWeight="semibold">
                    Plan Changes
                  </Text>
                  <Text variant="bodyLg" tone="subdued">
                    When upgrading or downgrading, charges are prorated automatically by Shopify.
                  </Text>
                </div>
                
                <div>
                  <Text variant="bodyLg" fontWeight="semibold">
                    Cancellation
                  </Text>
                  <Text variant="bodyLg" tone="subdued">
                    You can cancel anytime from your Shopify admin. No questions asked.
                  </Text>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
    
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
            
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  📧 Email Support
                </Text>
                <div style={{
                  background: "#F3F4F6",
                  padding: "12px",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <Text variant="bodyMd" fontWeight="semibold">
                    support@collectionscreator.com
                  </Text>
                  <Button
                    size="slim"
                    onClick={() => {
                      navigator.clipboard.writeText("support@collectionscreator.com");
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2000);
                    }}
                  >
                    {emailCopied ? "✓ Copied!" : "Copy"}
                  </Button>
                </div>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h4">
                  💡 What to Include in Your Email:
                </Text>
                <BlockStack gap="100">
                  <Text variant="bodyMd">• Your Shopify store URL</Text>
                  <Text variant="bodyMd">• Description of the issue or request</Text>
                  <Text variant="bodyMd">• Any relevant screenshots</Text>
                  <Text variant="bodyMd">• Steps to reproduce (if reporting a bug)</Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
    </div>
  );
}