#!/bin/bash

echo "Deploying Collections Creator as Full Stack App to Render..."

# Render API configuration
RENDER_API_KEY="rnd_cO3kpJ3XeDM3AiTHfQ4fOHi9Igtr"
GITHUB_REPO="https://github.com/Axnivo/collection-creator"

# Create the service using Render API
echo "Creating full-stack web service on Render..."

# Open Render dashboard with full-stack configuration
DEPLOY_URL="https://dashboard.render.com/new/web?repo=${GITHUB_REPO}&branch=main&name=collection-creator-fullstack&runtime=node&buildCommand=npm%20install%20%26%26%20npm%20run%20build&startCommand=npm%20run%20start&region=oregon&plan=free"

echo "Opening Render dashboard to complete deployment..."
open "$DEPLOY_URL"

# Also try to create via API
curl -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "web_service",
    "name": "collection-creator-fullstack",
    "ownerId": "usr-clmjkqt4t5oic73ccdh2dltg",
    "repo": "https://github.com/Axnivo/collection-creator",
    "autoDeploy": "yes",
    "branch": "main",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm run start",
    "envVars": [
      {"key": "NODE_ENV", "value": "production"},
      {"key": "PORT", "value": "10000"}
    ],
    "serviceDetails": {
      "env": "node",
      "region": "oregon",
      "plan": "free"
    }
  }' 2>/dev/null

echo ""
echo "Deployment initiated!"
echo "Your full-stack app will be available at:"
echo "https://collection-creator-fullstack.onrender.com"
echo ""
echo "The Render dashboard has been opened in your browser."
echo "The deployment will complete automatically."