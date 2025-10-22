import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate, useRevalidator } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Badge,
  DataTable,
  Modal,
  TextField,
  Select,
  Checkbox,
  ProgressBar,
  EmptyState,
  DropZone,
  Icon,
  Thumbnail,
  TextContainer,
} from "@shopify/polaris";
import {
  ImportIcon,
  ExportIcon,
  EditIcon,
  DuplicateIcon,
  DeleteIcon,
  HomeIcon,
  PlusIcon,
  CheckIcon,
  XSmallIcon,
  CollectionIcon,
  DocumentIcon,
  ArrowDownIcon,
  MagicIcon,
  CreditCardIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
    const collections = data.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0
    })) || [];
    
    return json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    // Return empty data instead of showing login prompts
    return json({ collections: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");
    
    if (actionType === "bulkImport") {
    const csvData = formData.get("csvData") as string;
    const rows = csvData.split("\n").filter(row => row.trim());
    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
    
    const results = [];
    
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(",").map(v => v.trim());
      const collection: any = {};
      
      headers.forEach((header, index) => {
        collection[header] = values[index];
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
              handle: collection.handle || collection.title?.toLowerCase().replace(/\s+/g, "-"),
            },
          },
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
    const collectionIds = JSON.parse(formData.get("collectionIds") as string);
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
          variables: { id },
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
    const collectionIds = JSON.parse(formData.get("collectionIds") as string);
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
          variables: { id },
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
              handle: `${original.handle}-copy-${Date.now()}`,
            },
          },
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
    const collections = JSON.parse(formData.get("collections") as string);
    const csv = [
      "Title,Handle,Description,Products Count,Updated At",
      ...collections.map((c: any) => 
        `"${c.title}","${c.handle}","${c.descriptionHtml?.replace(/<[^>]*>/g, "") || ""}","${c.productsCount}","${c.updatedAt}"`
      )
    ].join("\n");
    
    return json({ actionType: "exportCSV", csv });
  }
  
  if (actionType === "editCollection") {
    const collectionId = formData.get("collectionId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const handle = formData.get("handle") as string;
    
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
          handle,
        },
      },
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

