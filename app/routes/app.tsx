import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      console.log('No session found, redirecting to auth');
      throw new Response(null, { status: 401 });
    }
    
    console.log('App loader - authenticated for shop:', session.shop);
    
    // Warm up the API connection after reinstall
    if (session.isOnlineAccessMode) {
      try {
        // Make a warmup request to prepare the API
        const warmupUrl = new URL('/app/warmup', request.url);
        await fetch(warmupUrl.toString(), {
          headers: request.headers
        }).catch(() => {});
      } catch (e) {
        // Ignore warmup errors
      }
    }
    
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    console.error('App loader authentication error:', error);
    // Let Shopify handle the redirect
    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
