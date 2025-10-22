# Deploy Size Chart Creator to Render.com

## ✅ Prerequisites

1. A GitHub repository with this code
2. A Render.com account (free tier works)
3. Shopify Partner account with app credentials

## 📋 Deployment Steps

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Create Web Service on Render

1. **Log in to Render.com** → Click "New +" → Select "Web Service"
2. **Connect your GitHub repository** (size-chart-creator-1)
3. **Configure the service:**
   - **Name:** `size-chart-creator` (or your preferred name)
   - **Runtime:** Node
   - **Branch:** main
   - **Build Command:** `npm install; npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** Starter ($7/month) recommended

### Step 3: Configure Environment Variables

**CRITICAL:** You must add these environment variables before the service will work:

1. Go to your service dashboard → "Environment" tab
2. Add these **required** variables:

```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SCOPES=read_products,write_products,read_product_listings,write_product_listings
APP_URL=https://your-service-name.onrender.com
SESSION_SECRET=your_32_character_random_string_here
NODE_ENV=production
PORT=10000
```

**Important Notes:**
- Replace `your-service-name` with your actual Render service name
- Generate a strong random string for SESSION_SECRET (32+ characters)
- Get SHOPIFY_API_KEY and SHOPIFY_API_SECRET from Shopify Partner Dashboard

### Step 4: Deploy Services

1. Click **"Manual Deploy"** → **"Deploy latest commit"** for both services
2. Wait for both services to show "Live" status (5-10 minutes)

### Step 5: Update Shopify App Settings

1. Go to your Shopify Partner Dashboard
2. Select your app → "App setup"
3. Update URLs:
   ```
   App URL: https://collection-creator-frontend.onrender.com
   Allowed redirection URL(s): 
   - https://collection-creator-frontend.onrender.com/auth/callback
   - https://collection-creator-frontend.onrender.com/api/auth/callback
   ```

### Step 6: Test Your App

1. Install the app in a development store
2. The app should authenticate and show the main interface
3. Test creating a collection to verify backend connectivity

## 🔍 Verify Deployment

### Check Backend Health:
```
https://collection-creator-backend.onrender.com/health
```
Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

### Check Frontend:
```
https://collection-creator-frontend.onrender.com
```
Should redirect to Shopify OAuth or show the app interface

## 🚨 Troubleshooting

### If backend fails to start:
- Check logs in Render dashboard
- Verify Python version compatibility (requires 3.11+)
- Check if all dependencies in `requirements.txt` are valid

### If frontend fails to build:
- Check Node version (requires 18.20+)
- Verify all npm packages are installed
- Check build logs for specific errors

### If services can't communicate:
- Verify `BACKEND_API_URL` is correctly set in frontend
- Check CORS settings in backend `main.py`
- Ensure both services are deployed and running

### Database issues:
- SQLite database is created automatically on first run
- Database file persists in Render's disk storage
- No additional database service needed

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Services may spin down after 15 minutes of inactivity
   - First request after sleep may be slow (cold start)
   - Limited to 750 hours/month across all services

2. **Production Considerations:**
   - For production, upgrade to paid tier for always-on services
   - Consider using PostgreSQL instead of SQLite for production
   - Add proper logging and monitoring

3. **Security:**
   - Never commit `.env` files with real credentials
   - Use Render's environment variables for all secrets
   - Regularly rotate API keys and tokens

## 🎉 Success!

Once deployed, your app will be available at:
- **Frontend:** `https://collection-creator-frontend.onrender.com`
- **Backend API:** `https://collection-creator-backend.onrender.com`

The services are configured to auto-deploy on every push to the main branch.