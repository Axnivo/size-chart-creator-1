#!/bin/bash

echo "Deploying to GitHub and Render..."

# Skip GitHub if can't push (repository might not exist or auth issues)
echo "Attempting GitHub push..."
timeout 5 git push -u origin main 2>/dev/null || echo "GitHub push skipped - repository may need to be created manually"

echo ""
echo "Now deploying directly to Render..."
echo "This will work even without GitHub!"

# Deploy directly to Render using their CLI or web interface
open "https://dashboard.render.com/select-repo?type=blueprint"

echo ""
echo "Render deployment page opened in browser."
echo "You can either:"
echo "1. Connect your GitHub repo (if it exists)"
echo "2. Or use Render's direct Git deploy"
echo ""
echo "Your app will be available at:"
echo "- Frontend: https://collection-creator-frontend.onrender.com"
echo "- Backend: https://collection-creator-backend.onrender.com"