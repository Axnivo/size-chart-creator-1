#!/bin/bash

echo "Creating GitHub repository..."
echo "Please make sure you're logged into GitHub in your browser"
echo ""
echo "Opening GitHub to create repository..."
open "https://github.com/new?name=collection-creator&description=Shopify%20Collection%20Creator%20App&public=true"

echo ""
echo "After creating the repository on GitHub, press Enter to continue..."
read

echo "Attempting to push code..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "Successfully pushed to GitHub!"
else
    echo "Failed to push. Please check your repository was created correctly."
fi