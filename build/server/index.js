var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, Link, useRouteError, useFetcher, useNavigate, useRevalidator } from "@remix-run/react";
import { createReadableStreamFromReadable, json, redirect } from "@remix-run/node";
import { isbot } from "isbot";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-remix/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { useState, useEffect, useCallback } from "react";
import { AppProvider, Page, Card, FormLayout, Text, TextField, Button, Layout, BlockStack, Thumbnail, Icon, Badge, RadioButton, InlineStack, Spinner, EmptyState, DataTable, Modal, Banner, ProgressBar, Box, Checkbox, DropZone, TextContainer, Select, List as List$1, Grid, InlineGrid, Divider, Tabs } from "@shopify/polaris";
import { AppProvider as AppProvider$1 } from "@shopify/shopify-app-remix/react";
import { NavMenu, useAppBridge, TitleBar } from "@shopify/app-bridge-react";
import { ProductIcon, HomeIcon, ImageIcon, MagicIcon, ImportIcon, CreditCardIcon, RefreshIcon, AlertTriangleIcon, CollectionIcon, ExportIcon, EditIcon, DuplicateIcon, DeleteIcon, CalendarIcon, ChartVerticalFilledIcon, ViewIcon, CheckIcon, PlusIcon, HeartIcon, XSmallIcon, ChartVerticalIcon, SearchIcon, ClockIcon, DisabledIcon, PlayIcon, CashDollarIcon, CartFilledIcon, StarFilledIcon, GlobeIcon, HashtagIcon } from "@shopify/polaris-icons";
import { createCanvas, loadImage } from "canvas";
const memoryStorage = new MemorySessionStorage();
const uninstalledShops = /* @__PURE__ */ new Set();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: memoryStorage,
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/app/uninstalled"
    },
    CUSTOMERS_DATA_REQUEST: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks"
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks"
    },
    SHOP_REDACT: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks"
    }
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      var _a2, _b;
      console.log("AfterAuth hook - session created for shop:", session.shop);
      if (uninstalledShops.has(session.shop)) {
        console.log("Shop reinstalled, removing from uninstalled list:", session.shop);
        uninstalledShops.delete(session.shop);
      }
      const existingSessions = await memoryStorage.findSessionsByShop(session.shop);
      for (const oldSession of existingSessions) {
        if (oldSession.id !== session.id) {
          await memoryStorage.deleteSession(oldSession.id);
        }
      }
      console.log("Checking for active subscriptions after auth...");
      try {
        const query = `#graphql
          query checkSubscription {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                test
              }
            }
          }
        `;
        const response = await admin.graphql(query);
        const data = await response.json();
        const subscriptions = ((_b = (_a2 = data.data) == null ? void 0 : _a2.currentAppInstallation) == null ? void 0 : _b.activeSubscriptions) || [];
        console.log(`Found ${subscriptions.length} active subscriptions for ${session.shop}`);
        if (subscriptions.length === 0) {
          console.log("💳 No subscription found for ${session.shop}");
          console.log("User will need to subscribe to access app features.");
        } else {
          console.log(`✅ Active subscription confirmed for ${session.shop}`);
        }
      } catch (error) {
        console.error("Error checking subscription in afterAuth:", error);
      }
      try {
        await shopify.registerWebhooks({ session });
      } catch (error) {
        console.error("Error registering webhooks:", error);
      }
    }
  },
  future: {
    unstable_newEmbeddedAuthStrategy: false,
    removeRest: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.January25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
const isShopUninstalled = (shop) => uninstalledShops.has(shop);
const markShopUninstalled = (shop) => uninstalledShops.add(shop);
const clearShopSessions = async (shop) => {
  const sessions = await memoryStorage.findSessionsByShop(shop);
  for (const session of sessions) {
    await memoryStorage.deleteSession(session.id);
  }
};
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url
        }
      ),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function App$2() {
  return /* @__PURE__ */ jsxs("html", { children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$2
}, Symbol.toStringTag, { value: "Module" }));
const action$k = async ({ request }) => {
  var _a2, _b, _c, _d, _e;
  const headers2 = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (request.method === "OPTIONS") {
    return json({}, { headers: headers2 });
  }
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const host = url.searchParams.get("host");
    if (!shop) {
      return json({
        success: false,
        error: "Shop parameter missing"
      }, { headers: headers2 });
    }
    const { admin } = await authenticate.admin(request);
    if (!admin) {
      return json({
        success: false,
        error: "Unable to create admin client"
      }, { headers: headers2 });
    }
    const body = await request.json();
    const { collectionId, title, description, handle } = body;
    const mutation = `
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
            descriptionHtml
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const input2 = {
      id: collectionId,
      title,
      descriptionHtml: description ? `<p>${description}</p>` : "",
      handle
    };
    const response = await admin.graphql(mutation, {
      variables: { input: input2 }
    });
    const data = await response.json();
    if (((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collectionUpdate) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
      return json({
        success: false,
        error: data.data.collectionUpdate.userErrors[0].message
      }, { headers: headers2 });
    }
    if ((_e = (_d = data.data) == null ? void 0 : _d.collectionUpdate) == null ? void 0 : _e.collection) {
      return json({
        success: true,
        collection: data.data.collectionUpdate.collection
      }, { headers: headers2 });
    }
    return json({
      success: false,
      error: "Unexpected response from Shopify"
    }, { headers: headers2 });
  } catch (error) {
    console.error("API Update error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update collection"
    }, { headers: headers2 });
  }
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$k
}, Symbol.toStringTag, { value: "Module" }));
const loader$k = async ({ request }) => {
  var _a2, _b;
  const { admin, session, billing } = await authenticate.admin(request);
  if (!session) {
    console.log("No session found in subscription auth");
    return redirect(`/app`);
  }
  console.log("Checking subscription requirements for shop:", session.shop);
  try {
    const query = `#graphql
      query checkInstallation {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            status
            name
          }
        }
      }
    `;
    const response = await admin.graphql(query);
    const data = await response.json();
    console.log("Installation check:", JSON.stringify(data, null, 2));
    const subscriptions = ((_b = (_a2 = data.data) == null ? void 0 : _a2.currentAppInstallation) == null ? void 0 : _b.activeSubscriptions) || [];
    if (subscriptions.length === 0) {
      console.log("No active subscriptions found - should prompt for payment");
      console.error("WARNING: Managed pricing app installed without subscription!");
      console.error("This indicates a configuration issue in Partner Dashboard");
    }
  } catch (error) {
    console.error("Error checking subscription during auth:", error);
  }
  return redirect(`/app?shop=${session.shop}`);
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$k
}, Symbol.toStringTag, { value: "Module" }));
const Polaris = /* @__PURE__ */ JSON.parse('{"ActionMenu":{"Actions":{"moreActions":"More actions"},"RollupActions":{"rollupButton":"View actions"}},"ActionList":{"SearchField":{"clearButtonLabel":"Clear","search":"Search","placeholder":"Search actions"}},"Avatar":{"label":"Avatar","labelWithInitials":"Avatar with initials {initials}"},"Autocomplete":{"spinnerAccessibilityLabel":"Loading","ellipsis":"{content}…"},"Badge":{"PROGRESS_LABELS":{"incomplete":"Incomplete","partiallyComplete":"Partially complete","complete":"Complete"},"TONE_LABELS":{"info":"Info","success":"Success","warning":"Warning","critical":"Critical","attention":"Attention","new":"New","readOnly":"Read-only","enabled":"Enabled"},"progressAndTone":"{toneLabel} {progressLabel}"},"Banner":{"dismissButton":"Dismiss notification"},"Button":{"spinnerAccessibilityLabel":"Loading"},"Common":{"checkbox":"checkbox","undo":"Undo","cancel":"Cancel","clear":"Clear","close":"Close","submit":"Submit","more":"More"},"ContextualSaveBar":{"save":"Save","discard":"Discard"},"DataTable":{"sortAccessibilityLabel":"sort {direction} by","navAccessibilityLabel":"Scroll table {direction} one column","totalsRowHeading":"Totals","totalRowHeading":"Total"},"DatePicker":{"previousMonth":"Show previous month, {previousMonthName} {showPreviousYear}","nextMonth":"Show next month, {nextMonth} {nextYear}","today":"Today ","start":"Start of range","end":"End of range","months":{"january":"January","february":"February","march":"March","april":"April","may":"May","june":"June","july":"July","august":"August","september":"September","october":"October","november":"November","december":"December"},"days":{"monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"daysAbbreviated":{"monday":"Mo","tuesday":"Tu","wednesday":"We","thursday":"Th","friday":"Fr","saturday":"Sa","sunday":"Su"}},"DiscardConfirmationModal":{"title":"Discard all unsaved changes","message":"If you discard changes, you’ll delete any edits you made since you last saved.","primaryAction":"Discard changes","secondaryAction":"Continue editing"},"DropZone":{"single":{"overlayTextFile":"Drop file to upload","overlayTextImage":"Drop image to upload","overlayTextVideo":"Drop video to upload","actionTitleFile":"Add file","actionTitleImage":"Add image","actionTitleVideo":"Add video","actionHintFile":"or drop file to upload","actionHintImage":"or drop image to upload","actionHintVideo":"or drop video to upload","labelFile":"Upload file","labelImage":"Upload image","labelVideo":"Upload video"},"allowMultiple":{"overlayTextFile":"Drop files to upload","overlayTextImage":"Drop images to upload","overlayTextVideo":"Drop videos to upload","actionTitleFile":"Add files","actionTitleImage":"Add images","actionTitleVideo":"Add videos","actionHintFile":"or drop files to upload","actionHintImage":"or drop images to upload","actionHintVideo":"or drop videos to upload","labelFile":"Upload files","labelImage":"Upload images","labelVideo":"Upload videos"},"errorOverlayTextFile":"File type is not valid","errorOverlayTextImage":"Image type is not valid","errorOverlayTextVideo":"Video type is not valid"},"EmptySearchResult":{"altText":"Empty search results"},"Frame":{"skipToContent":"Skip to content","navigationLabel":"Navigation","Navigation":{"closeMobileNavigationLabel":"Close navigation"}},"FullscreenBar":{"back":"Back","accessibilityLabel":"Exit fullscreen mode"},"Filters":{"moreFilters":"More filters","moreFiltersWithCount":"More filters ({count})","filter":"Filter {resourceName}","noFiltersApplied":"No filters applied","cancel":"Cancel","done":"Done","clearAllFilters":"Clear all filters","clear":"Clear","clearLabel":"Clear {filterName}","addFilter":"Add filter","clearFilters":"Clear all","searchInView":"in:{viewName}"},"FilterPill":{"clear":"Clear","unsavedChanges":"Unsaved changes - {label}"},"IndexFilters":{"searchFilterTooltip":"Search and filter","searchFilterTooltipWithShortcut":"Search and filter (F)","searchFilterAccessibilityLabel":"Search and filter results","sort":"Sort your results","addView":"Add a new view","newView":"Custom search","SortButton":{"ariaLabel":"Sort the results","tooltip":"Sort","title":"Sort by","sorting":{"asc":"Ascending","desc":"Descending","az":"A-Z","za":"Z-A"}},"EditColumnsButton":{"tooltip":"Edit columns","accessibilityLabel":"Customize table column order and visibility"},"UpdateButtons":{"cancel":"Cancel","update":"Update","save":"Save","saveAs":"Save as","modal":{"title":"Save view as","label":"Name","sameName":"A view with this name already exists. Please choose a different name.","save":"Save","cancel":"Cancel"}}},"IndexProvider":{"defaultItemSingular":"Item","defaultItemPlural":"Items","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} are selected","selected":"{selectedItemsCount} selected","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}"},"IndexTable":{"emptySearchTitle":"No {resourceNamePlural} found","emptySearchDescription":"Try changing the filters or search term","onboardingBadgeText":"New","resourceLoadingAccessibilityLabel":"Loading {resourceNamePlural}…","selectAllLabel":"Select all {resourceNamePlural}","selected":"{selectedItemsCount} selected","undo":"Undo","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural}","selectItem":"Select {resourceName}","selectButtonText":"Select","sortAccessibilityLabel":"sort {direction} by"},"Loading":{"label":"Page loading bar"},"Modal":{"iFrameTitle":"body markup","modalWarning":"These required properties are missing from Modal: {missingProps}"},"Page":{"Header":{"rollupActionsLabel":"View actions for {title}","pageReadyAccessibilityLabel":"{title}. This page is ready"}},"Pagination":{"previous":"Previous","next":"Next","pagination":"Pagination"},"ProgressBar":{"negativeWarningMessage":"Values passed to the progress prop shouldn’t be negative. Resetting {progress} to 0.","exceedWarningMessage":"Values passed to the progress prop shouldn’t exceed 100. Setting {progress} to 100."},"ResourceList":{"sortingLabel":"Sort by","defaultItemSingular":"item","defaultItemPlural":"items","showing":"Showing {itemsCount} {resource}","showingTotalCount":"Showing {itemsCount} of {totalItemsCount} {resource}","loading":"Loading {resource}","selected":"{selectedItemsCount} selected","allItemsSelected":"All {itemsLength}+ {resourceNamePlural} in your store are selected","allFilteredItemsSelected":"All {itemsLength}+ {resourceNamePlural} in this filter are selected","selectAllItems":"Select all {itemsLength}+ {resourceNamePlural} in your store","selectAllFilteredItems":"Select all {itemsLength}+ {resourceNamePlural} in this filter","emptySearchResultTitle":"No {resourceNamePlural} found","emptySearchResultDescription":"Try changing the filters or search term","selectButtonText":"Select","a11yCheckboxDeselectAllSingle":"Deselect {resourceNameSingular}","a11yCheckboxSelectAllSingle":"Select {resourceNameSingular}","a11yCheckboxDeselectAllMultiple":"Deselect all {itemsLength} {resourceNamePlural}","a11yCheckboxSelectAllMultiple":"Select all {itemsLength} {resourceNamePlural}","Item":{"actionsDropdownLabel":"Actions for {accessibilityLabel}","actionsDropdown":"Actions dropdown","viewItem":"View details for {itemName}"},"BulkActions":{"actionsActivatorLabel":"Actions","moreActionsActivatorLabel":"More actions"}},"SkeletonPage":{"loadingLabel":"Page loading"},"Tabs":{"newViewAccessibilityLabel":"Create new view","newViewTooltip":"Create view","toggleTabsLabel":"More views","Tab":{"rename":"Rename view","duplicate":"Duplicate view","edit":"Edit view","editColumns":"Edit columns","delete":"Delete view","copy":"Copy of {name}","deleteModal":{"title":"Delete view?","description":"This can’t be undone. {viewName} view will no longer be available in your admin.","cancel":"Cancel","delete":"Delete view"}},"RenameModal":{"title":"Rename view","label":"Name","cancel":"Cancel","create":"Save","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"DuplicateModal":{"title":"Duplicate view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}},"CreateViewModal":{"title":"Create new view","label":"Name","cancel":"Cancel","create":"Create view","errors":{"sameName":"A view with this name already exists. Please choose a different name."}}},"Tag":{"ariaLabel":"Remove {children}"},"TextField":{"characterCount":"{count} characters","characterCountWithMaxLength":"{count} of {limit} characters used"},"TooltipOverlay":{"accessibilityLabel":"Tooltip: {label}"},"TopBar":{"toggleMenuLabel":"Toggle menu","SearchField":{"clearButtonLabel":"Clear","search":"Search"}},"MediaCard":{"dismissButton":"Dismiss","popoverButton":"Actions"},"VideoThumbnail":{"playButtonA11yLabel":{"default":"Play video","defaultWithDuration":"Play video of length {duration}","duration":{"hours":{"other":{"only":"{hourCount} hours","andMinutes":"{hourCount} hours and {minuteCount} minutes","andMinute":"{hourCount} hours and {minuteCount} minute","minutesAndSeconds":"{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hours, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hours, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hours, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hours and {secondCount} seconds","andSecond":"{hourCount} hours and {secondCount} second"},"one":{"only":"{hourCount} hour","andMinutes":"{hourCount} hour and {minuteCount} minutes","andMinute":"{hourCount} hour and {minuteCount} minute","minutesAndSeconds":"{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds","minutesAndSecond":"{hourCount} hour, {minuteCount} minutes, and {secondCount} second","minuteAndSeconds":"{hourCount} hour, {minuteCount} minute, and {secondCount} seconds","minuteAndSecond":"{hourCount} hour, {minuteCount} minute, and {secondCount} second","andSeconds":"{hourCount} hour and {secondCount} seconds","andSecond":"{hourCount} hour and {secondCount} second"}},"minutes":{"other":{"only":"{minuteCount} minutes","andSeconds":"{minuteCount} minutes and {secondCount} seconds","andSecond":"{minuteCount} minutes and {secondCount} second"},"one":{"only":"{minuteCount} minute","andSeconds":"{minuteCount} minute and {secondCount} seconds","andSecond":"{minuteCount} minute and {secondCount} second"}},"seconds":{"other":"{secondCount} seconds","one":"{secondCount} second"}}}}}');
const polarisTranslations = {
  Polaris
};
const polarisStyles = "/assets/styles-BeiPL2RV.css";
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const links$3 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$j = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors, polarisTranslations };
};
const action$j = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, { i18n: loaderData.polarisTranslations, children: /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(FormLayout, { children: [
    /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Log in" }),
    /* @__PURE__ */ jsx(
      TextField,
      {
        type: "text",
        name: "shop",
        label: "Shop domain",
        helpText: "example.myshopify.com",
        value: shop,
        onChange: setShop,
        autoComplete: "on",
        error: errors.shop
      }
    ),
    /* @__PURE__ */ jsx(Button, { submit: true, children: "Log in" })
  ] }) }) }) }) });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$j,
  default: Auth,
  links: links$3,
  loader: loader$j
}, Symbol.toStringTag, { value: "Module" }));
const action$i = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        console.log("Customer data request:", payload);
        break;
      case "CUSTOMERS_REDACT":
        console.log("Customer redact request:", payload);
        break;
      case "SHOP_REDACT":
        console.log("Shop redact request:", payload);
        console.log(`Shop data cleanup acknowledged for: ${shop}`);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$i
}, Symbol.toStringTag, { value: "Module" }));
const action$h = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
    console.log(`Subscription update for shop ${shop}:`, payload);
    const subscription = payload;
    if (subscription.status === "CANCELLED" || subscription.status === "EXPIRED") {
      console.log(`Subscription ${subscription.status} for shop ${shop}`);
    }
    if (subscription.status === "ACTIVE") {
      console.log(`Subscription activated for shop ${shop}`);
    }
  }
  return new Response(null, { status: 200 });
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$h
}, Symbol.toStringTag, { value: "Module" }));
const action$g = async ({ request }) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    console.log(`Received customers/data_request webhook for ${shop}`);
    console.log("Customer data request:", payload);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$g
}, Symbol.toStringTag, { value: "Module" }));
const action$f = async ({ request }) => {
  try {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    const current = payload.current;
    if (session && session.accessToken) {
      console.log(`Scopes updated for shop: ${shop}`);
      console.log(`New scopes:`, current);
    }
    return new Response();
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$f
}, Symbol.toStringTag, { value: "Module" }));
const action$e = async ({ request }) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    console.log(`Received customers/redact webhook for ${shop}`);
    console.log("Customer redact request:", payload);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$e
}, Symbol.toStringTag, { value: "Module" }));
const action$d = async ({ request }) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    markShopUninstalled(shop);
    await clearShopSessions(shop);
    console.log(`App uninstalled for shop: ${shop} - sessions cleared`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$d
}, Symbol.toStringTag, { value: "Module" }));
const action$c = async ({ request }) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    console.log(`Received shop/redact webhook for ${shop}`);
    console.log("Shop redact request:", payload);
    console.log(`Shop data cleanup acknowledged for: ${shop}`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$c
}, Symbol.toStringTag, { value: "Module" }));
const index = "_index_12o3y_1";
const heading = "_heading_12o3y_11";
const text = "_text_12o3y_12";
const content = "_content_12o3y_22";
const form = "_form_12o3y_27";
const label = "_label_12o3y_35";
const input = "_input_12o3y_43";
const button = "_button_12o3y_47";
const list = "_list_12o3y_51";
const styles = {
  index,
  heading,
  text,
  content,
  form,
  label,
  input,
  button,
  list
};
const loader$i = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { showForm: true };
};
function App$1() {
  const { showForm } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: styles.index, children: /* @__PURE__ */ jsxs("div", { className: styles.content, children: [
    /* @__PURE__ */ jsx("h1", { className: styles.heading, children: "Collections Creator for Shopify" }),
    /* @__PURE__ */ jsx("p", { className: styles.text, children: "Easily create and manage product collections in your Shopify store." }),
    showForm && /* @__PURE__ */ jsxs(Form, { className: styles.form, method: "post", action: "/auth/login", children: [
      /* @__PURE__ */ jsxs("label", { className: styles.label, children: [
        /* @__PURE__ */ jsx("span", { children: "Shop domain" }),
        /* @__PURE__ */ jsx("input", { className: styles.input, type: "text", name: "shop" }),
        /* @__PURE__ */ jsx("span", { children: "e.g: my-shop-domain.myshopify.com" })
      ] }),
      /* @__PURE__ */ jsx("button", { className: styles.button, type: "submit", children: "Log in" })
    ] }),
    /* @__PURE__ */ jsxs("ul", { className: styles.list, children: [
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Bulk Collection Creation" }),
        ". Create multiple collections at once to organize your products efficiently."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Smart Categorization" }),
        ". Automatically organize products into collections based on tags, types, or vendors."
      ] }),
      /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Easy Management" }),
        ". Update and manage all your collections from a single, intuitive dashboard."
      ] })
    ] })
  ] }) });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  loader: loader$i
}, Symbol.toStringTag, { value: "Module" }));
const loader$h = async ({ request }) => {
  console.log("=== AUTH CALLBACK TRIGGERED ===");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);
  try {
    const result = await authenticate.admin(request);
    console.log("Auth successful:", result);
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
};
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$h
}, Symbol.toStringTag, { value: "Module" }));
async function loader$g() {
  return json({
    status: "healthy",
    service: "collection-creator",
    platform: "Render",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
}
function HealthCheck() {
  return /* @__PURE__ */ jsxs("div", { style: { padding: "20px", fontFamily: "sans-serif" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "Collections Creator - Health Check" }),
    /* @__PURE__ */ jsx("p", { children: "✅ App is running successfully on Render" }),
    /* @__PURE__ */ jsx("p", { children: "This endpoint keeps the app warm to prevent cold starts." }),
    /* @__PURE__ */ jsx("hr", {}),
    /* @__PURE__ */ jsx("p", { children: "Service Status: Healthy" }),
    /* @__PURE__ */ jsx("p", { children: "Platform: Render" }),
    /* @__PURE__ */ jsxs("p", { children: [
      "Timestamp: ",
      (/* @__PURE__ */ new Date()).toISOString()
    ] })
  ] });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: HealthCheck,
  loader: loader$g
}, Symbol.toStringTag, { value: "Module" }));
const links$2 = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader$f = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    if (!session) {
      console.log("No session found, redirecting to auth");
      throw new Response(null, { status: 401 });
    }
    console.log("App loader - authenticated for shop:", session.shop);
    if (session.isOnlineAccessMode) {
      try {
        const warmupUrl = new URL("/app/warmup", request.url);
        await fetch(warmupUrl.toString(), {
          headers: request.headers
        }).catch(() => {
        });
      } catch (e) {
      }
    }
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    console.error("App loader authentication error:", error);
    throw error;
  }
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider$1, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsx(NavMenu, { children: /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Home" }) }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  return boundary.error(useRouteError());
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links: links$2,
  loader: loader$f
}, Symbol.toStringTag, { value: "Module" }));
async function checkSubscriptionStatus(admin, shop) {
  var _a2, _b;
  try {
    const query = `#graphql
      query checkSubscription {
        currentAppInstallation {
          id
          activeSubscriptions {
            id
            name
            status
            test
            createdAt
            currentPeriodEnd
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;
    const response = await admin.graphql(query);
    const result = await response.json();
    const subscriptions = ((_b = (_a2 = result.data) == null ? void 0 : _a2.currentAppInstallation) == null ? void 0 : _b.activeSubscriptions) || [];
    const hasActiveSubscription = subscriptions.length > 0 && subscriptions.some(
      (sub) => sub.status === "ACTIVE" || sub.status === "PENDING"
    );
    const activeSubscription = subscriptions.find(
      (sub) => sub.status === "ACTIVE" || sub.status === "PENDING"
    );
    return {
      hasActiveSubscription,
      subscription: activeSubscription || subscriptions[0]
    };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { hasActiveSubscription: false };
  }
}
class SizeChartImageService {
  constructor(config, logoPath) {
    __publicField(this, "config");
    __publicField(this, "logoPath");
    this.config = {
      mainColor: "#8B4A9C",
      headerBg: "#D1B3E0",
      textColor: "#000000",
      borderColor: "#8B4A9C",
      bulletColor: "#8B4A9C",
      alternateRowColor: "#F8F8F8",
      tableBorderWidth: 11,
      headerBorderWidth: 18,
      outerBorderWidth: 22,
      titleUnderlineHeight: 4,
      titleFontSize: 48,
      headerFontSize: 32,
      cellFontSize: 38,
      detailFontSize: 32,
      bulletFontSize: 36,
      brandName: "",
      ...config
    };
    this.logoPath = logoPath;
  }
  /**
   * Create size chart image from measurements (converted from Python PIL code)
   */
  async createSizeChartImage(measurements, product) {
    try {
      if (!measurements || Object.keys(measurements).length === 0) {
        return null;
      }
      const sizes = Object.keys(measurements);
      const allMeasurements = /* @__PURE__ */ new Set();
      Object.values(measurements).forEach((sizeData) => {
        Object.keys(sizeData).forEach((key) => allMeasurements.add(key));
      });
      const measurementTypes = Array.from(allMeasurements).sort();
      const headers2 = ["Size", ...measurementTypes];
      const rows = [];
      sizes.forEach((size) => {
        const row = [size];
        measurementTypes.forEach((measureType) => {
          const value = measurements[size][measureType] || "-";
          row.push(value);
        });
        rows.push(row);
      });
      return await this.createEnhancedSizeChartImage(headers2, rows, product, "Text-Based Measurements");
    } catch (error) {
      console.error("Error creating size chart from text:", error);
      return null;
    }
  }
  /**
   * Create enhanced size chart image with custom brand colors (converted from Python PIL)
   */
  async createEnhancedSizeChartImage(headers2, rows, product, chartType) {
    try {
      const maxHeaderLength = Math.max(...headers2.map((h) => h.length));
      const cellWidth = Math.max(320, Math.min(400, maxHeaderLength * 12));
      const cellHeight = 120;
      const headerHeight = 140;
      const tableWidth = headers2.length * cellWidth;
      const tableHeight = headerHeight + rows.length * cellHeight;
      const padding = 60;
      const titleSpace = 180;
      const description = product.descriptionHtml || "";
      const descriptionLength = description.length;
      let detailsSpace;
      if (descriptionLength > 5e3) {
        detailsSpace = 800;
      } else if (descriptionLength > 2e3) {
        detailsSpace = 650;
      } else {
        detailsSpace = 520;
      }
      const imgWidth = Math.max(tableWidth + padding * 2, 1800);
      const imgHeight = tableHeight + padding * 2 + titleSpace + detailsSpace;
      const canvas = createCanvas(imgWidth, imgHeight);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, imgWidth, imgHeight);
      const logoAreaHeight = 120;
      const logoY = 30;
      if (this.logoPath) {
        try {
          const logoImg = await loadImage(this.logoPath);
          const maxLogoWidth = 812;
          const maxLogoHeight = 271;
          const logoRatio = Math.min(maxLogoWidth / logoImg.width, maxLogoHeight / logoImg.height);
          const newLogoWidth = logoImg.width * logoRatio;
          const newLogoHeight = logoImg.height * logoRatio;
          const logoX = (imgWidth - newLogoWidth) / 2;
          ctx.drawImage(logoImg, logoX, logoY, newLogoWidth, newLogoHeight);
        } catch (error) {
          console.warn("Could not load logo:", error);
          this.drawTextLogo(ctx, imgWidth, logoY);
        }
      } else {
        this.drawTextLogo(ctx, imgWidth, logoY);
      }
      const title = "SIZE CHART";
      ctx.font = `bold ${this.config.titleFontSize}px Arial, sans-serif`;
      ctx.fillStyle = this.config.mainColor;
      const titleMetrics = ctx.measureText(title);
      const titleWidth = titleMetrics.width;
      const titleX = padding + 30;
      const titleY = logoAreaHeight + 30 + this.config.titleFontSize;
      ctx.fillText(title, titleX, titleY);
      const lineY = titleY + 20;
      ctx.fillRect(titleX, lineY, titleWidth, this.config.titleUnderlineHeight);
      const startX = (imgWidth - tableWidth) / 2;
      const startY = logoAreaHeight + 150;
      headers2.forEach((header, i) => {
        const x = startX + i * cellWidth;
        const y = startY;
        ctx.fillStyle = this.config.headerBg;
        ctx.fillRect(x, y, cellWidth, headerHeight);
        ctx.strokeStyle = this.config.borderColor;
        ctx.lineWidth = this.config.headerBorderWidth;
        ctx.strokeRect(x, y, cellWidth, headerHeight);
        let fontSize = this.config.headerFontSize;
        let textWidth = 0;
        let textHeight = 0;
        while (fontSize > 16) {
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(header);
          textWidth = metrics.width;
          textHeight = fontSize;
          if (textWidth <= cellWidth - 40 && textHeight <= headerHeight - 20) {
            break;
          }
          fontSize -= 2;
        }
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = y + (headerHeight + fontSize) / 2;
        const finalTextX = Math.max(x + 20, Math.min(textX, x + cellWidth - textWidth - 20));
        ctx.fillStyle = this.config.textColor;
        ctx.fillText(header, finalTextX, textY);
      });
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (colIdx >= headers2.length) return;
          const x = startX + colIdx * cellWidth;
          const y = startY + headerHeight + rowIdx * cellHeight;
          let fillColor;
          if (colIdx === 0) {
            fillColor = this.config.headerBg;
          } else {
            fillColor = rowIdx % 2 === 0 ? "white" : this.config.alternateRowColor;
          }
          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, cellWidth, cellHeight);
          ctx.strokeStyle = this.config.borderColor;
          ctx.lineWidth = this.config.tableBorderWidth;
          ctx.strokeRect(x, y, cellWidth, cellHeight);
          ctx.font = `bold ${this.config.cellFontSize}px Arial, sans-serif`;
          const metrics = ctx.measureText(cell);
          const textWidth = metrics.width;
          const textHeight = this.config.cellFontSize;
          const textX = x + (cellWidth - textWidth) / 2;
          const textY = y + (cellHeight + textHeight) / 2;
          const finalTextX = Math.max(x + 10, Math.min(textX, x + cellWidth - textWidth - 10));
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(cell, finalTextX, textY);
        });
      });
      let notesY = startY + headerHeight + rows.length * cellHeight + 50;
      try {
        const descriptionText = this.stripHtml(description).toLowerCase();
        const patterns = {
          "Features:": /features:\s*([^\n]*)/,
          "Sheer:": /sheer:\s*([^\n]*)/,
          "Stretch:": /stretch:\s*([^\n]*)/,
          "Material:": /(?:material composition:|material:|fabric:)\s*([^\n]*)/,
          "Pattern:": /(?:pattern type:|pattern:)\s*([^\n]*)/,
          "Style:": /style:\s*([^\n]*)/,
          "Neckline:": /neckline:\s*([^\n]*)/,
          "Length:": new RegExp("(?<!top\\s)(?<!sleeve\\s)length:\\s*([^\\n]*)"),
          "Sleeve Length:": /sleeve length:\s*([^\n]*)/,
          "Sleeve Type:": /sleeve type:\s*([^\n]*)/,
          "Care:": /(?:care instructions:|care:)\s*([^\n]*)/,
          "Fit:": /fit:\s*([^\n]*)/,
          "Color:": /color:\s*([^\n]*)/,
          "Season:": /(?:season:|occasion:)\s*([^\n]*)/
        };
        const productDetails = [];
        Object.entries(patterns).forEach(([label2, pattern]) => {
          const match = descriptionText.match(pattern);
          if (match && match[1]) {
            const content2 = match[1].trim();
            if (content2) {
              const capitalizedContent = content2.charAt(0).toUpperCase() + content2.slice(1);
              productDetails.push([label2, capitalizedContent]);
            }
          }
        });
        const maxDetails = Math.min(productDetails.length, descriptionLength > 3e3 ? 12 : 8);
        productDetails.slice(0, maxDetails).forEach(([label2, content2], i) => {
          const yPos = notesY + i * 60;
          const bulletX = padding + 30;
          ctx.fillStyle = this.config.bulletColor;
          ctx.beginPath();
          ctx.arc(bulletX + 8, yPos + 20, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.font = `bold ${this.config.bulletFontSize}px Arial, sans-serif`;
          const labelX = bulletX + 30;
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(label2, labelX, yPos + 25);
          ctx.font = `${this.config.detailFontSize}px Arial, sans-serif`;
          const labelMetrics = ctx.measureText(label2);
          const labelWidth = labelMetrics.width;
          const maxContentLength = descriptionLength > 3e3 ? 50 : 35;
          const contentTruncated = content2.length > maxContentLength ? content2.substring(0, maxContentLength) + "..." : content2;
          const contentX = labelX + labelWidth + 20;
          ctx.fillStyle = this.config.textColor;
          ctx.fillText(contentTruncated, contentX, yPos + 25);
        });
      } catch (error) {
        console.warn("Error processing product details:", error);
      }
      ctx.strokeStyle = this.config.borderColor;
      ctx.lineWidth = this.config.outerBorderWidth;
      ctx.strokeRect(
        this.config.outerBorderWidth / 2,
        this.config.outerBorderWidth / 2,
        imgWidth - this.config.outerBorderWidth,
        imgHeight - this.config.outerBorderWidth
      );
      return canvas.toBuffer("image/png");
    } catch (error) {
      console.error("Error creating enhanced size chart image:", error);
      return null;
    }
  }
  /**
   * Draw text logo as fallback when no image logo is provided
   */
  drawTextLogo(ctx, imgWidth, logoY) {
    if (!this.config.brandName || this.config.brandName.trim() === "") {
      return;
    }
    ctx.font = `bold 48px Arial, sans-serif`;
    const logoText = this.config.brandName.toUpperCase();
    const logoMetrics = ctx.measureText(logoText);
    const logoWidth = logoMetrics.width;
    const logoX = (imgWidth - logoWidth) / 2;
    ctx.fillStyle = this.config.mainColor;
    ctx.fillText(logoText, logoX, logoY + 48);
  }
  /**
   * Strip HTML tags from text (simple version)
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  }
  /**
   * Create size chart from HTML table
   */
  async createTableImage(tableHtml, product) {
    try {
      const rows = this.parseTableHtml(tableHtml);
      if (!rows || rows.length === 0) {
        return null;
      }
      const headers2 = rows[0];
      const dataRows = rows.slice(1);
      return await this.createEnhancedSizeChartImage(headers2, dataRows, product, "HTML Table");
    } catch (error) {
      console.error("Error creating table image:", error);
      return null;
    }
  }
  /**
   * Simple HTML table parser
   */
  parseTableHtml(tableHtml) {
    try {
      const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gi);
      if (!rowMatches) return null;
      const rows = [];
      rowMatches.forEach((rowHtml) => {
        const cellMatches = rowHtml.match(/<t[hd][^>]*>.*?<\/t[hd]>/gi);
        if (cellMatches) {
          const cells = cellMatches.map(
            (cellHtml) => this.stripHtml(cellHtml).trim()
          );
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      });
      return rows.length > 0 ? rows : null;
    } catch (error) {
      console.error("Error parsing table HTML:", error);
      return null;
    }
  }
}
class SizeChartService {
  constructor(admin, config, logoPath) {
    __publicField(this, "admin");
    __publicField(this, "imageService");
    this.admin = admin;
    this.imageService = new SizeChartImageService(config, logoPath);
  }
  /**
   * Extract measurements from product description text
   * Converted from Python regex patterns to TypeScript
   */
  extractMeasurementsFromText(descriptionText) {
    const measurements = {};
    let text2 = descriptionText.toLowerCase().trim();
    text2 = text2.replace(/：/g, ":");
    text2 = text2.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
    text2 = text2.replace(/\s+/g, " ");
    const sizeKeywords = [
      "size",
      "measurement",
      "bust",
      "waist",
      "chest",
      "length",
      "hip",
      "shoulder",
      "sizing",
      "guide",
      "dimensions",
      "insole",
      "shaft"
    ];
    if (!sizeKeywords.some((keyword) => text2.includes(keyword))) {
      return {};
    }
    const validMeasurements = [
      "bust",
      "chest",
      "waist",
      "hip",
      "length",
      "shoulder",
      "sleeve",
      "neck",
      "inseam",
      "rise",
      "thigh",
      "knee",
      "ankle",
      "front length",
      "back length",
      "sleeve length",
      "shoulder width",
      "chest width",
      "waist width",
      "hip width",
      "bust width",
      "top length",
      "outseam",
      "insole length",
      "shaft height",
      "heel height",
      "calf"
    ];
    const unitsPattern = '(?:in|inch|inches|"|cm|centimeter|centimeters)';
    const sizeIndicator = "(?:one size|x{0,3}[sml]|[0-9]{1,2}xl|[2-6]xl|[0-9]{1,2}x|[0-9]{1,2})";
    const measurePattern = new RegExp(`([a-zA-Z\\s/]+?)\\s*[:：-]?\\s*(\\d*\\.?\\d+)\\s*${unitsPattern}`, "gi");
    const linePattern = new RegExp(`^\\s*(${sizeIndicator})\\s*[:：-]\\s*(.*)`, "i");
    const lines = text2.split("\n");
    for (const line of lines) {
      const match = line.match(linePattern);
      if (match) {
        const size = match[1].trim().toUpperCase();
        const measurementsStr = match[2].trim();
        if (!measurements[size]) {
          measurements[size] = {};
        }
        let foundMeasures;
        measurePattern.lastIndex = 0;
        while ((foundMeasures = measurePattern.exec(measurementsStr)) !== null) {
          const measureName = foundMeasures[1];
          const value = foundMeasures[2];
          const cleanName = measureName.trim().replace(/\s+/g, " ");
          if (validMeasurements.some((vm) => cleanName.toLowerCase().includes(vm))) {
            const unitMatch = measurementsStr.match(new RegExp(`${value}\\s*(${unitsPattern})`, "i"));
            const unit = unitMatch ? unitMatch[1] : "in";
            measurements[size][this.toTitleCase(cleanName)] = `${value} ${unit}`;
          }
        }
      }
    }
    const blockKeywords = ["product measurements:", "measurements:", "size guide:", "sizing:", "dimensions:"];
    let textBlock = text2;
    for (const keyword of blockKeywords) {
      if (text2.includes(keyword)) {
        textBlock = text2.split(keyword)[1] || text2;
        break;
      }
    }
    const blockSizePattern = new RegExp(`(${sizeIndicator})\\s*[:：-]?\\s*((?:[a-zA-Z\\s/]+?[:：-]?\\s*\\d*\\.?\\d+\\s*${unitsPattern}\\s*,?\\s*)+)`, "gi");
    let sizeMatches;
    while ((sizeMatches = blockSizePattern.exec(textBlock)) !== null) {
      const size = sizeMatches[1].trim().toUpperCase();
      const measurementsStr = sizeMatches[2];
      if (!measurements[size]) {
        measurements[size] = {};
      }
      measurePattern.lastIndex = 0;
      let foundMeasures;
      while ((foundMeasures = measurePattern.exec(measurementsStr)) !== null) {
        const measureName = foundMeasures[1];
        const value = foundMeasures[2];
        const cleanName = measureName.trim().replace(/\s+/g, " ");
        if (validMeasurements.some((vm) => cleanName.toLowerCase().includes(vm))) {
          const unitMatch = measurementsStr.match(new RegExp(`${value}\\s*(${unitsPattern})`, "i"));
          const unit = unitMatch ? unitMatch[1] : "in";
          measurements[size][this.toTitleCase(cleanName)] = `${value} ${unit}`;
        }
      }
    }
    const validatedMeasurements = {};
    for (const [size, data] of Object.entries(measurements)) {
      if (Object.keys(data).length > 0) {
        validatedMeasurements[size] = data;
      }
    }
    const totalMeasurements = Object.values(validatedMeasurements).reduce((sum, sizeData) => sum + Object.keys(sizeData).length, 0);
    if (totalMeasurements < 1) {
      return {};
    }
    return validatedMeasurements;
  }
  /**
   * Convert string to title case
   */
  toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
  /**
   * Check if product already has a size chart image
   */
  async hasExistingSizeChart(productId) {
    var _a2, _b, _c;
    try {
      const query = `
        query getProductImages($id: ID!) {
          product(id: $id) {
            images(first: 10) {
              edges {
                node {
                  altText
                }
              }
            }
          }
        }
      `;
      const response = await this.admin.graphql(query, {
        variables: { id: productId }
      });
      const data = await response.json();
      const images = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.product) == null ? void 0 : _b.images) == null ? void 0 : _c.edges) || [];
      return images.some((edge) => {
        const altText = edge.node.altText || "";
        return altText.toLowerCase().includes("size chart");
      });
    } catch (error) {
      console.error("Error checking existing size chart:", error);
      return false;
    }
  }
  /**
   * Create size chart image from measurements
   */
  async createSizeChartImage(measurements, product) {
    try {
      console.log("Creating size chart image for product:", product.title);
      console.log("Measurements:", measurements);
      const imageBuffer = await this.imageService.createSizeChartImage(measurements, product);
      if (!imageBuffer) {
        return null;
      }
      const base64Image = imageBuffer.toString("base64");
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error("Error creating size chart image:", error);
      return null;
    }
  }
  /**
   * Upload image to Shopify product
   */
  async uploadImageToShopify(imageDataUrl, productId, productTitle) {
    var _a2, _b, _c, _d, _e;
    try {
      console.log("Uploading image to Shopify for product:", productTitle);
      const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      const mutation = `
        mutation productImageCreate($productId: ID!, $image: ImageInput!) {
          productImageCreate(productId: $productId, image: $image) {
            image {
              id
              url
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const response = await this.admin.graphql(mutation, {
        variables: {
          productId,
          image: {
            attachment: base64Data,
            altText: `Size Chart - ${productTitle}`
          }
        }
      });
      const data = await response.json();
      if (((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.productImageCreate) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
        console.error("GraphQL errors:", data.data.productImageCreate.userErrors);
        return false;
      }
      if ((_e = (_d = data.data) == null ? void 0 : _d.productImageCreate) == null ? void 0 : _e.image) {
        console.log("Successfully uploaded image:", data.data.productImageCreate.image.url);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error uploading image to Shopify:", error);
      return false;
    }
  }
  /**
   * Process a single product for size chart creation
   */
  async processSingleProduct(product) {
    const result = {
      productId: product.id,
      productTitle: product.title,
      success: false,
      imageUploaded: false,
      skipped: false
    };
    try {
      const hasExisting = await this.hasExistingSizeChart(product.id);
      if (hasExisting) {
        result.skipped = true;
        result.error = "Already has size chart image";
        return result;
      }
      const measurements = this.extractMeasurementsFromText(product.descriptionHtml);
      if (Object.keys(measurements).length === 0) {
        result.error = "No size chart data found in description";
        return result;
      }
      const totalMeasurements = Object.values(measurements).reduce((sum, sizeData) => sum + Object.keys(sizeData).length, 0);
      if (totalMeasurements < 2) {
        result.error = "Insufficient measurements found (need at least 2)";
        return result;
      }
      const imageUrl = await this.createSizeChartImage(measurements, product);
      if (!imageUrl) {
        result.error = "Failed to create size chart image";
        return result;
      }
      result.screenshotPath = imageUrl;
      const uploadSuccess = await this.uploadImageToShopify(imageUrl, product.id, product.title);
      if (uploadSuccess) {
        result.success = true;
        result.imageUploaded = true;
      } else {
        result.error = "Failed to upload image to Shopify";
      }
    } catch (error) {
      result.error = `Processing error: ${error}`;
    }
    return result;
  }
  /**
   * Process multiple products sequentially
   */
  async processProducts(products, progressCallback) {
    const results = [];
    console.log(`Starting to process ${products.length} products sequentially...`);
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        if (progressCallback) {
          progressCallback(i + 1, products.length);
        }
        const result = await this.processSingleProduct(product);
        results.push(result);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          productId: product.id,
          productTitle: product.title,
          success: false,
          imageUploaded: false,
          error: `Processing error: ${error}`,
          skipped: false
        });
      }
    }
    const successfulCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failedCount = results.length - successfulCount - skippedCount;
    console.log(`Completed processing ${products.length} products! ✅ ${successfulCount} successful, ❌ ${failedCount} failed, ⏭️ ${skippedCount} skipped`);
    return results;
  }
  /**
   * Get all products from Shopify store with pagination
   */
  async getAllProducts() {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const products = [];
    let hasNextPage = true;
    let cursor = null;
    while (hasNextPage) {
      try {
        const query = `
          query getProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              edges {
                node {
                  id
                  title
                  handle
                  descriptionHtml
                  images(first: 10) {
                    edges {
                      node {
                        id
                        url
                        altText
                      }
                    }
                  }
                }
                cursor
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `;
        const response = await this.admin.graphql(query, {
          variables: {
            first: 250,
            // Maximum allowed by Shopify API
            after: cursor
          }
        });
        const data = await response.json();
        const edges = ((_b = (_a2 = data.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges) || [];
        for (const edge of edges) {
          products.push({
            ...edge.node,
            images: ((_d = (_c = edge.node.images) == null ? void 0 : _c.edges) == null ? void 0 : _d.map((imgEdge) => imgEdge.node)) || []
          });
        }
        hasNextPage = ((_g = (_f = (_e = data.data) == null ? void 0 : _e.products) == null ? void 0 : _f.pageInfo) == null ? void 0 : _g.hasNextPage) || false;
        cursor = ((_j = (_i = (_h = data.data) == null ? void 0 : _h.products) == null ? void 0 : _i.pageInfo) == null ? void 0 : _j.endCursor) || null;
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (error) {
        console.error("Error fetching products:", error);
        break;
      }
    }
    console.log(`Successfully fetched ${products.length} products total`);
    return products;
  }
  /**
   * Get products from a specific collection
   */
  async getProductsByCollection(collectionId) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const products = [];
    let hasNextPage = true;
    let cursor = null;
    while (hasNextPage) {
      try {
        const query = `
          query getCollectionProducts($id: ID!, $first: Int!, $after: String) {
            collection(id: $id) {
              products(first: $first, after: $after) {
                edges {
                  node {
                    id
                    title
                    handle
                    descriptionHtml
                    images(first: 10) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                    }
                  }
                  cursor
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `;
        const response = await this.admin.graphql(query, {
          variables: {
            id: collectionId,
            first: 250,
            after: cursor
          }
        });
        const data = await response.json();
        const edges = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collection) == null ? void 0 : _b.products) == null ? void 0 : _c.edges) || [];
        for (const edge of edges) {
          products.push({
            ...edge.node,
            images: ((_e = (_d = edge.node.images) == null ? void 0 : _d.edges) == null ? void 0 : _e.map((imgEdge) => imgEdge.node)) || []
          });
        }
        hasNextPage = ((_i = (_h = (_g = (_f = data.data) == null ? void 0 : _f.collection) == null ? void 0 : _g.products) == null ? void 0 : _h.pageInfo) == null ? void 0 : _i.hasNextPage) || false;
        cursor = ((_m = (_l = (_k = (_j = data.data) == null ? void 0 : _j.collection) == null ? void 0 : _k.products) == null ? void 0 : _l.pageInfo) == null ? void 0 : _m.endCursor) || null;
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (error) {
        console.error("Error fetching collection products:", error);
        break;
      }
    }
    console.log(`Successfully fetched ${products.length} products from collection`);
    return products;
  }
}
const loader$e = async ({ request }) => {
  var _a2, _b, _c, _d, _e, _f;
  const { admin, session } = await authenticate.admin(request);
  if (!session) {
    console.log("No session in size-chart-creator, authentication required");
    throw new Response(null, { status: 401 });
  }
  if (isShopUninstalled(session.shop)) {
    console.log("Shop was uninstalled, forcing re-authentication:", session.shop);
    throw new Response(null, { status: 401 });
  }
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(admin, session.shop);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";
  const needsSubscription = !hasActiveSubscription;
  if (needsSubscription) {
    console.log(`No subscription for ${session.shop} - showing pricing page`);
    return json({
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  }
  console.log("Loading products for size chart processing for shop:", session.shop);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const productsQuery = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  const collectionsQuery = `
    query getCollections {
      collections(first: 250) {
        edges {
          node {
            id
            title
            handle
            productsCount {
              count
            }
          }
        }
      }
    }
  `;
  try {
    let retries = 5;
    let productsResponse, collectionsResponse;
    let productsData, collectionsData;
    while (retries > 0) {
      try {
        productsResponse = await admin.graphql(productsQuery, {
          variables: { first: 250 }
        });
        collectionsResponse = await admin.graphql(collectionsQuery);
        productsData = await productsResponse.json();
        collectionsData = await collectionsResponse.json();
        if (productsData && productsData.data && collectionsData && collectionsData.data) {
          break;
        }
        throw new Error("Empty response");
      } catch (retryError) {
        console.log(`GraphQL retry attempt ${6 - retries}/5`);
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        } else {
          console.error("All retries exhausted:", retryError);
          throw retryError;
        }
      }
    }
    const products = ((_c = (_b = (_a2 = productsData.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3, _b2;
      return {
        ...edge.node,
        images: ((_b2 = (_a3 = edge.node.images) == null ? void 0 : _a3.edges) == null ? void 0 : _b2.map((imgEdge) => imgEdge.node)) || []
      };
    })) || [];
    const collections = ((_f = (_e = (_d = collectionsData.data) == null ? void 0 : _d.collections) == null ? void 0 : _e.edges) == null ? void 0 : _f.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0
      };
    })) || [];
    console.log(`Fetched ${products.length} products and ${collections.length} collections from Shopify`);
    return json({
      products,
      collections,
      stats: {
        totalProducts: products.length,
        totalCollections: collections.length
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return json({
      products: [],
      collections: [],
      stats: {
        totalProducts: 0,
        totalCollections: 0
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  }
};
const action$b = async ({ request }) => {
  let admin, session;
  let authAttempts = 0;
  const maxAuthAttempts = 3;
  while (authAttempts < maxAuthAttempts) {
    try {
      const auth = await authenticate.admin(request);
      admin = auth.admin;
      session = auth.session;
      if (session && admin) {
        console.log(`Auth successful on attempt ${authAttempts + 1} for shop:`, session.shop);
        break;
      }
    } catch (authError) {
      authAttempts++;
      console.error(`Auth attempt ${authAttempts} failed:`, authError);
      if (authAttempts < maxAuthAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * authAttempts));
      } else {
        throw authError;
      }
    }
  }
  if (!session || !admin) {
    console.error("No valid session after all auth attempts");
    throw new Response(null, { status: 401 });
  }
  console.log("Action called with verified session for shop:", session.shop);
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    if (actionType === "process_size_charts") {
      const selectedProducts = JSON.parse(formData.get("selectedProducts") || "[]");
      const selectedCollection = formData.get("selectedCollection");
      const processingMode = formData.get("processingMode");
      console.log(`Processing size charts for ${selectedProducts.length} products`);
      const brandConfig = {
        mainColor: formData.get("mainColor") || "#8B4A9C",
        headerBg: formData.get("headerBg") || "#D1B3E0",
        textColor: formData.get("textColor") || "#000000",
        borderColor: formData.get("borderColor") || "#8B4A9C",
        bulletColor: formData.get("bulletColor") || "#8B4A9C",
        alternateRowColor: formData.get("alternateRowColor") || "#F8F8F8",
        brandName: formData.get("brandName") || "",
        tableBorderWidth: parseInt(formData.get("tableBorderWidth") || "11"),
        headerBorderWidth: parseInt(formData.get("headerBorderWidth") || "18"),
        outerBorderWidth: parseInt(formData.get("outerBorderWidth") || "22"),
        titleUnderlineHeight: parseInt(formData.get("titleUnderlineHeight") || "4"),
        titleFontSize: parseInt(formData.get("titleFontSize") || "48"),
        headerFontSize: parseInt(formData.get("headerFontSize") || "32"),
        cellFontSize: parseInt(formData.get("cellFontSize") || "38"),
        detailFontSize: parseInt(formData.get("detailFontSize") || "32"),
        bulletFontSize: parseInt(formData.get("bulletFontSize") || "36")
      };
      const sizeChartService = new SizeChartService(admin, brandConfig);
      const results = await sizeChartService.processProducts(selectedProducts);
      const successfulCount = results.filter((r) => r.success).length;
      const skippedCount = results.filter((r) => r.skipped).length;
      return json({
        success: true,
        message: `Processed ${successfulCount} of ${selectedProducts.length} products`,
        results,
        processedCount: successfulCount,
        totalCount: selectedProducts.length,
        skippedCount
      });
    }
    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: "Operation failed" });
  }
};
function SizeChartCreator() {
  var _a2, _b;
  const data = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify2 = useAppBridge();
  const handleSubscribe = (planType) => {
    const shop = data.shop.replace(".myshopify.com", "");
    const billingUrl = `https://admin.shopify.com/store/${shop}/charges/collections-creator/pricing_plans`;
    window.top.location.href = billingUrl;
  };
  if (data.needsSubscription) {
    return /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx("div", { style: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "2rem 0"
    }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "600", children: [
      /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx(Text, { variant: "heading2xl", as: "h1", children: "Choose Your Plan" }),
        /* @__PURE__ */ jsx("div", { style: { marginTop: "0.5rem" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Select your subscription plan. Cancel anytime." }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem",
        marginTop: "1rem"
      }, children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("div", { style: {
          padding: "2rem",
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Starter" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Perfect for small stores" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: {
            textAlign: "center",
            padding: "1.5rem 0",
            borderBottom: "1px solid #e1e3e5"
          }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }, children: [
            /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "span", children: "$1.99" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", as: "span", children: "/month" })
          ] }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Unlimited size charts" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Bulk operations" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Custom brand colors" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Email support" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { marginTop: "auto", paddingTop: "1rem" }, children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              size: "large",
              fullWidth: true,
              onClick: () => handleSubscribe(),
              children: "Subscribe Now"
            }
          ) })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: {
          padding: "2rem",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          border: "2px solid #5c6ac4",
          borderRadius: "0.5rem"
        }, children: [
          /* @__PURE__ */ jsx("div", { style: {
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#5c6ac4",
            color: "white",
            padding: "4px 16px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }, children: "Best Value - Save 20%" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Professional" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "For growing businesses" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: {
              textAlign: "center",
              padding: "1.5rem 0",
              borderBottom: "1px solid #e1e3e5"
            }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "span", children: "$19.00" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", as: "span", children: "/year" })
              ] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "success", children: "Save $4.88 (20% off)" })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Everything in Starter" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Priority support" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Advanced analytics" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "API access" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: "auto", paddingTop: "1rem" }, children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                tone: "success",
                size: "large",
                fullWidth: true,
                onClick: () => handleSubscribe(),
                children: "Subscribe Now"
              }
            ) })
          ] })
        ] }) })
      ] })
    ] }) }) }) }) });
  }
  const { products, collections, stats } = data;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [processingMode, setProcessingMode] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [processingResults, setProcessingResults] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [mainColor, setMainColor] = useState("#8B4A9C");
  const [headerBg, setHeaderBg] = useState("#D1B3E0");
  const [textColor, setTextColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#8B4A9C");
  const [bulletColor, setBulletColor] = useState("#8B4A9C");
  const [alternateRowColor, setAlternateRowColor] = useState("#F8F8F8");
  const [tableBorderWidth, setTableBorderWidth] = useState(11);
  const [headerBorderWidth, setHeaderBorderWidth] = useState(18);
  const [outerBorderWidth, setOuterBorderWidth] = useState(22);
  const [titleUnderlineHeight, setTitleUnderlineHeight] = useState(4);
  const [titleFontSize, setTitleFontSize] = useState(48);
  const [headerFontSize, setHeaderFontSize] = useState(32);
  const [cellFontSize, setCellFontSize] = useState(38);
  const [detailFontSize, setDetailFontSize] = useState(32);
  const [bulletFontSize, setBulletFontSize] = useState(36);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.requiresAuth) {
        console.log("Authentication required, refreshing page...");
        shopify2.toast.show("Session expired. Refreshing...");
        setTimeout(() => {
          window.location.href = "/app";
        }, 1e3);
      } else if (fetcher.data.success && fetcher.state === "idle") {
        console.log("Operation successful");
        setIsProcessing(false);
        setShowResults(true);
        setProcessingResults(fetcher.data.results || []);
        shopify2.toast.show(`✅ Processed ${fetcher.data.processedCount} of ${fetcher.data.totalCount} products!`);
      } else if (fetcher.data.error && fetcher.state === "idle") {
        console.error("Operation failed:", fetcher.data.error);
        setIsProcessing(false);
        shopify2.toast.show(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data, fetcher.state, shopify2]);
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || product.handle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  const handleProductToggle = useCallback((product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  }, []);
  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts);
    }
  }, [selectedProducts, filteredProducts]);
  const handleStartProcessing = useCallback(() => {
    if (selectedProducts.length === 0) {
      shopify2.toast.show("Please select at least one product");
      return;
    }
    setIsProcessing(true);
    setShowResults(false);
    fetcher.submit(
      {
        actionType: "process_size_charts",
        selectedProducts: JSON.stringify(selectedProducts),
        selectedCollection,
        processingMode,
        // Brand configuration
        brandName,
        mainColor,
        headerBg,
        textColor,
        borderColor,
        bulletColor,
        alternateRowColor,
        tableBorderWidth: tableBorderWidth.toString(),
        headerBorderWidth: headerBorderWidth.toString(),
        outerBorderWidth: outerBorderWidth.toString(),
        titleUnderlineHeight: titleUnderlineHeight.toString(),
        titleFontSize: titleFontSize.toString(),
        headerFontSize: headerFontSize.toString(),
        cellFontSize: cellFontSize.toString(),
        detailFontSize: detailFontSize.toString(),
        bulletFontSize: bulletFontSize.toString()
      },
      { method: "POST" }
    );
  }, [selectedProducts, selectedCollection, processingMode, brandName, mainColor, headerBg, textColor, borderColor, bulletColor, alternateRowColor, tableBorderWidth, headerBorderWidth, outerBorderWidth, titleUnderlineHeight, titleFontSize, headerFontSize, cellFontSize, detailFontSize, bulletFontSize, fetcher, shopify2]);
  const rows = filteredProducts.map((product) => {
    var _a3, _b2, _c, _d, _e, _f;
    return [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: selectedProducts.some((p) => p.id === product.id),
            onChange: () => handleProductToggle(product),
            style: { marginRight: "8px" }
          }
        ),
        ((_b2 = (_a3 = product.images) == null ? void 0 : _a3[0]) == null ? void 0 : _b2.url) ? /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: product.images[0].url,
            alt: product.title,
            size: "small"
          }
        ) : /* @__PURE__ */ jsx("div", { style: {
          width: "40px",
          height: "40px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }, children: /* @__PURE__ */ jsx(Icon, { source: ProductIcon, tone: "base" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: product.title }),
          /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
            "/",
            product.handle
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Badge, { tone: ((_c = product.descriptionHtml) == null ? void 0 : _c.includes("size")) || ((_d = product.descriptionHtml) == null ? void 0 : _d.includes("measurement")) ? "success" : "attention", children: ((_e = product.descriptionHtml) == null ? void 0 : _e.includes("size")) || ((_f = product.descriptionHtml) == null ? void 0 : _f.includes("measurement")) ? "Has Size Data" : "No Size Data" }),
      /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", children: new Date(product.updatedAt).toLocaleDateString() })
    ];
  });
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Size Chart Creator" }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      width: "100%",
      background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      marginBottom: "1rem",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
    }, children: /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "0.8rem",
      padding: "0 1rem",
      maxWidth: "1400px",
      margin: "0 auto"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app"),
          icon: HomeIcon,
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🏠 Home" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
        padding: "4px",
        borderRadius: "12px",
        boxShadow: "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)",
        transition: "all 0.3s ease",
        transform: "scale(1.05)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/size-chart-creator"),
          icon: ImageIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "700",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "15px"
          }, children: "📏 Size Charts" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(240, 147, 251, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/create-collection"),
          icon: MagicIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🎨 Create Collection" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(79, 172, 254, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/bulk-operations"),
          icon: ImportIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "⚡ Bulk Operations" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => setShowContactModal(true),
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "📧 Contact Support" })
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxs(Page, { children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "1.5rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        color: "white",
        textAlign: "center"
      }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", align: "center", children: [
        /* @__PURE__ */ jsx(Text, { variant: "displayLarge", as: "h1", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold", fontSize: "3rem" }, children: stats.totalProducts }) }),
        /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)", fontSize: "1.2rem" }, children: "Products Available for Size Chart Processing" }) })
      ] }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsxs(Layout.Section, { variant: "oneThird", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "📏 Size Chart Processing" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Processing Options" }),
              /* @__PURE__ */ jsxs("div", { style: { marginTop: "1rem" }, children: [
                /* @__PURE__ */ jsx(
                  RadioButton,
                  {
                    label: "Process all products",
                    checked: processingMode === "all",
                    id: "all",
                    name: "processingMode",
                    onChange: () => setProcessingMode("all")
                  }
                ),
                /* @__PURE__ */ jsx(
                  RadioButton,
                  {
                    label: "Process selected products only",
                    checked: processingMode === "selected",
                    id: "selected",
                    name: "processingMode",
                    onChange: () => setProcessingMode("selected")
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Search products",
                placeholder: "Search by product name...",
                value: searchQuery,
                onChange: setSearchQuery,
                prefix: /* @__PURE__ */ jsx(Icon, { source: ProductIcon }),
                clearButton: true,
                onClearButtonClick: () => setSearchQuery(""),
                autoComplete: "off"
              }
            ),
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "plain",
                onClick: () => setShowBrandSettings(!showBrandSettings),
                children: showBrandSettings ? "Hide Brand Settings" : "Customize Brand & Colors"
              }
            ) }),
            showBrandSettings && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "🎨 Brand Customization" }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Brand Name (Optional)",
                  value: brandName,
                  onChange: setBrandName,
                  placeholder: "Enter your brand name",
                  helpText: "Will appear as logo if no image is uploaded",
                  autoComplete: "off"
                }
              ),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Main Color" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "color",
                      value: mainColor,
                      onChange: (e) => setMainColor(e.target.value),
                      style: { width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Header Background" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "color",
                      value: headerBg,
                      onChange: (e) => setHeaderBg(e.target.value),
                      style: { width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Text Color" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "color",
                      value: textColor,
                      onChange: (e) => setTextColor(e.target.value),
                      style: { width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Border Color" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "color",
                      value: borderColor,
                      onChange: (e) => setBorderColor(e.target.value),
                      style: { width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px" }
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Title Font Size",
                    type: "number",
                    value: titleFontSize.toString(),
                    onChange: (value) => setTitleFontSize(parseInt(value) || 48),
                    suffix: "px",
                    autoComplete: "off"
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Header Font Size",
                    type: "number",
                    value: headerFontSize.toString(),
                    onChange: (value) => setHeaderFontSize(parseInt(value) || 32),
                    suffix: "px",
                    autoComplete: "off"
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Table Border Width",
                    type: "number",
                    value: tableBorderWidth.toString(),
                    onChange: (value) => setTableBorderWidth(parseInt(value) || 11),
                    suffix: "px",
                    autoComplete: "off"
                  }
                ),
                /* @__PURE__ */ jsx(
                  TextField,
                  {
                    label: "Header Border Width",
                    type: "number",
                    value: headerBorderWidth.toString(),
                    onChange: (value) => setHeaderBorderWidth(parseInt(value) || 18),
                    suffix: "px",
                    autoComplete: "off"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "secondary",
                  onClick: () => {
                    setBrandName("");
                    setMainColor("#8B4A9C");
                    setHeaderBg("#D1B3E0");
                    setTextColor("#000000");
                    setBorderColor("#8B4A9C");
                    setBulletColor("#8B4A9C");
                    setAlternateRowColor("#F8F8F8");
                    setTableBorderWidth(11);
                    setHeaderBorderWidth(18);
                    setOuterBorderWidth(22);
                    setTitleUnderlineHeight(4);
                    setTitleFontSize(48);
                    setHeaderFontSize(32);
                    setCellFontSize(38);
                    setDetailFontSize(32);
                    setBulletFontSize(36);
                  },
                  children: "Reset to Defaults"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "p", children: [
                "Selected: ",
                selectedProducts.length,
                " products"
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "plain",
                  onClick: handleSelectAll,
                  children: selectedProducts.length === filteredProducts.length ? "Deselect All" : "Select All"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                size: "large",
                fullWidth: true,
                onClick: handleStartProcessing,
                loading: isProcessing,
                disabled: selectedProducts.length === 0,
                children: isProcessing ? "Processing..." : `🚀 Start Processing (${selectedProducts.length} products)`
              }
            ),
            isProcessing && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: "Processing products..." }),
              /* @__PURE__ */ jsx("div", { style: { marginTop: "0.5rem" }, children: /* @__PURE__ */ jsx(Spinner, { accessibilityLabel: "Processing", size: "small" }) })
            ] })
          ] }) }),
          showResults && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "📊 Processing Results" }),
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "p", children: [
              "Processed ",
              processingResults.filter((r) => r.success).length,
              " of ",
              processingResults.length,
              " products successfully"
            ] }) }),
            /* @__PURE__ */ jsx("div", { style: { maxHeight: "300px", overflowY: "auto" }, children: /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: processingResults.map((result, index2) => /* @__PURE__ */ jsxs("div", { style: {
              padding: "0.75rem",
              border: "1px solid #e1e3e5",
              borderRadius: "0.5rem",
              background: result.success ? "#f0f9ff" : "#fef2f2"
            }, children: [
              /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "p", children: [
                result.success ? "✅" : "❌",
                " ",
                result.productTitle
              ] }),
              result.error && /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: result.error })
            ] }, index2)) }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "twoThirds", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Your Products" }),
            /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
              filteredProducts.length,
              " products"
            ] })
          ] }),
          products.length === 0 ? /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No products found",
              action: {
                content: "Go to Products",
                icon: ProductIcon,
                onAction: () => navigate("/app")
              },
              image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              children: /* @__PURE__ */ jsx("p", { children: "You need products in your store to create size charts." })
            }
          ) : filteredProducts.length === 0 ? /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No products found",
              image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              children: /* @__PURE__ */ jsx("p", { children: "Try adjusting your search query" })
            }
          ) : /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text", "text"],
              headings: [
                "Product",
                "Size Data Status",
                "Last Updated"
              ],
              rows
            }
          )
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showContactModal,
          onClose: () => {
            setShowContactModal(false);
            setEmailCopied(false);
          },
          title: "Contact Support",
          primaryAction: {
            content: "Close",
            onAction: () => {
              setShowContactModal(false);
              setEmailCopied(false);
            }
          },
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx("div", { style: {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              textAlign: "center"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "📧 Need Help with Size Chart Creator?" }) }) }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "We're here to help! For any questions, issues, or feature requests regarding the Size Chart Creator app, please reach out to our support team." }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "📬 Email Support" }),
                /* @__PURE__ */ jsxs("div", { style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "white",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db"
                }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: /* @__PURE__ */ jsx("strong", { children: "support@axnivo.com" }) }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "micro",
                      variant: emailCopied ? "primary" : "secondary",
                      onClick: () => {
                        navigator.clipboard.writeText("support@axnivo.com");
                        setEmailCopied(true);
                        shopify2.toast.show("✅ Email copied to clipboard!");
                        setTimeout(() => setEmailCopied(false), 3e3);
                      },
                      children: emailCopied ? "✅ Copied!" : "Copy"
                    }
                  )
                ] })
              ] }) })
            ] })
          ] }) })
        }
      ),
      ((_a2 = fetcher.data) == null ? void 0 : _a2.success) && /* @__PURE__ */ jsx("div", { style: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1e3
      }, children: /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Success!",
          tone: "success",
          onDismiss: () => {
          }
        }
      ) }),
      ((_b = fetcher.data) == null ? void 0 : _b.error) && /* @__PURE__ */ jsx("div", { style: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1e3
      }, children: /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Error",
          tone: "critical",
          onDismiss: () => {
          },
          children: /* @__PURE__ */ jsx("p", { children: fetcher.data.error })
        }
      ) })
    ] })
  ] });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$b,
  default: SizeChartCreator,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const appStyles = "/assets/app-BWQcT1cM.css";
