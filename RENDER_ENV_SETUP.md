# Render Environment Variables Setup

## Required Environment Variables for Deployment

Add these environment variables in your Render service dashboard:

### Core Shopify App Variables
```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SCOPES=read_products,write_products,read_product_listings,write_product_listings
APP_URL=https://your-render-app-name.onrender.com
DATABASE_URL=your_database_connection_string
SESSION_SECRET=your_session_secret_key_here
```

### Additional Required Variables
```
NODE_ENV=production
PORT=10000
SHOPIFY_APP_URL=https://your-render-app-name.onrender.com
```

## Steps to Configure:

1. Go to your Render dashboard
2. Select your deployed service
3. Go to "Environment" tab
4. Add each variable above with your actual values
5. Save and redeploy

## Important Notes:

- Replace `your-render-app-name` with your actual Render service name
- Get SHOPIFY_API_KEY and SHOPIFY_API_SECRET from your Shopify Partner Dashboard
- Generate a strong SESSION_SECRET (32+ random characters)
- The APP_URL must match your Render service URL exactly
- DATABASE_URL can be PostgreSQL, MySQL, or SQLite connection string

## After Setting Variables:

The app will automatically restart and should deploy successfully.