export default function BulkOperations() {
  const { collections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  
  // Track active page - "bulk" for this page
  const activePage = "bulk";
  
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationResults, setOperationResults] = useState<any[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [lastExportedCsv, setLastExportedCsv] = useState<string | null>(null);
  
  const handleSelectCollection = useCallback((id: string) => {
    setSelectedCollections(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedCollections.length === collections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(collections.map((c: any) => c.id));
    }
  }, [selectedCollections, collections]);
  
  const handleEditOpen = useCallback(() => {
    if (selectedCollections.length === 1) {
      const collection = collections.find((c: any) => c.id === selectedCollections[0]);
      if (collection) {
        setEditTitle(collection.title);
        setEditDescription(collection.descriptionHtml?.replace(/<[^>]*>/g, "") || "");
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
          handle: editHandle,
        },
        { method: "POST" }
      );
      
      setTimeout(() => {
        setIsProcessing(false);
        setShowEditModal(false);
        navigate("/app/bulk-operations", { replace: true });
      }, 1000);
    }
  }, [selectedCollections, editTitle, editDescription, editHandle, fetcher, navigate]);
  
  const handleFileUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (file && file.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvContent(e.target?.result as string);
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
          csvData: csvContent,
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
          collectionIds: JSON.stringify(selectedCollections),
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
          collectionIds: JSON.stringify(selectedCollections),
        },
        { method: "POST" }
      );
    }
  };
  
  const handleExport = useCallback(() => {
    // Capture current selection at the time of export
    const currentSelection = [...selectedCollections];
    const exportCollections = currentSelection.length > 0
      ? collections.filter((c: any) => currentSelection.includes(c.id))
      : collections;
    
    console.log('Exporting collections:', exportCollections.map(c => c.title));
    
    fetcher.submit(
      {
        actionType: "exportCSV",
        collections: JSON.stringify(exportCollections),
      },
      { method: "POST" }
    );
  }, [selectedCollections, collections, fetcher]);
  
  // Handle action results
  useEffect(() => {
    if (fetcher.data && fetcher.data.results && fetcher.data.results.length > 0) {
      console.log("Setting operation results:", fetcher.data.results);
      setOperationResults(fetcher.data.results);
      setShowResultsModal(true);
      setIsProcessing(false);
    }
  }, [fetcher.data]);
  
  // Handle CSV export with proper state management
  useEffect(() => {
    if (fetcher.data?.actionType === "exportCSV" && fetcher.data.csv) {
      // Check if this is a new CSV different from the last one
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
        
        // Reset fetcher to prevent re-downloads
        setTimeout(() => {
          // Clear the CSV data to prevent re-triggering
          fetcher.data = null;
        }, 100);
      }
    }
  }, [fetcher.data, lastExportedCsv]);
  
  const rows = collections.map((collection: any) => [
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Checkbox
        checked={selectedCollections.includes(collection.id)}
        onChange={() => handleSelectCollection(collection.id)}
      />
    </div>,
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ flexShrink: 0 }}>
        {collection.image?.url ? (
          <Thumbnail
            source={collection.image.url}
            alt={collection.title}
            size="small"
          />
        ) : (
          <div style={{ 
            width: "32px", 
            height: "32px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px"
          }}>
            <Icon source={CollectionIcon} />
          </div>
        )}
      </div>
      <div>
        <Text variant="bodyMd" fontWeight="semibold">{collection.title}</Text>
        <Text variant="bodySm" tone="subdued">/{collection.handle}</Text>
      </div>
    </div>,
    <div style={{ textAlign: "center" }}>
      <Badge tone="info">{collection.productsCount} products</Badge>
    </div>,
    <div style={{ textAlign: "center" }}>
      {new Date(collection.updatedAt).toLocaleDateString()}
    </div>,
  ]);
  
  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar 
        title="Bulk Operations"
        primaryAction={{
          content: "Home",
          onAction: () => navigate("/app")
        }}
        secondaryActions={[
          {
            content: "Create Collection",
            onAction: () => navigate("/app/create-collection")
          }
        ]}
      />

      {/* Sticky Magical Navigation Header */}
      <div style={{ 
        position: "sticky",
        top: 0,
        zIndex: 999,
        width: "100%", 
        background: "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 100%)",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
        marginBottom: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(5, 1fr)", 
          gap: "0.8rem",
          padding: "0 1rem",
          maxWidth: "1400px",
          margin: "0 auto"
        }}>
          <div style={{
            background: activePage === "home" 
              ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
              : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: activePage === "home" ? "4px" : "2px",
            borderRadius: "12px",
            boxShadow: activePage === "home" 
              ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
              : "0 4px 15px rgba(102, 126, 234, 0.4)",
            transition: "all 0.3s ease",
            transform: activePage === "home" ? "scale(1.05)" : "scale(1)",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate("/app")}
              icon={HomeIcon}
              variant="primary"
            >
              <span style={{ 
                fontWeight: activePage === "home" ? "700" : "600",
                letterSpacing: "0.5px",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: activePage === "home" ? "15px" : "14px",
              }}>
                {activePage === "home" ? "🏠 Home" : "✨ Home"}
              </span>
            </Button>
          </div>
          
          <div style={{
            background: activePage === "create" 
              ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
              : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: activePage === "create" ? "4px" : "2px",
            borderRadius: "12px",
            boxShadow: activePage === "create" 
              ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
              : "0 4px 15px rgba(240, 147, 251, 0.4)",
            transition: "all 0.3s ease",
            transform: activePage === "create" ? "scale(1.05)" : "scale(1)",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate("/app/create-collection")}
              icon={MagicIcon}
              variant="primary"
            >
              <span style={{ 
                fontWeight: activePage === "create" ? "700" : "600",
                letterSpacing: "0.5px",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: activePage === "create" ? "15px" : "14px",
              }}>
                {activePage === "create" ? "🎨 Create" : "🎨 Create Collection"}
              </span>
            </Button>
          </div>
          
          <div style={{
            background: activePage === "bulk" 
              ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
              : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: activePage === "bulk" ? "4px" : "2px",
            borderRadius: "12px",
            boxShadow: activePage === "bulk" 
              ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
              : "0 4px 15px rgba(79, 172, 254, 0.4)",
            transition: "all 0.3s ease",
            transform: activePage === "bulk" ? "scale(1.05)" : "scale(1)",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate("/app/bulk-operations")}
              icon={ImportIcon}
              variant="primary"
            >
              <span style={{ 
                fontWeight: activePage === "bulk" ? "700" : "600",
                letterSpacing: "0.5px",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: activePage === "bulk" ? "15px" : "14px",
              }}>
                {activePage === "bulk" ? "⚡ Bulk" : "⚡ Bulk Operations"}
              </span>
            </Button>
          </div>
          
          {/* Subscription Button */}
          <div style={{
            background: activePage === "subscription" 
              ? "linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)" 
              : "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: activePage === "subscription" ? "4px" : "2px",
            borderRadius: "12px",
            boxShadow: activePage === "subscription" 
              ? "0 6px 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)" 
              : "0 4px 15px rgba(224, 224, 224, 0.4)",
            transition: "all 0.3s ease",
            transform: activePage === "subscription" ? "scale(1.05)" : "scale(1)",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate("/app/subscription")}
              icon={CreditCardIcon}
              variant="primary"
            >
              <span style={{ 
                fontWeight: activePage === "subscription" ? "700" : "600",
                letterSpacing: "0.5px",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: activePage === "subscription" ? "15px" : "14px",
              }}>
                💳 Subscription
              </span>
            </Button>
          </div>
          
          {/* Contact Support Button */}
          <div style={{
            background: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
            padding: "2px",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(107, 114, 128, 0.4)",
            transition: "all 0.3s ease",
          }}>
            <Button 
              size="large" 
              fullWidth 
              onClick={() => setShowContactModal(true)}
              variant="primary"
            >
              <span style={{ 
                fontWeight: "600",
                letterSpacing: "0.5px",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                fontSize: "14px",
              }}>
                📧 Contact Support
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Page>
      
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
      }}>
        <BlockStack gap="200">
          <Text as="h1" variant="headingXl">
            <span style={{ color: "white", fontWeight: "bold" }}>
              Bulk Collection Operations
            </span>
          </Text>
          <Text variant="bodyLg">
            <span style={{ color: "rgba(255,255,255,0.9)" }}>
              Import, export, and manage multiple collections at once
            </span>
          </Text>
        </BlockStack>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <InlineStack gap="200">
                  <Button
                    icon={ImportIcon}
                    onClick={() => setShowImportModal(true)}
                  >
                    Import CSV
                  </Button>
                  <Button
                    icon={ExportIcon}
                    onClick={handleExport}
                  >
                    Export {selectedCollections.length > 0 ? `(${selectedCollections.length})` : "All"}
                  </Button>
                  <Button
                    icon={EditIcon}
                    onClick={handleEditOpen}
                    disabled={selectedCollections.length !== 1}
                  >
                    Edit {selectedCollections.length === 1 ? "" : `(${selectedCollections.length})`}
                  </Button>
                  <Button
                    icon={DuplicateIcon}
                    onClick={handleBulkDuplicate}
                    disabled={selectedCollections.length === 0}
                  >
                    Duplicate ({selectedCollections.length})
                  </Button>
                  <Button
                    tone="critical"
                    icon={DeleteIcon}
                    onClick={() => setShowDeleteModal(true)}
                    disabled={selectedCollections.length === 0}
                  >
                    Delete ({selectedCollections.length})
                  </Button>
                </InlineStack>
                
                <Button
                  onClick={handleSelectAll}
                  variant="plain"
                >
                  {selectedCollections.length === collections.length ? "Deselect All" : "Select All"}
                </Button>
              </InlineStack>
              
              {isProcessing && (
                <Banner tone="info">
                  <BlockStack gap="200">
                    <Text>Processing bulk operation...</Text>
                    <ProgressBar progress={75} />
                  </BlockStack>
                </Banner>
              )}
              
              {collections.length === 0 ? (
                <EmptyState
                  heading="No collections yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Import collections from CSV or create them individually.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={[
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Checkbox
                        checked={selectedCollections.length === collections.length && collections.length > 0}
                        onChange={handleSelectAll}
                      />
                    </div>,
                    "Collection",
                    <div style={{ textAlign: "center" }}>Products</div>,
                    <div style={{ textAlign: "center" }}>Last Updated</div>,
                  ]}
                  rows={rows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">CSV Format Guide</Text>
              <BlockStack gap="200">
                <Text variant="bodySm">
                  Your CSV file should include these columns:
                </Text>
                <div style={{
                  background: "#f4f6f8",
                  padding: "12px",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}>
                  Title,Handle,Description<br/>
                  Summer Sale,summer-sale,Best summer products<br/>
                  Winter Collection,winter-collection,Warm winter gear
                </div>
                <Text variant="bodySm" tone="subdued">
                  The first row must contain column headers.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
          
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd">Quick Stats</Text>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="bodySm">Total Collections</Text>
                  <Badge>{collections.length}</Badge>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text variant="bodySm">Selected</Text>
                  <Badge tone="success">{selectedCollections.length}</Badge>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {/* Import Modal */}
      <Modal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Collections from CSV"
        primaryAction={{
          content: "Import",
          onAction: handleImport,
          disabled: !csvContent,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowImportModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <DropZone
              onDrop={handleFileUpload}
              accept=".csv"
            >
              <DropZone.FileUpload />
            </DropZone>
            
            {csvContent && (
              <Banner tone="success">
                <p>CSV file loaded successfully</p>
              </Banner>
            )}
            
            <TextField
              label="Or paste CSV content"
              value={csvContent}
              onChange={setCsvContent}
              multiline={6}
              placeholder="Title,Handle,Description&#10;Summer Sale,summer-sale,Best deals"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Collections?"
        primaryAction={{
          content: "Delete",
          onAction: handleBulkDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Are you sure you want to delete {selectedCollections.length} collections?
              This action cannot be undone.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
      
      {/* Results Modal */}
      {showResultsModal && (
        <Modal
          open={true}
          onClose={() => {
            console.log("Close button clicked");
            setShowResultsModal(false);
            setOperationResults([]);
            setSelectedCollections([]);
            // Revalidate the data to refresh collections
            revalidator.revalidate();
          }}
          title="Operation Results"
          primaryAction={{
            content: "Done",
            onAction: () => {
              console.log("Done button clicked");
              setShowResultsModal(false);
              setOperationResults([]);
              setSelectedCollections([]);
              // Revalidate the data to refresh collections
              revalidator.revalidate();
            },
          }}
        >
          <Modal.Section>
            <BlockStack gap="300">
              {operationResults.length > 0 ? (
                operationResults.map((result, index) => (
                  <InlineStack key={index} align="space-between">
                    <Text>{result.title || result.id}</Text>
                    {result.success ? (
                      <Badge tone="success">Success</Badge>
                    ) : (
                      <Badge tone="critical">Failed</Badge>
                    )}
                  </InlineStack>
                ))
              ) : (
                <Text>Processing operation...</Text>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
      
      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Collection"
        primaryAction={{
          content: "Save Changes",
          onAction: handleEditSave,
          disabled: !editTitle,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowEditModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Collection Title"
              value={editTitle}
              onChange={setEditTitle}
              autoComplete="off"
              requiredIndicator
            />
            
            <TextField
              label="Handle (URL)"
              value={editHandle}
              onChange={setEditHandle}
              autoComplete="off"
              helpText="Used in the collection's URL"
            />
            
            <TextField
              label="Description"
              value={editDescription}
              onChange={setEditDescription}
              multiline={4}
              autoComplete="off"
              helpText="Describe what's in this collection"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Contact Support Modal */}
      <Modal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Support"
        primaryAction={{
          content: "Close",
          onAction: () => setShowContactModal(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "20px",
              borderRadius: "12px",
              color: "white",
              textAlign: "center",
            }}>
              <Text variant="headingMd" as="h3">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  📧 Need Help with Collections Creator?
                </span>
              </Text>
            </div>
            
            <BlockStack gap="300">
              <Text variant="bodyMd">
                We're here to help! For any questions, issues, or feature requests regarding the Collections Creator app, please reach out to our support team.
              </Text>
              
              <div style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">
                    📬 Email Support
                  </Text>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    background: "white",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}>
                    <Text variant="bodyMd" as="p">
                      <strong>support@axnivo.com</strong>
                    </Text>
                    <Button
                      size="micro"
                      onClick={() => {
                        navigator.clipboard.writeText('support@axnivo.com');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </BlockStack>
              </div>
              
              <div style={{
                background: "#f0f9ff",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #0ea5e9",
              }}>
                <Text variant="bodySm">
                  💡 <strong>Tip:</strong> When contacting support, please include details about what you were trying to do and any error messages you saw. This helps us assist you faster!
                </Text>
              </div>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
    </Page>
    </div>
  );
}