const customStyles = "/assets/custom-D5Z2oUK3.css";
const links$1 = () => [
  { rel: "stylesheet", href: appStyles },
  { rel: "stylesheet", href: customStyles }
];
const loader$d = async ({ request }) => {
  var _a2, _b, _c, _d, _e;
  try {
    const { admin, session } = await authenticate.admin(request);
    const weekAgo = /* @__PURE__ */ new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();
    const collectionsQuery = `
      query {
        collections(first: 250) {
          edges {
            node {
              id
              title
              updatedAt
              productsCount {
                count
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;
    const productsQuery = `
      query {
        products(first: 250, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
                width
                height
              }
              vendor
              productType
              tags
              updatedAt
              status
              totalInventory
              publishedAt
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;
    const [collectionsResponse, productsResponse] = await Promise.all([
      admin.graphql(collectionsQuery),
      admin.graphql(productsQuery)
    ]);
    const collectionsData = await collectionsResponse.json();
    const productsData = await productsResponse.json();
    const collections = ((_b = (_a2 = collectionsData.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) || [];
    const totalCollections = collections.length;
    const recentCollections = collections.filter((edge) => {
      const updatedAt = new Date(edge.node.updatedAt);
      return updatedAt >= weekAgo;
    });
    const collectionsThisWeek = recentCollections.length;
    const collectionsWithProducts = collections.filter(
      (edge) => {
        var _a3;
        return ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) > 0;
      }
    );
    const successRate = totalCollections > 0 ? Math.round(collectionsWithProducts.length / totalCollections * 100) : 0;
    const allProducts = ((_e = (_d = (_c = productsData.data) == null ? void 0 : _c.products) == null ? void 0 : _d.edges) == null ? void 0 : _e.map((edge) => edge.node)) || [];
    const products = allProducts.filter((product) => product.status === "ACTIVE" && product.publishedAt);
    const totalProducts = products.length;
    const stats = {
      totalCollections,
      totalProducts,
      successRate,
      collectionsThisWeek
    };
    return json({
      shop: session.shop.replace(".myshopify.com", ""),
      stats,
      products
    });
  } catch (error) {
    console.error("Error fetching Shopify data:", error);
    const stats = {
      totalCollections: 0,
      totalProducts: 0,
      successRate: 0,
      collectionsThisWeek: 0
    };
    return json({
      shop: "demo-shop",
      stats,
      products: []
    });
  }
};
const action$a = async ({ request }) => {
  var _a2, _b, _c;
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const handle = formData.get("handle");
    const seoTitle = formData.get("seoTitle");
    const seoDescription = formData.get("seoDescription");
    const collectionType = formData.get("collectionType");
    const selectedProducts = JSON.parse(formData.get("selectedProducts") || "[]");
    const conditions = JSON.parse(formData.get("conditions") || "[]");
    const conditionMatch = formData.get("conditionMatch");
    let mutation;
    let variables;
    if (collectionType === "smart") {
      const rules = conditions.filter((c) => c.value).map((c) => {
        let column = c.type.toUpperCase();
        if (column === "PRODUCT_TYPE") column = "TYPE";
        if (column === "VARIANT_INVENTORY") column = "INVENTORY_QUANTITY";
        if (column === "VARIANT_WEIGHT") column = "WEIGHT";
        let relation = c.operator.toUpperCase();
        if (relation === "GREATER") relation = "GREATER_THAN";
        if (relation === "LESS") relation = "LESS_THAN";
        return {
          column,
          relation,
          condition: c.value
        };
      });
      mutation = `
        mutation createSmartCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      variables = {
        input: {
          title,
          descriptionHtml: description ? `<p>${description}</p>` : "",
          handle: handle || void 0,
          ruleSet: rules.length > 0 ? {
            appliedDisjunctively: conditionMatch === "any",
            rules
          } : void 0,
          seo: seoTitle || seoDescription ? {
            title: seoTitle || void 0,
            description: seoDescription || void 0
          } : void 0
        }
      };
    } else {
      mutation = `
        mutation createCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      variables = {
        input: {
          title,
          descriptionHtml: description ? `<p>${description}</p>` : "",
          handle: handle || void 0,
          seo: seoTitle || seoDescription ? {
            title: seoTitle || void 0,
            description: seoDescription || void 0
          } : void 0
        }
      };
    }
    let retries = 3;
    let response;
    let data;
    while (retries > 0) {
      try {
        console.log(`Creating collection, attempt ${4 - retries}/3`);
        response = await admin.graphql(mutation, { variables });
        data = await response.json();
        if (data && data.data && data.data.collectionCreate) {
          break;
        }
        if (((_c = (_b = (_a2 = data == null ? void 0 : data.data) == null ? void 0 : _a2.collectionCreate) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
          break;
        }
      } catch (retryError) {
        console.error(`GraphQL error on attempt ${4 - retries}:`, retryError);
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        } else {
          throw new Error("Failed to create collection after 3 attempts");
        }
      }
    }
    if (data.data.collectionCreate.userErrors.length > 0) {
      return json({
        success: false,
        error: data.data.collectionCreate.userErrors[0].message
      });
    }
    const collectionId = data.data.collectionCreate.collection.id;
    if (collectionType === "manual" && selectedProducts.length > 0) {
      const addProductsMutation = `
        mutation addProductsToCollection($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            collection {
              id
              products(first: 5) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      await admin.graphql(addProductsMutation, {
        variables: {
          id: collectionId,
          productIds: selectedProducts
        }
      });
    }
    return json({
      success: true,
      collection: data.data.collectionCreate.collection
    });
  } catch (error) {
    console.error("Authentication or creation error:", error);
    return json({ success: false, error: "Failed to create collection - please try again" });
  }
};
function CreateCollection() {
  var _a2, _b;
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify2 = useAppBridge();
  const isLoading = fetcher.state === "submitting";
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [handle, setHandle] = useState("");
  const collectionType = "manual";
  const [isOnlineStore, setIsOnlineStore] = useState(true);
  const [creationProgress, setCreationProgress] = useState(0);
  const [inputError, setInputError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showContactModal, setShowContactModal] = useState(false);
  const [conditionMatch, setConditionMatch] = useState("all");
  const [conditions, setConditions] = useState([{
    id: 1,
    type: "tag",
    operator: "equals",
    value: ""
  }]);
  useEffect(() => {
    var _a3;
    if ((_a3 = fetcher.data) == null ? void 0 : _a3.success) {
      setToastMessage(`Collection '${fetcher.data.collection.title}' created successfully!`);
      setToastType("success");
      setToastActive(true);
      setTimeout(() => {
        setToastActive(false);
      }, 4500);
      setTimeout(() => {
        setCollectionName("");
        setCollectionDescription("");
        setSeoTitle("");
        setSeoDescription("");
        setHandle("");
      }, 2e3);
    }
  }, [fetcher.data]);
  const toggleToastActive = useCallback(() => setToastActive((active) => !active), []);
  const [selectedProducts, setSelectedProducts] = useState(/* @__PURE__ */ new Set());
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const handleSubmit = () => {
    if (!collectionName.trim()) {
      setInputError("Collection name is required");
      return;
    }
    setInputError("");
    fetcher.submit(
      {
        title: collectionName,
        description: collectionDescription,
        seoTitle,
        seoDescription,
        handle,
        collectionType,
        selectedProducts: JSON.stringify(Array.from(selectedProducts)),
        conditions: JSON.stringify(conditions),
        conditionMatch
      },
      { method: "POST" }
    );
  };
  const handleAISuggestions2 = () => {
    const suggestions = {
      names: [
        "Summer Essentials",
        "Best Sellers 2024",
        "New Arrivals",
        "Limited Edition",
        "Trending Now",
        "Customer Favorites",
        "Seasonal Collection",
        "Premium Selection",
        "Flash Sale Items",
        "Featured Products",
        "Holiday Special",
        "Clearance Sale",
        "Exclusive Deals",
        "Weekly Picks",
        "Editor's Choice",
        "Gift Ideas",
        "Back to School",
        "Winter Collection",
        "Spring Collection",
        "Fall Favorites",
        "Weekend Deals",
        "Top Rated",
        "Under $50",
        "Luxury Items",
        "Eco-Friendly",
        "New in Stock",
        "Staff Picks",
        "Bundle Deals",
        "Anniversary Sale",
        "Black Friday Deals"
      ],
      descriptions: [
        "Curated collection of our most popular items",
        "Handpicked products for the season",
        "Exclusive items available for a limited time",
        "Top-rated products loved by our customers",
        "Special offers and discounts on selected items",
        "Fresh arrivals that are trending right now",
        "Premium quality products at the best prices",
        "Carefully selected items for special occasions",
        "Our team's favorite picks for this month",
        "Amazing deals you don't want to miss",
        "Essential items for everyday use",
        "Perfect gifts for your loved ones",
        "Sustainable and eco-conscious products",
        "Limited stock items - grab them while you can",
        "Bestselling products from our catalog"
      ]
    };
    if (!window.lastUsedSuggestions) {
      window.lastUsedSuggestions = { names: [], descriptions: [] };
    }
    let availableNames = suggestions.names.filter(
      (name) => !window.lastUsedSuggestions.names.includes(name)
    );
    if (availableNames.length === 0) {
      availableNames = suggestions.names;
      window.lastUsedSuggestions.names = [];
    }
    let availableDescriptions = suggestions.descriptions.filter(
      (desc) => !window.lastUsedSuggestions.descriptions.includes(desc)
    );
    if (availableDescriptions.length === 0) {
      availableDescriptions = suggestions.descriptions;
      window.lastUsedSuggestions.descriptions = [];
    }
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    const randomDesc = availableDescriptions[Math.floor(Math.random() * availableDescriptions.length)];
    window.lastUsedSuggestions.names.push(randomName);
    window.lastUsedSuggestions.descriptions.push(randomDesc);
    if (window.lastUsedSuggestions.names.length > 5) {
      window.lastUsedSuggestions.names.shift();
    }
    if (window.lastUsedSuggestions.descriptions.length > 5) {
      window.lastUsedSuggestions.descriptions.shift();
    }
    setCollectionName(randomName);
    setCollectionDescription(randomDesc);
    setToastMessage("✨ AI suggestions applied!");
    setToastType("info");
    setToastActive(true);
    setTimeout(() => setToastActive(false), 3e3);
  };
  useEffect(() => {
    var _a3;
    if (isLoading) {
      setCreationProgress(10);
      const interval = setInterval(() => {
        setCreationProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(interval);
    } else if ((_a3 = fetcher.data) == null ? void 0 : _a3.success) {
      setCreationProgress(100);
      setCollectionName("");
      setCollectionDescription("");
      setSeoTitle("");
      setSeoDescription("");
      setHandle("");
      setTimeout(() => setCreationProgress(0), 2e3);
    }
  }, [fetcher.data, shopify2, isLoading]);
  const filteredProducts = ((_a2 = loaderData.products) == null ? void 0 : _a2.filter((product) => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    return product.title.toLowerCase().includes(query) || product.vendor.toLowerCase().includes(query) || product.productType.toLowerCase().includes(query) || product.tags.some((tag) => tag.toLowerCase().includes(query));
  })) || [];
  showAllProducts ? filteredProducts : filteredProducts.slice(0, 20);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      ` }),
    /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh", background: "#f8fafc", paddingBottom: "80px" }, children: [
      /* @__PURE__ */ jsx(
        TitleBar,
        {
          title: "Collection Creator",
          primaryAction: {
            content: "Create Collection",
            onAction: () => {
              const nameInput = document.querySelector('input[placeholder="e.g., Summer Essentials, Best Sellers"]');
              if (nameInput) {
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
          },
          secondaryActions: [
            {
              content: "Bulk Operations",
              onAction: () => navigate("/app/bulk-operations")
            }
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { style: {
        position: "sticky",
        top: 0,
        zIndex: 999,
        width: "100%",
        background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
        marginBottom: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
      }, children: /* @__PURE__ */ jsxs("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "0.8rem",
        padding: "0 1rem",
        maxWidth: "1400px",
        margin: "0 auto"
      }, children: [
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: "2px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
          transition: "all 0.3s ease",
          transform: "scale(1)"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            size: "large",
            fullWidth: true,
            onClick: () => navigate("/app"),
            icon: HomeIcon,
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "14px"
            }, children: "🏠 Home" })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
          padding: "4px",
          borderRadius: "12px",
          boxShadow: "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)",
          transition: "all 0.3s ease",
          transform: "scale(1.05)"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "large",
            fullWidth: true,
            onClick: () => navigate("/app/create-collection"),
            icon: MagicIcon,
            variant: "primary",
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "700",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "15px"
            }, children: "🎨 Create Collection" })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: "2px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(79, 172, 254, 0.4)",
          transition: "all 0.3s ease",
          transform: "scale(1)"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "large",
            fullWidth: true,
            onClick: () => navigate("/app/bulk-operations"),
            icon: ImportIcon,
            variant: "primary",
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "14px"
            }, children: "⚡ Bulk Operations" })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
          padding: "2px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0, 166, 81, 0.4)",
          transition: "all 0.3s ease",
          transform: "scale(1)"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "large",
            fullWidth: true,
            onClick: () => navigate("/app/subscription"),
            icon: CreditCardIcon,
            variant: "primary",
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "14px"
            }, children: "💳 Subscription" })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
          padding: "2px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
          transition: "all 0.3s ease"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            size: "large",
            fullWidth: true,
            onClick: () => setShowContactModal(true),
            variant: "primary",
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "600",
              letterSpacing: "0.5px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              fontSize: "14px"
            }, children: "📧 Contact Support" })
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "1rem 1.5rem",
        color: "white",
        position: "relative",
        overflow: "hidden",
        borderRadius: "0 0 20px 20px",
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)"
      }, children: [
        /* @__PURE__ */ jsx("div", { style: {
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "120px",
          height: "120px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%"
        } }),
        /* @__PURE__ */ jsx("div", { style: {
          position: "absolute",
          bottom: "-20px",
          left: "-20px",
          width: "100px",
          height: "100px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%"
        } }),
        /* @__PURE__ */ jsx("div", { style: { maxWidth: "800px", margin: "0 auto", position: "relative" }, children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "center", children: [
          /* @__PURE__ */ jsx("div", { style: {
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }, children: /* @__PURE__ */ jsx("span", { style: { fontSize: "24px" }, children: "✨" }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingLg", children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "700", letterSpacing: "0.5px" }, children: "Create Collection" }) }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "base", children: /* @__PURE__ */ jsx("span", { style: { opacity: "0.95" }, children: "Build organized product collections with ease" }) })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        creationProgress > 0 && creationProgress < 100 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "center", children: [
            /* @__PURE__ */ jsx(Icon, { source: RefreshIcon }),
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Creating Collection" })
          ] }),
          /* @__PURE__ */ jsx(ProgressBar, { progress: creationProgress, tone: "primary" }),
          /* @__PURE__ */ jsxs(Text, { variant: "bodySm", alignment: "center", tone: "subdued", children: [
            "Processing... ",
            creationProgress,
            "%"
          ] })
        ] }) }),
        ((_b = fetcher.data) == null ? void 0 : _b.error) && !isLoading && /* @__PURE__ */ jsx(
          Banner,
          {
            title: "Unable to create collection",
            tone: "critical",
            icon: AlertTriangleIcon,
            children: /* @__PURE__ */ jsx("p", { children: fetcher.data.error })
          }
        ),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Collection Details" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Give your collection a name and description" })
          ] }),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Name",
              value: collectionName,
              onChange: setCollectionName,
              placeholder: "e.g., Summer Essentials, Best Sellers",
              requiredIndicator: true,
              autoComplete: "off",
              error: inputError
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Description",
              value: collectionDescription,
              onChange: setCollectionDescription,
              placeholder: "Tell customers about this collection...",
              multiline: 3,
              autoComplete: "off"
            }
          ),
          /* @__PURE__ */ jsx(InlineStack, { gap: "300", children: /* @__PURE__ */ jsx("div", { style: {
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            padding: "2px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(240, 147, 251, 0.3)",
            display: "inline-block"
          }, children: /* @__PURE__ */ jsx(
            Button,
            {
              icon: MagicIcon,
              onClick: handleAISuggestions2,
              variant: "primary",
              size: "slim",
              children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "600" }, children: "✨ AI Suggestions" })
            }
          ) }) })
        ] }) }),
        false,
        false,
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Visibility" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Choose where this collection appears" })
          ] }),
          /* @__PURE__ */ jsx(Box, { padding: "300", background: isOnlineStore ? "bg-surface-success-subdued" : "bg-surface", borderRadius: "200", children: /* @__PURE__ */ jsx(
            Checkbox,
            {
              label: "Online Store",
              helpText: "Customers can find this collection on your website",
              checked: isOnlineStore,
              onChange: setIsOnlineStore
            }
          ) })
        ] }) }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(
            Box,
            {
              padding: "400",
              background: "bg-surface-neutral-subdued",
              borderRadius: "200",
              onClick: () => setShowAdvanced(!showAdvanced),
              style: { cursor: "pointer" },
              children: /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "space-between", children: [
                /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "SEO Settings" }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Optional settings for better discoverability" })
                ] }),
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: showAdvanced ? "−" : "+" })
              ] })
            }
          ),
          showAdvanced && /* @__PURE__ */ jsx(Box, { paddingBlockStart: "400", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "URL Handle",
                value: handle,
                onChange: setHandle,
                placeholder: "summer-collection",
                prefix: "collections/",
                helpText: "Leave empty for auto-generation",
                autoComplete: "off"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "SEO Title",
                value: seoTitle,
                onChange: setSeoTitle,
                placeholder: "Summer Collection - Your Store",
                helpText: "Title shown in search results",
                autoComplete: "off"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "SEO Description",
                value: seoDescription,
                onChange: setSeoDescription,
                placeholder: "Shop our curated summer collection...",
                multiline: 2,
                helpText: "Description shown in search results",
                autoComplete: "off"
              }
            )
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("div", { style: {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
        borderTop: "2px solid transparent",
        borderImage: "linear-gradient(90deg, #667eea 0%, #f093fb 50%, #4facfe 100%) 1",
        padding: "1rem 1.5rem",
        zIndex: 1e3,
        boxShadow: "0 -4px 20px rgba(102, 126, 234, 0.15)"
      }, children: /* @__PURE__ */ jsx("div", { style: { maxWidth: "800px", margin: "0 auto" }, children: /* @__PURE__ */ jsxs(InlineStack, { gap: "400", align: "center", children: [
        /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #e0e7ff 0%, #cfe2ff 100%)",
          padding: "2px",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(99, 102, 241, 0.2)"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "large",
            onClick: () => {
              setIsDraft(true);
              setToastMessage("📝 Draft saved!");
              setToastType("draft");
              setToastActive(true);
              setTimeout(() => setToastActive(false), 3e3);
            },
            disabled: !collectionName.trim(),
            children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "600" }, children: "📝 Save Draft" })
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx("div", { style: {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          padding: "3px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
          transition: "all 0.3s ease"
        }, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            size: "large",
            fullWidth: true,
            loading: isLoading,
            onClick: handleSubmit,
            disabled: !collectionName.trim(),
            children: /* @__PURE__ */ jsx("span", { style: {
              fontWeight: "700",
              letterSpacing: "0.5px",
              fontSize: "16px",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)"
            }, children: isLoading ? "🎨 Creating Magic..." : "✨ Create Collection" })
          }
        ) }) })
      ] }) }) })
    ] }),
    toastActive && /* @__PURE__ */ jsxs("div", { style: {
      position: "fixed",
      top: "240px",
      right: "20px",
      zIndex: 9999,
      background: toastType === "success" ? "#008060" : toastType === "info" ? "#5C6AC4" : "#6B7280",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      animation: "slideIn 0.3s ease-out",
      maxWidth: "400px"
    }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: "20px" }, children: toastType === "success" ? "✅" : toastType === "info" ? "✨" : "📝" }),
      /* @__PURE__ */ jsx("span", { children: toastMessage }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: toggleToastActive,
          style: {
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "18px",
            marginLeft: "auto",
            padding: "0 4px"
          },
          children: "×"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showContactModal,
        onClose: () => setShowContactModal(false),
        title: "Contact Support",
        primaryAction: {
          content: "Close",
          onAction: () => setShowContactModal(false)
        },
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx("div", { style: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            textAlign: "center"
          }, children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "📧 Need Help with Collections Creator?" }) }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team." }),
            /* @__PURE__ */ jsx("div", { style: {
              background: "#f8fafc",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "📬 Email Support" }),
              /* @__PURE__ */ jsxs("div", { style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "white",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db"
              }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: /* @__PURE__ */ jsx("strong", { children: "support@axnivo.com" }) }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    size: "micro",
                    onClick: () => {
                      navigator.clipboard.writeText("support@axnivo.com");
                    },
                    children: "Copy"
                  }
                )
              ] })
            ] }) }),
            /* @__PURE__ */ jsx("div", { style: {
              background: "#f0f9ff",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #0ea5e9"
            }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
              "💡 ",
              /* @__PURE__ */ jsx("strong", { children: "Tip:" }),
              " When contacting support, please include details about what you were trying to do and any error messages you saw. This helps us assist you faster!"
            ] }) })
          ] })
        ] }) })
      }
    )
  ] });
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$a,
  default: CreateCollection,
  links: links$1,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
