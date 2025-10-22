# Collection Creator - Shopify App

A Shopify app for creating collections quickly and easily. Deployed on Render.com for simplified hosting.

## Architecture

### Frontend
- **Framework**: Remix (React)
- **Deployment**: Render.com Web Service
- **Purpose**: Shopify App interface

### Backend  
- **Framework**: Remix (integrated)
- **Deployment**: Render.com Web Service
- **Purpose**: Shopify API integration

## Deployment

The app is configured to deploy both frontend and backend services to Render.com using a single `render.yaml` configuration file.

### Render Configuration

The app runs as a single service on Render:

- **Node.js runtime**
- **Deploys from root directory**
- **Integrated frontend and backend**

### Environment Variables

- `NODE_ENV=production`
- `SHOPIFY_API_KEY` - Your Shopify app key
- `SHOPIFY_API_SECRET` - Your Shopify app secret  
- `SCOPES` - Shopify API permissions
- `HOST` - Auto-populated with service URL
- `PORT=10000` - Render port

### Deployment Steps

1. **Connect Repository**: Link your Git repository to Render
2. **Deploy Service**: Render will automatically deploy the app
3. **Configure Environment**: Set the required Shopify credentials in Render dashboard
4. **Update Shopify App**: Update your Shopify app settings with the new Render URL

## Local Development

### Development
```bash
npm install
npm run dev
```

## Features

- Create collections directly in Shopify
- Simple and intuitive interface
- Fast deployment on Render

## File Structure

```
├── app/                    # Remix app
│   ├── routes/            # Remix routes
│   ├── shopify.server.ts  # Shopify configuration
│   └── ...
├── package.json          # Dependencies
├── server.js             # Express server
└── README.md            # This file
```

## Notes

This app uses Shopify's built-in session management and creates collections directly via the Shopify GraphQL API. All functionality is integrated within the Remix app for simplified deployment and maintenance.