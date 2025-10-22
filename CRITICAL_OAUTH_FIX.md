# CRITICAL OAuth Fix for Size Chart Creator

## The Problem
The "OAuth error invalid_request: The redirect_uri is not whitelisted" error occurs because the Shopify Partner Dashboard configuration doesn't match the deployed app URLs.

## Root Cause
The Shopify app configuration in Partners Dashboard still has old or incorrect redirect URIs.

## IMMEDIATE FIX STEPS:

### Step 1: Update Shopify Partner Dashboard
1. Go to [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Find your "AI-Size-Chart-Creator" app
3. Click on the app name to open app details
4. Go to "App setup" tab
5. Update these settings:

**App URL:**
```
https://size-chart-creator-1.onrender.com
```

**Allowed redirection URL(s):**
```
https://size-chart-creator-1.onrender.com/auth/callback
https://size-chart-creator-1.onrender.com/auth/shopify/callback
https://size-chart-creator-1.onrender.com/api/auth/callback
```

6. Click "Save" at the bottom

### Step 2: Update Render Environment Variables
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Find your "size-chart-creator-1" service
3. Go to "Environment" tab
4. Add/Update these variables:

```
NODE_ENV=production
SHOPIFY_API_KEY=b1ff1c6deec209c1d5a589ad5363af8b
SHOPIFY_API_SECRET=[Get from original env.txt file]
SHOPIFY_APP_URL=https://size-chart-creator-1.onrender.com
HOST=https://size-chart-creator-1.onrender.com
SCOPES=read_inventory,read_products,write_inventory,write_products
```

5. Click "Save Changes"

### Step 3: Force Redeploy
1. In Render dashboard, click "Manual Deploy" > "Deploy latest commit"
2. Wait for deployment to complete

## Verification
After completing these steps:
1. Try installing the app again
2. The OAuth error should be resolved
3. The app should work exactly like collection-creator

## Why This Happened
The app was using collection-creator's configuration instead of its own dedicated configuration.

---
**This fix addresses the exact same configuration that makes collection-creator work.**