const loader$c = async ({ request }) => {
  var _a2, _b, _c;
  try {
    const { admin } = await authenticate.admin(request);
    const query = `
      query getCollections {
        collections(first: 250) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              productsCount {
                count
              }
              updatedAt
            }
          }
        }
      }
    `;
    const response = await admin.graphql(query);
    const data = await response.json();
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0
      };
    })) || [];
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return json({ collections: [] });
  }
};
const action$9 = async ({ request }) => {
  var _a2;
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    if (actionType === "bulkImport") {
      const csvData = formData.get("csvData");
      const rows = csvData.split("\n").filter((row) => row.trim());
      const headers2 = rows[0].split(",").map((h) => h.trim().toLowerCase());
      const results = [];
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(",").map((v) => v.trim());
        const collection = {};
        headers2.forEach((header, index2) => {
          collection[header] = values[index2];
        });
        const mutation = `
        mutation collectionCreate($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
        try {
          const response = await admin.graphql(mutation, {
            variables: {
              input: {
                title: collection.title || `Collection ${i}`,
                descriptionHtml: collection.description ? `<p>${collection.description}</p>` : "",
                handle: collection.handle || ((_a2 = collection.title) == null ? void 0 : _a2.toLowerCase().replace(/\s+/g, "-"))
              }
            }
          });
          const data = await response.json();
          if (data.data.collectionCreate.userErrors.length === 0) {
            results.push({ success: true, title: collection.title });
          } else {
            results.push({
              success: false,
              title: collection.title,
              error: data.data.collectionCreate.userErrors[0].message
            });
          }
        } catch (error) {
          results.push({
            success: false,
            title: collection.title,
            error: "Failed to create collection"
          });
        }
      }
      return json({ actionType: "bulkImport", results });
    }
    if (actionType === "bulkDelete") {
      const collectionIds = JSON.parse(formData.get("collectionIds"));
      const results = [];
      for (const id of collectionIds) {
        const mutation = `
        mutation collectionDelete($id: ID!) {
          collectionDelete(input: { id: $id }) {
            deletedCollectionId
            userErrors {
              field
              message
            }
          }
        }
      `;
        try {
          const response = await admin.graphql(mutation, {
            variables: { id }
          });
          const data = await response.json();
          if (data.data.collectionDelete.userErrors.length === 0) {
            results.push({ success: true, id });
          } else {
            results.push({
              success: false,
              id,
              error: data.data.collectionDelete.userErrors[0].message
            });
          }
        } catch (error) {
          results.push({ success: false, id, error: "Failed to delete" });
        }
      }
      return json({ actionType: "bulkDelete", results });
    }
    if (actionType === "bulkDuplicate") {
      const collectionIds = JSON.parse(formData.get("collectionIds"));
      const results = [];
      for (const id of collectionIds) {
        const query = `
        query getCollection($id: ID!) {
          collection(id: $id) {
            title
            descriptionHtml
            handle
          }
        }
      `;
        try {
          const getResponse = await admin.graphql(query, {
            variables: { id }
          });
          const getData = await getResponse.json();
          const original = getData.data.collection;
          const mutation = `
          mutation collectionCreate($input: CollectionInput!) {
            collectionCreate(input: $input) {
              collection {
                id
                title
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
          const response = await admin.graphql(mutation, {
            variables: {
              input: {
                title: `${original.title} (Copy)`,
                descriptionHtml: original.descriptionHtml,
                handle: `${original.handle}-copy-${Date.now()}`
              }
            }
          });
          const data = await response.json();
          if (data.data.collectionCreate.userErrors.length === 0) {
            results.push({ success: true, title: `${original.title} (Copy)` });
          } else {
            results.push({
              success: false,
              title: original.title,
              error: data.data.collectionCreate.userErrors[0].message
            });
          }
        } catch (error) {
          results.push({ success: false, id, error: "Failed to duplicate" });
        }
      }
      return json({ actionType: "bulkDuplicate", results });
    }
    if (actionType === "exportCSV") {
      const collections = JSON.parse(formData.get("collections"));
      const csv = [
        "Title,Handle,Description,Products Count,Updated At",
        ...collections.map(
          (c) => {
            var _a3;
            return `"${c.title}","${c.handle}","${((_a3 = c.descriptionHtml) == null ? void 0 : _a3.replace(/<[^>]*>/g, "")) || ""}","${c.productsCount}","${c.updatedAt}"`;
          }
        )
      ].join("\n");
      return json({ actionType: "exportCSV", csv });
    }
    if (actionType === "editCollection") {
      const collectionId = formData.get("collectionId");
      const title = formData.get("title");
      const description = formData.get("description");
      const handle = formData.get("handle");
      const mutation = `
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
            handle
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            id: collectionId,
            title,
            descriptionHtml: description ? `<p>${description}</p>` : "",
            handle
          }
        }
      });
      const data = await response.json();
      if (data.data.collectionUpdate.userErrors.length === 0) {
        return json({ actionType: "editCollection", success: true });
      } else {
        return json({
          actionType: "editCollection",
          success: false,
          error: data.data.collectionUpdate.userErrors[0].message
        });
      }
    }
    return json({ actionType: "unknown", results: [] });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: "Authentication or action failed" });
  }
};
function BulkOperations() {
  const { collections } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationResults, setOperationResults] = useState([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [lastExportedCsv, setLastExportedCsv] = useState(null);
  const handleSelectCollection = useCallback((id) => {
    setSelectedCollections(
      (prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);
  const handleSelectAll = useCallback(() => {
    if (selectedCollections.length === collections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(collections.map((c) => c.id));
    }
  }, [selectedCollections, collections]);
  const handleEditOpen = useCallback(() => {
    var _a2;
    if (selectedCollections.length === 1) {
      const collection = collections.find((c) => c.id === selectedCollections[0]);
      if (collection) {
        setEditTitle(collection.title);
        setEditDescription(((_a2 = collection.descriptionHtml) == null ? void 0 : _a2.replace(/<[^>]*>/g, "")) || "");
        setEditHandle(collection.handle);
        setShowEditModal(true);
      }
    }
  }, [selectedCollections, collections]);
  const handleEditSave = useCallback(() => {
    if (selectedCollections.length === 1) {
      setIsProcessing(true);
      fetcher.submit(
        {
          actionType: "editCollection",
          collectionId: selectedCollections[0],
          title: editTitle,
          description: editDescription,
          handle: editHandle
        },
        { method: "POST" }
      );
      setTimeout(() => {
        setIsProcessing(false);
        setShowEditModal(false);
        navigate("/app/bulk-operations", { replace: true });
      }, 1e3);
    }
  }, [selectedCollections, editTitle, editDescription, editHandle, fetcher, navigate]);
  const handleFileUpload = useCallback((files) => {
    const file = files[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        var _a2;
        setCsvContent((_a2 = e.target) == null ? void 0 : _a2.result);
      };
      reader.readAsText(file);
    }
  }, []);
  const handleImport = () => {
    if (csvContent) {
      setIsProcessing(true);
      fetcher.submit(
        {
          actionType: "bulkImport",
          csvData: csvContent
        },
        { method: "POST" }
      );
    }
  };
  const handleBulkDelete = () => {
    if (selectedCollections.length > 0) {
      setIsProcessing(true);
      fetcher.submit(
        {
          actionType: "bulkDelete",
          collectionIds: JSON.stringify(selectedCollections)
        },
        { method: "POST" }
      );
      setShowDeleteModal(false);
    }
  };
  const handleBulkDuplicate = () => {
    if (selectedCollections.length > 0) {
      setIsProcessing(true);
      fetcher.submit(
        {
          actionType: "bulkDuplicate",
          collectionIds: JSON.stringify(selectedCollections)
        },
        { method: "POST" }
      );
    }
  };
  const handleExport = useCallback(() => {
    const currentSelection = [...selectedCollections];
    const exportCollections = currentSelection.length > 0 ? collections.filter((c) => currentSelection.includes(c.id)) : collections;
    console.log("Exporting collections:", exportCollections.map((c) => c.title));
    fetcher.submit(
      {
        actionType: "exportCSV",
        collections: JSON.stringify(exportCollections)
      },
      { method: "POST" }
    );
  }, [selectedCollections, collections, fetcher]);
  useEffect(() => {
    if (fetcher.data && fetcher.data.results && fetcher.data.results.length > 0) {
      console.log("Setting operation results:", fetcher.data.results);
      setOperationResults(fetcher.data.results);
      setShowResultsModal(true);
      setIsProcessing(false);
    }
  }, [fetcher.data]);
  useEffect(() => {
    var _a2;
    if (((_a2 = fetcher.data) == null ? void 0 : _a2.actionType) === "exportCSV" && fetcher.data.csv) {
      if (fetcher.data.csv !== lastExportedCsv) {
        setLastExportedCsv(fetcher.data.csv);
        const blob = new Blob([fetcher.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `collections_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setTimeout(() => {
          fetcher.data = null;
        }, 100);
      }
    }
  }, [fetcher.data, lastExportedCsv]);
  const rows = collections.map((collection) => {
    var _a2;
    return [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx(
        Checkbox,
        {
          checked: selectedCollections.includes(collection.id),
          onChange: () => handleSelectCollection(collection.id)
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
        /* @__PURE__ */ jsx("div", { style: { flexShrink: 0 }, children: ((_a2 = collection.image) == null ? void 0 : _a2.url) ? /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: collection.image.url,
            alt: collection.title,
            size: "small"
          }
        ) : /* @__PURE__ */ jsx("div", { style: {
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
          borderRadius: "4px"
        }, children: /* @__PURE__ */ jsx(Icon, { source: CollectionIcon }) }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
          /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
            "/",
            collection.handle
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { textAlign: "center" }, children: /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
        collection.productsCount,
        " products"
      ] }) }),
      /* @__PURE__ */ jsx("div", { style: { textAlign: "center" }, children: new Date(collection.updatedAt).toLocaleDateString() })
    ];
  });
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsx(
      TitleBar,
      {
        title: "Bulk Operations",
        primaryAction: {
          content: "Home",
          onAction: () => navigate("/app")
        },
        secondaryActions: [
          {
            content: "Create Collection",
            onAction: () => navigate("/app/create-collection")
          }
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { style: {
      position: "sticky",
      top: 0,
      zIndex: 999,
      width: "100%",
      background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      marginBottom: "1rem",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
    }, children: /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "0.8rem",
      padding: "0 1rem",
      maxWidth: "1400px",
      margin: "0 auto"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app"),
          icon: HomeIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "✨ Home" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(240, 147, 251, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/create-collection"),
          icon: MagicIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🎨 Create Collection" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
        padding: "4px",
        borderRadius: "12px",
        boxShadow: "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)",
        transition: "all 0.3s ease",
        transform: "scale(1.05)"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/bulk-operations"),
          icon: ImportIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "700",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "15px"
          }, children: "⚡ Bulk" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(224, 224, 224, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/subscription"),
          icon: CreditCardIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "💳 Subscription" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
        transition: "all 0.3s ease"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => setShowContactModal(true),
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "📧 Contact Support" })
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxs(Page, { children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem"
      }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Bulk Collection Operations" }) }),
        /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Import, export, and manage multiple collections at once" }) })
      ] }) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  icon: ImportIcon,
                  onClick: () => setShowImportModal(true),
                  children: "Import CSV"
                }
              ),
              /* @__PURE__ */ jsxs(
                Button,
                {
                  icon: ExportIcon,
                  onClick: handleExport,
                  children: [
                    "Export ",
                    selectedCollections.length > 0 ? `(${selectedCollections.length})` : "All"
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                Button,
                {
                  icon: EditIcon,
                  onClick: handleEditOpen,
                  disabled: selectedCollections.length !== 1,
                  children: [
                    "Edit ",
                    selectedCollections.length === 1 ? "" : `(${selectedCollections.length})`
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                Button,
                {
                  icon: DuplicateIcon,
                  onClick: handleBulkDuplicate,
                  disabled: selectedCollections.length === 0,
                  children: [
                    "Duplicate (",
                    selectedCollections.length,
                    ")"
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                Button,
                {
                  tone: "critical",
                  icon: DeleteIcon,
                  onClick: () => setShowDeleteModal(true),
                  disabled: selectedCollections.length === 0,
                  children: [
                    "Delete (",
                    selectedCollections.length,
                    ")"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: handleSelectAll,
                variant: "plain",
                children: selectedCollections.length === collections.length ? "Deselect All" : "Select All"
              }
            )
          ] }),
          isProcessing && /* @__PURE__ */ jsx(Banner, { tone: "info", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { children: "Processing bulk operation..." }),
            /* @__PURE__ */ jsx(ProgressBar, { progress: 75 })
          ] }) }),
          collections.length === 0 ? /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No collections yet",
              image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              children: /* @__PURE__ */ jsx("p", { children: "Import collections from CSV or create them individually." })
            }
          ) : /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text", "text", "text"],
              headings: [
                /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx(
                  Checkbox,
                  {
                    checked: selectedCollections.length === collections.length && collections.length > 0,
                    onChange: handleSelectAll
                  }
                ) }),
                "Collection",
                /* @__PURE__ */ jsx("div", { style: { textAlign: "center" }, children: "Products" }),
                /* @__PURE__ */ jsx("div", { style: { textAlign: "center" }, children: "Last Updated" })
              ],
              rows
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsxs(Layout.Section, { variant: "oneThird", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "CSV Format Guide" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Your CSV file should include these columns:" }),
              /* @__PURE__ */ jsxs("div", { style: {
                background: "#f4f6f8",
                padding: "12px",
                borderRadius: "8px",
                fontFamily: "monospace",
                fontSize: "12px"
              }, children: [
                "Title,Handle,Description",
                /* @__PURE__ */ jsx("br", {}),
                "Summer Sale,summer-sale,Best summer products",
                /* @__PURE__ */ jsx("br", {}),
                "Winter Collection,winter-collection,Warm winter gear"
              ] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "The first row must contain column headers." })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Stats" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Total Collections" }),
                /* @__PURE__ */ jsx(Badge, { children: collections.length })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Selected" }),
                /* @__PURE__ */ jsx(Badge, { tone: "success", children: selectedCollections.length })
              ] })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showImportModal,
          onClose: () => setShowImportModal(false),
          title: "Import Collections from CSV",
          primaryAction: {
            content: "Import",
            onAction: handleImport,
            disabled: !csvContent
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowImportModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(
              DropZone,
              {
                onDrop: handleFileUpload,
                accept: ".csv",
                children: /* @__PURE__ */ jsx(DropZone.FileUpload, {})
              }
            ),
            csvContent && /* @__PURE__ */ jsx(Banner, { tone: "success", children: /* @__PURE__ */ jsx("p", { children: "CSV file loaded successfully" }) }),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Or paste CSV content",
                value: csvContent,
                onChange: setCsvContent,
                multiline: 6,
                placeholder: "Title,Handle,Description\nSummer Sale,summer-sale,Best deals"
              }
            )
          ] }) })
        }
      ),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showDeleteModal,
          onClose: () => setShowDeleteModal(false),
          title: "Delete Collections?",
          primaryAction: {
            content: "Delete",
            onAction: handleBulkDelete,
            destructive: true
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowDeleteModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx(TextContainer, { children: /* @__PURE__ */ jsxs("p", { children: [
            "Are you sure you want to delete ",
            selectedCollections.length,
            " collections? This action cannot be undone."
          ] }) }) })
        }
      ),
      showResultsModal && /* @__PURE__ */ jsx(
        Modal,
        {
          open: true,
          onClose: () => {
            console.log("Close button clicked");
            setShowResultsModal(false);
            setOperationResults([]);
            setSelectedCollections([]);
            revalidator.revalidate();
          },
          title: "Operation Results",
          primaryAction: {
            content: "Done",
            onAction: () => {
              console.log("Done button clicked");
              setShowResultsModal(false);
              setOperationResults([]);
              setSelectedCollections([]);
              revalidator.revalidate();
            }
          },
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: operationResults.length > 0 ? operationResults.map((result, index2) => /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { children: result.title || result.id }),
            result.success ? /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Success" }) : /* @__PURE__ */ jsx(Badge, { tone: "critical", children: "Failed" })
          ] }, index2)) : /* @__PURE__ */ jsx(Text, { children: "Processing operation..." }) }) })
        }
      ),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showEditModal,
          onClose: () => setShowEditModal(false),
          title: "Edit Collection",
          primaryAction: {
            content: "Save Changes",
            onAction: handleEditSave,
            disabled: !editTitle
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowEditModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Collection Title",
                value: editTitle,
                onChange: setEditTitle,
                autoComplete: "off",
                requiredIndicator: true
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Handle (URL)",
                value: editHandle,
                onChange: setEditHandle,
                autoComplete: "off",
                helpText: "Used in the collection's URL"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Description",
                value: editDescription,
                onChange: setEditDescription,
                multiline: 4,
                autoComplete: "off",
                helpText: "Describe what's in this collection"
              }
            )
          ] }) })
        }
      ),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showContactModal,
          onClose: () => setShowContactModal(false),
          title: "Contact Support",
          primaryAction: {
            content: "Close",
            onAction: () => setShowContactModal(false)
          },
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx("div", { style: {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              textAlign: "center"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "📧 Need Help with Collections Creator?" }) }) }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team." }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "📬 Email Support" }),
                /* @__PURE__ */ jsxs("div", { style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "white",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db"
                }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: /* @__PURE__ */ jsx("strong", { children: "support@axnivo.com" }) }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "micro",
                      onClick: () => {
                        navigator.clipboard.writeText("support@axnivo.com");
                      },
                      children: "Copy"
                    }
                  )
                ] })
              ] }) }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#f0f9ff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #0ea5e9"
              }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                "💡 ",
                /* @__PURE__ */ jsx("strong", { children: "Tip:" }),
                " When contacting support, please include details about what you were trying to do and any error messages you saw. This helps us assist you faster!"
              ] }) })
            ] })
          ] }) })
        }
      )
    ] })
  ] });
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9,
  default: BulkOperations,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
