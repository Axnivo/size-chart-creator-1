#!/bin/bash

echo "🔧 FIXING SCOPES ISSUE FOR SIZE CHART CREATOR"
echo "============================================="
echo ""

# Navigate to the project directory
cd "/Users/gokul/Documents/Personal_Projects/size-chart-creator-1"

echo "📋 Current Configuration:"
echo "- App URL: https://size-chart-creator-1.onrender.com"
echo "- Scopes: read_inventory,read_products,write_inventory,write_products"
echo "- API Key: b1ff1c6deec209c1d5a589ad5363af8b"
echo ""

echo "🚀 STEP 1: Deploying updated configuration to Shopify..."
# Force deploy the configuration
npx shopify app deploy --reset --force

echo ""
echo "✅ STEP 2: Configuration deployed!"
echo ""

echo "🔄 STEP 3: Manual updates needed in Shopify Dashboard:"
echo "1. Go to your app configuration dashboard"
echo "2. In the 'Scopes' field, enter:"
echo "   read_inventory,read_products,write_inventory,write_products"
echo "3. Click 'Save'"
echo ""

echo "🎯 STEP 4: Redeploy on Render:"
echo "1. Go to Render dashboard"
echo "2. Click 'Manual Deploy' > 'Deploy latest commit'"
echo "3. Wait for deployment to complete"
echo ""

echo "✨ This will fix the authentication loop issue!"
echo "The app currently only has write permissions, but needs read permissions too."