#!/bin/bash

echo "🔄 Force updating Shopify app configuration..."

# Set production environment variables
export NODE_ENV=production
export SHOPIFY_API_KEY=b1ff1c6deec209c1d5a589ad5363af8b
export SHOPIFY_API_SECRET=[REPLACE_WITH_ACTUAL_SECRET]
export SHOPIFY_APP_URL=https://size-chart-creator-1.onrender.com
export HOST=https://size-chart-creator-1.onrender.com
export SCOPES=read_inventory,read_products,write_inventory,write_products

echo "📋 Current configuration:"
echo "- App URL: $SHOPIFY_APP_URL"
echo "- API Key: $SHOPIFY_API_KEY"
echo "- Scopes: $SCOPES"

echo ""
echo "🚀 Deploying app configuration to Shopify Partners..."

# Force deploy the app configuration
npx shopify app deploy --force

echo ""
echo "✅ App configuration updated!"
echo ""
echo "🔧 Manual steps needed:"
echo "1. Go to Shopify Partners Dashboard"
echo "2. Find your 'AI-Size-Chart-Creator' app"
echo "3. Go to App setup > App URL and Redirect URLs"
echo "4. Verify these URLs are set:"
echo "   - App URL: https://size-chart-creator-1.onrender.com"
echo "   - Redirect URLs:"
echo "     * https://size-chart-creator-1.onrender.com/auth/callback"
echo "     * https://size-chart-creator-1.onrender.com/auth/shopify/callback"
echo "     * https://size-chart-creator-1.onrender.com/api/auth/callback"
echo "5. Save the configuration"
echo ""
echo "🔄 After manual update, trigger a new deployment on Render"