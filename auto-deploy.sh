#!/bin/bash

echo "=== Automatic Deployment Script ==="
echo "This script will handle everything for you"
echo ""

# Set git credentials
git config user.name "Axnivo"
git config user.email "axnivo@gmail.com"

# Try to create GitHub repo using gh CLI (if authenticated)
echo "Attempting to create GitHub repository..."
gh repo create Axnivo/collection-creator --public --source=. --remote=origin --push 2>/dev/null && echo "✓ Repository created and pushed!" || {
    echo "GitHub CLI not authenticated. Trying alternative method..."
    
    # Alternative: Try to push to existing repo
    git remote remove origin 2>/dev/null
    git remote add origin https://github.com/Axnivo/collection-creator.git
    
    echo "Attempting to push to GitHub..."
    git push -u origin main --force 2>/dev/null && echo "✓ Pushed to GitHub!" || {
        echo "Could not push to GitHub automatically."
        echo "Opening GitHub in browser to create repository manually..."
        open "https://github.com/new"
        echo ""
        echo "Please create a repository named 'collection-creator' in the browser"
        echo "Then press Enter to continue..."
        read
        
        # Try pushing again after manual creation
        git push -u origin main --force 2>/dev/null && echo "✓ Pushed to GitHub!" || echo "Still couldn't push. Will proceed with Render anyway."
    }
}

echo ""
echo "=== Deploying to Render ==="
echo ""

# Check if render.yaml exists
if [ -f "render.yaml" ]; then
    echo "✓ render.yaml found"
    echo ""
    echo "Opening Render dashboard..."
    open "https://dashboard.render.com/blueprints/new"
    
    echo ""
    echo "=== Instructions for Render Dashboard ==="
    echo "1. Click 'New Blueprint Instance'"
    echo "2. Select 'Public Git repository'"
    echo "3. Enter: https://github.com/Axnivo/collection-creator"
    echo "4. Click 'Apply'"
    echo ""
    echo "Your app will be deployed to:"
    echo "https://collection-creator-app.onrender.com"
    echo ""
    echo "Press Enter when you've completed the Render setup..."
    read
    
    echo "✓ Deployment initiated!"
    echo ""
    echo "You can check the deployment status at:"
    echo "https://dashboard.render.com/services"
else
    echo "✗ render.yaml not found"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Your Shopify Collection Creator app is being deployed!"