const loader$b = async ({ request }) => {
  var _a2, _b, _c;
  const { admin } = await authenticate.admin(request);
  const productsQuery = `
    query getProducts {
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            tags
            createdAt
            totalInventory
            priceRangeV2 {
              minVariantPrice {
                amount
              }
              maxVariantPrice {
                amount
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(productsQuery);
    const data = await response.json();
    const products = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.products) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => edge.node)) || [];
    return json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ products: [] });
  }
};
const action$8 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  if (actionType === "createAICollection") {
    formData.get("aiType");
    const title = formData.get("title");
    const description = formData.get("description");
    const productIds = JSON.parse(formData.get("productIds"));
    const mutation = `
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    try {
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            title,
            descriptionHtml: `<p>${description}</p>`,
            handle: title.toLowerCase().replace(/\s+/g, "-"),
            products: productIds
          }
        }
      });
      const data = await response.json();
      if (data.data.collectionCreate.userErrors.length === 0) {
        return json({ success: true, collection: data.data.collectionCreate.collection });
      } else {
        return json({
          success: false,
          error: data.data.collectionCreate.userErrors[0].message
        });
      }
    } catch (error) {
      return json({ success: false, error: "Failed to create collection" });
    }
  }
  return json({ success: false, error: "Invalid action" });
};
function AICollections() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [aiType, setAiType] = useState("seasonal");
  const [season, setSeason] = useState("summer");
  const [performanceMetric, setPerformanceMetric] = useState("bestsellers");
  const [visualCategory, setVisualCategory] = useState("color");
  const [colorTheme, setColorTheme] = useState("warm");
  const [priceRange, setPriceRange] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const analyzeProducts = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      let filtered = [...products];
      let title = "";
      let description = "";
      if (aiType === "seasonal") {
        const seasonKeywords = {
          summer: ["summer", "beach", "sun", "swim", "shorts", "tank", "sandal", "light"],
          winter: ["winter", "coat", "jacket", "warm", "wool", "fleece", "boot", "thermal"],
          spring: ["spring", "floral", "pastel", "light", "fresh", "rain"],
          fall: ["fall", "autumn", "layer", "cardigan", "sweater", "harvest"]
        };
        const keywords = seasonKeywords[season] || [];
        filtered = products.filter((p) => {
          const searchText = `${p.title} ${p.tags.join(" ")} ${p.productType}`.toLowerCase();
          return keywords.some((keyword) => searchText.includes(keyword));
        });
        title = `${season.charAt(0).toUpperCase() + season.slice(1)} Collection ${(/* @__PURE__ */ new Date()).getFullYear()}`;
        description = `Curated ${season} essentials featuring seasonal favorites and trending items.`;
      } else if (aiType === "performance") {
        if (performanceMetric === "bestsellers") {
          filtered = products.slice(0, 20);
          title = "Bestsellers Collection";
          description = "Our top-performing products loved by customers.";
        } else if (performanceMetric === "trending") {
          filtered = products.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ).slice(0, 15);
          title = "Trending Now";
          description = "Discover what's hot and trending in our store.";
        } else if (performanceMetric === "high-margin") {
          filtered = products.filter((p) => {
            var _a2, _b;
            const price = parseFloat(((_b = (_a2 = p.priceRangeV2) == null ? void 0 : _a2.maxVariantPrice) == null ? void 0 : _b.amount) || "0");
            return price > 50;
          }).slice(0, 20);
          title = "Premium Collection";
          description = "Exclusive high-value products for discerning customers.";
        }
      } else if (aiType === "visual") {
        if (visualCategory === "color") {
          const colorKeywords = {
            warm: ["red", "orange", "yellow", "gold", "amber", "coral"],
            cool: ["blue", "green", "purple", "teal", "cyan", "indigo"],
            neutral: ["black", "white", "gray", "grey", "beige", "brown"],
            pastel: ["pink", "lavender", "mint", "peach", "sky", "baby"]
          };
          const keywords = colorKeywords[colorTheme] || [];
          filtered = products.filter((p) => {
            const searchText = `${p.title} ${p.tags.join(" ")}`.toLowerCase();
            return keywords.some((keyword) => searchText.includes(keyword));
          });
          title = `${colorTheme.charAt(0).toUpperCase() + colorTheme.slice(1)} Tones Collection`;
          description = `Products featuring ${colorTheme} color palettes and aesthetics.`;
        } else if (visualCategory === "style") {
          const styleKeywords = ["minimal", "vintage", "modern", "classic", "boho"];
          filtered = products.filter((p) => {
            const searchText = `${p.title} ${p.tags.join(" ")}`.toLowerCase();
            return styleKeywords.some((keyword) => searchText.includes(keyword));
          }).slice(0, 20);
          title = "Curated Style Collection";
          description = "Handpicked products that match your aesthetic preferences.";
        }
      }
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map(Number);
        filtered = filtered.filter((p) => {
          var _a2, _b;
          const price = parseFloat(((_b = (_a2 = p.priceRangeV2) == null ? void 0 : _a2.minVariantPrice) == null ? void 0 : _b.amount) || "0");
          return price >= min && (max ? price <= max : true);
        });
      }
      setSuggestedProducts(filtered.slice(0, 30));
      setSelectedProducts(filtered.slice(0, 30).map((p) => p.id));
      setCollectionTitle(title);
      setCollectionDescription(description);
      setIsAnalyzing(false);
    }, 2e3);
  };
  const handleCreateCollection = () => {
    if (selectedProducts.length > 0 && collectionTitle) {
      fetcher.submit(
        {
          actionType: "createAICollection",
          aiType,
          title: collectionTitle,
          description: collectionDescription,
          productIds: JSON.stringify(selectedProducts)
        },
        { method: "POST" }
      );
    }
  };
  useEffect(() => {
    var _a2;
    if ((_a2 = fetcher.data) == null ? void 0 : _a2.success) {
      navigate("/app/collections-enhanced");
    }
  }, [fetcher.data, navigate]);
  const rows = suggestedProducts.map((product) => {
    var _a2, _b, _c, _d, _e, _f;
    return [
      /* @__PURE__ */ jsx(
        Checkbox,
        {
          checked: selectedProducts.includes(product.id),
          onChange: (checked) => {
            if (checked) {
              setSelectedProducts([...selectedProducts, product.id]);
            } else {
              setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
            }
          }
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
        ((_d = (_c = (_b = (_a2 = product.images) == null ? void 0 : _a2.edges) == null ? void 0 : _b[0]) == null ? void 0 : _c.node) == null ? void 0 : _d.url) && /* @__PURE__ */ jsx(
          "img",
          {
            src: product.images.edges[0].node.url,
            alt: product.title,
            style: { width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: product.title }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: product.vendor })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Badge, { children: product.productType || "N/A" }),
      `$${((_f = (_e = product.priceRangeV2) == null ? void 0 : _e.minVariantPrice) == null ? void 0 : _f.amount) || "0"}`,
      /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
        product.totalInventory || 0,
        " in stock"
      ] })
    ];
  });
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "AI-Powered Collections" }),
    /* @__PURE__ */ jsx("div", { style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "1.5rem",
      borderRadius: "12px",
      marginBottom: "1.5rem"
    }, children: /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "AI Collection Generator" }) }),
        /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Let AI create smart collections based on data and patterns" }) })
      ] }),
      /* @__PURE__ */ jsx(Icon, { source: MagicIcon, tone: "base" })
    ] }) }) }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsxs(Layout.Section, { children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Choose AI Analysis Type" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(
              RadioButton,
              {
                label: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Icon, { source: CalendarIcon }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Seasonal Collections" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Automatically group products by season and trends" })
                  ] })
                ] }),
                checked: aiType === "seasonal",
                onChange: () => setAiType("seasonal")
              }
            ),
            /* @__PURE__ */ jsx(
              RadioButton,
              {
                label: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Icon, { source: ChartVerticalFilledIcon }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Performance-Based" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Group by sales performance, trending, or margins" })
                  ] })
                ] }),
                checked: aiType === "performance",
                onChange: () => setAiType("performance")
              }
            ),
            /* @__PURE__ */ jsx(
              RadioButton,
              {
                label: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Icon, { source: ImageIcon }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Visual Similarity" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Group products by colors, styles, or visual themes" })
                  ] })
                ] }),
                checked: aiType === "visual",
                onChange: () => setAiType("visual")
              }
            )
          ] }),
          aiType === "seasonal" && /* @__PURE__ */ jsx(Card, { sectioned: true, children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: /* @__PURE__ */ jsx(
            Select,
            {
              label: "Select Season",
              options: [
                { label: "Summer", value: "summer" },
                { label: "Winter", value: "winter" },
                { label: "Spring", value: "spring" },
                { label: "Fall/Autumn", value: "fall" }
              ],
              value: season,
              onChange: setSeason
            }
          ) }) }),
          aiType === "performance" && /* @__PURE__ */ jsx(Card, { sectioned: true, children: /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: /* @__PURE__ */ jsx(
            Select,
            {
              label: "Performance Metric",
              options: [
                { label: "Bestsellers", value: "bestsellers" },
                { label: "Trending Now", value: "trending" },
                { label: "High Margin Products", value: "high-margin" }
              ],
              value: performanceMetric,
              onChange: setPerformanceMetric
            }
          ) }) }),
          aiType === "visual" && /* @__PURE__ */ jsx(Card, { sectioned: true, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "Visual Grouping",
                options: [
                  { label: "By Color Theme", value: "color" },
                  { label: "By Style", value: "style" }
                ],
                value: visualCategory,
                onChange: setVisualCategory
              }
            ),
            visualCategory === "color" && /* @__PURE__ */ jsx(
              Select,
              {
                label: "Color Theme",
                options: [
                  { label: "Warm Tones", value: "warm" },
                  { label: "Cool Tones", value: "cool" },
                  { label: "Neutral Tones", value: "neutral" },
                  { label: "Pastel Tones", value: "pastel" }
                ],
                value: colorTheme,
                onChange: setColorTheme
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(
            Select,
            {
              label: "Price Range Filter (Optional)",
              options: [
                { label: "All Prices", value: "all" },
                { label: "Under $25", value: "0-25" },
                { label: "$25 - $50", value: "25-50" },
                { label: "$50 - $100", value: "50-100" },
                { label: "Over $100", value: "100-9999" }
              ],
              value: priceRange,
              onChange: setPriceRange
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "primary",
              size: "large",
              fullWidth: true,
              onClick: analyzeProducts,
              loading: isAnalyzing,
              icon: MagicIcon,
              children: isAnalyzing ? "Analyzing Products..." : "Generate AI Collection"
            }
          ),
          isAnalyzing && /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(ProgressBar, { progress: 75 }),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", alignment: "center", children: "AI is analyzing your products and creating smart groupings..." })
          ] })
        ] }) }),
        suggestedProducts.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "AI Suggested Products" }),
            /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
              selectedProducts.length,
              " of ",
              suggestedProducts.length,
              " selected"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Title",
              value: collectionTitle,
              onChange: setCollectionTitle
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Description",
              value: collectionDescription,
              onChange: setCollectionDescription,
              multiline: 3
            }
          ),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text", "text", "text", "text"],
              headings: ["Select", "Product", "Type", "Price", "Inventory"],
              rows
            }
          ),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "primary",
                size: "large",
                onClick: handleCreateCollection,
                loading: fetcher.state === "submitting",
                disabled: selectedProducts.length === 0,
                children: [
                  "Create Collection with ",
                  selectedProducts.length,
                  " Products"
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => setShowPreview(true),
                children: "Preview Collection"
              }
            )
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Layout.Section, { variant: "oneThird", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "AI Insights" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Total Products" }),
              /* @__PURE__ */ jsx(Badge, { children: products.length })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Products Analyzed" }),
              /* @__PURE__ */ jsx(Badge, { tone: "info", children: suggestedProducts.length })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Match Rate" }),
              /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
                products.length > 0 ? Math.round(suggestedProducts.length / products.length * 100) : 0,
                "%"
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "How It Works" }),
          /* @__PURE__ */ jsxs(List$1, { type: "number", children: [
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Choose an AI analysis type that fits your needs" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Configure specific parameters for the analysis" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "AI analyzes your products and suggests groupings" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Review and customize the suggested collection" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Create the collection with one click" }) })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showPreview,
        onClose: () => setShowPreview(false),
        title: "Collection Preview",
        primaryAction: {
          content: "Create Collection",
          onAction: handleCreateCollection
        },
        secondaryActions: [
          {
            content: "Close",
            onAction: () => setShowPreview(false)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingLg", children: collectionTitle }),
          /* @__PURE__ */ jsx(Text, { children: collectionDescription }),
          /* @__PURE__ */ jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px"
          }, children: selectedProducts.slice(0, 6).map((productId) => {
            var _a2, _b, _c, _d;
            const product = suggestedProducts.find((p) => p.id === productId);
            return ((_d = (_c = (_b = (_a2 = product == null ? void 0 : product.images) == null ? void 0 : _a2.edges) == null ? void 0 : _b[0]) == null ? void 0 : _c.node) == null ? void 0 : _d.url) ? /* @__PURE__ */ jsx(
              "img",
              {
                src: product.images.edges[0].node.url,
                alt: product.title,
                style: {
                  width: "100%",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "8px"
                }
              },
              productId
            ) : null;
          }) }),
          /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
            selectedProducts.length,
            " products will be added to this collection"
          ] })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      zIndex: 1e3
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: CollectionIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/bulk-operations"),
          children: "Bulk Ops"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: RefreshIcon,
          onClick: () => window.location.reload(),
          children: "Refresh"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: AICollections,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [{ rel: "stylesheet", href: appStyles }];
const loader$a = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const stats = {
    totalCollections: Math.floor(Math.random() * 100) + 50,
    recentCollections: Math.floor(Math.random() * 10) + 1,
    popularCategory: "Summer Collection"
  };
  return json({ stats });
};
const action$7 = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const collectionTitle = formData.get("title");
  const collectionDescription = formData.get("description");
  formData.get("collectionType");
  const seoTitle = formData.get("seoTitle");
  const seoDescription = formData.get("seoDescription");
  const handle = formData.get("handle");
  if (!collectionTitle || typeof collectionTitle !== "string") {
    return json(
      { error: "Collection name is required" },
      { status: 400 }
    );
  }
  if (!(session == null ? void 0 : session.shop)) {
    return json(
      { error: "Shop domain not found in session" },
      { status: 401 }
    );
  }
  try {
    const mutation = `
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
            handle
            descriptionHtml
            seo {
              title
              description
            }
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const variables = {
      input: {
        title: collectionTitle.trim(),
        descriptionHtml: collectionDescription ? `${collectionDescription}` : ""
      }
    };
    if (seoTitle || seoDescription) {
      variables.input.seo = {};
      if (seoTitle) variables.input.seo.title = seoTitle;
      if (seoDescription) variables.input.seo.description = seoDescription;
    }
    if (handle) {
      variables.input.handle = handle;
    }
    const response = await admin.graphql(mutation, { variables });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const responseJson = await response.json();
    if (responseJson == null ? void 0 : responseJson.errors) {
      const errorMessages = responseJson.errors.map(
        (e) => {
          var _a2;
          return `${e.message} (${((_a2 = e.extensions) == null ? void 0 : _a2.code) || "unknown"})`;
        }
      );
      throw new Error(`GraphQL errors: ${errorMessages.join(", ")}`);
    }
    const data = responseJson == null ? void 0 : responseJson.data;
    if (!data) {
      throw new Error("No data returned from GraphQL API");
    }
    const collectionCreate = data.collectionCreate;
    if (collectionCreate.userErrors && collectionCreate.userErrors.length > 0) {
      const errors = collectionCreate.userErrors.map((e) => `${e.field}: ${e.message}`).join(", ");
      throw new Error(`Validation errors: ${errors}`);
    }
    const collection = collectionCreate.collection;
    if (!collection) {
      throw new Error("Collection was not created successfully");
    }
    return json({
      success: true,
      collection: {
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
        url: `https://${session.shop}/admin/collections/${collection.id.split("/").pop()}`
      }
    });
  } catch (error) {
    let errorMessage = "Failed to create collection. Please try again.";
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("scope") || msg.includes("permission")) {
        errorMessage = "App doesn't have permission to create collections.";
      } else if (msg.includes("authentication") || msg.includes("unauthorized")) {
        errorMessage = "Authentication failed. Please try logging out and back in.";
      } else if (msg.includes("network") || msg.includes("fetch")) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message;
      }
    }
    return json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
};
function Index$1() {
  var _a2, _b, _c;
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { stats } = fetcher.data || {};
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionType, setCollectionType] = useState("manual");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [handle, setHandle] = useState("");
  const [salesChannels, setSalesChannels] = useState({
    online: true,
    pos: false
  });
  const [inputError, setInputError] = useState("");
  const [creationProgress, setCreationProgress] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const shopify2 = useAppBridge();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  const handleSubmit = useCallback(() => {
    if (!collectionName.trim()) {
      setInputError("Collection name is required");
      return;
    }
    setInputError("");
    setCreationProgress(0);
    const formData = {
      title: collectionName,
      description: collectionDescription,
      collectionType
    };
    if (seoTitle) formData.seoTitle = seoTitle;
    if (seoDescription) formData.seoDescription = seoDescription;
    if (handle) formData.handle = handle;
    fetcher.submit(formData, { method: "POST" });
  }, [collectionName, collectionDescription, collectionType, seoTitle, seoDescription, handle, fetcher]);
  useEffect(() => {
    if (collectionName && !handle) {
      const autoHandle = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setHandle(autoHandle);
    }
  }, [collectionName, handle]);
  useEffect(() => {
    var _a3;
    if (isLoading) {
      const interval = setInterval(() => {
        setCreationProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(interval);
    } else if ((_a3 = fetcher.data) == null ? void 0 : _a3.success) {
      setCreationProgress(100);
      setCollectionName("");
      setCollectionDescription("");
      setSeoTitle("");
      setSeoDescription("");
      setHandle("");
      setCollectionType("manual");
      shopify2.toast.show(`✨ Collection '${fetcher.data.collection.title}' created successfully!`);
      setTimeout(() => setCreationProgress(0), 2e3);
    }
  }, [fetcher.data, shopify2, isLoading]);
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Add Collection", children: /* @__PURE__ */ jsx("button", { variant: "primary", onClick: () => navigate("/app/collections"), children: "View Collections" }) }),
    /* @__PURE__ */ jsx("div", { style: {
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
      padding: "1rem",
      borderRadius: "12px",
      marginBottom: "1.5rem",
      boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
      /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
        /* @__PURE__ */ jsx("div", { style: {
          background: "rgba(255,255,255,0.2)",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center"
        }, children: /* @__PURE__ */ jsx(Icon, { source: MagicIcon, tone: "base" }) }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
          /* @__PURE__ */ jsx(Text, { as: "h2", variant: "headingLg", tone: "inherit", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Create Collection" }) }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Add a new collection to organize your products" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "large",
            onClick: () => navigate("/app/collections"),
            icon: ViewIcon,
            children: "View Collections"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            tone: "success",
            size: "large",
            loading: isLoading,
            onClick: handleSubmit,
            disabled: !collectionName.trim(),
            icon: MagicIcon,
            children: "Create Collection"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
      creationProgress > 0 && creationProgress < 100 && /* @__PURE__ */ jsxs(Box, { paddingBlockEnd: "400", children: [
        /* @__PURE__ */ jsx(ProgressBar, { progress: creationProgress, tone: "primary" }),
        /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", alignment: "center", children: [
          "Creating your collection... ",
          creationProgress,
          "%"
        ] })
      ] }),
      ((_a2 = fetcher.data) == null ? void 0 : _a2.error) && !isLoading && /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Error creating collection",
          tone: "critical",
          icon: AlertTriangleIcon,
          onDismiss: () => {
          },
          children: /* @__PURE__ */ jsx("p", { children: fetcher.data.error })
        }
      ),
      inputError && /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Validation Error",
          tone: "warning",
          onDismiss: () => setInputError(""),
          children: /* @__PURE__ */ jsx("p", { children: inputError })
        }
      ),
      ((_b = fetcher.data) == null ? void 0 : _b.success) && ((_c = fetcher.data) == null ? void 0 : _c.collection) && !isLoading && /* @__PURE__ */ jsx("div", { className: "success-animation", children: /* @__PURE__ */ jsxs(
        Banner,
        {
          title: "Success!",
          tone: "success",
          icon: CheckIcon,
          children: [
            /* @__PURE__ */ jsxs("p", { children: [
              'Collection "',
              fetcher.data.collection.title,
              '" created successfully!'
            ] }),
            fetcher.data.collection.url && /* @__PURE__ */ jsx(
              Button,
              {
                url: fetcher.data.collection.url,
                external: true,
                variant: "plain",
                size: "slim",
                children: "View in Shopify Admin"
              }
            )
          ]
        }
      ) }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Title",
                value: collectionName,
                onChange: setCollectionName,
                placeholder: "e.g., Summer collection, Under $100, Staff picks",
                autoComplete: "off",
                disabled: isLoading,
                requiredIndicator: true
              }
            ),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", fontWeight: "semibold", children: "Description" }),
              /* @__PURE__ */ jsx("div", { style: {
                marginTop: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                minHeight: "120px",
                padding: "12px",
                background: "#fff"
              }, children: /* @__PURE__ */ jsx(
                "textarea",
                {
                  value: collectionDescription,
                  onChange: (e) => setCollectionDescription(e.target.value),
                  placeholder: "Describe your collection...",
                  style: {
                    width: "100%",
                    minHeight: "100px",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: "14px"
                  },
                  disabled: isLoading
                }
              ) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Collection type" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(
                RadioButton,
                {
                  label: "Manual",
                  helpText: "Add products to this collection one by one.",
                  checked: collectionType === "manual",
                  id: "manual",
                  name: "collectionType",
                  onChange: () => setCollectionType("manual")
                }
              ) }),
              /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(
                RadioButton,
                {
                  label: "Smart",
                  helpText: "Existing and future products that match the conditions you set will automatically be added to this collection.",
                  checked: collectionType === "smart",
                  id: "smart",
                  name: "collectionType",
                  onChange: () => setCollectionType("smart")
                }
              ) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Search engine listing" }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "plain",
                  onClick: () => setShowSeoPreview(!showSeoPreview),
                  children: showSeoPreview ? "Hide preview" : "Edit website SEO"
                }
              )
            ] }),
            showSeoPreview && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Box, { background: "bg-surface-secondary", padding: "400", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Preview" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", tone: "info", children: seoTitle || collectionName || "Collection title" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: `${window.location.hostname}/collections/${handle || "collection-handle"}` }),
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: seoDescription || collectionDescription || "Add a description to see how this collection might appear in a search engine listing" })
              ] }) }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Page title",
                  value: seoTitle,
                  onChange: setSeoTitle,
                  placeholder: collectionName || "Enter page title",
                  helpText: `${seoTitle.length} of 70 characters used`,
                  maxLength: 70,
                  disabled: isLoading
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Description",
                  value: seoDescription,
                  onChange: setSeoDescription,
                  placeholder: "Enter meta description",
                  helpText: `${seoDescription.length} of 160 characters used`,
                  maxLength: 160,
                  multiline: 2,
                  disabled: isLoading
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "URL handle",
                  value: handle,
                  onChange: setHandle,
                  placeholder: "collection-handle",
                  prefix: `${window.location.hostname}/collections/`,
                  helpText: "Used in the web address",
                  disabled: isLoading
                }
              )
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Publishing" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Sales channels" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  label: "Online Store",
                  checked: salesChannels.online,
                  onChange: (newChecked) => setSalesChannels({ ...salesChannels, online: newChecked })
                }
              ),
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  label: "Point of Sale",
                  checked: salesChannels.pos,
                  onChange: (newChecked) => setSalesChannels({ ...salesChannels, pos: newChecked }),
                  helpText: "Available to all locations"
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Image" }),
            /* @__PURE__ */ jsx(
              "div",
              {
                style: {
                  border: "2px dashed #ddd",
                  borderRadius: "8px",
                  padding: "40px",
                  textAlign: "center",
                  background: "#fafafa",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.background = "#f5f5ff";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.borderColor = "#ddd";
                  e.currentTarget.style.background = "#fafafa";
                },
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx("div", { style: { margin: "0 auto" }, children: /* @__PURE__ */ jsx(Icon, { source: ImageIcon, tone: "subdued" }) }),
                  /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                    /* @__PURE__ */ jsx(Button, { variant: "primary", size: "slim", children: "Add image" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "or drop an image to upload" })
                  ] })
                ] })
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Theme template" }),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "",
                options: [
                  { label: "Default collection", value: "default" },
                  { label: "Custom template 1", value: "custom1" },
                  { label: "Custom template 2", value: "custom2" }
                ],
                value: "default",
                onChange: () => {
                }
              }
            )
          ] }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      backdropFilter: "blur(10px)",
      zIndex: 999,
      borderTop: "2px solid rgba(99, 102, 241, 0.3)"
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          variant: "primary",
          icon: PlusIcon,
          onClick: () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            const nameField = document.querySelector('input[placeholder="Summer Collection, Best Sellers, etc."]');
            if (nameField) nameField.focus();
          },
          children: "Quick Create"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ViewIcon,
          onClick: () => navigate("/app/collections"),
          children: "View Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: RefreshIcon,
          onClick: () => window.location.reload(),
          children: "Reset Form"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: MagicIcon,
          onClick: () => handleAISuggestions(),
          children: "AI Suggest"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: Index$1,
  links,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
