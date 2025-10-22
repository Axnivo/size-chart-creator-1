# ✅ Enable Automatic Deployment to Render

## Quick Setup (2 Minutes)

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Click on your "collection-creator" service

### Step 2: Check Auto-Deploy Settings
1. In your service, click "Settings" tab
2. Scroll to "Build & Deploy" section
3. Make sure **"Auto-Deploy"** is set to **"Yes"**
4. Branch should be set to **"main"**

### Step 3: Verify GitHub Connection
1. In the same Settings page
2. Check "Source Code" section
3. Should show: `Axnivo/collection-creator`
4. If not connected, click "Connect GitHub"

### Step 4: Check GitHub Webhook
1. Go to: https://github.com/Axnivo/collection-creator/settings/hooks
2. You should see a webhook from Render
3. It should have a green checkmark ✅

## If Auto-Deploy is NOT Working:

### Option A: Re-connect GitHub (Recommended)
1. In Render Dashboard → Settings
2. Click "Disconnect from GitHub"
3. Click "Connect GitHub" again
4. Authorize Render
5. Select your repository

### Option B: Manual Webhook Setup
1. In Render Dashboard → Settings
2. Copy the "Deploy Hook" URL
3. Go to GitHub → Settings → Webhooks
4. Add webhook with:
   - Payload URL: (paste Render deploy hook)
   - Content type: application/json
   - Events: Just the push event

## How It Works After Setup:
1. You make changes locally
2. Git commit and push to GitHub
3. **Render automatically detects the push**
4. **Automatically starts deployment**
5. App is live in 2-3 minutes

## Test It:
```bash
# Make a small change
echo "# Auto-deploy test" >> README.md
git add README.md
git commit -m "Test auto-deploy"
git push origin main

# Then watch Render dashboard - deployment should start automatically!
```

## Current Status:
- ✅ render.yaml has `autoDeploy: true`
- ✅ Repository is connected
- ⚠️ Need to verify webhook in GitHub settings

## No More Manual Deploys! 🎉
Once this is set up, every `git push` will automatically deploy to Render!