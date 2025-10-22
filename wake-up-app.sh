#!/bin/bash

# This script wakes up your Render app
# Run this BEFORE opening your Shopify admin

echo "🔥 Waking up Collection Creator app..."
echo "This will take about 30 seconds..."
echo ""

# Send multiple requests to wake up the app
for i in 1 2 3 4 5
do
  echo "Ping $i/5..."
  curl -s -o /dev/null "https://collection-creator.onrender.com/health" &
  curl -s -o /dev/null "https://collection-creator.onrender.com" &
  sleep 2
done

wait

echo ""
echo "✅ App should be warm now!"
echo "📱 You can now open your Shopify admin"
echo ""
echo "⚠️  IMPORTANT: This is temporary!"
echo "📌 Please set up UptimeRobot for permanent fix"
open "https://admin.shopify.com/store/kittlu/apps"