# 🚀 Size Chart Creator - Environment Setup Guide

## Current Status
✅ **App is deployed and running on Render**
🔗 **URL:** https://size-chart-creator-1.onrender.com

## Required Environment Variables

### Add these to your Render Environment Variables:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_client_id_here
SHOPIFY_API_SECRET=your_shopify_client_secret_here
SCOPES=read_products,write_products,read_product_listings,write_product_listings

# App URLs
APP_URL=https://size-chart-creator-1.onrender.com
SHOPIFY_APP_URL=https://size-chart-creator-1.onrender.com

# Security
SESSION_SECRET=your_32_character_random_string_here

# Environment
NODE_ENV=production
PORT=10000
```

## 📋 Setup Steps

### 1. Create Shopify App
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Click "Apps" → "Create App"
3. Choose "Create a new app"
4. Fill in details:
   - **App name:** AI Size Chart Creator
   - **App URL:** `https://size-chart-creator-1.onrender.com`
   - **Allowed redirection URLs:**
     ```
     https://size-chart-creator-1.onrender.com/auth/callback
     https://size-chart-creator-1.onrender.com/api/auth/callback
     ```

### 2. Copy App Credentials
- **Client ID** → Use as `SHOPIFY_API_KEY`
- **Client secret** → Use as `SHOPIFY_API_SECRET`

### 3. Update Render Environment Variables
- Go to Render Dashboard → Your Service → Environment
- Add/update the variables above
- Save changes (app will redeploy automatically)

### 4. Test Installation
1. Visit: `https://size-chart-creator-1.onrender.com`
2. Enter your Shopify store domain
3. Complete OAuth flow
4. Start creating size charts!

## 🔍 Troubleshooting

### Check App Status
Visit: `https://size-chart-creator-1.onrender.com/health`

### Common Issues
- **502 Bad Gateway** → Missing SESSION_SECRET
- **OAuth Error** → Wrong SHOPIFY_API_KEY or SHOPIFY_API_SECRET
- **App URL mismatch** → Update URLs in Shopify Partner Dashboard

## 🎉 Success!
Once environment variables are set, your Size Chart Creator will be fully functional!