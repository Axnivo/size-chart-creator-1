# Manual Deployment Steps for Render

## Quick Manual Deployment

1. **Open Render Dashboard**
   - Go to: https://dashboard.render.com/
   - Find your service: "collection-creator"

2. **Manual Deploy**
   - Click on your service
   - Click the "Manual Deploy" button (top right)
   - Select "main" branch
   - Click "Deploy"

## Fix Auto-Deploy (If Not Working)

1. **Go to Service Settings**
   - In Render Dashboard, click your service
   - Go to "Settings" tab
   - Scroll to "Build & Deploy" section

2. **Enable Auto-Deploy**
   - Set "Auto-Deploy" to "Yes"
   - Make sure branch is set to "main"
   - Click "Save Changes"

3. **Verify GitHub Connection**
   - In "Settings" > "Source Code"
   - Make sure it shows: https://github.com/Axnivo/collection-creator
   - If not connected, click "Connect GitHub"

## Verify Deployment

After deployment starts, monitor:
1. Go to "Events" tab to see build logs
2. Wait for "Deploy live" message
3. Test your app at: https://collection-creator.onrender.com

## Current Changes Being Deployed

✅ OAuth re-installation fix
✅ Collections detection after reinstall
✅ Export feature fix
✅ App name: "Axnivo Collections Manager"
✅ Updated app tags

## If Deployment Fails

Check these environment variables in Render:
- SHOPIFY_API_KEY (must be set)
- SHOPIFY_API_SECRET (must be set)
- SHOPIFY_APP_URL=https://collection-creator.onrender.com
- SCOPES=write_products,read_products,write_inventory,read_inventory
- NODE_ENV=production
- PORT=3000