const action$6 = async ({ request }) => {
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    if (actionType === "update") {
      return json({
        success: true,
        message: "Collection updated successfully (bypass mode)"
      });
    }
    return json({
      success: false,
      error: "Invalid action"
    });
  } catch (error) {
    console.error("Direct update error:", error);
    return json({
      success: false,
      error: "Update failed"
    });
  }
};
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6
}, Symbol.toStringTag, { value: "Module" }));
const loader$9 = async ({ request }) => {
  var _a2, _b, _c;
  const { admin } = await authenticate.admin(request);
  const query = `
    query getCollections {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            image {
              url
              altText
            }
            productsCount {
              count
            }
            updatedAt
            createdAt
          }
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      const collection = edge.node;
      const health = calculateHealthScore(collection);
      return health;
    })) || [];
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return json({ collections: [] });
  }
};
function calculateHealthScore(collection) {
  var _a2, _b, _c;
  const metrics = [];
  const productCount = ((_a2 = collection.productsCount) == null ? void 0 : _a2.count) || 0;
  const productMetric = {
    name: "Product Count",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: []
  };
  if (productCount >= 10) {
    productMetric.score = 20;
    productMetric.status = "good";
  } else if (productCount >= 5) {
    productMetric.score = 15;
    productMetric.status = "warning";
    productMetric.issues.push("Low product count");
    productMetric.recommendations.push("Add more products to improve collection appeal");
  } else {
    productMetric.score = productCount * 2;
    productMetric.status = "critical";
    productMetric.issues.push("Very low product count");
    productMetric.recommendations.push("Add at least 10 products for better customer experience");
  }
  metrics.push(productMetric);
  const hasDescription = collection.descriptionHtml && collection.descriptionHtml.length > 50;
  const hasImage = !!((_b = collection.image) == null ? void 0 : _b.url);
  const hasAltText = !!((_c = collection.image) == null ? void 0 : _c.altText);
  const contentMetric = {
    name: "Content Quality",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: []
  };
  if (hasDescription) contentMetric.score += 10;
  else {
    contentMetric.issues.push("Missing description");
    contentMetric.recommendations.push("Add a compelling description");
  }
  if (hasImage) contentMetric.score += 7;
  else {
    contentMetric.issues.push("Missing image");
    contentMetric.recommendations.push("Add a collection image");
  }
  if (hasAltText) contentMetric.score += 3;
  else if (hasImage) {
    contentMetric.issues.push("Missing alt text");
    contentMetric.recommendations.push("Add alt text for accessibility");
  }
  contentMetric.status = contentMetric.score >= 17 ? "good" : contentMetric.score >= 10 ? "warning" : "critical";
  metrics.push(contentMetric);
  const daysSinceUpdate = Math.floor((Date.now() - new Date(collection.updatedAt).getTime()) / (1e3 * 60 * 60 * 24));
  const freshnessMetric = {
    name: "Freshness",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: []
  };
  if (daysSinceUpdate <= 7) {
    freshnessMetric.score = 20;
    freshnessMetric.status = "good";
  } else if (daysSinceUpdate <= 30) {
    freshnessMetric.score = 15;
    freshnessMetric.status = "warning";
    freshnessMetric.issues.push("Not recently updated");
    freshnessMetric.recommendations.push("Refresh collection monthly");
  } else {
    freshnessMetric.score = Math.max(0, 20 - Math.floor(daysSinceUpdate / 10));
    freshnessMetric.status = "critical";
    freshnessMetric.issues.push("Stale collection");
    freshnessMetric.recommendations.push("Update immediately to maintain relevance");
  }
  metrics.push(freshnessMetric);
  const seoMetric = {
    name: "SEO Readiness",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: []
  };
  if (collection.title && collection.title.length >= 20) seoMetric.score += 10;
  else {
    seoMetric.issues.push("Title too short");
    seoMetric.recommendations.push("Expand title for better SEO");
  }
  if (collection.handle && collection.handle.includes("-")) seoMetric.score += 5;
  else {
    seoMetric.issues.push("URL not optimized");
    seoMetric.recommendations.push("Use hyphens in URL");
  }
  if (hasDescription && collection.descriptionHtml.length >= 150) seoMetric.score += 5;
  else {
    seoMetric.issues.push("Description too short for SEO");
    seoMetric.recommendations.push("Write 150+ character description");
  }
  seoMetric.status = seoMetric.score >= 17 ? "good" : seoMetric.score >= 10 ? "warning" : "critical";
  metrics.push(seoMetric);
  const performanceMetric = {
    name: "Performance Potential",
    score: 0,
    maxScore: 20,
    status: "critical",
    issues: [],
    recommendations: []
  };
  if (productCount > 5) performanceMetric.score += 10;
  if (hasImage) performanceMetric.score += 5;
  if (daysSinceUpdate <= 30) performanceMetric.score += 5;
  if (performanceMetric.score < 10) {
    performanceMetric.issues.push("Low performance potential");
    performanceMetric.recommendations.push("Improve content and product selection");
  }
  performanceMetric.status = performanceMetric.score >= 17 ? "good" : performanceMetric.score >= 10 ? "warning" : "critical";
  metrics.push(performanceMetric);
  const overallScore = Math.round(
    metrics.reduce((sum, metric) => sum + metric.score / metric.maxScore * 20, 0)
  );
  const trend = Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "stable" : "down";
  return {
    id: collection.id,
    title: collection.title,
    handle: collection.handle,
    overallScore,
    metrics,
    trend,
    lastUpdated: collection.updatedAt
  };
}
function HealthScore() {
  const { collections } = useLoaderData();
  const navigate = useNavigate();
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const healthyCollections = collections.filter((c) => c.overallScore >= 80);
  const warningCollections = collections.filter((c) => c.overallScore >= 60 && c.overallScore < 80);
  const criticalCollections = collections.filter((c) => c.overallScore < 60);
  const averageScore = collections.length > 0 ? Math.round(collections.reduce((sum, c) => sum + c.overallScore, 0) / collections.length) : 0;
  const getScoreBadge = (score) => {
    if (score >= 80) return /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
      score,
      "/100"
    ] });
    if (score >= 60) return /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
      score,
      "/100"
    ] });
    return /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
      score,
      "/100"
    ] });
  };
  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };
  const getTrendIcon = (trend) => {
    if (trend === "up") return /* @__PURE__ */ jsx(Icon, { source: ChartVerticalFilledIcon, tone: "success" });
    if (trend === "down") return /* @__PURE__ */ jsx(Icon, { source: ChartVerticalIcon, tone: "critical" });
    return /* @__PURE__ */ jsx(Icon, { source: RefreshIcon });
  };
  const filteredCollections = filterStatus === "all" ? collections : filterStatus === "healthy" ? healthyCollections : filterStatus === "warning" ? warningCollections : criticalCollections;
  const handleViewDetails = (collection) => {
    setSelectedCollection(collection);
    setShowDetailsModal(true);
  };
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Collection Health Score" }),
    /* @__PURE__ */ jsxs("div", { style: {
      background: "linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)",
      padding: "2rem",
      borderRadius: "16px",
      marginBottom: "1.5rem",
      position: "relative",
      overflow: "hidden"
    }, children: [
      /* @__PURE__ */ jsx("style", { children: `
            @keyframes heartbeat {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            
            .heart-icon {
              animation: heartbeat 2s ease-in-out infinite;
            }
            
            .health-card {
              transition: all 0.3s ease;
              cursor: pointer;
            }
            
            .health-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 15px 30px rgba(0,0,0,0.2);
            }
            
            .health-ring {
              transition: all 0.5s ease;
              stroke-dasharray: 440;
              stroke-dashoffset: 440;
              animation: fillRing 2s ease-out forwards;
            }
            
            @keyframes fillRing {
              to {
                stroke-dashoffset: 0;
              }
            }
          ` }),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Collection Health Monitor" }) }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Track and improve your collection performance" }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "heart-icon", children: /* @__PURE__ */ jsx(Icon, { source: HeartIcon, tone: "base" }) })
        ] }),
        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            healthyCollections.length,
            " Healthy"
          ] }),
          /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
            warningCollections.length,
            " Need Attention"
          ] }),
          /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
            criticalCollections.length,
            " Critical"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { marginBottom: "1.5rem" }, children: /* @__PURE__ */ jsxs(Grid, { children: [
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: HeartIcon, tone: "success" }),
          /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Health" })
        ] }),
        /* @__PURE__ */ jsxs(Text, { variant: "headingXl", children: [
          averageScore,
          "/100"
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Average Score" }),
        /* @__PURE__ */ jsx(ProgressBar, { progress: averageScore, tone: "success" })
      ] }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Healthy" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", children: healthyCollections.length }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Collections" }),
        /* @__PURE__ */ jsx(
          ProgressBar,
          {
            progress: healthyCollections.length / collections.length * 100,
            tone: "success"
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: AlertTriangleIcon, tone: "warning" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Warning" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", children: warningCollections.length }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Need Attention" }),
        /* @__PURE__ */ jsx(
          ProgressBar,
          {
            progress: warningCollections.length / collections.length * 100,
            tone: "warning"
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: XSmallIcon, tone: "critical" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Critical" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", children: criticalCollections.length }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Immediate Action" }),
        /* @__PURE__ */ jsx(
          ProgressBar,
          {
            progress: criticalCollections.length / collections.length * 100,
            tone: "critical"
          }
        )
      ] }) }) })
    ] }) }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Collection Health Overview" }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => setFilterStatus("all"),
                pressed: filterStatus === "all",
                children: "All"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => setFilterStatus("healthy"),
                pressed: filterStatus === "healthy",
                children: "Healthy"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => setFilterStatus("warning"),
                pressed: filterStatus === "warning",
                children: "Warning"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                onClick: () => setFilterStatus("critical"),
                pressed: filterStatus === "critical",
                children: "Critical"
              }
            )
          ] })
        ] }),
        filteredCollections.length === 0 ? /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No collections found",
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: "Create collections to monitor their health" })
          }
        ) : /* @__PURE__ */ jsx(
          DataTable,
          {
            columnContentTypes: ["text", "numeric", "text", "text", "text", "text"],
            headings: [
              "Collection",
              "Health Score",
              "Status",
              "Issues",
              "Trend",
              "Actions"
            ],
            rows: filteredCollections.map((collection) => {
              const criticalIssues = collection.metrics.filter((m) => m.status === "critical").length;
              const warningIssues = collection.metrics.filter((m) => m.status === "warning").length;
              return [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                  /* @__PURE__ */ jsx("div", { style: {
                    width: "50px",
                    height: "50px",
                    position: "relative"
                  }, children: /* @__PURE__ */ jsxs("svg", { width: "50", height: "50", children: [
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        cx: "25",
                        cy: "25",
                        r: "20",
                        fill: "none",
                        stroke: "#e5e7eb",
                        strokeWidth: "4"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        cx: "25",
                        cy: "25",
                        r: "20",
                        fill: "none",
                        stroke: getScoreColor(collection.overallScore),
                        strokeWidth: "4",
                        strokeDasharray: `${collection.overallScore / 100 * 126} 126`,
                        transform: "rotate(-90 25 25)"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "text",
                      {
                        x: "25",
                        y: "25",
                        textAnchor: "middle",
                        dy: "5",
                        fontSize: "14",
                        fontWeight: "bold",
                        children: collection.overallScore
                      }
                    )
                  ] }) }),
                  getScoreBadge(collection.overallScore)
                ] }),
                collection.overallScore >= 80 ? /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Healthy" }) : collection.overallScore >= 60 ? /* @__PURE__ */ jsx(Badge, { tone: "warning", children: "Warning" }) : /* @__PURE__ */ jsx(Badge, { tone: "critical", children: "Critical" }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                  criticalIssues > 0 && /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
                    criticalIssues,
                    " critical"
                  ] }),
                  warningIssues > 0 && /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
                    warningIssues,
                    " warning"
                  ] }),
                  criticalIssues === 0 && warningIssues === 0 && /* @__PURE__ */ jsx(Badge, { tone: "success", children: "No issues" })
                ] }),
                getTrendIcon(collection.trend),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "slim",
                      onClick: () => handleViewDetails(collection),
                      children: "View Details"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "slim",
                      icon: MagicIcon,
                      onClick: () => navigate("/app/collections-enhanced"),
                      children: "Fix Now"
                    }
                  )
                ] })
              ];
            })
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Health Tips" }),
          /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Keep at least 10 products per collection" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Update collections weekly for freshness" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Add high-quality images with alt text" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Write descriptions of 150+ characters" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Use SEO-friendly URLs with hyphens" }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Fixes" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: MagicIcon, children: "Auto-Fix All Issues" }),
            /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: RefreshIcon, children: "Refresh All Collections" }),
            /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: ProductIcon, children: "Add Missing Products" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Top Issues" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-critical-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: XSmallIcon, tone: "critical" }),
              /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                criticalCollections.length,
                " collections need immediate attention"
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-warning-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: AlertTriangleIcon, tone: "warning" }),
              /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                collections.filter(
                  (c) => c.metrics.some((m) => m.name === "Freshness" && m.status !== "good")
                ).length,
                " collections need updating"
              ] })
            ] }) })
          ] })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showDetailsModal,
        onClose: () => setShowDetailsModal(false),
        title: `Health Report: ${selectedCollection == null ? void 0 : selectedCollection.title}`,
        size: "large",
        primaryAction: {
          content: "Fix Issues",
          onAction: () => {
            setShowDetailsModal(false);
            navigate("/app/collections-enhanced");
          }
        },
        secondaryActions: [
          {
            content: "Close",
            onAction: () => setShowDetailsModal(false)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: selectedCollection && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Box, { padding: "400", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingLg", children: "Overall Health Score" }),
              /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                "Last updated: ",
                new Date(selectedCollection.lastUpdated).toLocaleDateString()
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
              /* @__PURE__ */ jsxs(Text, { variant: "heading2xl", children: [
                selectedCollection.overallScore,
                "/100"
              ] }),
              getScoreBadge(selectedCollection.overallScore)
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: selectedCollection.metrics.map((metric) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: metric.name }),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                  metric.score,
                  "/",
                  metric.maxScore
                ] }),
                /* @__PURE__ */ jsx(Badge, { tone: metric.status === "good" ? "success" : metric.status === "warning" ? "warning" : "critical", children: metric.status })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              ProgressBar,
              {
                progress: metric.score / metric.maxScore * 100,
                tone: metric.status === "good" ? "success" : metric.status === "warning" ? "warning" : "critical"
              }
            ),
            metric.issues.length > 0 && /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-critical-subdued", borderRadius: "100", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", fontWeight: "semibold", children: "Issues:" }),
              /* @__PURE__ */ jsx(List$1, { type: "bullet", children: metric.issues.map((issue, i) => /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: issue }) }, i)) })
            ] }) }),
            metric.recommendations.length > 0 && /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-info-subdued", borderRadius: "100", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", fontWeight: "semibold", children: "Recommendations:" }),
              /* @__PURE__ */ jsx(List$1, { type: "bullet", children: metric.recommendations.map((rec, i) => /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: rec }) }, i)) })
            ] }) })
          ] }) }, metric.name)) })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      zIndex: 1e3
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: CollectionIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/bulk-operations"),
          children: "Bulk Ops"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: MagicIcon,
          onClick: () => navigate("/app/ai-collections"),
          children: "AI Magic"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ChartVerticalFilledIcon,
          onClick: () => navigate("/app/analytics"),
          children: "Analytics"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: HealthScore,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
const loader$8 = async ({ request }) => {
  var _a2, _b;
  const { admin, session } = await authenticate.admin(request);
  if (!session || !session.shop) {
    console.log("No valid session found in subscription page");
    throw new Response(null, { status: 401 });
  }
  console.log("Subscription page - authenticated for shop:", session.shop);
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(admin, session.shop);
  let currentPlan = null;
  let nextBillingDate = null;
  let amount = null;
  if (hasActiveSubscription && subscription) {
    if (((_a2 = subscription.name) == null ? void 0 : _a2.toLowerCase().includes("annual")) || ((_b = subscription.name) == null ? void 0 : _b.toLowerCase().includes("year"))) {
      currentPlan = "annual";
      amount = "$19.00";
    } else {
      currentPlan = "monthly";
      amount = "$1.99";
    }
    if (subscription.currentPeriodEnd) {
      nextBillingDate = new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }
  }
  const shop = session.shop.replace(".myshopify.com", "");
  return json({
    hasActiveSubscription,
    currentPlan,
    nextBillingDate,
    amount,
    shop,
    subscription
  });
};
function Subscription() {
  const data = useLoaderData();
  const navigate = useNavigate();
  const app = useAppBridge();
  const [showContactModal, setShowContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const handleUpgrade = (targetPlan) => {
    const billingUrl = `https://admin.shopify.com/store/${data.shop}/charges/collections-creator/pricing_plans`;
    if (app && window.top) {
      window.open(billingUrl, "_top");
    } else {
      window.location.href = billingUrl;
    }
  };
  const handleManageSubscription = () => {
    const billingUrl = `https://admin.shopify.com/store/${data.shop}/settings/billing`;
    if (app && window.top) {
      window.open(billingUrl, "_top");
    } else {
      window.location.href = billingUrl;
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Subscription" }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      width: "100%",
      background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      marginBottom: "1rem",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
    }, children: /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "0.8rem",
      padding: "0 1rem",
      maxWidth: "1400px",
      margin: "0 auto"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app"),
          icon: HomeIcon,
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🏠 Home" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(240, 147, 251, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/create-collection"),
          icon: MagicIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🎨 Create Collection" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(79, 172, 254, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/bulk-operations"),
          icon: ImportIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "⚡ Bulk Operations" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
        padding: "4px",
        borderRadius: "12px",
        boxShadow: "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)",
        transition: "all 0.3s ease",
        transform: "scale(1.05)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => navigate("/app/subscription"),
          icon: CreditCardIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "700",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "15px"
          }, children: "💳 Subscription" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => setShowContactModal(true),
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "📧 Contact Support" })
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
        /* @__PURE__ */ jsx(Text, { variant: "heading2xl", as: "h2", children: "Current Subscription" }),
        data.hasActiveSubscription ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(InlineGrid, { columns: "1fr auto", gap: "400", children: [
            /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Active Plan" }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "p", children: data.currentPlan === "annual" ? "Professional" : "Starter" }),
                /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Active" })
              ] }),
              /* @__PURE__ */ jsxs(Text, { variant: "headingLg", children: [
                data.amount,
                " / ",
                data.currentPlan === "annual" ? "year" : "month"
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Next Billing Date" }),
              /* @__PURE__ */ jsx(Text, { variant: "headingLg", children: data.nextBillingDate || "Not available" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          /* @__PURE__ */ jsxs(InlineGrid, { columns: "1fr auto", gap: "400", children: [
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "Manage your subscription, update payment method, or view invoices" }) }),
            /* @__PURE__ */ jsx(Button, { onClick: handleManageSubscription, children: "Manage Billing" })
          ] })
        ] }) : /* @__PURE__ */ jsx(Banner, { tone: "warning", children: /* @__PURE__ */ jsx("p", { children: "No active subscription found. Subscribe to access all features." }) })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
        /* @__PURE__ */ jsx(Text, { variant: "heading2xl", as: "h2", children: "Available Plans" }),
        /* @__PURE__ */ jsxs("div", { style: {
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem"
        }, children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
              data.currentPlan === "monthly" && /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Current Plan" }),
              /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h3", children: "Starter" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Perfect for small stores" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "p", children: "$1.99" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "per month" })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Unlimited collections" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Bulk operations" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ SEO optimization" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Email support" })
            ] }),
            data.currentPlan !== "monthly" && /* @__PURE__ */ jsx(
              Button,
              {
                fullWidth: true,
                onClick: () => handleUpgrade(),
                disabled: data.currentPlan === "monthly",
                children: data.hasActiveSubscription ? "Downgrade to Monthly" : "Subscribe Monthly"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
              data.currentPlan === "annual" && /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Current Plan" }),
              /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h3", children: "Professional" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "For growing businesses" }),
              /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Save 20%" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "p", children: "$19.00" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "per year" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "success", children: "Save $4.88/year" })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Everything in Starter" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Priority support" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ Advanced analytics" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: "✓ API access" })
            ] }),
            data.currentPlan !== "annual" && /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                tone: "success",
                fullWidth: true,
                onClick: () => handleUpgrade(),
                disabled: data.currentPlan === "annual",
                children: data.hasActiveSubscription ? "Upgrade to Annual" : "Subscribe Annual"
              }
            )
          ] }) })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h3", children: "Important Billing Information" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", fontWeight: "semibold", children: "Immediate Billing" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Charges are processed immediately upon subscription. Your first billing cycle starts right away." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", fontWeight: "semibold", children: "Plan Changes" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "When upgrading or downgrading, charges are prorated automatically by Shopify." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", fontWeight: "semibold", children: "Cancellation" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "You can cancel anytime from your Shopify admin. No questions asked." })
          ] })
        ] })
      ] }) }) })
    ] }) }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showContactModal,
        onClose: () => {
          setShowContactModal(false);
          setEmailCopied(false);
        },
        title: "Contact Support",
        primaryAction: {
          content: "Close",
          onAction: () => {
            setShowContactModal(false);
            setEmailCopied(false);
          }
        },
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx("div", { style: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "20px",
            borderRadius: "12px",
            color: "white",
            textAlign: "center"
          }, children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "📧 Need Help with Collections Creator?" }) }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team." }),
            /* @__PURE__ */ jsx("div", { style: {
              background: "#FEF3C7",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #F59E0B"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "600", color: "#92400E" }, children: "⏱️ Response Time: We typically respond within 48 hours" }) }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "📧 Email Support" }),
              /* @__PURE__ */ jsxs("div", { style: {
                background: "#F3F4F6",
                padding: "12px",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "support@collectionscreator.com" }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    size: "slim",
                    onClick: () => {
                      navigator.clipboard.writeText("support@collectionscreator.com");
                      setEmailCopied(true);
                      setTimeout(() => setEmailCopied(false), 2e3);
                    },
                    children: emailCopied ? "✓ Copied!" : "Copy"
                  }
                )
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "💡 What to Include in Your Email:" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Your Shopify store URL" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Description of the issue or request" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Any relevant screenshots" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "• Steps to reproduce (if reporting a bug)" })
              ] })
            ] }) })
          ] })
        ] }) })
      }
    )
  ] });
}
const route22 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Subscription,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
const loader$7 = async ({ request }) => {
  var _a2, _b, _c;
  try {
    const { admin, session } = await authenticate.admin(request);
    if (!session) {
      console.log("No session in app.collections, authentication required");
      throw new Response(null, { status: 401 });
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const query = `
    query getCollections {
      collections(first: 250) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            productsCount {
              count
            }
            image {
              url
              altText
            }
            updatedAt
          }
        }
      }
    }
  `;
    try {
      let retries = 5;
      let response;
      let responseData;
      while (retries > 0) {
        try {
          response = await admin.graphql(query);
          responseData = await response.json();
          if (responseData && responseData.data && responseData.data.collections) {
            break;
          }
          if (responseData && !responseData.errors) {
            console.log("No collections in response, retrying...");
            throw new Error("Empty collections response");
          }
        } catch (retryError) {
          console.log(`Collections GraphQL retry ${6 - retries}/5`);
          retries--;
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 3e3));
          } else {
            throw retryError;
          }
        }
      }
      if ((_b = (_a2 = responseData.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) {
        const collections = responseData.data.collections.edges.map((edge) => {
          var _a3;
          return {
            ...edge.node,
            productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0
          };
        });
        return json({ collections, error: null });
      } else if (responseData.errors) {
        console.error("GraphQL errors:", responseData.errors);
        return json({ collections: [], error: ((_c = responseData.errors[0]) == null ? void 0 : _c.message) || "Failed to fetch collections" });
      } else {
        console.error("Unexpected response structure:", responseData);
        return json({ collections: [], error: null });
      }
    } catch (graphqlError) {
      console.error("GraphQL error:", graphqlError);
      return json({ collections: [], error: graphqlError instanceof Error ? graphqlError.message : "Failed to fetch collections" });
    }
  } catch (error) {
    console.error("Authentication or request error:", error);
    return json({ collections: [], error: error instanceof Error ? error.message : "Authentication failed" });
  }
};
const action$5 = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    const collectionId = formData.get("collectionId");
    if (actionType === "delete" && collectionId) {
      const mutation = `
      mutation collectionDelete($id: ID!) {
        collectionDelete(input: { id: $id }) {
          deletedCollectionId
          userErrors {
            field
            message
          }
        }
      }
    `;
      try {
        const response = await admin.graphql(mutation, {
          variables: { id: collectionId }
        });
        const data = await response.json();
        if (data.data.collectionDelete.userErrors.length > 0) {
          return json({
            success: false,
            error: data.data.collectionDelete.userErrors[0].message
          });
        }
        return json({ success: true });
      } catch (error) {
        return json({ success: false, error: "Failed to delete collection" });
      }
    }
    if (actionType === "update" && collectionId) {
      const title = formData.get("title");
      const description = formData.get("description");
      const mutation = `
      mutation collectionUpdate($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
      try {
        const response = await admin.graphql(mutation, {
          variables: {
            input: {
              id: collectionId,
              title,
              descriptionHtml: description ? `<p>${description}</p>` : ""
            }
          }
        });
        const data = await response.json();
        if (data.data.collectionUpdate.userErrors.length > 0) {
          return json({
            success: false,
            error: data.data.collectionUpdate.userErrors[0].message
          });
        }
        return json({ success: true });
      } catch (error) {
        return json({ success: false, error: "Failed to update collection" });
      }
    }
    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Authentication or action failed" });
  }
};
function Collections() {
  var _a2, _b;
  const { collections, error } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCollection, setEditingCollection] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const filteredCollections = (collections == null ? void 0 : collections.filter((collection) => {
    if (!collection) return false;
    return (collection.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (collection.handle || "").toLowerCase().includes(searchQuery.toLowerCase());
  })) || [];
  const handleEdit = (collection) => {
    var _a3;
    setEditingCollection(collection);
    setEditTitle(collection.title);
    setEditDescription(((_a3 = collection.descriptionHtml) == null ? void 0 : _a3.replace(/<[^>]*>/g, "")) || "");
  };
  const handleSaveEdit = () => {
    if (editingCollection && editTitle.trim()) {
      fetcher.submit(
        {
          actionType: "update",
          collectionId: editingCollection.id,
          title: editTitle.trim(),
          description: editDescription.trim()
        },
        { method: "POST" }
      );
    }
  };
  const handleDelete = (collectionId) => {
    fetcher.submit(
      {
        actionType: "delete",
        collectionId
      },
      { method: "POST" }
    );
    setDeleteConfirmId(null);
  };
  useEffect(() => {
    var _a3, _b2;
    if ((_a3 = fetcher.data) == null ? void 0 : _a3.success) {
      setEditingCollection(null);
      setDeleteConfirmId(null);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else if ((_b2 = fetcher.data) == null ? void 0 : _b2.error) {
      console.error("Action failed:", fetcher.data.error);
    }
  }, [fetcher.data]);
  const rows = filteredCollections.map((collection) => {
    var _a3;
    return [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
        ((_a3 = collection.image) == null ? void 0 : _a3.url) ? /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: collection.image.url,
            alt: collection.image.altText || collection.title,
            size: "small"
          }
        ) : /* @__PURE__ */ jsx("div", { style: {
          width: "40px",
          height: "40px",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }, children: /* @__PURE__ */ jsx(Icon, { source: CollectionIcon, tone: "base" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
          /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
            "/",
            collection.handle
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
        collection.productsCount || 0,
        " products"
      ] }),
      new Date(collection.updatedAt).toLocaleDateString(),
      /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "center", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "slim",
            icon: EditIcon,
            onClick: () => handleEdit(collection),
            children: "Edit"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "slim",
            tone: "critical",
            icon: DeleteIcon,
            onClick: () => setDeleteConfirmId(collection.id),
            children: "Delete"
          }
        )
      ] })
    ];
  });
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(
      TitleBar,
      {
        title: "Collections",
        primaryAction: {
          content: "Create Collection",
          onAction: () => navigate("/app")
        },
        secondaryActions: [
          {
            content: "Home",
            onAction: () => navigate("/app")
          },
          {
            content: "View Collections",
            onAction: () => navigate("/app/collections-enhanced")
          },
          {
            content: "Bulk Operations",
            onAction: () => navigate("/app/bulk-operations")
          },
          {
            content: "SEO Tools",
            onAction: () => navigate("/app/seo-tools")
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { style: { width: "100%", marginBottom: "1rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }, children: [
      /* @__PURE__ */ jsxs(Button, { variant: "primary", size: "large", fullWidth: true, onClick: () => navigate("/app"), children: [
        /* @__PURE__ */ jsx(Icon, { source: HomeIcon }),
        " Home"
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app/collections-enhanced"), children: "View Collections" }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app/bulk-operations"), children: "Bulk Operations" }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app/seo-tools"), children: "SEO Tools" })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
      padding: "1.5rem",
      borderRadius: "12px",
      marginBottom: "1.5rem",
      boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
    }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Manage Collections" }) }),
      /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "View and manage all your store collections" }) })
    ] }) }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(
          TextField,
          {
            label: "",
            placeholder: "Search collections...",
            value: searchQuery,
            onChange: setSearchQuery,
            prefix: /* @__PURE__ */ jsx(Icon, { source: SearchIcon }),
            clearButton: true,
            onClearButtonClick: () => setSearchQuery("")
          }
        ),
        error ? /* @__PURE__ */ jsx(Banner, { tone: "critical", children: /* @__PURE__ */ jsx("p", { children: error }) }) : null,
        ((_a2 = fetcher.data) == null ? void 0 : _a2.error) && !((_b = fetcher.data) == null ? void 0 : _b.success) && /* @__PURE__ */ jsx(Banner, { tone: "critical", children: /* @__PURE__ */ jsxs("p", { children: [
          "Action failed: ",
          fetcher.data.error
        ] }) }),
        filteredCollections.length === 0 ? /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No collections found",
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: "Start by creating your first collection using the button below." })
          }
        ) : /* @__PURE__ */ jsx(
          DataTable,
          {
            columnContentTypes: ["text", "text", "text", "text"],
            headings: ["Collection", "Products", "Last Updated", "Actions"],
            rows
          }
        )
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: "Collection Stats" }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Total Collections" }),
            /* @__PURE__ */ jsx(Badge, { tone: "success", children: (collections == null ? void 0 : collections.length) || 0 })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Active Collections" }),
            /* @__PURE__ */ jsx(Badge, { tone: "info", children: (collections == null ? void 0 : collections.filter((c) => ((c == null ? void 0 : c.productsCount) || 0) > 0).length) || 0 })
          ] })
        ] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!editingCollection,
        onClose: () => setEditingCollection(null),
        title: "Edit Collection",
        primaryAction: {
          content: "Save",
          onAction: handleSaveEdit,
          loading: fetcher.state === "submitting"
        },
        secondaryActions: [
          {
            content: "Cancel",
            onAction: () => setEditingCollection(null)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Title",
              value: editTitle,
              onChange: setEditTitle,
              autoComplete: "off"
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Description",
              value: editDescription,
              onChange: setEditDescription,
              multiline: 4,
              autoComplete: "off"
            }
          )
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!deleteConfirmId,
        onClose: () => setDeleteConfirmId(null),
        title: "Delete Collection?",
        primaryAction: {
          content: "Delete",
          onAction: () => deleteConfirmId && handleDelete(deleteConfirmId),
          destructive: true,
          loading: fetcher.state === "submitting"
        },
        secondaryActions: [
          {
            content: "Cancel",
            onAction: () => setDeleteConfirmId(null)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsx(TextContainer, { children: /* @__PURE__ */ jsx("p", { children: "Are you sure you want to delete this collection? This action cannot be undone." }) }) })
      }
    ),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      backdropFilter: "blur(10px)",
      zIndex: 999,
      borderTop: "2px solid rgba(99, 102, 241, 0.3)"
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          variant: "primary",
          icon: PlusIcon,
          onClick: () => navigate("/app"),
          children: "Create Collection"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: RefreshIcon,
          onClick: () => window.location.reload(),
          children: "Refresh"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: SearchIcon,
          onClick: () => {
            const searchField = document.querySelector('input[placeholder="Search collections..."]');
            if (searchField) {
              searchField.focus();
              searchField.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          },
          children: "Search"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Enhanced View"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route23 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: Collections,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
const loader$6 = async ({ request }) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
  const { admin } = await authenticate.admin(request);
  const query = `
    query getCollections {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
            productsCount {
              count
            }
            updatedAt
          }
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0
      };
    })) || [];
    const scheduledTasks = [
      {
        id: "task-1",
        collectionId: (_d = collections[0]) == null ? void 0 : _d.id,
        collectionTitle: ((_e = collections[0]) == null ? void 0 : _e.title) || "Summer Collection",
        type: "activate",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
        status: "pending",
        recurring: false
      },
      {
        id: "task-2",
        collectionId: (_f = collections[1]) == null ? void 0 : _f.id,
        collectionTitle: ((_g = collections[1]) == null ? void 0 : _g.title) || "Flash Sale",
        type: "deactivate",
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3).toISOString(),
        status: "pending",
        recurring: false
      },
      {
        id: "task-3",
        collectionId: (_h = collections[2]) == null ? void 0 : _h.id,
        collectionTitle: ((_i = collections[2]) == null ? void 0 : _i.title) || "Weekly Deals",
        type: "refresh",
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1e3).toISOString(),
        status: "active",
        recurring: true,
        recurringInterval: "weekly"
      }
    ];
    return json({ collections, scheduledTasks });
  } catch (error) {
    console.error("Error fetching data:", error);
    return json({ collections: [], scheduledTasks: [] });
  }
};
const action$4 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  if (actionType === "scheduleTask") {
    return json({ success: true, message: "Task scheduled successfully" });
  }
  if (actionType === "deleteTask") {
    return json({ success: true, message: "Task deleted successfully" });
  }
  if (actionType === "pauseTask") {
    return json({ success: true, message: "Task paused successfully" });
  }
  if (actionType === "resumeTask") {
    return json({ success: true, message: "Task resumed successfully" });
  }
  return json({ success: false, error: "Invalid action" });
};
function Scheduling() {
  var _a2;
  const { collections, scheduledTasks } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [taskType, setTaskType] = useState("activate");
  const [selectedDate, setSelectedDate] = useState({
    month: (/* @__PURE__ */ new Date()).getMonth(),
    year: (/* @__PURE__ */ new Date()).getFullYear()
  });
  const [selectedDateTime, setSelectedDateTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("daily");
  const [editingTask, setEditingTask] = useState(null);
  const handleScheduleTask = () => {
    if (selectedCollection && selectedDateTime) {
      fetcher.submit(
        {
          actionType: "scheduleTask",
          collectionId: selectedCollection,
          taskType,
          scheduledDate: selectedDateTime,
          isRecurring: isRecurring.toString(),
          recurringInterval
        },
        { method: "POST" }
      );
      setShowScheduleModal(false);
      resetForm();
    }
  };
  const handleDeleteTask = (taskId) => {
    fetcher.submit(
      {
        actionType: "deleteTask",
        taskId
      },
      { method: "POST" }
    );
  };
  const handlePauseTask = (taskId) => {
    fetcher.submit(
      {
        actionType: "pauseTask",
        taskId
      },
      { method: "POST" }
    );
  };
  const handleResumeTask = (taskId) => {
    fetcher.submit(
      {
        actionType: "resumeTask",
        taskId
      },
      { method: "POST" }
    );
  };
  const resetForm = () => {
    setSelectedCollection("");
    setTaskType("activate");
    setSelectedDateTime("");
    setIsRecurring(false);
    setRecurringInterval("daily");
    setEditingTask(null);
  };
  const getTaskTypeIcon = (type) => {
    switch (type) {
      case "activate":
        return PlayIcon;
      case "deactivate":
        return DisabledIcon;
      case "refresh":
        return RefreshIcon;
      default:
        return CalendarIcon;
    }
  };
  const getTaskTypeBadge = (type) => {
    switch (type) {
      case "activate":
        return /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Activate" });
      case "deactivate":
        return /* @__PURE__ */ jsx(Badge, { tone: "warning", children: "Deactivate" });
      case "refresh":
        return /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Refresh" });
      default:
        return /* @__PURE__ */ jsx(Badge, { children: type });
    }
  };
  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return /* @__PURE__ */ jsx(Badge, { tone: "success", children: "Active" });
      case "pending":
        return /* @__PURE__ */ jsx(Badge, { children: "Pending" });
      case "paused":
        return /* @__PURE__ */ jsx(Badge, { tone: "warning", children: "Paused" });
      case "completed":
        return /* @__PURE__ */ jsx(Badge, { tone: "info", children: "Completed" });
      default:
        return /* @__PURE__ */ jsx(Badge, { children: status });
    }
  };
  const upcomingTasks = scheduledTasks.filter((t) => t.status === "pending" || t.status === "active");
  const completedTasks = scheduledTasks.filter((t) => t.status === "completed");
  useEffect(() => {
    var _a3;
    if ((_a3 = fetcher.data) == null ? void 0 : _a3.success) {
      window.location.reload();
    }
  }, [fetcher.data]);
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Collection Scheduling" }),
    /* @__PURE__ */ jsxs("div", { style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      padding: "2rem",
      borderRadius: "16px",
      marginBottom: "1.5rem",
      position: "relative",
      overflow: "hidden"
    }, children: [
      /* @__PURE__ */ jsx("style", { children: `
            @keyframes clockTick {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            .clock-icon {
              animation: clockTick 60s linear infinite;
            }
            
            .task-card {
              transition: all 0.3s ease;
              cursor: pointer;
            }
            
            .task-card:hover {
              transform: translateX(10px);
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            
            .pulse-dot {
              width: 10px;
              height: 10px;
              background: #10b981;
              border-radius: 50%;
              animation: pulse 2s ease-in-out infinite;
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.5); opacity: 0.5; }
            }
          ` }),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Scheduling Center" }) }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Automate collection management with smart scheduling" }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "clock-icon", children: /* @__PURE__ */ jsx(Icon, { source: ClockIcon, tone: "base" }) })
        ] }),
        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            upcomingTasks.length,
            " Active"
          ] }),
          /* @__PURE__ */ jsxs(Badge, { tone: "info", children: [
            scheduledTasks.filter((t) => t.recurring).length,
            " Recurring"
          ] }),
          /* @__PURE__ */ jsxs(Badge, { children: [
            completedTasks.length,
            " Completed"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsxs(Layout.Section, { children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Scheduled Tasks" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                icon: CalendarIcon,
                onClick: () => setShowScheduleModal(true),
                children: "Schedule New Task"
              }
            )
          ] }),
          upcomingTasks.length === 0 ? /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No scheduled tasks",
              image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              children: /* @__PURE__ */ jsx("p", { children: "Schedule automatic collection management tasks" })
            }
          ) : /* @__PURE__ */ jsx(BlockStack, { gap: "300", children: upcomingTasks.map((task) => /* @__PURE__ */ jsx("div", { className: "task-card", children: /* @__PURE__ */ jsx(
            Box,
            {
              padding: "400",
              background: "bg-surface",
              borderWidth: "025",
              borderColor: "border",
              borderRadius: "200",
              children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsxs(InlineStack, { gap: "300", align: "center", children: [
                  task.status === "active" && /* @__PURE__ */ jsx("div", { className: "pulse-dot" }),
                  /* @__PURE__ */ jsx(Icon, { source: getTaskTypeIcon(task.type) }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: task.collectionTitle }),
                    /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                      getTaskTypeBadge(task.type),
                      task.recurring && /* @__PURE__ */ jsx(Badge, { tone: "info", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "050", children: [
                        /* @__PURE__ */ jsx(Icon, { source: RefreshIcon }),
                        task.recurringInterval
                      ] }) }),
                      getStatusBadge(task.status)
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                    "Scheduled: ",
                    new Date(task.scheduledDate).toLocaleString()
                  ] }),
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                    task.status === "active" ? /* @__PURE__ */ jsx(
                      Button,
                      {
                        size: "slim",
                        icon: DisabledIcon,
                        onClick: () => handlePauseTask(task.id),
                        children: "Pause"
                      }
                    ) : /* @__PURE__ */ jsx(
                      Button,
                      {
                        size: "slim",
                        icon: PlayIcon,
                        onClick: () => handleResumeTask(task.id),
                        children: "Resume"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        size: "slim",
                        icon: EditIcon,
                        onClick: () => {
                          setEditingTask(task);
                          setShowScheduleModal(true);
                        },
                        children: "Edit"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        size: "slim",
                        tone: "critical",
                        icon: DeleteIcon,
                        onClick: () => handleDeleteTask(task.id),
                        children: "Delete"
                      }
                    )
                  ] })
                ] }) })
              ] })
            }
          ) }, task.id)) })
        ] }) }),
        completedTasks.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Completed Tasks" }),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "text", "text", "text"],
              headings: ["Collection", "Task", "Completed", "Status"],
              rows: completedTasks.map((task) => [
                task.collectionTitle,
                getTaskTypeBadge(task.type),
                new Date(task.scheduledDate).toLocaleDateString(),
                getStatusBadge(task.status)
              ])
            }
          )
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Schedule" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Button, { fullWidth: true, onClick: () => {
              setTaskType("activate");
              setShowScheduleModal(true);
            }, children: "Activate Collection" }),
            /* @__PURE__ */ jsx(Button, { fullWidth: true, onClick: () => {
              setTaskType("deactivate");
              setShowScheduleModal(true);
            }, children: "Deactivate Collection" }),
            /* @__PURE__ */ jsx(Button, { fullWidth: true, onClick: () => {
              setTaskType("refresh");
              setIsRecurring(true);
              setShowScheduleModal(true);
            }, children: "Set Recurring Refresh" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Automation Benefits" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Save time on manual tasks" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Never miss important dates" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Optimize for peak times" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Consistent updates" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Schedule Templates" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(
              Box,
              {
                padding: "200",
                background: "bg-surface-neutral-subdued",
                borderRadius: "200",
                onClick: () => {
                  setTaskType("activate");
                  setIsRecurring(false);
                  setShowScheduleModal(true);
                },
                style: { cursor: "pointer" },
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Weekend Sale" }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Activate Friday, deactivate Monday" })
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              Box,
              {
                padding: "200",
                background: "bg-surface-neutral-subdued",
                borderRadius: "200",
                onClick: () => {
                  setTaskType("refresh");
                  setIsRecurring(true);
                  setRecurringInterval("daily");
                  setShowScheduleModal(true);
                },
                style: { cursor: "pointer" },
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Daily Refresh" }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Update collection every morning" })
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              Box,
              {
                padding: "200",
                background: "bg-surface-neutral-subdued",
                borderRadius: "200",
                onClick: () => {
                  setTaskType("activate");
                  setIsRecurring(true);
                  setRecurringInterval("monthly");
                  setShowScheduleModal(true);
                },
                style: { cursor: "pointer" },
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Monthly Feature" }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Rotate featured collection monthly" })
                ] })
              }
            )
          ] })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showScheduleModal,
        onClose: () => {
          setShowScheduleModal(false);
          resetForm();
        },
        title: editingTask ? "Edit Scheduled Task" : "Schedule New Task",
        primaryAction: {
          content: editingTask ? "Update Task" : "Schedule Task",
          onAction: handleScheduleTask,
          disabled: !selectedCollection || !selectedDateTime
        },
        secondaryActions: [
          {
            content: "Cancel",
            onAction: () => {
              setShowScheduleModal(false);
              resetForm();
            }
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(
            Select,
            {
              label: "Select Collection",
              options: [
                { label: "Choose collection...", value: "" },
                ...collections.map((c) => ({
                  label: `${c.title} (${c.productsCount} products)`,
                  value: c.id
                }))
              ],
              value: selectedCollection,
              onChange: setSelectedCollection
            }
          ),
          /* @__PURE__ */ jsx(
            Select,
            {
              label: "Task Type",
              options: [
                { label: "Activate Collection", value: "activate" },
                { label: "Deactivate Collection", value: "deactivate" },
                { label: "Refresh Products", value: "refresh" },
                { label: "Update SEO", value: "update-seo" },
                { label: "Change Sort Order", value: "change-sort" }
              ],
              value: taskType,
              onChange: setTaskType
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Date & Time",
              type: "datetime-local",
              value: selectedDateTime,
              onChange: setSelectedDateTime,
              helpText: "Schedule when this task should run"
            }
          ),
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              label: "Make this a recurring task",
              checked: isRecurring,
              onChange: setIsRecurring
            }
          ),
          isRecurring && /* @__PURE__ */ jsx(
            Select,
            {
              label: "Recurring Interval",
              options: [
                { label: "Daily", value: "daily" },
                { label: "Weekly", value: "weekly" },
                { label: "Bi-weekly", value: "biweekly" },
                { label: "Monthly", value: "monthly" },
                { label: "Quarterly", value: "quarterly" }
              ],
              value: recurringInterval,
              onChange: setRecurringInterval
            }
          ),
          /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-info-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Task Preview" }),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
              taskType === "activate" && "This collection will be made visible to customers",
              taskType === "deactivate" && "This collection will be hidden from customers",
              taskType === "refresh" && "Products in this collection will be refreshed",
              isRecurring && ` and will repeat ${recurringInterval}`
            ] })
          ] }) })
        ] }) })
      }
    ),
    ((_a2 = fetcher.data) == null ? void 0 : _a2.success) && /* @__PURE__ */ jsx(Banner, { tone: "success", onDismiss: () => {
    }, children: fetcher.data.message }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      zIndex: 1e3
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: CollectionIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/bulk-operations"),
          children: "Bulk Ops"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: MagicIcon,
          onClick: () => navigate("/app/ai-collections"),
          children: "AI Magic"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ChartVerticalFilledIcon,
          onClick: () => navigate("/app/analytics"),
          children: "Analytics"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route24 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: Scheduling,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
const loader$5 = async ({ request }) => {
  var _a2, _b, _c;
  const { admin } = await authenticate.admin(request);
  const query = `
    query getAnalyticsData {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
            productsCount {
              count
            }
            image {
              url
            }
            updatedAt
            createdAt
          }
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const data = await response.json();
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0,
        // Simulate analytics data (in production, this would come from actual analytics)
        analytics: {
          revenue: Math.floor(Math.random() * 5e4) + 1e3,
          views: Math.floor(Math.random() * 1e4) + 100,
          orders: Math.floor(Math.random() * 500) + 10,
          conversionRate: (Math.random() * 10 + 0.5).toFixed(2),
          avgOrderValue: Math.floor(Math.random() * 200) + 50,
          growth: Math.random() * 40 - 10
          // -10% to +30%
        }
      };
    })) || [];
    return json({ collections });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return json({ collections: [] });
  }
};
function Analytics() {
  var _a2, _b, _c;
  const { collections } = useLoaderData();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [selectedTab, setSelectedTab] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const totals = collections.reduce((acc, collection) => ({
    revenue: acc.revenue + collection.analytics.revenue,
    views: acc.views + collection.analytics.views,
    orders: acc.orders + collection.analytics.orders,
    collections: acc.collections + 1
  }), { revenue: 0, views: 0, orders: 0, collections: 0 });
  const avgConversionRate = collections.length > 0 ? (collections.reduce((sum, c) => sum + parseFloat(c.analytics.conversionRate), 0) / collections.length).toFixed(2) : "0";
  const topPerformers = [...collections].sort((a, b) => {
    switch (selectedMetric) {
      case "revenue":
        return b.analytics.revenue - a.analytics.revenue;
      case "views":
        return b.analytics.views - a.analytics.views;
      case "orders":
        return b.analytics.orders - a.analytics.orders;
      case "conversion":
        return parseFloat(b.analytics.conversionRate) - parseFloat(a.analytics.conversionRate);
      default:
        return 0;
    }
  }).slice(0, 10);
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0
    }).format(amount);
  };
  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };
  const chartData = [
    { name: "Mon", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Tue", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Wed", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Thu", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Fri", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Sat", value: Math.floor(Math.random() * 5e3) + 2e3 },
    { name: "Sun", value: Math.floor(Math.random() * 5e3) + 2e3 }
  ];
  const tabs = [
    { id: "overview", content: "Overview", icon: ChartVerticalFilledIcon },
    { id: "performance", content: "Performance", icon: ChartVerticalFilledIcon },
    { id: "comparison", content: "Comparison", icon: CollectionIcon },
    { id: "insights", content: "Insights", icon: StarFilledIcon }
  ];
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Collection Analytics" }),
    /* @__PURE__ */ jsxs("div", { style: {
      background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
      padding: "2rem",
      borderRadius: "16px",
      marginBottom: "1.5rem",
      position: "relative",
      overflow: "hidden"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        position: "absolute",
        top: "-50%",
        right: "-10%",
        width: "300px",
        height: "300px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "50%",
        animation: "pulse 4s ease-in-out infinite"
      } }),
      /* @__PURE__ */ jsx("style", { children: `
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.1; }
              50% { transform: scale(1.1); opacity: 0.2; }
            }
            
            @keyframes slideIn {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            
            .metric-card {
              animation: slideIn 0.5s ease-out;
              transition: all 0.3s ease;
            }
            
            .metric-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
          ` }),
      /* @__PURE__ */ jsx(BlockStack, { gap: "400", children: /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Analytics Dashboard" }) }),
          /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Track performance and optimize your collections" }) })
        ] }),
        /* @__PURE__ */ jsx(
          Select,
          {
            label: "",
            options: [
              { label: "Last 7 Days", value: "7days" },
              { label: "Last 30 Days", value: "30days" },
              { label: "Last 90 Days", value: "90days" },
              { label: "This Year", value: "year" }
            ],
            value: selectedPeriod,
            onChange: setSelectedPeriod
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { marginBottom: "1.5rem" }, children: /* @__PURE__ */ jsxs(Grid, { children: [
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx("div", { className: "metric-card", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: CashDollarIcon, tone: "success" }),
          /* @__PURE__ */ jsx(Badge, { tone: "success", children: "+12.5%" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h2", children: formatCurrency(totals.revenue) }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Total Revenue" })
      ] }) }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx("div", { className: "metric-card", style: { animationDelay: "0.1s" }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: CartFilledIcon, tone: "info" }),
          /* @__PURE__ */ jsx(Badge, { tone: "info", children: "+8.3%" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h2", children: formatNumber(totals.orders) }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Total Orders" })
      ] }) }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx("div", { className: "metric-card", style: { animationDelay: "0.2s" }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: ViewIcon, tone: "base" }),
          /* @__PURE__ */ jsx(Badge, { children: "+15.2%" })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "headingXl", as: "h2", children: formatNumber(totals.views) }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Total Views" })
      ] }) }) }) }),
      /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx("div", { className: "metric-card", style: { animationDelay: "0.3s" }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Icon, { source: ChartVerticalFilledIcon, tone: "success" }),
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            avgConversionRate,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Text, { variant: "headingXl", as: "h2", children: [
          avgConversionRate,
          "%"
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Avg Conversion" })
      ] }) }) }) })
    ] }) }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Tabs, { tabs, selected: selectedTab, onSelect: setSelectedTab, children: [
        selectedTab === 0 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Revenue Trend" }),
          /* @__PURE__ */ jsx("div", { style: {
            background: "linear-gradient(to bottom, rgba(139, 92, 246, 0.1), transparent)",
            borderRadius: "8px",
            padding: "1rem"
          }, children: /* @__PURE__ */ jsx("div", { style: { height: "200px", display: "flex", alignItems: "flex-end", gap: "10px" }, children: chartData.map((day, index2) => {
            const height = day.value / Math.max(...chartData.map((d) => d.value)) * 100;
            return /* @__PURE__ */ jsxs("div", { style: { flex: 1, textAlign: "center" }, children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    height: `${height}%`,
                    background: "linear-gradient(to top, #8b5cf6, #3b82f6)",
                    borderRadius: "4px 4px 0 0",
                    position: "relative",
                    transition: "all 0.3s ease",
                    cursor: "pointer"
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.transform = "scaleY(1.05)";
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.transform = "scaleY(1)";
                  },
                  children: /* @__PURE__ */ jsxs("div", { style: {
                    position: "absolute",
                    top: "-25px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }, children: [
                    "$",
                    (day.value / 1e3).toFixed(1),
                    "k"
                  ] })
                }
              ),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: day.name })
            ] }, index2);
          }) }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Stats" }),
            /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Best performing collection:" }),
                /* @__PURE__ */ jsx(Badge, { tone: "success", children: (_a2 = topPerformers[0]) == null ? void 0 : _a2.title })
              ] }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Most viewed collection:" }),
                /* @__PURE__ */ jsx(Badge, { tone: "info", children: (_b = [...collections].sort((a, b) => b.analytics.views - a.analytics.views)[0]) == null ? void 0 : _b.title })
              ] }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Highest conversion rate:" }),
                /* @__PURE__ */ jsx(Badge, { children: (_c = [...collections].sort(
                  (a, b) => parseFloat(b.analytics.conversionRate) - parseFloat(a.analytics.conversionRate)
                )[0]) == null ? void 0 : _c.title })
              ] }) })
            ] })
          ] })
        ] }),
        selectedTab === 1 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Top Performing Collections" }),
            /* @__PURE__ */ jsx(
              Select,
              {
                label: "",
                options: [
                  { label: "By Revenue", value: "revenue" },
                  { label: "By Orders", value: "orders" },
                  { label: "By Views", value: "views" },
                  { label: "By Conversion", value: "conversion" }
                ],
                value: selectedMetric,
                onChange: setSelectedMetric
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "numeric", "numeric", "numeric", "numeric", "text"],
              headings: [
                "Collection",
                "Revenue",
                "Orders",
                "Views",
                "Conversion",
                "Trend"
              ],
              rows: topPerformers.map((collection) => {
                var _a3;
                return [
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    ((_a3 = collection.image) == null ? void 0 : _a3.url) && /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: collection.image.url,
                        alt: collection.title,
                        style: { width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
                      /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                        collection.productsCount,
                        " products"
                      ] })
                    ] })
                  ] }),
                  formatCurrency(collection.analytics.revenue),
                  formatNumber(collection.analytics.orders),
                  formatNumber(collection.analytics.views),
                  `${collection.analytics.conversionRate}%`,
                  collection.analytics.growth > 0 ? /* @__PURE__ */ jsx(Badge, { tone: "success", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "050", children: [
                    /* @__PURE__ */ jsx(Icon, { source: ChartVerticalFilledIcon }),
                    Math.abs(collection.analytics.growth).toFixed(1),
                    "%"
                  ] }) }) : /* @__PURE__ */ jsx(Badge, { tone: "critical", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "050", children: [
                    /* @__PURE__ */ jsx(Icon, { source: ChartVerticalIcon }),
                    Math.abs(collection.analytics.growth).toFixed(1),
                    "%"
                  ] }) })
                ];
              })
            }
          )
        ] }),
        selectedTab === 2 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Collection Comparison" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Select collections to compare performance metrics" }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }, children: collections.slice(0, 6).map((collection) => /* @__PURE__ */ jsx(
              Box,
              {
                padding: "300",
                background: selectedCollections.includes(collection.id) ? "bg-surface-selected" : "bg-surface",
                borderWidth: "025",
                borderColor: "border",
                borderRadius: "200",
                onClick: () => {
                  if (selectedCollections.includes(collection.id)) {
                    setSelectedCollections(selectedCollections.filter((id) => id !== collection.id));
                  } else if (selectedCollections.length < 3) {
                    setSelectedCollections([...selectedCollections, collection.id]);
                  }
                },
                style: { cursor: "pointer" },
                children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "center", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: selectedCollections.includes(collection.id),
                      onChange: () => {
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: collection.title })
                ] })
              },
              collection.id
            )) })
          ] }),
          selectedCollections.length > 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Comparison Results" }),
            selectedCollections.map((id) => {
              const collection = collections.find((c) => c.id === id);
              if (!collection) return null;
              return /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "400", children: [
                  /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                    "Revenue: ",
                    formatCurrency(collection.analytics.revenue)
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                    "Orders: ",
                    collection.analytics.orders
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                    "Conversion: ",
                    collection.analytics.conversionRate,
                    "%"
                  ] })
                ] })
              ] }) }, id);
            })
          ] }) })
        ] }),
        selectedTab === 3 && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "AI-Powered Insights" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-success-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Top Opportunity" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: 'The "Summer Essentials" collection has 25% higher conversion rate than average. Consider featuring it more prominently.' })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-warning-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", children: [
              /* @__PURE__ */ jsx(Icon, { source: AlertTriangleIcon, tone: "warning" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Improvement Area" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "3 collections have zero products. Adding products could increase overall revenue by 15%." })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-info-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", children: [
              /* @__PURE__ */ jsx(Icon, { source: ChartVerticalFilledIcon, tone: "info" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Growth Trend" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Collections created in the last 30 days show 40% higher engagement. Keep the momentum going!" })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "start", children: [
              /* @__PURE__ */ jsx(Icon, { source: StarFilledIcon }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Recommendation" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Create seasonal collections 2 weeks before peak shopping periods for maximum impact." })
              ] })
            ] }) })
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Performance Score" }),
          /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "1rem" }, children: [
            /* @__PURE__ */ jsx("div", { style: {
              width: "120px",
              height: "120px",
              margin: "0 auto",
              background: "conic-gradient(#10b981 0deg 270deg, #e5e7eb 270deg)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }, children: /* @__PURE__ */ jsx("div", { style: {
              width: "100px",
              height: "100px",
              background: "white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "heading2xl", as: "span", children: "75" }) }) }),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Your collections are performing well" })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
            /* @__PURE__ */ jsx(ProgressBar, { progress: 75, tone: "success" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "75/100 Overall Score" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Actions" }),
          /* @__PURE__ */ jsx(Button, { fullWidth: true, onClick: () => navigate("/app/ai-collections"), children: "Create AI Collection" }),
          /* @__PURE__ */ jsx(Button, { fullWidth: true, onClick: () => navigate("/app/bulk-operations"), children: "Bulk Operations" }),
          /* @__PURE__ */ jsx(Button, { fullWidth: true, variant: "plain", children: "Export Report" })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Tips" }),
          /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Update collections weekly for better engagement" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Use high-quality images to increase click rates" }) }),
            /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Create seasonal collections 2 weeks early" }) })
          ] })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      zIndex: 1e3
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: CollectionIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/bulk-operations"),
          children: "Bulk Ops"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: MagicIcon,
          onClick: () => navigate("/app/ai-collections"),
          children: "AI Magic"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: RefreshIcon,
          onClick: () => window.location.reload(),
          children: "Refresh"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route25 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Analytics,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
const loader$4 = async ({ request }) => {
  try {
    await authenticate.admin(request);
    return redirect("/app");
  } catch (error) {
    throw error;
  }
};
const route26 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({ request }) => {
  var _a2, _b, _c;
  try {
    const { admin } = await authenticate.admin(request);
    const query = `
      query getCollections {
        collections(first: 100) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              image {
                url
                altText
              }
              productsCount {
                count
              }
            }
          }
        }
      }
    `;
    const response = await admin.graphql(query);
    const data = await response.json();
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0,
        // Calculate SEO score (in production, this would be more sophisticated)
        seoScore: calculateSEOScore(edge.node)
      };
    })) || [];
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return json({ collections: [] });
  }
};
function calculateSEOScore(collection) {
  var _a2, _b, _c;
  let score = 0;
  if (collection.title) {
    if (collection.title.length >= 30 && collection.title.length <= 60) score += 20;
    else if (collection.title.length >= 20) score += 10;
  }
  const description = ((_a2 = collection.descriptionHtml) == null ? void 0 : _a2.replace(/<[^>]*>/g, "")) || "";
  if (description.length >= 150 && description.length <= 160) score += 20;
  else if (description.length >= 100) score += 10;
  if (collection.handle) {
    if (collection.handle.includes("-")) score += 10;
    if (collection.handle.length <= 50) score += 5;
  }
  if ((_b = collection.image) == null ? void 0 : _b.url) score += 10;
  if ((_c = collection.image) == null ? void 0 : _c.altText) score += 5;
  if (collection.productsCount > 0) score += 15;
  if (description.split(" ").length > 20) score += 15;
  return Math.min(score, 100);
}
const action$3 = async ({ request }) => {
  var _a2, _b, _c;
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    if (actionType === "updateSEO") {
      const collectionId = formData.get("collectionId");
      const seoTitle = formData.get("seoTitle");
      const seoDescription = formData.get("seoDescription");
      const mutation = `
        mutation updateCollectionSEO($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              seo {
                title
                description
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const response = await admin.graphql(mutation, {
        variables: {
          input: {
            id: collectionId,
            seo: {
              title: seoTitle,
              description: seoDescription
            }
          }
        }
      });
      const data = await response.json();
      if (((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collectionUpdate) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
        return json({
          success: false,
          error: data.data.collectionUpdate.userErrors[0].message
        });
      }
      return json({ success: true, message: "SEO settings updated successfully" });
    }
    if (actionType === "generateMeta") {
      const title = formData.get("title");
      const generatedMeta = {
        title: `${title} | Best Deals & Free Shipping`,
        description: `Shop our ${title} collection. Discover amazing products with free shipping on orders over $50. Limited time offers available.`,
        keywords: `${title.toLowerCase()}, online shopping, best deals, free shipping`
      };
      return json({ success: true, generatedMeta });
    }
    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: "Authentication or action failed" });
  }
};
function SEOTools() {
  var _a2, _b, _c;
  const { collections } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [schemaType, setSchemaType] = useState("Product");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const handleOptimize = (collection) => {
    var _a3;
    setSelectedCollection(collection);
    setSeoTitle(collection.title);
    setSeoDescription(((_a3 = collection.descriptionHtml) == null ? void 0 : _a3.replace(/<[^>]*>/g, "")) || "");
    setShowOptimizeModal(true);
  };
  const handleGenerateMeta = () => {
    if (selectedCollection) {
      setIsAnalyzing(true);
      fetcher.submit(
        {
          actionType: "generateMeta",
          title: selectedCollection.title
        },
        { method: "POST" }
      );
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 2e3);
    }
  };
  const handleSaveSEO = () => {
    if (selectedCollection) {
      fetcher.submit(
        {
          actionType: "updateSEO",
          collectionId: selectedCollection.id,
          seoTitle,
          seoDescription
        },
        { method: "POST" }
      );
      setTimeout(() => {
        setShowOptimizeModal(false);
        navigate("/app/seo-tools", { replace: true });
      }, 500);
    }
  };
  useEffect(() => {
    var _a3;
    if ((_a3 = fetcher.data) == null ? void 0 : _a3.generatedMeta) {
      setSeoTitle(fetcher.data.generatedMeta.title);
      setSeoDescription(fetcher.data.generatedMeta.description);
      setKeywords(fetcher.data.generatedMeta.keywords);
    }
  }, [fetcher.data]);
  const getScoreBadge = (score) => {
    if (score >= 80) return /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
      score,
      "/100"
    ] });
    if (score >= 60) return /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
      score,
      "/100"
    ] });
    return /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
      score,
      "/100"
    ] });
  };
  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };
  const tabs = [
    { id: "analyzer", content: "SEO Analyzer", icon: SearchIcon },
    { id: "meta", content: "Meta Tags", icon: HashtagIcon },
    { id: "schema", content: "Schema Markup", icon: GlobeIcon },
    { id: "suggestions", content: "Suggestions", icon: MagicIcon }
  ];
  const sortedCollections = [...collections].sort((a, b) => a.seoScore - b.seoScore);
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsx(
      TitleBar,
      {
        title: "SEO Optimization Tools",
        primaryAction: {
          content: "View Collections",
          onAction: () => navigate("/app/collections-enhanced")
        },
        secondaryActions: [
          {
            content: "Home",
            onAction: () => navigate("/app")
          },
          {
            content: "View Collections",
            onAction: () => navigate("/app/collections-enhanced")
          },
          {
            content: "Create Collection",
            onAction: () => navigate("/app")
          },
          {
            content: "Bulk Operations",
            onAction: () => navigate("/app/bulk-operations")
          }
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { style: {
      position: "sticky",
      top: 0,
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      zIndex: 100,
      padding: "0.5rem 1rem"
    }, children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", maxWidth: "1200px", margin: "0 auto" }, children: [
      /* @__PURE__ */ jsxs(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app"), children: [
        /* @__PURE__ */ jsx(Icon, { source: HomeIcon }),
        " Home"
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app/collections-enhanced"), children: "View All Collections" }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app"), children: "Create Collection" }),
      /* @__PURE__ */ jsx(Button, { size: "large", fullWidth: true, onClick: () => navigate("/app/bulk-operations"), children: "Bulk Operations" }),
      /* @__PURE__ */ jsx(Button, { variant: "primary", size: "large", fullWidth: true, onClick: () => navigate("/app/seo-tools"), children: "SEO Tools" })
    ] }) }),
    /* @__PURE__ */ jsxs(Page, { children: [
      /* @__PURE__ */ jsxs("div", { style: {
        background: "linear-gradient(135deg, #3b82f6 0%, #10b981 50%, #6366f1 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ jsx("style", { children: `
            @keyframes searchPulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            
            .search-icon {
              animation: searchPulse 2s ease-in-out infinite;
            }
            
            .seo-card {
              transition: all 0.3s ease;
            }
            
            .seo-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 15px 30px rgba(0,0,0,0.2);
            }
            
            .score-ring {
              transition: all 0.5s ease;
            }
          ` }),
        /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "SEO Optimization Center" }) }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Boost your collections' search visibility" }) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "search-icon", children: /* @__PURE__ */ jsx(Icon, { source: SearchIcon, tone: "base" }) })
          ] }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
              collections.filter((c) => c.seoScore >= 80).length,
              " Optimized"
            ] }),
            /* @__PURE__ */ jsxs(Badge, { tone: "warning", children: [
              collections.filter((c) => c.seoScore >= 60 && c.seoScore < 80).length,
              " Needs Work"
            ] }),
            /* @__PURE__ */ jsxs(Badge, { tone: "critical", children: [
              collections.filter((c) => c.seoScore < 60).length,
              " Poor SEO"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Collection SEO Analysis" }),
            /* @__PURE__ */ jsx(
              Button,
              {
                icon: RefreshIcon,
                onClick: () => navigate("/app/seo-tools", { replace: true }),
                children: "Re-analyze"
              }
            )
          ] }),
          collections.length === 0 ? /* @__PURE__ */ jsx(
            EmptyState,
            {
              heading: "No collections to analyze",
              image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              children: /* @__PURE__ */ jsx("p", { children: "Create collections first to analyze their SEO" })
            }
          ) : /* @__PURE__ */ jsx(
            DataTable,
            {
              columnContentTypes: ["text", "numeric", "text", "text", "text"],
              headings: [
                "Collection",
                "SEO Score",
                "Issues",
                "Opportunities",
                "Actions"
              ],
              rows: sortedCollections.map((collection) => {
                var _a3, _b2, _c2;
                const issues = [];
                const opportunities = [];
                if (!collection.descriptionHtml) issues.push("No description");
                if (!((_a3 = collection.image) == null ? void 0 : _a3.url)) issues.push("No image");
                if (!((_b2 = collection.image) == null ? void 0 : _b2.altText)) issues.push("No alt text");
                if (collection.productsCount === 0) issues.push("No products");
                if (collection.title.length < 30) opportunities.push("Expand title");
                if (!collection.handle.includes("-")) opportunities.push("Optimize URL");
                return [
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "center", children: [
                    ((_c2 = collection.image) == null ? void 0 : _c2.url) ? /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: collection.image.url,
                        alt: collection.title,
                        style: { width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }
                      }
                    ) : /* @__PURE__ */ jsx(Icon, { source: ImageIcon }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
                      /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                        "/",
                        collection.handle
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: {
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      border: `3px solid ${getScoreColor(collection.seoScore)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "12px"
                    }, children: collection.seoScore }),
                    getScoreBadge(collection.seoScore)
                  ] }),
                  issues.length > 0 ? /* @__PURE__ */ jsxs(InlineStack, { gap: "100", wrap: true, children: [
                    issues.slice(0, 2).map((issue, i) => /* @__PURE__ */ jsx(Badge, { tone: "critical", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "050", children: [
                      /* @__PURE__ */ jsx(Icon, { source: XSmallIcon }),
                      issue
                    ] }) }, i)),
                    issues.length > 2 && /* @__PURE__ */ jsxs(Badge, { children: [
                      "+",
                      issues.length - 2,
                      " more"
                    ] })
                  ] }) : /* @__PURE__ */ jsx(Badge, { tone: "success", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "050", children: [
                    /* @__PURE__ */ jsx(Icon, { source: CheckIcon }),
                    "All good"
                  ] }) }),
                  opportunities.length > 0 ? /* @__PURE__ */ jsx(InlineStack, { gap: "100", wrap: true, children: opportunities.map((opp, i) => /* @__PURE__ */ jsx(Badge, { tone: "info", children: opp }, i)) }) : /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "-" }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "slim",
                      onClick: () => handleOptimize(collection),
                      children: "Optimize"
                    }
                  )
                ];
              })
            }
          )
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Overall SEO Health" }),
            /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "1rem" }, children: [
              /* @__PURE__ */ jsx("div", { style: {
                width: "120px",
                height: "120px",
                margin: "0 auto",
                background: `conic-gradient(
                      #10b981 0deg ${collections.filter((c) => c.seoScore >= 80).length / collections.length * 360}deg,
                      #f59e0b ${collections.filter((c) => c.seoScore >= 80).length / collections.length * 360}deg ${(collections.filter((c) => c.seoScore >= 80).length + collections.filter((c) => c.seoScore >= 60 && c.seoScore < 80).length) / collections.length * 360}deg,
                      #ef4444 ${(collections.filter((c) => c.seoScore >= 80).length + collections.filter((c) => c.seoScore >= 60 && c.seoScore < 80).length) / collections.length * 360}deg
                    )`,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }, children: /* @__PURE__ */ jsx("div", { style: {
                width: "100px",
                height: "100px",
                background: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }, children: /* @__PURE__ */ jsx(Text, { variant: "heading2xl", children: collections.length > 0 ? Math.round(collections.reduce((sum, c) => sum + c.seoScore, 0) / collections.length) : 0 }) }) }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Average SEO Score" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Quick Actions" }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: MagicIcon, children: "Generate All Meta Tags" }),
              /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: GlobeIcon, children: "Create Sitemap" }),
              /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: HashtagIcon, children: "Bulk Update Keywords" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "SEO Tips" }),
            /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Keep titles between 30-60 characters" }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Write descriptions of 150-160 characters" }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Use descriptive URLs with hyphens" }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Add alt text to all images" }) }),
              /* @__PURE__ */ jsx(List$1.Item, { children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: "Include relevant keywords naturally" }) })
            ] })
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showOptimizeModal,
          onClose: () => setShowOptimizeModal(false),
          title: `Optimize SEO: ${selectedCollection == null ? void 0 : selectedCollection.title}`,
          size: "large",
          primaryAction: {
            content: "Save Changes",
            onAction: handleSaveSEO,
            loading: fetcher.state === "submitting"
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowOptimizeModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(Tabs, { tabs, selected: selectedTab, onSelect: setSelectedTab, children: [
            selectedTab === 0 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "SEO Analysis" }),
              selectedCollection && /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsxs(Box, { padding: "300", background: "bg-surface-neutral-subdued", borderRadius: "200", children: [
                  /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Current SEO Score" }),
                    /* @__PURE__ */ jsxs(Text, { variant: "headingLg", children: [
                      selectedCollection.seoScore,
                      "/100"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(ProgressBar, { progress: selectedCollection.seoScore, tone: selectedCollection.seoScore >= 80 ? "success" : selectedCollection.seoScore >= 60 ? "warning" : "critical" })
                ] }),
                /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Issues Found" }),
                  !selectedCollection.descriptionHtml && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(Icon, { source: XSmallIcon, tone: "critical" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Missing meta description" })
                  ] }),
                  selectedCollection.title.length < 30 && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(Icon, { source: AlertTriangleIcon, tone: "warning" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Title too short (under 30 chars)" })
                  ] }),
                  !((_a2 = selectedCollection.image) == null ? void 0 : _a2.altText) && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(Icon, { source: XSmallIcon, tone: "critical" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Missing image alt text" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Recommendations" }),
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Add focus keywords to title" })
                  ] }),
                  /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
                    /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
                    /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Include call-to-action in description" })
                  ] })
                ] })
              ] })
            ] }) }),
            selectedTab === 1 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Meta Tags" }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    icon: MagicIcon,
                    onClick: handleGenerateMeta,
                    loading: isAnalyzing,
                    children: "AI Generate"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "SEO Title",
                  value: seoTitle,
                  onChange: setSeoTitle,
                  helpText: `${seoTitle.length}/60 characters`,
                  autoComplete: "off"
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Meta Description",
                  value: seoDescription,
                  onChange: setSeoDescription,
                  multiline: 3,
                  helpText: `${seoDescription.length}/160 characters`,
                  autoComplete: "off"
                }
              ),
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Keywords",
                  value: keywords,
                  onChange: setKeywords,
                  placeholder: "summer, collection, sale, fashion",
                  helpText: "Comma-separated keywords",
                  autoComplete: "off"
                }
              ),
              /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Preview" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", tone: "info", children: seoTitle || (selectedCollection == null ? void 0 : selectedCollection.title) }),
                /* @__PURE__ */ jsxs(Text, { variant: "bodySm", tone: "subdued", children: [
                  "https://yourstore.com/collections/",
                  selectedCollection == null ? void 0 : selectedCollection.handle
                ] }),
                /* @__PURE__ */ jsx(Text, { variant: "bodySm", children: seoDescription || "No description provided" })
              ] }) })
            ] }) }),
            selectedTab === 2 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Schema Markup" }),
              /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsx("pre", { style: { fontSize: "12px", overflow: "auto" }, children: `{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "${selectedCollection == null ? void 0 : selectedCollection.title}",
  "description": "${seoDescription}",
  "url": "https://yourstore.com/collections/${selectedCollection == null ? void 0 : selectedCollection.handle}",
  "numberOfItems": ${selectedCollection == null ? void 0 : selectedCollection.productsCount},
  "image": "${((_b = selectedCollection == null ? void 0 : selectedCollection.image) == null ? void 0 : _b.url) || ""}",
  "potentialAction": {
    "@type": "ViewAction",
    "target": "https://yourstore.com/collections/${selectedCollection == null ? void 0 : selectedCollection.handle}"
  }
}` }) }),
              /* @__PURE__ */ jsx(Button, { fullWidth: true, children: "Copy Schema Markup" })
            ] }) }),
            selectedTab === 3 && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "AI Suggestions" }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
                /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-success-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Title Suggestions" }),
                  /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
                    /* @__PURE__ */ jsxs(List$1.Item, { children: [
                      selectedCollection == null ? void 0 : selectedCollection.title,
                      " - Best Deals"
                    ] }),
                    /* @__PURE__ */ jsxs(List$1.Item, { children: [
                      "Shop ",
                      selectedCollection == null ? void 0 : selectedCollection.title,
                      " Collection"
                    ] }),
                    /* @__PURE__ */ jsxs(List$1.Item, { children: [
                      selectedCollection == null ? void 0 : selectedCollection.title,
                      " | Up to 50% Off"
                    ] })
                  ] })
                ] }) }),
                /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-info-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "100", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Description Ideas" }),
                  /* @__PURE__ */ jsxs(List$1, { type: "bullet", children: [
                    /* @__PURE__ */ jsxs(List$1.Item, { children: [
                      "Discover our ",
                      selectedCollection == null ? void 0 : selectedCollection.title,
                      " collection with exclusive deals"
                    ] }),
                    /* @__PURE__ */ jsxs(List$1.Item, { children: [
                      "Shop ",
                      selectedCollection == null ? void 0 : selectedCollection.productsCount,
                      " amazing products in our ",
                      selectedCollection == null ? void 0 : selectedCollection.title
                    ] })
                  ] })
                ] }) })
              ] })
            ] }) })
          ] }) })
        }
      ),
      ((_c = fetcher.data) == null ? void 0 : _c.success) && /* @__PURE__ */ jsx(Banner, { tone: "success", onDismiss: () => {
      }, children: fetcher.data.message })
    ] })
  ] });
}
const route27 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: SEOTools,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const TEMPLATES = [
  {
    id: "seasonal-summer",
    category: "seasonal",
    title: "Summer Collection",
    description: "Perfect for showcasing summer products, beachwear, and outdoor items",
    icon: "☀️",
    color: "linear-gradient(135deg, #ffd89b 0%, #ff6b6b 100%)",
    tags: ["summer", "beach", "outdoor", "warm"],
    products: ["swimwear", "sunglasses", "sandals", "shorts"],
    rules: [
      { type: "tag", operator: "contains", value: "summer" },
      { type: "product_type", operator: "equals", value: "swimwear" }
    ]
  },
  {
    id: "seasonal-winter",
    category: "seasonal",
    title: "Winter Wonderland",
    description: "Cozy winter essentials and holiday items",
    icon: "❄️",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tags: ["winter", "cold", "holiday", "cozy"],
    products: ["jackets", "boots", "scarves", "gloves"],
    rules: [
      { type: "tag", operator: "contains", value: "winter" },
      { type: "product_type", operator: "equals", value: "outerwear" }
    ]
  },
  {
    id: "sale-flash",
    category: "promotional",
    title: "Flash Sale",
    description: "Limited time offers and quick deals",
    icon: "⚡",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    tags: ["sale", "discount", "limited", "flash"],
    products: ["clearance", "overstock"],
    rules: [
      { type: "tag", operator: "contains", value: "sale" },
      { type: "compare_at_price", operator: "greater_than", value: "0" }
    ]
  },
  {
    id: "new-arrivals",
    category: "product-launch",
    title: "New Arrivals",
    description: "Showcase your latest products and fresh inventory",
    icon: "✨",
    color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    tags: ["new", "arrival", "latest", "fresh"],
    products: ["recent"],
    rules: [
      { type: "created_at", operator: "greater_than", value: "30_days_ago" }
    ]
  },
  {
    id: "bestsellers",
    category: "performance",
    title: "Best Sellers",
    description: "Your top-performing products in one collection",
    icon: "🏆",
    color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    tags: ["bestseller", "popular", "trending"],
    products: ["top-rated"],
    rules: [
      { type: "tag", operator: "contains", value: "bestseller" }
    ]
  },
  {
    id: "gift-guide",
    category: "occasion",
    title: "Gift Guide",
    description: "Curated gift ideas for special occasions",
    icon: "🎁",
    color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    tags: ["gift", "present", "occasion"],
    products: ["giftable"],
    rules: [
      { type: "tag", operator: "contains", value: "gift" }
    ]
  },
  {
    id: "eco-friendly",
    category: "lifestyle",
    title: "Eco-Friendly",
    description: "Sustainable and environmentally conscious products",
    icon: "🌱",
    color: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
    tags: ["eco", "sustainable", "organic", "green"],
    products: ["sustainable"],
    rules: [
      { type: "tag", operator: "contains", value: "eco" },
      { type: "tag", operator: "contains", value: "sustainable" }
    ]
  },
  {
    id: "luxury",
    category: "premium",
    title: "Luxury Collection",
    description: "Premium, high-end products for discerning customers",
    icon: "💎",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tags: ["luxury", "premium", "exclusive"],
    products: ["high-end"],
    rules: [
      { type: "price", operator: "greater_than", value: "100" },
      { type: "tag", operator: "contains", value: "luxury" }
    ]
  },
  {
    id: "clearance",
    category: "promotional",
    title: "Clearance Sale",
    description: "Deep discounts on last-chance items",
    icon: "🏷️",
    color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    tags: ["clearance", "final-sale", "last-chance"],
    products: ["clearance"],
    rules: [
      { type: "tag", operator: "contains", value: "clearance" },
      { type: "inventory_quantity", operator: "less_than", value: "10" }
    ]
  },
  {
    id: "trending",
    category: "performance",
    title: "Trending Now",
    description: "What's hot and popular right now",
    icon: "🔥",
    color: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    tags: ["trending", "hot", "popular"],
    products: ["trending"],
    rules: [
      { type: "tag", operator: "contains", value: "trending" }
    ]
  }
];
const action$2 = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const templateId = formData.get("templateId");
  const customTitle = formData.get("customTitle");
  const customDescription = formData.get("customDescription");
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return json({ success: false, error: "Template not found" });
  }
  const mutation = `
    mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(mutation, {
      variables: {
        input: {
          title: customTitle || template.title,
          descriptionHtml: `<p>${customDescription || template.description}</p>`,
          handle: (customTitle || template.title).toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()
        }
      }
    });
    const data = await response.json();
    if (data.data.collectionCreate.userErrors.length === 0) {
      return json({ success: true, collection: data.data.collectionCreate.collection });
    } else {
      return json({
        success: false,
        error: data.data.collectionCreate.userErrors[0].message
      });
    }
  } catch (error) {
    return json({ success: false, error: "Failed to create collection from template" });
  }
};
function Templates() {
  var _a2, _b;
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const categories = [
    { id: "all", content: "All Templates", icon: DuplicateIcon },
    { id: "seasonal", content: "Seasonal", icon: CalendarIcon },
    { id: "promotional", content: "Promotional", icon: HashtagIcon },
    { id: "performance", content: "Performance", icon: ChartVerticalFilledIcon },
    { id: "occasion", content: "Occasions", icon: ProductIcon },
    { id: "lifestyle", content: "Lifestyle", icon: StarFilledIcon },
    { id: "premium", content: "Premium", icon: StarFilledIcon },
    { id: "product-launch", content: "Product Launch", icon: PlusIcon }
  ];
  const filteredTemplates = selectedCategory === 0 ? TEMPLATES : TEMPLATES.filter((t) => t.category === categories[selectedCategory].id);
  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setCustomTitle(template.title);
    setCustomDescription(template.description);
  };
  const handleCreateFromTemplate = () => {
    if (selectedTemplate) {
      fetcher.submit(
        {
          templateId: selectedTemplate.id,
          customTitle,
          customDescription
        },
        { method: "POST" }
      );
      setSelectedTemplate(null);
    }
  };
  if ((_a2 = fetcher.data) == null ? void 0 : _a2.success) {
    navigate("/app/collections-enhanced");
  }
  return /* @__PURE__ */ jsxs(Page, { children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Collection Templates" }),
    /* @__PURE__ */ jsxs("div", { style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      padding: "2rem",
      borderRadius: "16px",
      marginBottom: "1.5rem",
      position: "relative",
      overflow: "hidden"
    }, children: [
      /* @__PURE__ */ jsx("style", { children: `
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }
            
            .template-card {
              transition: all 0.3s ease;
              cursor: pointer;
              position: relative;
              overflow: hidden;
            }
            
            .template-card:hover {
              transform: translateY(-10px) scale(1.02);
              box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            }
            
            .template-card::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
              transform: rotate(45deg);
              transition: all 0.5s;
              opacity: 0;
            }
            
            .template-card:hover::before {
              animation: shine 0.5s ease-in-out;
            }
            
            @keyframes shine {
              0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
              50% { opacity: 1; }
              100% { transform: translateX(100%) translateY(100%) rotate(45deg); opacity: 0; }
            }
          ` }),
      /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Text, { as: "h1", variant: "headingXl", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "Template Gallery" }) }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyLg", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)" }, children: "Professional templates to jumpstart your collections" }) })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { animation: "float 3s ease-in-out infinite" }, children: /* @__PURE__ */ jsx(Icon, { source: DuplicateIcon, tone: "base" }) })
        ] }),
        /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
          /* @__PURE__ */ jsxs(Badge, { tone: "success", children: [
            TEMPLATES.length,
            " Templates"
          ] }),
          /* @__PURE__ */ jsx(Badge, { tone: "info", children: "8 Categories" }),
          /* @__PURE__ */ jsx(Badge, { children: "One-Click Setup" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Layout, { children: [
      /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(Tabs, { tabs: categories, selected: selectedCategory, onSelect: setSelectedCategory, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Grid, { children: filteredTemplates.map((template) => /* @__PURE__ */ jsx(Grid.Cell, { columnSpan: { xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }, children: /* @__PURE__ */ jsx("div", { className: "template-card", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx("div", { style: {
            height: "120px",
            background: template.color,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem"
          }, children: template.icon }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", fontWeight: "semibold", children: template.title }),
            /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: template.description })
          ] }),
          /* @__PURE__ */ jsx(InlineStack, { gap: "100", wrap: true, children: template.tags.slice(0, 3).map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, tag)) }),
          /* @__PURE__ */ jsxs(InlineStack, { gap: "100", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                fullWidth: true,
                onClick: () => handleUseTemplate(template),
                icon: CheckIcon,
                children: "Use Template"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                icon: ViewIcon,
                onClick: () => {
                  setSelectedTemplate(template);
                  setShowPreview(true);
                }
              }
            )
          ] })
        ] }) }) }) }, template.id)) }),
        filteredTemplates.length === 0 && /* @__PURE__ */ jsx(Box, { padding: "800", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", align: "center", children: [
          /* @__PURE__ */ jsx(Icon, { source: CollectionIcon, tone: "subdued" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", alignment: "center", children: "No templates found in this category" })
        ] }) })
      ] }) }) }) }),
      /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Template Benefits" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Save hours of setup time" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Professional designs" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "SEO optimized" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Conversion focused" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Icon, { source: CheckIcon, tone: "success" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Mobile responsive" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Custom Template?" }),
          /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Can't find what you need? Create your own template or request a custom design." }),
          /* @__PURE__ */ jsx(Button, { fullWidth: true, icon: PlusIcon, children: "Create Custom Template" })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: "Popular This Week" }),
          /* @__PURE__ */ jsx(BlockStack, { gap: "200", children: TEMPLATES.slice(0, 3).map((template) => /* @__PURE__ */ jsx(
            Box,
            {
              padding: "200",
              background: "bg-surface-neutral-subdued",
              borderRadius: "200",
              children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "center", children: [
                /* @__PURE__ */ jsx("span", { children: template.icon }),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: template.title }),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Used 234 times" })
                ] })
              ] })
            },
            template.id
          )) })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!selectedTemplate && !showPreview,
        onClose: () => setSelectedTemplate(null),
        title: "Customize Template",
        primaryAction: {
          content: "Create Collection",
          onAction: handleCreateFromTemplate,
          loading: fetcher.state === "submitting"
        },
        secondaryActions: [
          {
            content: "Cancel",
            onAction: () => setSelectedTemplate(null)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-neutral-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(InlineStack, { gap: "200", align: "center", children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "2rem" }, children: selectedTemplate == null ? void 0 : selectedTemplate.icon }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: selectedTemplate == null ? void 0 : selectedTemplate.title }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Template" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Title",
              value: customTitle,
              onChange: setCustomTitle,
              autoComplete: "off"
            }
          ),
          /* @__PURE__ */ jsx(
            TextField,
            {
              label: "Collection Description",
              value: customDescription,
              onChange: setCustomDescription,
              multiline: 3,
              autoComplete: "off"
            }
          ),
          /* @__PURE__ */ jsx(Box, { padding: "300", background: "bg-surface-info-subdued", borderRadius: "200", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "This template includes:" }),
            /* @__PURE__ */ jsxs(List, { type: "bullet", children: [
              /* @__PURE__ */ jsx(List.Item, { children: "Pre-configured smart rules" }),
              /* @__PURE__ */ jsx(List.Item, { children: "SEO optimized settings" }),
              /* @__PURE__ */ jsx(List.Item, { children: "Suggested product tags" }),
              /* @__PURE__ */ jsx(List.Item, { children: "Professional layout" })
            ] })
          ] }) })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: showPreview,
        onClose: () => setShowPreview(false),
        title: "Template Preview",
        primaryAction: {
          content: "Use This Template",
          onAction: () => {
            setShowPreview(false);
            handleUseTemplate(selectedTemplate);
          }
        },
        secondaryActions: [
          {
            content: "Close",
            onAction: () => setShowPreview(false)
          }
        ],
        children: /* @__PURE__ */ jsx(Modal.Section, { children: selectedTemplate && /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx("div", { style: {
            height: "150px",
            background: selectedTemplate.color,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "4rem"
          }, children: selectedTemplate.icon }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", children: selectedTemplate.title }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: selectedTemplate.description })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Included Tags:" }),
            /* @__PURE__ */ jsx(InlineStack, { gap: "100", wrap: true, children: selectedTemplate.tags.map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, tag)) })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Suggested Products:" }),
            /* @__PURE__ */ jsx(InlineStack, { gap: "100", wrap: true, children: selectedTemplate.products.map((product) => /* @__PURE__ */ jsx(Badge, { tone: "info", children: product }, product)) })
          ] }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", children: "Smart Rules:" }),
            selectedTemplate.rules.map((rule, index2) => /* @__PURE__ */ jsx(Box, { padding: "200", background: "bg-surface-neutral-subdued", borderRadius: "100", children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
              rule.type,
              " ",
              rule.operator,
              " ",
              rule.value
            ] }) }, index2))
          ] })
        ] }) })
      }
    ),
    ((_b = fetcher.data) == null ? void 0 : _b.error) && /* @__PURE__ */ jsx(Banner, { tone: "critical", onDismiss: () => {
    }, children: fetcher.data.error }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      padding: "1rem",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      zIndex: 1e3
    }, children: /* @__PURE__ */ jsxs(InlineStack, { align: "center", gap: "400", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: HomeIcon,
          onClick: () => navigate("/app"),
          children: "Home"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: CollectionIcon,
          onClick: () => navigate("/app/collections-enhanced"),
          children: "Collections"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ImportIcon,
          onClick: () => navigate("/app/bulk-operations"),
          children: "Bulk Ops"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: MagicIcon,
          onClick: () => navigate("/app/ai-collections"),
          children: "AI Magic"
        }
      ),
      /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          icon: ChartVerticalFilledIcon,
          onClick: () => navigate("/app/analytics"),
          children: "Analytics"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { style: { paddingBottom: "100px" } })
  ] });
}
const route28 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: Templates
}, Symbol.toStringTag, { value: "Module" }));
const action$1 = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  if (!session) {
    return json({ error: "No session found" }, { status: 401 });
  }
  const formData = await request.formData();
  formData.get("planType");
  const billingUrl = `https://admin.shopify.com/store/${session.shop.replace(".myshopify.com", "")}/charges/collections-creator/pricing_plans`;
  return json({
    success: true,
    redirectUrl: billingUrl,
    message: "Redirecting to Shopify billing..."
  });
};
const loader$2 = async ({ request }) => {
  return json({ error: "Method not allowed" }, { status: 405 });
};
const route29 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({ request }) => {
  var _a2, _b, _c;
  const { admin, session } = await authenticate.admin(request);
  if (!session) {
    console.log("No session in app._index, authentication required");
    throw new Response(null, { status: 401 });
  }
  if (isShopUninstalled(session.shop)) {
    console.log("Shop was uninstalled, forcing re-authentication:", session.shop);
    throw new Response(null, { status: 401 });
  }
  const { hasActiveSubscription, subscription } = await checkSubscriptionStatus(admin, session.shop);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";
  const needsSubscription = !hasActiveSubscription;
  if (needsSubscription) {
    console.log(`No subscription for ${session.shop} - showing pricing page`);
  } else {
    console.log(`Active subscription found for ${session.shop}`);
  }
  console.log("Loading collections for shop:", session.shop);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const query = `
    query getCollections {
      collections(first: 250) {
        edges {
          node {
            id
            title
            handle
            descriptionHtml
            productsCount {
              count
            }
            seo {
              title
              description
            }
            updatedAt
          }
        }
      }
    }
  `;
  try {
    let retries = 5;
    let response;
    let data;
    while (retries > 0) {
      try {
        response = await admin.graphql(query);
        data = await response.json();
        if (data && data.data && data.data.collections) {
          break;
        }
        if (data && !data.errors) {
          console.log("No collections in response, retrying...");
          throw new Error("Empty collections response");
        }
      } catch (retryError) {
        console.log(`GraphQL retry attempt ${6 - retries}/5`);
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        } else {
          console.error("All retries exhausted:", retryError);
          throw retryError;
        }
      }
    }
    if (data && "errors" in data && data.errors) {
      console.error("GraphQL errors:", data.errors);
    }
    const collections = ((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collections) == null ? void 0 : _b.edges) == null ? void 0 : _c.map((edge) => {
      var _a3;
      return {
        ...edge.node,
        productsCount: ((_a3 = edge.node.productsCount) == null ? void 0 : _a3.count) || 0
      };
    })) || [];
    console.log(`Fetched ${collections.length} collections from Shopify`);
    return json({
      collections,
      stats: {
        totalCollections: collections.length
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return json({
      collections: [],
      stats: {
        totalCollections: 0
      },
      needsSubscription,
      hasActiveSubscription,
      subscription,
      host,
      shop: session.shop
    });
  }
};
const action = async ({ request }) => {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  let admin, session;
  let authAttempts = 0;
  const maxAuthAttempts = 3;
  while (authAttempts < maxAuthAttempts) {
    try {
      const auth = await authenticate.admin(request);
      admin = auth.admin;
      session = auth.session;
      if (session && admin) {
        console.log(`Auth successful on attempt ${authAttempts + 1} for shop:`, session.shop);
        break;
      }
    } catch (authError) {
      authAttempts++;
      console.error(`Auth attempt ${authAttempts} failed:`, authError);
      if (authAttempts < maxAuthAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * authAttempts));
      } else {
        throw authError;
      }
    }
  }
  if (!session || !admin) {
    console.error("No valid session after all auth attempts");
    throw new Response(null, { status: 401 });
  }
  console.log("Action called with verified session for shop:", session.shop);
  try {
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    const collectionId = formData.get("collectionId");
    if (actionType === "delete" && collectionId) {
      const mutation = `
        mutation deleteCollection($id: ID!) {
          collectionDelete(input: { id: $id }) {
            deletedCollectionId
            userErrors {
              field
              message
            }
          }
        }
      `;
      const response = await admin.graphql(mutation, {
        variables: { id: collectionId }
      });
      const data = await response.json();
      if (data.data.collectionDelete.userErrors.length > 0) {
        return json({
          success: false,
          error: data.data.collectionDelete.userErrors[0].message
        });
      }
      return json({ success: true });
    }
    if (actionType === "update" && collectionId) {
      const title = formData.get("title");
      const description = formData.get("description");
      const handle = formData.get("handle");
      const seoTitle = formData.get("seoTitle");
      const seoDescription = formData.get("seoDescription");
      console.log("Updating collection:", collectionId, "with title:", title);
      if (!session.accessToken) {
        console.error("No access token in session, cannot proceed");
        return json({
          success: false,
          error: "Session invalid. Please refresh the page.",
          requiresAuth: true
        });
      }
      const mutation = `
        mutation updateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              title
              handle
              descriptionHtml
              seo {
                title
                description
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const variables = {
        input: {
          id: collectionId,
          title,
          descriptionHtml: description,
          handle,
          seo: {
            title: seoTitle || title,
            description: seoDescription
          }
        }
      };
      let retries = 3;
      let lastError = null;
      while (retries > 0) {
        try {
          if (!admin) {
            console.log("Admin client lost, re-authenticating...");
            const reauth = await authenticate.admin(request);
            admin = reauth.admin;
            session = reauth.session;
            if (!admin || !session) {
              throw new Error("Re-authentication failed");
            }
          }
          console.log(`Attempt ${4 - retries}: Updating collection with valid session`);
          const response = await admin.graphql(mutation, { variables });
          const data = await response.json();
          if (((_c = (_b = (_a2 = data.data) == null ? void 0 : _a2.collectionUpdate) == null ? void 0 : _b.userErrors) == null ? void 0 : _c.length) > 0) {
            const errorMessage = data.data.collectionUpdate.userErrors[0].message;
            console.error("GraphQL error:", errorMessage);
            if (!errorMessage.includes("throttled") && !errorMessage.includes("try again")) {
              return json({
                success: false,
                error: errorMessage
              });
            }
          }
          if ((_e = (_d = data.data) == null ? void 0 : _d.collectionUpdate) == null ? void 0 : _e.collection) {
            console.log("Collection updated successfully:", data.data.collectionUpdate.collection.title);
            return json({
              success: true,
              message: "Collection updated successfully",
              collection: data.data.collectionUpdate.collection
            });
          }
        } catch (error) {
          console.error(`Update attempt ${4 - retries} failed:`, (error == null ? void 0 : error.message) || error);
          lastError = error;
          retries--;
          if (((_f = error == null ? void 0 : error.message) == null ? void 0 : _f.includes("Unauthorized")) || ((_g = error == null ? void 0 : error.message) == null ? void 0 : _g.includes("401")) || ((_h = error == null ? void 0 : error.message) == null ? void 0 : _h.includes("session"))) {
            console.log("Auth error detected, attempting re-authentication...");
            try {
              const reauth = await authenticate.admin(request);
              admin = reauth.admin;
              session = reauth.session;
              console.log("Re-authentication successful");
            } catch (reauthError) {
              console.error("Re-authentication failed:", reauthError);
              return json({
                success: false,
                error: "Session expired. Please refresh the page.",
                requiresAuth: true
              });
            }
          }
          if (retries > 0) {
            const delay = (4 - retries) * 1e3;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      return json({
        success: false,
        error: "Failed to update collection. Please try again."
      });
    }
    if (actionType === "duplicate" && collectionId) {
      const query = `
        query getCollection($id: ID!) {
          collection(id: $id) {
            title
            descriptionHtml
            handle
          }
        }
      `;
      const getResponse = await admin.graphql(query, {
        variables: { id: collectionId }
      });
      const getData = await getResponse.json();
      const original = getData.data.collection;
      const createMutation = `
        mutation createCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      const createResponse = await admin.graphql(createMutation, {
        variables: {
          input: {
            title: `${original.title} (Copy)`,
            descriptionHtml: original.descriptionHtml,
            handle: `${original.handle}-copy-${Date.now()}`
          }
        }
      });
      const createData = await createResponse.json();
      if (createData.data.collectionCreate.userErrors.length > 0) {
        return json({
          success: false,
          error: createData.data.collectionCreate.userErrors[0].message
        });
      }
      return json({ success: true });
    }
    return json({ success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, error: "Operation failed" });
  }
};
function Index() {
  var _a2, _b;
  const data = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify2 = useAppBridge();
  const handleSubscribe = (planType) => {
    const shop = data.shop.replace(".myshopify.com", "");
    const billingUrl = `https://admin.shopify.com/store/${shop}/charges/collections-creator/pricing_plans`;
    window.top.location.href = billingUrl;
  };
  if (data.needsSubscription) {
    return /* @__PURE__ */ jsx(Page, { children: /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx("div", { style: {
      maxWidth: "900px",
      margin: "0 auto",
      padding: "2rem 0"
    }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "600", children: [
      /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx(Text, { variant: "heading2xl", as: "h1", children: "Choose Your Plan" }),
        /* @__PURE__ */ jsx("div", { style: { marginTop: "0.5rem" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodyLg", tone: "subdued", children: "Select your subscription plan. Cancel anytime." }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem",
        marginTop: "1rem"
      }, children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx("div", { style: {
          padding: "2rem",
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
          /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Starter" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "Perfect for small stores" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: {
            textAlign: "center",
            padding: "1.5rem 0",
            borderBottom: "1px solid #e1e3e5"
          }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }, children: [
            /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "span", children: "$1.99" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", as: "span", children: "/month" })
          ] }) }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Unlimited collections" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Bulk operations" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "SEO optimization" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Email support" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { marginTop: "auto", paddingTop: "1rem" }, children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "primary",
                size: "large",
                fullWidth: true,
                onClick: () => handleSubscribe(),
                children: "Subscribe Now"
              }
            ),
            /* @__PURE__ */ jsx("div", { style: { textAlign: "center", marginTop: "0.75rem" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "$1.99/month" }) })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: {
          padding: "2rem",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          border: "2px solid #5c6ac4",
          borderRadius: "0.5rem"
        }, children: [
          /* @__PURE__ */ jsx("div", { style: {
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#5c6ac4",
            color: "white",
            padding: "4px 16px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }, children: "Best Value - Save 20%" }),
          /* @__PURE__ */ jsxs(BlockStack, { gap: "500", children: [
            /* @__PURE__ */ jsxs("div", { style: { textAlign: "center" }, children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Professional" }),
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", children: "For growing businesses" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: {
              textAlign: "center",
              padding: "1.5rem 0",
              borderBottom: "1px solid #e1e3e5"
            }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "heading3xl", as: "span", children: "$19.00" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", tone: "subdued", as: "span", children: "/year" })
              ] }),
              /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "success", children: "Save $4.88 (20% off)" })
            ] }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Everything in Starter" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Priority support" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Advanced analytics" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: "#00a651", fontSize: "1.25rem" }, children: "✓" }),
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "API access" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { marginTop: "auto", paddingTop: "1rem" }, children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "primary",
                  tone: "success",
                  size: "large",
                  fullWidth: true,
                  onClick: () => handleSubscribe(),
                  children: "Subscribe Now"
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { textAlign: "center", marginTop: "0.75rem" }, children: /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "$19.00/year" }) })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { style: {
        textAlign: "center",
        padding: "2rem 0",
        borderTop: "1px solid #e1e3e5"
      }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "3rem", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.5rem" }, children: "🔒" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Secure Payments" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.5rem" }, children: "⚡" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "Instant Access" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.5rem" }, children: "🎯" }),
            /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "No Setup Fees" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", children: "Secure billing handled by Shopify" })
      ] }) })
    ] }) }) }) }) });
  }
  const { collections, stats } = data;
  console.log("Index component mounted", { collections, stats });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editSeoTitle, setEditSeoTitle] = useState("");
  const [editSeoDescription, setEditSeoDescription] = useState("");
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.requiresAuth) {
        console.log("Authentication required, refreshing page...");
        shopify2.toast.show("Session expired. Refreshing...");
        setTimeout(() => {
          window.location.href = "/app";
        }, 1e3);
      } else if (fetcher.data.success && fetcher.state === "idle") {
        console.log("Operation successful");
        shopify2.toast.show("✅ Collection updated successfully!");
        setTimeout(() => {
          navigate("/app", { replace: true });
        }, 500);
      } else if (fetcher.data.error && fetcher.state === "idle") {
        console.error("Operation failed:", fetcher.data.error);
        shopify2.toast.show(`Error: ${fetcher.data.error}`);
      }
    }
  }, [fetcher.data, fetcher.state, navigate, shopify2]);
  const handleEdit = useCallback(async (collection) => {
    var _a3, _b2;
    console.log("Edit clicked for:", collection.title);
    try {
      const response = await fetch("/app?index", {
        method: "HEAD",
        credentials: "same-origin"
      });
      if (!response.ok && response.status === 401) {
        console.log("Session expired, refreshing...");
        shopify2.toast.show("Session expired. Refreshing...");
        window.location.href = "/app";
        return;
      }
    } catch (error) {
      console.log("Session check failed, continuing anyway:", error);
    }
    setSelectedCollection(collection);
    setEditTitle(collection.title || "");
    setEditDescription(collection.descriptionHtml || "");
    setEditHandle(collection.handle || "");
    setEditSeoTitle(((_a3 = collection.seo) == null ? void 0 : _a3.title) || collection.title || "");
    setEditSeoDescription(((_b2 = collection.seo) == null ? void 0 : _b2.description) || "");
    setShowEditModal(true);
  }, [shopify2]);
  const handleDelete = useCallback((collection) => {
    console.log("Delete clicked for:", collection.title);
    setSelectedCollection(collection);
    setShowDeleteModal(true);
  }, []);
  const confirmDelete = () => {
    if (selectedCollection) {
      fetcher.submit(
        {
          actionType: "delete",
          collectionId: selectedCollection.id
        },
        { method: "POST" }
      );
      setShowDeleteModal(false);
      setTimeout(() => {
        navigate("/app", { replace: true });
      }, 500);
    }
  };
  const handleDuplicate = useCallback((collection) => {
    console.log("Duplicate clicked for:", collection.title);
    fetcher.submit(
      {
        actionType: "duplicate",
        collectionId: collection.id
      },
      { method: "POST" }
    );
    shopify2.toast.show("📋 Duplicating collection...");
    setTimeout(() => {
      navigate("/app", { replace: true });
    }, 500);
  }, [fetcher, navigate, shopify2]);
  const filteredCollections = collections.filter(
    (collection) => collection.title.toLowerCase().includes(searchQuery.toLowerCase()) || collection.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const rows = filteredCollections.map((collection) => {
    var _a3;
    return [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "12px" }, children: [
        ((_a3 = collection.image) == null ? void 0 : _a3.url) ? /* @__PURE__ */ jsx(
          Thumbnail,
          {
            source: collection.image.url,
            alt: collection.title,
            size: "small"
          }
        ) : /* @__PURE__ */ jsx("div", { style: {
          width: "40px",
          height: "40px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }, children: /* @__PURE__ */ jsx(Icon, { source: CollectionIcon, tone: "base" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodyMd", fontWeight: "semibold", children: collection.title }),
          /* @__PURE__ */ jsxs(Text, { as: "span", variant: "bodySm", tone: "subdued", children: [
            "/",
            collection.handle
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Badge, { tone: "info", children: `${collection.productsCount} products` }),
      /* @__PURE__ */ jsx(Text, { as: "span", variant: "bodySm", children: new Date(collection.updatedAt).toLocaleDateString() }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px", flexWrap: "nowrap", whiteSpace: "nowrap" }, children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "slim",
            icon: EditIcon,
            onClick: () => {
              handleEdit(collection);
            },
            children: "Edit"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "slim",
            icon: DuplicateIcon,
            onClick: () => {
              handleDuplicate(collection);
            },
            children: "Duplicate"
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "slim",
            tone: "critical",
            icon: DeleteIcon,
            onClick: () => {
              handleDelete(collection);
            },
            children: "Delete"
          }
        )
      ] })
    ];
  });
  return /* @__PURE__ */ jsxs("div", { style: { minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsx(TitleBar, { title: "Collections Manager" }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      width: "100%",
      background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      marginBottom: "1rem",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)"
    }, children: /* @__PURE__ */ jsxs("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gap: "0.8rem",
      padding: "0 1rem",
      maxWidth: "1400px",
      margin: "0 auto"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)",
        padding: "4px",
        borderRadius: "12px",
        boxShadow: "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)",
        transition: "all 0.3s ease",
        transform: "scale(1.05)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          variant: "primary",
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Home navigation clicked");
            navigate("/app");
          },
          icon: HomeIcon,
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "700",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "15px"
          }, children: "🏠 Home" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(255, 107, 107, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Size Chart navigation clicked");
            navigate("/app/size-chart-creator");
          },
          icon: ImageIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "📏 Size Charts" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(240, 147, 251, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Create navigation clicked");
            navigate("/app/create-collection");
          },
          icon: MagicIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "🎨 Create Collection" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(79, 172, 254, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Bulk navigation clicked");
            navigate("/app/bulk-operations");
          },
          icon: ImportIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "⚡ Bulk Operations" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(0, 166, 81, 0.4)",
        transition: "all 0.3s ease",
        transform: "scale(1)",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Subscription navigation clicked");
            navigate("/app/subscription");
          },
          icon: CreditCardIcon,
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "💳 Subscription" })
        }
      ) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
        padding: "2px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
        transition: "all 0.3s ease",
        cursor: "pointer"
      }, children: /* @__PURE__ */ jsx(
        Button,
        {
          size: "large",
          fullWidth: true,
          onClick: () => {
            console.log("Contact modal button clicked");
            setShowContactModal(true);
          },
          variant: "primary",
          children: /* @__PURE__ */ jsx("span", { style: {
            fontWeight: "600",
            letterSpacing: "0.5px",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
            fontSize: "14px"
          }, children: "📧 Contact Support" })
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxs(Page, { children: [
      /* @__PURE__ */ jsx("div", { style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "1.5rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        color: "white",
        textAlign: "center"
      }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", align: "center", children: [
        /* @__PURE__ */ jsx(Text, { variant: "displayLarge", as: "h1", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold", fontSize: "3rem" }, children: stats.totalCollections }) }),
        /* @__PURE__ */ jsx(Text, { variant: "headingMd", children: /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.9)", fontSize: "1.2rem" }, children: "Total Collections in Your Store" }) })
      ] }) }),
      /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
        /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingLg", as: "h2", children: "Your Collections" }),
          /* @__PURE__ */ jsx(
            TextField,
            {
              placeholder: "Search collections...",
              value: searchQuery,
              onChange: setSearchQuery,
              prefix: /* @__PURE__ */ jsx(Icon, { source: CollectionIcon }),
              clearButton: true,
              onClearButtonClick: () => setSearchQuery(""),
              autoComplete: "off"
            }
          )
        ] }),
        collections.length === 0 ? /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "Start building your catalog",
            action: {
              content: "Create your first collection",
              icon: PlusIcon,
              onAction: () => navigate("/app/create-collection")
            },
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: "Group your products into collections to help customers find what they're looking for." })
          }
        ) : filteredCollections.length === 0 ? /* @__PURE__ */ jsx(
          EmptyState,
          {
            heading: "No collections found",
            image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
            children: /* @__PURE__ */ jsx("p", { children: "Try adjusting your search query" })
          }
        ) : /* @__PURE__ */ jsx(
          DataTable,
          {
            columnContentTypes: ["text", "text", "text", "text"],
            headings: [
              "Collection",
              "Products",
              "Last Updated",
              "Actions"
            ],
            rows
          }
        )
      ] }) }) }) }),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showDeleteModal,
          onClose: () => setShowDeleteModal(false),
          title: "Delete collection?",
          primaryAction: {
            content: "Delete",
            onAction: confirmDelete,
            destructive: true
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowDeleteModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
            'Are you sure you want to delete "',
            selectedCollection == null ? void 0 : selectedCollection.title,
            '"? This action cannot be undone.'
          ] }) })
        }
      ),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showEditModal,
          onClose: () => setShowEditModal(false),
          title: "Edit Collection",
          primaryAction: {
            content: "Save Changes",
            loading: fetcher.state === "submitting",
            disabled: !editTitle.trim(),
            onAction: async () => {
              if (selectedCollection && editTitle.trim()) {
                try {
                  console.log("Submitting update for collection:", selectedCollection.id);
                  fetcher.submit(
                    {
                      actionType: "update",
                      collectionId: selectedCollection.id,
                      title: editTitle.trim(),
                      description: editDescription,
                      handle: editHandle,
                      seoTitle: editSeoTitle || editTitle,
                      seoDescription: editSeoDescription
                    },
                    {
                      method: "POST",
                      action: "/app?index"
                      // Ensure it goes to the right route
                    }
                  );
                  shopify2.toast.show("Saving changes...");
                  setTimeout(() => {
                    setShowEditModal(false);
                  }, 500);
                } catch (error) {
                  console.error("Error submitting update:", error);
                  shopify2.toast.show("Error updating collection. Please try again.");
                }
              } else if (!editTitle.trim()) {
                shopify2.toast.show("Collection title is required");
              }
            }
          },
          secondaryActions: [
            {
              content: "Cancel",
              onAction: () => setShowEditModal(false)
            }
          ],
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Collection Title",
                value: editTitle,
                onChange: setEditTitle,
                autoComplete: "off",
                requiredIndicator: true
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "Description",
                value: editDescription,
                onChange: setEditDescription,
                multiline: 4,
                autoComplete: "off",
                helpText: "Describe what products are in this collection"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "URL Handle",
                value: editHandle,
                onChange: setEditHandle,
                autoComplete: "off",
                helpText: "Used in the collection URL (e.g., /collections/handle)"
              }
            ),
            /* @__PURE__ */ jsx("div", { style: {
              borderTop: "1px solid #e1e3e5",
              paddingTop: "16px",
              marginTop: "8px"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "SEO Settings" }) }),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "SEO Page Title",
                value: editSeoTitle,
                onChange: setEditSeoTitle,
                autoComplete: "off",
                helpText: "Title shown in search engine results (50-60 characters)"
              }
            ),
            /* @__PURE__ */ jsx(
              TextField,
              {
                label: "SEO Meta Description",
                value: editSeoDescription,
                onChange: setEditSeoDescription,
                multiline: 3,
                autoComplete: "off",
                helpText: "Description shown in search results (150-160 characters)"
              }
            )
          ] }) })
        }
      ),
      ((_a2 = fetcher.data) == null ? void 0 : _a2.success) && /* @__PURE__ */ jsx("div", { style: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1e3
      }, children: /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Success!",
          tone: "success",
          onDismiss: () => {
          }
        }
      ) }),
      ((_b = fetcher.data) == null ? void 0 : _b.error) && /* @__PURE__ */ jsx("div", { style: {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1e3
      }, children: /* @__PURE__ */ jsx(
        Banner,
        {
          title: "Error",
          tone: "critical",
          onDismiss: () => {
          },
          children: /* @__PURE__ */ jsx("p", { children: fetcher.data.error })
        }
      ) }),
      /* @__PURE__ */ jsx(
        Modal,
        {
          open: showContactModal,
          onClose: () => {
            setShowContactModal(false);
            setEmailCopied(false);
          },
          title: "Contact Support",
          primaryAction: {
            content: "Close",
            onAction: () => {
              setShowContactModal(false);
              setEmailCopied(false);
            }
          },
          children: /* @__PURE__ */ jsx(Modal.Section, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx("div", { style: {
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              textAlign: "center"
            }, children: /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h3", children: /* @__PURE__ */ jsx("span", { style: { color: "white", fontWeight: "bold" }, children: "📧 Need Help with Collections Creator?" }) }) }),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: "We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team." }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#FEF3C7",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #F59E0B"
              }, children: /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "600", color: "#92400E" }, children: "⏱️ Response Time: We typically respond within 48 hours" }) }) }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }, children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "📬 Email Support" }),
                /* @__PURE__ */ jsxs("div", { style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "white",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db"
                }, children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodyMd", as: "p", children: /* @__PURE__ */ jsx("strong", { children: "support@axnivo.com" }) }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "micro",
                      variant: emailCopied ? "primary" : "secondary",
                      onClick: () => {
                        navigator.clipboard.writeText("support@axnivo.com");
                        setEmailCopied(true);
                        shopify2.toast.show("✅ Email copied to clipboard!");
                        setTimeout(() => setEmailCopied(false), 3e3);
                      },
                      children: emailCopied ? "✅ Copied!" : "Copy"
                    }
                  )
                ] })
              ] }) }),
              /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h4", children: "⚡ What We Can Help With:" }),
                /* @__PURE__ */ jsx("div", { style: { paddingLeft: "16px" }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", as: "ul", children: [
                  /* @__PURE__ */ jsx("li", { children: "• Collection creation and management issues" }),
                  /* @__PURE__ */ jsx("li", { children: "• Bulk operations support" }),
                  /* @__PURE__ */ jsx("li", { children: "• App installation and setup" }),
                  /* @__PURE__ */ jsx("li", { children: "• Feature requests and suggestions" }),
                  /* @__PURE__ */ jsx("li", { children: "• Technical troubleshooting" }),
                  /* @__PURE__ */ jsx("li", { children: "• General usage questions" })
                ] }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: {
                background: "#EFF6FF",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #3B82F6"
              }, children: [
                /* @__PURE__ */ jsx(Text, { variant: "bodyMd", children: /* @__PURE__ */ jsx("span", { style: { fontWeight: "600", color: "#1E40AF" }, children: "📨 How to Contact:" }) }),
                /* @__PURE__ */ jsx("div", { style: { marginTop: "8px" }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodyMd", children: [
                  '1. Click the "Copy" button above to copy our email',
                  /* @__PURE__ */ jsx("br", {}),
                  "2. Send your message to support@axnivo.com",
                  /* @__PURE__ */ jsx("br", {}),
                  "3. We'll respond within 48 hours"
                ] }) })
              ] }),
              /* @__PURE__ */ jsx("div", { style: {
                background: "#f0f9ff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #0ea5e9"
              }, children: /* @__PURE__ */ jsxs(Text, { variant: "bodySm", children: [
                "💡 ",
                /* @__PURE__ */ jsx("strong", { children: "Tip:" }),
                " When contacting support, please include details about what you were trying to do and any error messages you saw. This helps us assist you faster!"
              ] }) })
            ] })
          ] }) })
        }
      )
    ] })
  ] });
}
const route30 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Index,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    if (!session) {
      return json({ warmed: false, error: "No session" });
    }
    const warmupQuery = `
      query warmup {
        shop {
          name
          currencyCode
        }
      }
    `;
    try {
      const response = await admin.graphql(warmupQuery);
      const data = await response.json();
      console.log("API warmed up for shop:", session.shop);
      return json({
        warmed: true,
        shop: session.shop,
        ready: true
      });
    } catch (error) {
      console.error("Warmup failed:", error);
      return json({
        warmed: false,
        error: "API not ready yet",
        retry: true
      });
    }
  } catch (error) {
    return json({
      warmed: false,
      error: "Authentication required"
    });
  }
};
const route31 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-Ci9HMumg.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-BfQDFoKg.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js"], "css": [] }, "routes/api.collection-update": { "id": "routes/api.collection-update", "parentId": "root", "path": "api/collection-update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.collection-update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.subscription": { "id": "routes/auth.subscription", "parentId": "root", "path": "auth/subscription", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth.subscription-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-Dx3vEMqj.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/styles-Daz940n8.js", "/assets/Page-BePJ91lz.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/FormLayout-DjxgjPJB.js", "/assets/context-BTIEeRbG.js", "/assets/context-C3Cd1xwR.js", "/assets/context-xI5rfeLT.js"], "css": [] }, "routes/webhooks": { "id": "routes/webhooks", "parentId": "root", "path": "webhooks", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.subscriptions_update": { "id": "routes/webhooks.app.subscriptions_update", "parentId": "routes/webhooks", "path": "app/subscriptions_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.subscriptions_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.customers.data_request": { "id": "routes/webhooks.customers.data_request", "parentId": "routes/webhooks", "path": "customers/data_request", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.customers.data_request-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "routes/webhooks", "path": "app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.customers.redact": { "id": "routes/webhooks.customers.redact", "parentId": "routes/webhooks", "path": "customers/redact", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.customers.redact-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "routes/webhooks", "path": "app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/webhooks.shop.redact": { "id": "routes/webhooks.shop.redact", "parentId": "routes/webhooks", "path": "shop/redact", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks.shop.redact-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/route-CrtAPN_I.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js"], "css": ["/assets/route-TqOIn4DE.css"] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/health": { "id": "routes/health", "parentId": "root", "path": "health", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/health-tQy_ArO-.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js"], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-sxV4RdRS.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/styles-Daz940n8.js", "/assets/context-BTIEeRbG.js", "/assets/context-C3Cd1xwR.js", "/assets/context-xI5rfeLT.js"], "css": [] }, "routes/app.size-chart-creator": { "id": "routes/app.size-chart-creator", "parentId": "routes/app", "path": "size-chart-creator", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.size-chart-creator-DpO5TSOr.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-BePJ91lz.js", "/assets/Layout-CR-2O1w0.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Thumbnail-I9kuQQRJ.js", "/assets/ProductIcon.svg-CmgSEMw5.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/Modal-Bmn2ovDN.js", "/assets/ImageIcon.svg-IgX9GCoh.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/RadioButton-DplwoY6N.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/DataTable-whaFcay8.js", "/assets/Banner-Bed-1WKG.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js", "/assets/Choice-BHYzD_70.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/CheckIcon.svg-DaHPfNLC.js"], "css": [] }, "routes/app.create-collection": { "id": "routes/app.create-collection", "parentId": "routes/app", "path": "create-collection", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.create-collection-Bx45CorI.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/app-C4gGeqNa.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Modal-Bmn2ovDN.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/CreditCardIcon.svg-BKTgWxb8.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/Banner-Bed-1WKG.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/Checkbox-9GjnhRMy.js", "/assets/context-BTIEeRbG.js", "/assets/context-C3Cd1xwR.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/Choice-BHYzD_70.js"], "css": [] }, "routes/app.bulk-operations": { "id": "routes/app.bulk-operations", "parentId": "routes/app", "path": "bulk-operations", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.bulk-operations-53QmzuH4.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Checkbox-9GjnhRMy.js", "/assets/Thumbnail-I9kuQQRJ.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/Modal-Bmn2ovDN.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/CreditCardIcon.svg-BKTgWxb8.js", "/assets/Layout-CR-2O1w0.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/DuplicateIcon.svg-Sg-cNaY3.js", "/assets/Banner-Bed-1WKG.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/DataTable-whaFcay8.js", "/assets/context-BTIEeRbG.js", "/assets/Choice-BHYzD_70.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/CheckIcon.svg-DaHPfNLC.js"], "css": [] }, "routes/app.ai-collections": { "id": "routes/app.ai-collections", "parentId": "routes/app", "path": "ai-collections", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.ai-collections-BcaAfn7b.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Checkbox-9GjnhRMy.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/Layout-CR-2O1w0.js", "/assets/RadioButton-DplwoY6N.js", "/assets/CalendarIcon.svg-Dnb3FKdo.js", "/assets/ChartVerticalFilledIcon.svg-B8ybti0_.js", "/assets/ImageIcon.svg-IgX9GCoh.js", "/assets/Select-BuNxC0mK.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/DataTable-whaFcay8.js", "/assets/List-DxpaJmNy.js", "/assets/Modal-Bmn2ovDN.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/Choice-BHYzD_70.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js"], "css": [] }, "routes/app._index_backup": { "id": "routes/app._index_backup", "parentId": "routes/app", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index_backup-SZQXTJyY.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/app-C4gGeqNa.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ViewIcon.svg-CCtJaB3j.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/Banner-Bed-1WKG.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/Layout-CR-2O1w0.js", "/assets/RadioButton-DplwoY6N.js", "/assets/Checkbox-9GjnhRMy.js", "/assets/ImageIcon.svg-IgX9GCoh.js", "/assets/Select-BuNxC0mK.js", "/assets/PlusIcon.svg-BfuTfPyI.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/Choice-BHYzD_70.js"], "css": [] }, "routes/app.direct-update": { "id": "routes/app.direct-update", "parentId": "routes/app", "path": "direct-update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.direct-update-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.health-score": { "id": "routes/app.health-score", "parentId": "routes/app", "path": "health-score", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.health-score-BS1KfxNu.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Grid-88T-Pb-u.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/XSmallIcon.svg-24jpfNfb.js", "/assets/Layout-CR-2O1w0.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/DataTable-whaFcay8.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/List-DxpaJmNy.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/ProductIcon.svg-CmgSEMw5.js", "/assets/Modal-Bmn2ovDN.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/ChartVerticalFilledIcon.svg-B8ybti0_.js", "/assets/ChartVerticalIcon.svg-BXHDKIYl.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js"], "css": [] }, "routes/app.subscription": { "id": "routes/app.subscription", "parentId": "routes/app", "path": "subscription", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.subscription-nF1Qz5kI.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Modal-Bmn2ovDN.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/CreditCardIcon.svg-BKTgWxb8.js", "/assets/Page-BePJ91lz.js", "/assets/Layout-CR-2O1w0.js", "/assets/Banner-Bed-1WKG.js", "/assets/context-BTIEeRbG.js", "/assets/context-C3Cd1xwR.js", "/assets/context-xI5rfeLT.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/CheckIcon.svg-DaHPfNLC.js"], "css": [] }, "routes/app.collections": { "id": "routes/app.collections", "parentId": "routes/app", "path": "collections", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.collections-DqecjOCc.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Thumbnail-I9kuQQRJ.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/Page-BePJ91lz.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/Modal-Bmn2ovDN.js", "/assets/Layout-CR-2O1w0.js", "/assets/Banner-Bed-1WKG.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/DataTable-whaFcay8.js", "/assets/PlusIcon.svg-BfuTfPyI.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/CheckIcon.svg-DaHPfNLC.js"], "css": [] }, "routes/app.scheduling": { "id": "routes/app.scheduling", "parentId": "routes/app", "path": "scheduling", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.scheduling-BvORcw4H.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Layout-CR-2O1w0.js", "/assets/CalendarIcon.svg-Dnb3FKdo.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/DataTable-whaFcay8.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/Modal-Bmn2ovDN.js", "/assets/Select-BuNxC0mK.js", "/assets/Checkbox-9GjnhRMy.js", "/assets/Banner-Bed-1WKG.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ChartVerticalFilledIcon.svg-B8ybti0_.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js", "/assets/Choice-BHYzD_70.js", "/assets/InfoIcon.svg-DN5ziCfk.js"], "css": [] }, "routes/app.analytics": { "id": "routes/app.analytics", "parentId": "routes/app", "path": "analytics", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.analytics-DtcwAoKS.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Select-BuNxC0mK.js", "/assets/Grid-88T-Pb-u.js", "/assets/ViewIcon.svg-CCtJaB3j.js", "/assets/ChartVerticalFilledIcon.svg-B8ybti0_.js", "/assets/Layout-CR-2O1w0.js", "/assets/Tabs-DgaInJU_.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/StarFilledIcon.svg-DTFbSQdL.js", "/assets/List-DxpaJmNy.js", "/assets/DataTable-whaFcay8.js", "/assets/ChartVerticalIcon.svg-BXHDKIYl.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/Modal-Bmn2ovDN.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/FormLayout-DjxgjPJB.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/DuplicateIcon.svg-Sg-cNaY3.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/PlusIcon.svg-BfuTfPyI.js", "/assets/context-C3Cd1xwR.js"], "css": [] }, "routes/app.reconnect": { "id": "routes/app.reconnect", "parentId": "routes/app", "path": "reconnect", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.reconnect-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.seo-tools": { "id": "routes/app.seo-tools", "parentId": "routes/app", "path": "seo-tools", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.seo-tools-BGg_j8QB.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Modal-Bmn2ovDN.js", "/assets/Page-BePJ91lz.js", "/assets/Layout-CR-2O1w0.js", "/assets/RefreshIcon.svg-dwuhltUX.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/DataTable-whaFcay8.js", "/assets/ImageIcon.svg-IgX9GCoh.js", "/assets/XSmallIcon.svg-24jpfNfb.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/HashtagIcon.svg-Bx3g7bo8.js", "/assets/List-DxpaJmNy.js", "/assets/Tabs-DgaInJU_.js", "/assets/ProgressBar-CUIdQP7m.js", "/assets/Banner-Bed-1WKG.js", "/assets/context-BTIEeRbG.js", "/assets/context-C3Cd1xwR.js", "/assets/context-xI5rfeLT.js", "/assets/FormLayout-DjxgjPJB.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/DuplicateIcon.svg-Sg-cNaY3.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/PlusIcon.svg-BfuTfPyI.js"], "css": [] }, "routes/app.templates": { "id": "routes/app.templates", "parentId": "routes/app", "path": "templates", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.templates-PmNFyD7n.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/DuplicateIcon.svg-Sg-cNaY3.js", "/assets/CalendarIcon.svg-Dnb3FKdo.js", "/assets/HashtagIcon.svg-Bx3g7bo8.js", "/assets/ChartVerticalFilledIcon.svg-B8ybti0_.js", "/assets/ProductIcon.svg-CmgSEMw5.js", "/assets/StarFilledIcon.svg-DTFbSQdL.js", "/assets/PlusIcon.svg-BfuTfPyI.js", "/assets/Page-BePJ91lz.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Layout-CR-2O1w0.js", "/assets/Tabs-DgaInJU_.js", "/assets/Grid-88T-Pb-u.js", "/assets/CheckIcon.svg-DaHPfNLC.js", "/assets/ViewIcon.svg-CCtJaB3j.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/Modal-Bmn2ovDN.js", "/assets/Banner-Bed-1WKG.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/FormLayout-DjxgjPJB.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/context-C3Cd1xwR.js"], "css": [] }, "routes/app.billing": { "id": "routes/app.billing", "parentId": "routes/app", "path": "billing", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.billing-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-Bmw0FUaC.js", "imports": ["/assets/jsx-runtime-0DLF9kdB.js", "/assets/components-DK7TFnBr.js", "/assets/useAppBridge-Bj34gXAL.js", "/assets/Page-BePJ91lz.js", "/assets/Layout-CR-2O1w0.js", "/assets/ButtonGroup-DgNny8n-.js", "/assets/Thumbnail-I9kuQQRJ.js", "/assets/CollectionIcon.svg-Cg2nuJZe.js", "/assets/EditIcon.svg-BMATWsJy.js", "/assets/DuplicateIcon.svg-Sg-cNaY3.js", "/assets/TitleBar-aGDsqF3i.js", "/assets/Modal-Bmn2ovDN.js", "/assets/ImageIcon.svg-IgX9GCoh.js", "/assets/MagicIcon.svg-Cq1XyIoH.js", "/assets/ImportIcon.svg-BseU5CJf.js", "/assets/CreditCardIcon.svg-BKTgWxb8.js", "/assets/EmptyState-B0o5Meh0.js", "/assets/PlusIcon.svg-BfuTfPyI.js", "/assets/DataTable-whaFcay8.js", "/assets/Banner-Bed-1WKG.js", "/assets/context-BTIEeRbG.js", "/assets/context-xI5rfeLT.js", "/assets/context-C3Cd1xwR.js", "/assets/InfoIcon.svg-DN5ziCfk.js", "/assets/CheckIcon.svg-DaHPfNLC.js"], "css": [] }, "routes/app.warmup": { "id": "routes/app.warmup", "parentId": "routes/app", "path": "warmup", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.warmup-l0sNRNKZ.js", "imports": [], "css": [] } }, "url": "/assets/manifest-8259ce75.js", "version": "8259ce75" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": true, "v3_singleFetch": false, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/api.collection-update": {
    id: "routes/api.collection-update",
    parentId: "root",
    path: "api/collection-update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/auth.subscription": {
    id: "routes/auth.subscription",
    parentId: "root",
    path: "auth/subscription",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/webhooks": {
    id: "routes/webhooks",
    parentId: "root",
    path: "webhooks",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/webhooks.app.subscriptions_update": {
    id: "routes/webhooks.app.subscriptions_update",
    parentId: "routes/webhooks",
    path: "app/subscriptions_update",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/webhooks.customers.data_request": {
    id: "routes/webhooks.customers.data_request",
    parentId: "routes/webhooks",
    path: "customers/data_request",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "routes/webhooks",
    path: "app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/webhooks.customers.redact": {
    id: "routes/webhooks.customers.redact",
    parentId: "routes/webhooks",
    path: "customers/redact",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "routes/webhooks",
    path: "app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/webhooks.shop.redact": {
    id: "routes/webhooks.shop.redact",
    parentId: "routes/webhooks",
    path: "shop/redact",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route11
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/health": {
    id: "routes/health",
    parentId: "root",
    path: "health",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/app.size-chart-creator": {
    id: "routes/app.size-chart-creator",
    parentId: "routes/app",
    path: "size-chart-creator",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/app.create-collection": {
    id: "routes/app.create-collection",
    parentId: "routes/app",
    path: "create-collection",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/app.bulk-operations": {
    id: "routes/app.bulk-operations",
    parentId: "routes/app",
    path: "bulk-operations",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/app.ai-collections": {
    id: "routes/app.ai-collections",
    parentId: "routes/app",
    path: "ai-collections",
    index: void 0,
    caseSensitive: void 0,
    module: route18
  },
  "routes/app._index_backup": {
    id: "routes/app._index_backup",
    parentId: "routes/app",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/app.direct-update": {
    id: "routes/app.direct-update",
    parentId: "routes/app",
    path: "direct-update",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/app.health-score": {
    id: "routes/app.health-score",
    parentId: "routes/app",
    path: "health-score",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  },
  "routes/app.subscription": {
    id: "routes/app.subscription",
    parentId: "routes/app",
    path: "subscription",
    index: void 0,
    caseSensitive: void 0,
    module: route22
  },
  "routes/app.collections": {
    id: "routes/app.collections",
    parentId: "routes/app",
    path: "collections",
    index: void 0,
    caseSensitive: void 0,
    module: route23
  },
  "routes/app.scheduling": {
    id: "routes/app.scheduling",
    parentId: "routes/app",
    path: "scheduling",
    index: void 0,
    caseSensitive: void 0,
    module: route24
  },
  "routes/app.analytics": {
    id: "routes/app.analytics",
    parentId: "routes/app",
    path: "analytics",
    index: void 0,
    caseSensitive: void 0,
    module: route25
  },
  "routes/app.reconnect": {
    id: "routes/app.reconnect",
    parentId: "routes/app",
    path: "reconnect",
    index: void 0,
    caseSensitive: void 0,
    module: route26
  },
  "routes/app.seo-tools": {
    id: "routes/app.seo-tools",
    parentId: "routes/app",
    path: "seo-tools",
    index: void 0,
    caseSensitive: void 0,
    module: route27
  },
  "routes/app.templates": {
    id: "routes/app.templates",
    parentId: "routes/app",
    path: "templates",
    index: void 0,
    caseSensitive: void 0,
    module: route28
  },
  "routes/app.billing": {
    id: "routes/app.billing",
    parentId: "routes/app",
    path: "billing",
    index: void 0,
    caseSensitive: void 0,
    module: route29
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route30
  },
  "routes/app.warmup": {
    id: "routes/app.warmup",
    parentId: "routes/app",
    path: "warmup",
    index: void 0,
    caseSensitive: void 0,
    module: route31
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
