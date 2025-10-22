import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Select,
  TextField,
  DatePicker,
  Modal,
  Banner,
  DataTable,
  Icon,
  Box,
  Checkbox,
  RadioButton,
  EmptyState,
  Grid,
  ProgressBar,
} from "@shopify/polaris";
import {
  CalendarIcon,
  ClockIcon,
  RefreshIcon,
  DisabledIcon,
  PlayIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  AlertTriangleIcon,
  HomeIcon,
  CollectionIcon,
  ImportIcon,
  MagicIcon,
  ChartVerticalFilledIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
    
    const collections = data.data?.collections?.edges?.map((edge: any) => ({
      ...edge.node,
      productsCount: edge.node.productsCount?.count || 0
    })) || [];
    
    // Simulate scheduled tasks (in production, these would be stored in a database)
    const scheduledTasks = [
      {
        id: "task-1",
        collectionId: collections[0]?.id,
        collectionTitle: collections[0]?.title || "Summer Collection",
        type: "activate",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        recurring: false,
      },
      {
        id: "task-2",
        collectionId: collections[1]?.id,
        collectionTitle: collections[1]?.title || "Flash Sale",
        type: "deactivate",
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        recurring: false,
      },
      {
        id: "task-3",
        collectionId: collections[2]?.id,
        collectionTitle: collections[2]?.title || "Weekly Deals",
        type: "refresh",
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        recurring: true,
        recurringInterval: "weekly",
      },
    ];
    
    return json({ collections, scheduledTasks });
  } catch (error) {
    console.error("Error fetching data:", error);
    return json({ collections: [], scheduledTasks: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  
  if (actionType === "scheduleTask") {
    // In production, save to database
    return json({ success: true, message: "Task scheduled successfully" });
  }
  
  if (actionType === "deleteTask") {
    // In production, delete from database
    return json({ success: true, message: "Task deleted successfully" });
  }
  
  if (actionType === "pauseTask") {
    // In production, update task status in database
    return json({ success: true, message: "Task paused successfully" });
  }
  
  if (actionType === "resumeTask") {
    // In production, update task status in database
    return json({ success: true, message: "Task resumed successfully" });
  }
  
  return json({ success: false, error: "Invalid action" });
};

export default function Scheduling() {
  const { collections, scheduledTasks } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [taskType, setTaskType] = useState("activate");
  const [selectedDate, setSelectedDate] = useState<{month: number, year: number}>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [selectedDateTime, setSelectedDateTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("daily");
  const [editingTask, setEditingTask] = useState<any>(null);
  
  const handleScheduleTask = () => {
    if (selectedCollection && selectedDateTime) {
      fetcher.submit(
        {
          actionType: "scheduleTask",
          collectionId: selectedCollection,
          taskType,
          scheduledDate: selectedDateTime,
          isRecurring: isRecurring.toString(),
          recurringInterval,
        },
        { method: "POST" }
      );
      setShowScheduleModal(false);
      resetForm();
    }
  };
  
  const handleDeleteTask = (taskId: string) => {
    fetcher.submit(
      {
        actionType: "deleteTask",
        taskId,
      },
      { method: "POST" }
    );
  };
  
  const handlePauseTask = (taskId: string) => {
    fetcher.submit(
      {
        actionType: "pauseTask",
        taskId,
      },
      { method: "POST" }
    );
  };
  
  const handleResumeTask = (taskId: string) => {
    fetcher.submit(
      {
        actionType: "resumeTask",
        taskId,
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
  
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "activate": return PlayIcon;
      case "deactivate": return DisabledIcon;
      case "refresh": return RefreshIcon;
      default: return CalendarIcon;
    }
  };
  
  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case "activate": return <Badge tone="success">Activate</Badge>;
      case "deactivate": return <Badge tone="warning">Deactivate</Badge>;
      case "refresh": return <Badge tone="info">Refresh</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge tone="success">Active</Badge>;
      case "pending": return <Badge>Pending</Badge>;
      case "paused": return <Badge tone="warning">Paused</Badge>;
      case "completed": return <Badge tone="info">Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };
  
  const upcomingTasks = scheduledTasks.filter(t => t.status === "pending" || t.status === "active");
  const completedTasks = scheduledTasks.filter(t => t.status === "completed");
  
  useEffect(() => {
    if (fetcher.data?.success) {
      // Refresh the page to show updated data
      window.location.reload();
    }
  }, [fetcher.data]);
  
  return (
    <Page>
      <TitleBar title="Collection Scheduling" />
      
      {/* Magical Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        padding: "2rem",
        borderRadius: "16px",
        marginBottom: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <style>
          {`
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
          `}
        </style>
        
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <div>
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white", fontWeight: "bold" }}>
                  Scheduling Center
                </span>
              </Text>
              <Text variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  Automate collection management with smart scheduling
                </span>
              </Text>
            </div>
            <div className="clock-icon">
              <Icon source={ClockIcon} tone="base" />
            </div>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge tone="success">{upcomingTasks.length} Active</Badge>
            <Badge tone="info">{scheduledTasks.filter(t => t.recurring).length} Recurring</Badge>
            <Badge>{completedTasks.length} Completed</Badge>
          </InlineStack>
        </BlockStack>
      </div>
      
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd">Scheduled Tasks</Text>
                <Button
                  variant="primary"
                  icon={CalendarIcon}
                  onClick={() => setShowScheduleModal(true)}
                >
                  Schedule New Task
                </Button>
              </InlineStack>
              
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  heading="No scheduled tasks"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Schedule automatic collection management tasks</p>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="task-card">
                      <Box
                        padding="400"
                        background="bg-surface"
                        borderWidth="025"
                        borderColor="border"
                        borderRadius="200"
                      >
                        <InlineStack align="space-between">
                          <InlineStack gap="300" align="center">
                            {task.status === "active" && <div className="pulse-dot" />}
                            <Icon source={getTaskTypeIcon(task.type)} />
                            <div>
                              <Text variant="bodyMd" fontWeight="semibold">
                                {task.collectionTitle}
                              </Text>
                              <InlineStack gap="200">
                                {getTaskTypeBadge(task.type)}
                                {task.recurring && (
                                  <Badge tone="info">
                                    <InlineStack gap="050">
                                      <Icon source={RefreshIcon} />
                                      {task.recurringInterval}
                                    </InlineStack>
                                  </Badge>
                                )}
                                {getStatusBadge(task.status)}
                              </InlineStack>
                            </div>
                          </InlineStack>
                          
                          <div>
                            <BlockStack gap="100">
                              <Text variant="bodySm" tone="subdued">
                                Scheduled: {new Date(task.scheduledDate).toLocaleString()}
                              </Text>
                              <InlineStack gap="100">
                                {task.status === "active" ? (
                                  <Button
                                    size="slim"
                                    icon={DisabledIcon}
                                    onClick={() => handlePauseTask(task.id)}
                                  >
                                    Pause
                                  </Button>
                                ) : (
                                  <Button
                                    size="slim"
                                    icon={PlayIcon}
                                    onClick={() => handleResumeTask(task.id)}
                                  >
                                    Resume
                                  </Button>
                                )}
                                <Button
                                  size="slim"
                                  icon={EditIcon}
                                  onClick={() => {
                                    setEditingTask(task);
                                    setShowScheduleModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="slim"
                                  tone="critical"
                                  icon={DeleteIcon}
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  Delete
                                </Button>
                              </InlineStack>
                            </BlockStack>
                          </div>
                        </InlineStack>
                      </Box>
                    </div>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
          
          {completedTasks.length > 0 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Completed Tasks</Text>
                
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Collection", "Task", "Completed", "Status"]}
                  rows={completedTasks.map((task) => [
                    task.collectionTitle,
                    getTaskTypeBadge(task.type),
                    new Date(task.scheduledDate).toLocaleDateString(),
                    getStatusBadge(task.status),
                  ])}
                />
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Quick Schedule</Text>
                
                <BlockStack gap="200">
                  <Button fullWidth onClick={() => {
                    setTaskType("activate");
                    setShowScheduleModal(true);
                  }}>
                    Activate Collection
                  </Button>
                  
                  <Button fullWidth onClick={() => {
                    setTaskType("deactivate");
                    setShowScheduleModal(true);
                  }}>
                    Deactivate Collection
                  </Button>
                  
                  <Button fullWidth onClick={() => {
                    setTaskType("refresh");
                    setIsRecurring(true);
                    setShowScheduleModal(true);
                  }}>
                    Set Recurring Refresh
                  </Button>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Automation Benefits</Text>
                
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Save time on manual tasks</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Never miss important dates</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Optimize for peak times</Text>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Icon source={CheckIcon} tone="success" />
                    <Text variant="bodyMd">Consistent updates</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Schedule Templates</Text>
                
                <BlockStack gap="200">
                  <Box
                    padding="200"
                    background="bg-surface-neutral-subdued"
                    borderRadius="200"
                    onClick={() => {
                      setTaskType("activate");
                      setIsRecurring(false);
                      setShowScheduleModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="semibold">
                        Weekend Sale
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Activate Friday, deactivate Monday
                      </Text>
                    </BlockStack>
                  </Box>
                  
                  <Box
                    padding="200"
                    background="bg-surface-neutral-subdued"
                    borderRadius="200"
                    onClick={() => {
                      setTaskType("refresh");
                      setIsRecurring(true);
                      setRecurringInterval("daily");
                      setShowScheduleModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="semibold">
                        Daily Refresh
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Update collection every morning
                      </Text>
                    </BlockStack>
                  </Box>
                  
                  <Box
                    padding="200"
                    background="bg-surface-neutral-subdued"
                    borderRadius="200"
                    onClick={() => {
                      setTaskType("activate");
                      setIsRecurring(true);
                      setRecurringInterval("monthly");
                      setShowScheduleModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="semibold">
                        Monthly Feature
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        Rotate featured collection monthly
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      
      {/* Schedule Task Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          resetForm();
        }}
        title={editingTask ? "Edit Scheduled Task" : "Schedule New Task"}
        primaryAction={{
          content: editingTask ? "Update Task" : "Schedule Task",
          onAction: handleScheduleTask,
          disabled: !selectedCollection || !selectedDateTime,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setShowScheduleModal(false);
              resetForm();
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Select
              label="Select Collection"
              options={[
                { label: "Choose collection...", value: "" },
                ...collections.map((c: any) => ({
                  label: `${c.title} (${c.productsCount} products)`,
                  value: c.id,
                })),
              ]}
              value={selectedCollection}
              onChange={setSelectedCollection}
            />
            
            <Select
              label="Task Type"
              options={[
                { label: "Activate Collection", value: "activate" },
                { label: "Deactivate Collection", value: "deactivate" },
                { label: "Refresh Products", value: "refresh" },
                { label: "Update SEO", value: "update-seo" },
                { label: "Change Sort Order", value: "change-sort" },
              ]}
              value={taskType}
              onChange={setTaskType}
            />
            
            <TextField
              label="Date & Time"
              type="datetime-local"
              value={selectedDateTime}
              onChange={setSelectedDateTime}
              helpText="Schedule when this task should run"
            />
            
            <Checkbox
              label="Make this a recurring task"
              checked={isRecurring}
              onChange={setIsRecurring}
            />
            
            {isRecurring && (
              <Select
                label="Recurring Interval"
                options={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                  { label: "Bi-weekly", value: "biweekly" },
                  { label: "Monthly", value: "monthly" },
                  { label: "Quarterly", value: "quarterly" },
                ]}
                value={recurringInterval}
                onChange={setRecurringInterval}
              />
            )}
            
            <Box padding="300" background="bg-surface-info-subdued" borderRadius="200">
              <BlockStack gap="200">
                <Text variant="headingSm">Task Preview</Text>
                <Text variant="bodySm">
                  {taskType === "activate" && "This collection will be made visible to customers"}
                  {taskType === "deactivate" && "This collection will be hidden from customers"}
                  {taskType === "refresh" && "Products in this collection will be refreshed"}
                  {isRecurring && ` and will repeat ${recurringInterval}`}
                </Text>
              </BlockStack>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {fetcher.data?.success && (
        <Banner tone="success" onDismiss={() => {}}>
          {fetcher.data.message}
        </Banner>
      )}
      
      {/* Fixed Bottom Navigation */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "1rem",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        zIndex: 1000,
      }}>
        <InlineStack align="center" gap="400">
          <Button
            size="large"
            icon={HomeIcon}
            onClick={() => navigate("/app")}
          >
            Home
          </Button>
          <Button
            size="large"
            icon={CollectionIcon}
            onClick={() => navigate("/app/collections-enhanced")}
          >
            Collections
          </Button>
          <Button
            size="large"
            icon={ImportIcon}
            onClick={() => navigate("/app/bulk-operations")}
          >
            Bulk Ops
          </Button>
          <Button
            size="large"
            icon={MagicIcon}
            onClick={() => navigate("/app/ai-collections")}
          >
            AI Magic
          </Button>
          <Button
            size="large"
            icon={ChartVerticalFilledIcon}
            onClick={() => navigate("/app/analytics")}
          >
            Analytics
          </Button>
        </InlineStack>
      </div>
      
      <div style={{ paddingBottom: "100px" }}></div>
    </Page>
  );
}