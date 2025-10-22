#!/bin/bash

# Update Render environment variables for collection-creator service
# Service ID: srv-d2tpdl95pdvs739ptdk0

SERVICE_ID="srv-d2tpdl95pdvs739ptdk0"
RENDER_TOKEN="rnd_UoqRTD9gBM8fTKKUGUiofFevM3tP"

echo "Updating environment variables for Render service: $SERVICE_ID"

# Read environment variables from .env.render file
if [ ! -f ".env.render" ]; then
    echo "Error: .env.render file not found"
    exit 1
fi

# Create environment variables JSON payload
ENV_VARS='{"envVars":['

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
        continue
    fi
    
    # Remove any quotes around the value
    value=$(echo $value | sed 's/^"//;s/"$//')
    
    ENV_VARS+="{\"key\":\"$key\",\"value\":\"$value\"},"
done < .env.render

# Remove trailing comma and close JSON
ENV_VARS=${ENV_VARS%,}
ENV_VARS+=']}'

echo "Updating environment variables..."
echo "$ENV_VARS" | jq .

curl -X PATCH \
  -H "Authorization: Bearer $RENDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ENV_VARS" \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars"

echo ""
echo "Environment variables updated. The service will automatically redeploy."