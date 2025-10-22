#!/bin/bash

# Keep-Alive Script for Render Free Tier
# Use this with a free cron job service like cron-job.org or GitHub Actions
# This script should be called every 5-10 minutes to keep the app warm

APP_URL="https://collection-creator.onrender.com"

echo "Pinging Collection Creator app at $(date)"

# Ping the health endpoint
curl -s -o /dev/null -w "Response: %{http_code}\n" "${APP_URL}/health"

# Also ping the main app to ensure it's fully awake
curl -s -o /dev/null -w "Main app response: %{http_code}\n" "${APP_URL}"

echo "Keep-alive ping completed at $(date)"
echo "---"